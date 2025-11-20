from pathlib import Path
import pandas as pd
import numpy as np

INPUT  = Path("src/data/nvda_2020_2022_preprocessed.csv")
OUTPUT = Path("src/data/q1.csv")

def main():
    if not INPUT.exists():
        raise FileNotFoundError(f"Cannot find preprocessed file: {INPUT.resolve()}")

    df = pd.read_csv(INPUT)

    required = ["DTE_bin", "log_m_bin", "return_exp_call", "return_exp_put"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise KeyError(f"Preprocessed CSV missing: {missing}")

    call_part = df[["DTE_bin", "log_m_bin", "return_exp_call"]].copy()
    call_part["option_type"] = "CALL"
    call_part["return_exp"] = call_part["return_exp_call"]
    call_part = call_part[["option_type", "DTE_bin", "log_m_bin", "return_exp"]]

    put_part = df[["DTE_bin", "log_m_bin", "return_exp_put"]].copy()
    put_part["option_type"] = "PUT"
    put_part["return_exp"] = put_part["return_exp_put"]
    put_part = put_part[["option_type", "DTE_bin", "log_m_bin", "return_exp"]]

    q1 = pd.concat([call_part, put_part], ignore_index=True)

    q1 = q1[
        q1["DTE_bin"].notna()
        & q1["log_m_bin"].notna()
        & np.isfinite(pd.to_numeric(q1["return_exp"], errors="coerce"))
    ].copy()

    q1.to_csv(OUTPUT, index=False)
    print(f"Q1 CSV written to: {OUTPUT.resolve()} (rows={len(q1):,})")

if __name__ == "__main__":
    main()