from pathlib import Path
import pandas as pd
import numpy as np

INPUT = Path("src/data/nvda_2020_2022_preprocessed.csv")
OUTPUT = Path("src/data/q3.csv")

def to_quarter(ts):
    if pd.isna(ts):
        return None
    q = (ts.month - 1)//3 + 1
    return f"{ts.year}-Q{q}"

def main():
    # 读入数据（包含 QUOTE_DATE 解析）
    df = pd.read_csv(INPUT, parse_dates=["QUOTE_DATE"], low_memory=False)

    # 必需列
    need = [
        "QUOTE_DATE", "DTE_bin", "log_m_bin",
        "return_exp_call", "return_exp_put"
    ]
    miss = [c for c in need if c not in df.columns]
    if miss:
        raise KeyError(f"preprocessed csv missing: {miss}")

    # ---------- 构造 CALL 部分 ----------
    call = df[["QUOTE_DATE","DTE_bin","log_m_bin","return_exp_call"]].copy()
    call["option_type"] = "CALL"
    call["return_exp"] = pd.to_numeric(call["return_exp_call"], errors="coerce")
    call = call[["option_type","QUOTE_DATE","DTE_bin","log_m_bin","return_exp"]]

    # ---------- 构造 PUT 部分 ----------
    put = df[["QUOTE_DATE","DTE_bin","log_m_bin","return_exp_put"]].copy()
    put["option_type"] = "PUT"
    put["return_exp"] = pd.to_numeric(put["return_exp_put"], errors="coerce")
    put = put[["option_type","QUOTE_DATE","DTE_bin","log_m_bin","return_exp"]]

    # 合并长表
    d = pd.concat([call, put], ignore_index=True)

    # 有效行过滤
    d = d[
        d["QUOTE_DATE"].notna()
        & d["DTE_bin"].notna()
        & d["log_m_bin"].notna()
        & d["return_exp"].notna()
    ].copy()

    # 截断极端 return（保持与 Q1/Q2 一致）
    d["return_exp"] = d["return_exp"].clip(lower=-1, upper=10)

    # 添加季度标签
    d["quarter"] = d["QUOTE_DATE"].apply(to_quarter)

    # ---------- 聚合 ----------
    agg = (
        d.groupby(["option_type","quarter","DTE_bin","log_m_bin"], observed=True)
         .agg(
            n=("return_exp","count"),
            mean_return=("return_exp","mean")
         )
         .reset_index()
    )

    agg.to_csv(OUTPUT, index=False)
    print(f"✅ Saved {OUTPUT} with {len(agg):,} rows")

if __name__ == "__main__":
    main()
