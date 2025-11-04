#!/usr/bin/env python3
"""
Preprocess NVDA options raw CSV into a clean, analysis-ready file.

Input : nvda_2020_2022.csv
Output: nvda_2020_2022_preprocessed.csv

Steps:
1. header clean (BOM, [], strip)
2. type coercion
3. explode call/put
4. mid price
5. DTE_int, DTE_bin
6. moneyness, moneyless, moneyness_bin
7. find S_exp (underlying at/near expiration)
8. payoff_exp, return_exp
9. log_m (PUT mirrored), log_m_bin (for Q1)
"""

from pathlib import Path
import pandas as pd
import numpy as np


INPUT_CSV = "data/nvda_2020_2022.csv"
OUTPUT_CSV = "data/nvda_2020_2022_preprocessed.csv"

DTE_LABELS = ["0-7","8-14","15-30","31-60","61-120","121-365",">365"]
DTE_EDGES  = [0,7,14,30,60,120,365,10_000]

MONEY_EDGES  = [0,0.7,0.85,0.95,1.05,1.15,1.3,10_000]
MONEY_LABELS = ["<0.7","0.7-0.85","0.85-0.95","0.95-1.05","1.05-1.15","1.15-1.3",">1.3"]

LOG_EDGES  = [-0.6, -0.3, -0.1, 0.1, 0.3, 0.6]
LOG_LABELS = ["≤-0.6","-0.6 – -0.3","-0.3 – -0.1","-0.1 – 0.1","0.1 – 0.3","0.3 – 0.6","> 0.6"]


def clean_header(path: str) -> pd.DataFrame:
    """Read csv and clean column names only."""
    df = pd.read_csv(path, encoding="utf-8-sig", low_memory=False)
    df.columns = [str(c).replace("[", "").replace("]", "").strip() for c in df.columns]
    return df


def coerce_types(df: pd.DataFrame) -> pd.DataFrame:

    for c in ["QUOTE_DATE", "EXPIRE_DATE"]:
        if c in df.columns:
            df[c] = pd.to_datetime(df[c], errors="coerce", utc=True)

    for c in [
        "DTE", "UNDERLYING_LAST", "STRIKE",
        "C_BID", "C_ASK", "C_LAST",
        "P_BID", "P_ASK", "P_LAST",
    ]:
        if c in df.columns:
            df[c] = pd.to_numeric(df[c], errors="coerce")
    return df


def explode_call_put(raw: pd.DataFrame) -> pd.DataFrame:
    """Turn each raw row into (maybe) 2 rows: CALL and PUT, with unified field names."""
    common = ["QUOTE_DATE","EXPIRE_DATE","DTE","UNDERLYING_LAST","STRIKE"]

    def make_side(mapping: dict, opt_type: str) -> pd.DataFrame:
        cols = common + list(mapping.values())
        exist = [c for c in cols if c in raw.columns]
        sub = raw[exist].copy()
        rename_map = {mapping[k]: k for k in mapping if mapping[k] in sub.columns}
        sub = sub.rename(columns=rename_map)
        sub["option_type"] = opt_type

        bid = sub.get("bid")
        ask = sub.get("ask")
        if bid is not None and ask is not None:
            sub["mid"] = np.where(bid.notna() & ask.notna(), (bid + ask)/2.0, np.nan)
        else:
            sub["mid"] = np.nan
        return sub

    call_map = {"bid": "C_BID", "ask": "C_ASK", "last": "C_LAST"}
    put_map  = {"bid": "P_BID", "ask": "P_ASK", "last": "P_LAST"}

    df_call = make_side(call_map, "CALL")
    df_put  = make_side(put_map,  "PUT")

    all_cols = sorted(set(df_call.columns) | set(df_put.columns))
    df_call = df_call.reindex(columns=all_cols)
    df_put  = df_put.reindex(columns=all_cols)

    out = pd.concat([df_call, df_put], ignore_index=True)
    return out


def add_dte_bins(df: pd.DataFrame) -> pd.DataFrame:
    df["DTE_int"] = pd.to_numeric(df["DTE"], errors="coerce").round(0).astype("Int64")
    df["DTE_bin"] = pd.cut(
        df["DTE_int"].astype("float"),
        bins=DTE_EDGES,
        right=True,
        include_lowest=True,
        labels=DTE_LABELS
    )
    return df


