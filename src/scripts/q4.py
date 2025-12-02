from pathlib import Path
import pandas as pd
import numpy as np

INPUT = Path("src/data/nvda_2020_2022_preprocessed.csv")
OUTPUT = Path("src/data/q4.csv")

def main():
    df = pd.read_csv(INPUT, low_memory=False)

    # --- must exist ---
    needed = ["option_type", "return_exp_call", "return_exp_put"]
    missing = [c for c in needed if c not in df.columns]
    if missing:
        raise KeyError(f"Preprocessed CSV missing columns: {missing}")

    # unified expected return
    df["return_exp"] = np.where(
        df["option_type"].astype(str).str.upper() == "CALL",
        df["return_exp_call"],
        df["return_exp_put"]
    )
    df["return_exp"] = pd.to_numeric(df["return_exp"], errors="coerce")

    # ------------------------------------------------------------------
    # Hard-coded Greeks:
    # Use C_xxx for calls and P_xxx for puts.
    # These column names match the CSV header exactly.
    # ------------------------------------------------------------------
    df["delta"] = np.where(
        df["option_type"].astype(str).str.upper() == "CALL",
        df["C_DELTA"],
        df["P_DELTA"],
    )

    df["gamma"] = np.where(
        df["option_type"].astype(str).str.upper() == "CALL",
        df["C_GAMMA"],
        df["P_GAMMA"],
    )

    df["theta"] = np.where(
        df["option_type"].astype(str).str.upper() == "CALL",
        df["C_THETA"],
        df["P_THETA"],
    )

    df["vega"] = np.where(
        df["option_type"].astype(str).str.upper() == "CALL",
        df["C_VEGA"],
        df["P_VEGA"],
    )

    df["iv"] = np.where(
        df["option_type"].astype(str).str.upper() == "CALL",
        df["C_IV"],
        df["P_IV"],
    )

    # convert all Greeks to numeric
    for g in ["delta", "gamma", "theta", "vega", "iv"]:
        df[g] = pd.to_numeric(df[g], errors="coerce")

    # keep required columns only
    cols = ["option_type", "return_exp", "delta", "gamma", "theta", "vega", "iv"]
    df = df[cols].dropna(subset=["option_type", "return_exp", "delta"], how="any")

    if df.empty:
        raise ValueError("No valid rows after Greek extraction.")

    # clamp return_exp for consistency with Q1–Q3
    df["return_exp"] = df["return_exp"].clip(-1, 10)

    # Keep only normal delta range
    df = df[(df["delta"] >= -1) & (df["delta"] <= 1)]
    if df.empty:
        raise ValueError("Dataset empty after delta filtering.")

    # Build 20 bins for delta, sample at most 200 per bin
    df["delta_bin_id"] = pd.cut(df["delta"], bins=20, labels=False)

    sampled = df.groupby("delta_bin_id", group_keys=False).apply(
        lambda x: x.sample(min(len(x), 200), random_state=42)
    )

    out = sampled[["option_type", "delta", "gamma", "theta", "vega", "iv", "return_exp"]]
    out.to_csv(OUTPUT, index=False)
    print(f"Saved {OUTPUT} with {len(out):,} rows")

if __name__ == "__main__":
    main()
