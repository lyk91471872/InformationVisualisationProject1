from pathlib import Path 
import pandas as pd
import numpy as np

INPUT = Path("src/data/nvda_2020_2022_preprocessed.csv")
OUTPUT = Path("src/data/q4.csv")

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

    # --- 确保有新版本的到期收益列 ---
    needed = ["option_type", "return_exp_call", "return_exp_put"]
    missing = [c for c in needed if c not in df.columns]
    if missing:
        raise KeyError(f"Preprocessed CSV missing columns: {missing}")

    # 用这一行真实的 option_type 选择对应的 return
    df["return_exp"] = np.where(
        df["option_type"].astype(str).str.upper().eq("CALL"),
        df["return_exp_call"],
        df["return_exp_put"]
    )
    df["return_exp"] = pd.to_numeric(df["return_exp"], errors="coerce")

    # --- 侦测 & 填充 Greeks 列（如果预处理已经有就会直接用） ---
    cols_detected = {g: detect_col(df, g) for g in ["delta","gamma","theta","vega","iv"]}
    print("Detected Greek columns:", cols_detected)

    for g, col in cols_detected.items():
        if col:
            df[g] = pd.to_numeric(df[col], errors="coerce")
        elif f"C_{g.upper()}" in df.columns and f"P_{g.upper()}" in df.columns:
            df[g] = np.where(
                df["option_type"].astype(str).str.upper().eq("CALL"),
                df[f"C_{g.upper()}"],
                df[f"P_{g.upper()}"]
            )
            df[g] = pd.to_numeric(df[g], errors="coerce")
        else:
            df[g] = np.nan

    # 只保留需要的列，并确保 option_type / return_exp / delta 不为空
    cols = ["option_type","return_exp","delta","gamma","theta","vega","iv"]
    df = df[[c for c in cols if c in df.columns]].dropna(
        subset=["option_type","return_exp","delta"],
        how="any"
    )

    if df.empty:
        raise ValueError("No valid rows after detecting Greeks. Check your CSV headers.")
    else:
        # 截断极端收益，保持与 Q1/Q2/Q3 一致
        df["return_exp"] = df["return_exp"].clip(-1, 10)

        # 只保留正常范围的 delta
        df = df[(df["delta"] >= -1) & (df["delta"] <= 1)]

        if df.empty:
            raise ValueError("Filtered dataset is empty after delta filtering.")

        # 把 delta 分成 20 个桶，然后每个桶最多采样 200 条点用于散点图
        df["delta_bin_id"] = pd.cut(df["delta"], bins=20, labels=False)

        sampled = df.groupby("delta_bin_id", group_keys=False).apply(
            lambda x: x.sample(min(len(x), 200), random_state=42)
        )

        out = sampled[["option_type","delta","gamma","theta","vega","iv","return_exp"]]
        out.to_csv(OUTPUT, index=False)
        print(f"Saved {OUTPUT} with {len(out):,} rows")

if __name__ == "__main__":
    main()
