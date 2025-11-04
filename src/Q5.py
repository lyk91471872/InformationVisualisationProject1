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
earn = pd.to_datetime(EARNINGS)

df = pd.read_csv(INPUT, parse_dates=["QUOTE_DATE"], low_memory=False)
if df["QUOTE_DATE"].dt.tz is not None:
    df["QUOTE_DATE"] = df["QUOTE_DATE"].dt.tz_localize(None)

cols = ["option_type","QUOTE_DATE","DTE_bin","log_m_bin","return_exp"]
df = df[cols].dropna()
df["return_exp"] = pd.to_numeric(df["return_exp"], errors="coerce")

dates = df["QUOTE_DATE"].values.astype("datetime64[D]")
earn_arr = earn.values.astype("datetime64[D]")
dist = np.abs(dates[:, None] - earn_arr[None, :]).astype("timedelta64[D]").astype(int)
df["days_to_earn"] = dist.min(axis=1)
df["near_earn"] = df["days_to_earn"] <= 3

agg = (
    df.groupby(["option_type","near_earn","DTE_bin","log_m_bin"], observed=True, sort=False)
    .agg(n=("return_exp","count"), mean_return=("return_exp","mean"))
    .reset_index()
)
agg.to_csv(OUTPUT, index=False)
print(f"Saved {OUTPUT} with {len(agg):,} rows")
