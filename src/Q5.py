from pathlib import Path
import pandas as pd
import numpy as np

INPUT = Path("data/nvda_2020_2022_preprocessed.csv")
OUTPUT = Path("data/q5.csv")

EARNINGS = [
    "2020-02-13","2020-05-21","2020-08-19","2020-11-18",
    "2021-02-24","2021-05-26","2021-08-18","2021-11-17",
    "2022-02-16","2022-05-25","2022-08-24","2022-11-16"
]

earn_ts = pd.to_datetime(EARNINGS, utc=False)

df = pd.read_csv(INPUT, parse_dates=["QUOTE_DATE"])
if df["QUOTE_DATE"].dt.tz is not None:
    df["QUOTE_DATE"] = df["QUOTE_DATE"].dt.tz_localize(None)

df = df[
    df["option_type"].notna() &
    df["QUOTE_DATE"].notna() &
    df["DTE_bin"].notna() &
    df["log_m_bin"].notna() &
    pd.to_numeric(df["return_exp"], errors="coerce").notna()
].copy()

def nearest_days(ts):
    if pd.isna(ts):
        return np.nan
    diffs = (earn_ts - pd.Timestamp(ts))
    diffs = diffs.map(lambda x: x.days)
    return float(np.min(np.abs(diffs)))

df["days_to_earn"] = df["QUOTE_DATE"].apply(nearest_days)
df["near_earn"] = df["days_to_earn"] <= 3

rows = []
for (opt, near, dte, logm), g in df.groupby(["option_type","near_earn","DTE_bin","log_m_bin"], observed=True):
    ret = pd.to_numeric(g["return_exp"], errors="coerce")
    ret = ret[np.isfinite(ret)]
    if ret.size == 0:
        continue
    rows.append({
        "option_type": opt,
        "near_earn": bool(near),
        "DTE_bin": dte,
        "log_m_bin": logm,
        "n": int(ret.size),
        "mean_return": float(ret.mean())
    })

pd.DataFrame(rows).to_csv(OUTPUT, index=False)
print(f"Wrote {OUTPUT.resolve()}")
