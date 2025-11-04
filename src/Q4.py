from pathlib import Path
import pandas as pd
import numpy as np

INPUT = Path("data/nvda_2020_2022_preprocessed.csv")
OUTPUT = Path("data/q4.csv")

df = pd.read_csv(INPUT, low_memory=False)

def unify(prefix):
    c, p = f"C_{prefix.upper()}", f"P_{prefix.upper()}"
    if c in df.columns and p in df.columns:
        return np.where(df["option_type"].eq("CALL"), df[c], df[p])
    elif c in df.columns:
        return df[c]
    elif p in df.columns:
        return df[p]
    else:
        return np.nan

for greek in ["delta","gamma","theta","vega","iv"]:
    if greek not in df.columns:
        df[greek] = unify(greek)

cols = ["option_type","return_exp","delta","gamma","theta","vega","iv"]
df = df[[c for c in cols if c in df.columns]].dropna()

df["return_exp"] = df["return_exp"].clip(-1,10)
df = df[(df["delta"] >= -1) & (df["delta"] <= 1)]

df["delta_bin_id"] = pd.cut(df["delta"], bins=20, labels=False)
sampled = df.groupby("delta_bin_id", group_keys=False).apply(lambda x: x.sample(min(len(x), 300), random_state=42))
out = sampled[["option_type","delta","gamma","theta","vega","iv","return_exp"]]
out.to_csv(OUTPUT, index=False)
print(f"Saved {OUTPUT} with {len(out):,} rows")
