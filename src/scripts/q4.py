from pathlib import Path
import pandas as pd
import numpy as np

INPUT = Path("data/nvda_2020_2022_preprocessed.csv")
OUTPUT = Path("data/q4.csv")

def detect_col(df, prefix):
    """Return the best matching column for a given greek prefix."""
    cands = [
        f"C_{prefix.upper()}", f"P_{prefix.upper()}",
        f"c_{prefix}", f"p_{prefix}",
        prefix, prefix.upper(), prefix.capitalize()
    ]
    for c in cands:
        if c in df.columns:
            return c
    return None

def main():
    df = pd.read_csv(INPUT, low_memory=False)

    cols_detected = {g: detect_col(df, g) for g in ["delta","gamma","theta","vega","iv"]}
    print("Detected Greek columns:", cols_detected)

    for g, col in cols_detected.items():
        if col:
            df[g] = pd.to_numeric(df[col], errors="coerce")
        elif f"C_{g.upper()}" in df.columns and f"P_{g.upper()}" in df.columns:
            df[g] = np.where(df["option_type"].eq("CALL"), df[f"C_{g.upper()}"], df[f"P_{g.upper()}"])
        else:
            df[g] = np.nan

    cols = ["option_type","return_exp","delta","gamma","theta","vega","iv"]
    df = df[[c for c in cols if c in df.columns]].dropna(subset=["option_type","return_exp","delta"], how="any")

    if df.empty:
        raise ValueError("No valid rows after detecting Greeks. Check your CSV headers.")
    else:
        df["return_exp"] = df["return_exp"].clip(-1,10)
        df = df[(df["delta"] >= -1) & (df["delta"] <= 1)]

        if df.empty:
            raise ValueError("Filtered dataset is empty after delta filtering.")

        df["delta_bin_id"] = pd.cut(df["delta"], bins=20, labels=False)
        sampled = df.groupby("delta_bin_id", group_keys=False).apply(
            lambda x: x.sample(min(len(x), 200), random_state=42)
        )
        out = sampled[["option_type","delta","gamma","theta","vega","iv","return_exp"]]
        out.to_csv(OUTPUT, index=False)
        print(f"Saved {OUTPUT} with {len(out):,} rows")

if __name__ == "__main__":
    main()
