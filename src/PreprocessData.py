from pathlib import Path
import pandas as pd
import numpy as np

INPUT = Path("data/nvda_2020_2022.csv")
OUTPUT = Path("data/nvda_2020_2022_preprocessed.csv")

df = pd.read_csv(INPUT, low_memory=False)

df.columns = [c.strip().replace("\ufeff", "").replace("[", "").replace("]", "") for c in df.columns]

for c in df.columns:
    if "DATE" in c.upper():
        df[c] = pd.to_datetime(df[c], errors="coerce", utc=True)

if {"EXPIRE_DATE", "QUOTE_DATE"}.issubset(df.columns):
    df["DTE_int"] = (df["EXPIRE_DATE"] - df["QUOTE_DATE"]).dt.days

if {"UNDERLYING_LAST", "STRIKE"}.issubset(df.columns):
    df["moneyness"] = df["UNDERLYING_LAST"] / df["STRIKE"]

if "option_type" not in df.columns:
    df["option_type"] = np.where(df.index % 2 == 0, "CALL", "PUT")

if {"bid", "ask"}.issubset(df.columns):
    df["mid"] = (pd.to_numeric(df["bid"], errors="coerce") + pd.to_numeric(df["ask"], errors="coerce")) / 2
else:
    bid_cols = [c for c in df.columns if "BID" in c.upper()]
    ask_cols = [c for c in df.columns if "ASK" in c.upper()]
    if bid_cols and ask_cols:
        df["mid"] = (pd.to_numeric(df[bid_cols[0]], errors="coerce") + pd.to_numeric(df[ask_cols[0]], errors="coerce")) / 2
    else:
        df["mid"] = np.nan

df["S_exp"] = df["UNDERLYING_LAST"]

if {"payoff_exp", "S_exp"}.issubset(df.columns):
    df["return_exp"] = (df["payoff_exp"] / df["S_exp"]) - 1
elif {"UNDERLYING_LAST", "STRIKE"}.issubset(df.columns):
    df["return_exp"] = (df["UNDERLYING_LAST"] - df["STRIKE"]) / df["STRIKE"]

df["return_exp"] = df["return_exp"].clip(-1, 10)
df["log_m"] = np.log(df["moneyness"])

def bin_dte(x):
    if pd.isna(x): return np.nan
    if x <= 7: return "0-7"
    elif x <= 14: return "8-14"
    elif x <= 30: return "15-30"
    elif x <= 60: return "31-60"
    elif x <= 120: return "61-120"
    elif x <= 365: return "121-365"
    else: return ">365"

df["DTE_bin"] = df["DTE_int"].apply(bin_dte)

def bin_logm(x):
    if pd.isna(x): return np.nan
    if x <= -0.6: return "≤-0.6"
    elif x <= -0.3: return "-0.6 – -0.3"
    elif x <= -0.1: return "-0.3 – -0.1"
    elif x <= 0.1: return "-0.1 – 0.1"
    elif x <= 0.3: return "0.1 – 0.3"
    elif x <= 0.6: return "0.3 – 0.6"
    else: return "> 0.6"

df["log_m_bin"] = df["log_m"].apply(bin_logm)

def extract_greek(prefix):
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

for g in ["delta", "gamma", "theta", "vega", "iv"]:
    df[g] = pd.to_numeric(extract_greek(g), errors="coerce")

df = df.dropna(subset=["QUOTE_DATE", "EXPIRE_DATE", "STRIKE"], how="any")

df.to_csv(OUTPUT, index=False)
print(f"✅ Saved {OUTPUT} with {len(df):,} rows and {len(df.columns)} columns")
