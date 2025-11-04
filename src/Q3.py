from pathlib import Path
import pandas as pd
import numpy as np

INPUT = Path("data/nvda_2020_2022_preprocessed.csv")
OUTPUT = Path("data/q3.csv")

def to_quarter(ts):
    if pd.isna(ts): return None
    q = (ts.month - 1) // 3 + 1
    return f"{ts.year}-Q{q}"

df = pd.read_csv(INPUT, parse_dates=["QUOTE_DATE"], low_memory=False)
cols = ["option_type","QUOTE_DATE","DTE_bin","log_m_bin","return_exp"]
df = df[cols].dropna()

df["quarter"] = df["QUOTE_DATE"].apply(to_quarter)
df["return_exp"] = pd.to_numeric(df["return_exp"], errors="coerce")

agg = (
    df.groupby(["option_type","quarter","DTE_bin","log_m_bin"], observed=True, sort=False)
    .agg(n=("return_exp","count"), mean_return=("return_exp","mean"))
    .reset_index()
)
agg.to_csv(OUTPUT, index=False)
print(f"Saved {OUTPUT} with {len(agg):,} rows")
