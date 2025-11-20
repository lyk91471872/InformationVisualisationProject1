from pathlib import Path
import pandas as pd
import numpy as np

INPUT = Path("src/data/nvda_2020_2022.csv")
OUTPUT = Path("src/data/nvda_2020_2022_preprocessed.csv")

def extract_greek(df, prefix):
    up = prefix.upper()
    low = prefix.lower()
    c_col, p_col = f"C_{up}", f"P_{up}"
    if c_col in df.columns and p_col in df.columns:
        return np.where(df["option_type"].eq("CALL"), df[c_col], df[p_col])
    elif low in df.columns:
        return df[low]
    elif up in df.columns:
        return df[up]
    return np.nan

def bin_logm(x):
    if pd.isna(x): return np.nan
    if x <= -0.6: return "≤-0.6"
    elif x <= -0.3: return "-0.6 – -0.3"
    elif x <= -0.1: return "-0.3 – -0.1"
    elif x <= 0.1: return "-0.1 – 0.1"
    elif x <= 0.3: return "0.1 – 0.3"
    elif x <= 0.6: return "0.3 – 0.6"
    else: return "> 0.6"

def bin_dte(x):
    if pd.isna(x): return np.nan
    if x <= 7: return "0-7"
    elif x <= 14: return "8-14"
    elif x <= 30: return "15-30"
    elif x <= 60: return "31-60"
    elif x <= 120: return "61-120"
    elif x <= 365: return "121-365"
    else: return ">365"

def main():
    df = pd.read_csv(INPUT, low_memory=False)

    # clean column names
    df.columns = [c.strip().replace("\ufeff", "").replace("[", "").replace("]", "") for c in df.columns]

    # date columns
    for c in df.columns:
        if "DATE" in c.upper():
            df[c] = pd.to_datetime(df[c], errors="coerce", utc=True)

    # numeric columns
    num_cols = ["UNDERLYING_LAST","STRIKE","C_BID","C_ASK","P_BID","P_ASK"]
    for c in num_cols:
        if c in df.columns:
            df[c] = pd.to_numeric(df[c], errors="coerce")

    # create option_type if missing
    if "option_type" not in df.columns:
        df["option_type"] = np.where(df.index % 2 == 0, "CALL", "PUT")

    # DTE
    df["DTE_int"] = (df["EXPIRE_DATE"] - df["QUOTE_DATE"]).dt.days

    # moneyness = K / S
    df["moneyness"] = df["STRIKE"] / df["UNDERLYING_LAST"]

    # log-moneyness = ln(K/S)
    df["log_m"] = np.log(df["moneyness"])


    # premiums
    df["call_premium"] = (df["C_BID"] + df["C_ASK"]) / 2
    df["put_premium"]  = (df["P_BID"] + df["P_ASK"]) / 2

    # --------------------------------------------------
    # STEP 1: Build underlying price table (daily)
    # --------------------------------------------------
    underlying_daily = (
        df[["QUOTE_DATE", "UNDERLYING_LAST"]]
        .dropna()
        .drop_duplicates(subset=["QUOTE_DATE"])
        .rename(columns={"UNDERLYING_LAST": "S_exp"})
    )

    # --------------------------------------------------
    # STEP 2: Merge expiration-day underlying price
    # --------------------------------------------------
    df = df.merge(
        underlying_daily,
        left_on="EXPIRE_DATE",
        right_on="QUOTE_DATE",
        how="left",
        suffixes=("", "_drop")
    )
    df = df.drop(columns=[c for c in df.columns if c.endswith("_drop")])

    # true expiration underlying price
    # S_exp is already created above

    # payoffs
    df["call_payoff"] = np.maximum(df["S_exp"] - df["STRIKE"], 0)
    df["put_payoff"]  = np.maximum(df["STRIKE"] - df["S_exp"], 0)

    # true returns
    df["return_exp_call"] = (df["call_payoff"] - df["call_premium"]) / df["call_premium"]
    df["return_exp_put"]  = (df["put_payoff"]  - df["put_premium"])  / df["put_premium"]

    # clip extreme returns
    df["return_exp_call"] = df["return_exp_call"].clip(-1, 10)
    df["return_exp_put"]  = df["return_exp_put"].clip(-1, 10)

    # bins
    df["DTE_bin"] = df["DTE_int"].apply(bin_dte)
    df["log_m_bin"] = df["log_m"].apply(bin_logm)

    # greeks
    for g in ["delta", "gamma", "theta", "vega", "iv"]:
        df[g] = pd.to_numeric(extract_greek(df, g), errors="coerce")

    df = df.dropna(subset=["QUOTE_DATE", "EXPIRE_DATE", "STRIKE"])

    df.to_csv(OUTPUT, index=False)
    print("✅ Saved", OUTPUT)

if __name__ == "__main__":
    main()
