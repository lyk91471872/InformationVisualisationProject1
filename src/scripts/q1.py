from pathlib import Path
import pandas as pd
import numpy as np

INPUT  = Path("data/nvda_2020_2022_preprocessed.csv")
OUTPUT = Path("data/q1.csv")

def main():
    if not INPUT.exists():
        raise FileNotFoundError(f"Cannot find preprocessed file: {INPUT.resolve()}")

    df = pd.read_csv(INPUT)

    needed_cols = ["option_type", "DTE_bin", "log_m_bin", "return_exp"]
    missing = [c for c in needed_cols if c not in df.columns]
    if missing:
        raise KeyError(f"Preprocessed CSV is missing columns needed by Q1: {missing}")

    q1 = df[needed_cols].copy()

    q1 = q1[
        q1["option_type"].notna()
        & q1["DTE_bin"].notna()
        & q1["log_m_bin"].notna()
        & np.isfinite(pd.to_numeric(q1["return_exp"], errors="coerce"))
    ].copy()

    q1.to_csv(OUTPUT, index=False)
    print(f"Q1 CSV written to: {OUTPUT.resolve()} (rows={len(q1):,})")

if __name__ == "__main__":
    main()