def add_moneyness(df: pd.DataFrame) -> pd.DataFrame:
    df["moneyness"] = df["UNDERLYING_LAST"] / df["STRIKE"]
    df["moneyless"] = df["moneyness"]  # just an alias you liked
    df["moneyness_bin"] = pd.cut(
        df["moneyness"].astype(float),
        bins=MONEY_EDGES,
        right=False,
        include_lowest=True,
        labels=MONEY_LABELS
    )
    return df


def find_S_exp(df: pd.DataFrame) -> pd.DataFrame:
    """
    For each (STRIKE, EXPIRE_DATE), find underlying price at/nearest-before expiration.
    If none before, take nearest overall.
    """
    base = df[["EXPIRE_DATE", "QUOTE_DATE", "UNDERLYING_LAST", "STRIKE"]].dropna(subset=["EXPIRE_DATE","STRIKE"]).copy()

    def pick(group: pd.DataFrame) -> float:
        exp = group["EXPIRE_DATE"].iloc[0]
        g = group.dropna(subset=["QUOTE_DATE","UNDERLYING_LAST"]).copy()
        if g.empty:
            return np.nan
        g["diff"] = (exp - g["QUOTE_DATE"]).dt.total_seconds()
        le = g["diff"] >= 0
        if le.any():
            cand = g.loc[le].sort_values("diff", ascending=True).head(1)
        else:
            g["adiff"] = g["diff"].abs()
            cand = g.sort_values("adiff", ascending=True).head(1)
        return float(cand["UNDERLYING_LAST"].iloc[0])

    key_cols = ["STRIKE","EXPIRE_DATE"]
    s_exp_map = (
        base.groupby(key_cols, as_index=False)
            .apply(pick)
            .rename(columns={None: "S_exp"})
    )

    df = df.merge(s_exp_map, on=key_cols, how="left")
    return df


def add_expiration_returns(df: pd.DataFrame) -> pd.DataFrame:
    """Add payoff_exp and return_exp based on option_type, strike, S_exp, and today's mid."""
    K   = df["STRIKE"]
    S   = df["S_exp"]
    mid = df["mid"]

    is_call = df["option_type"].eq("CALL")
    is_put  = df["option_type"].eq("PUT")

    payoff_call = np.maximum(0.0, S - K)
    payoff_put  = np.maximum(0.0, K - S)

    df["payoff_exp"] = np.where(is_call, payoff_call,
                         np.where(is_put,  payoff_put, np.nan))

    df["return_exp"] = np.where(
        (mid > 0) & np.isfinite(mid) & np.isfinite(df["payoff_exp"]),
        (df["payoff_exp"] - mid) / mid,
        np.nan
    )
    return df


def add_log_mirror_bins(df: pd.DataFrame) -> pd.DataFrame:
    """For Q1: log(moneyness) for CALL, -log(moneyness) for PUT, then bin."""
    m = df["moneyness"].astype(float)
    log_m = np.log(m)
    # mirror puts
    log_m = np.where(df["option_type"].eq("PUT"), -log_m, log_m)
    df["log_m"] = log_m

    def bin_log(v: float):
        if not np.isfinite(v):
            return pd.NA
        if v <= LOG_EDGES[0]:
            return LOG_LABELS[0]
        for i in range(len(LOG_EDGES)-1):
            if (v > LOG_EDGES[i]) and (v <= LOG_EDGES[i+1]):
                return LOG_LABELS[i+1]
        return LOG_LABELS[-1]

    df["log_m_bin"] = pd.Categorical(
        [bin_log(x) for x in log_m],
        categories=LOG_LABELS,
        ordered=True
    )
    return df


def main():
    src = Path(INPUT_CSV)
    if not src.exists():
        raise FileNotFoundError(f"Input CSV not found: {src.resolve()}")

    # 1) read + header clean
    df = clean_header(src)

    # 2) type coercion
    df = coerce_types(df)

    # 3) explode call/put
    df = explode_call_put(df)

    # 4) DTE bins
    df = add_dte_bins(df)

    # 5) moneyness + bins
    df = add_moneyness(df)

    # 6) S_exp
    df = find_S_exp(df)

    # 7) payoff & return to expiration
    df = add_expiration_returns(df)

    # 8) log moneyness (with PUT mirrored) & bins
    df = add_log_mirror_bins(df)

    # 9) save
    df.to_csv(OUTPUT_CSV, index=False)
    print(f"Saved: {Path(OUTPUT_CSV).resolve()} (rows={len(df):,})")


if __name__ == "__main__":
    main()
