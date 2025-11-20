from pathlib import Path
import pandas as pd
import numpy as np

INPUT  = Path("src/data/nvda_2020_2022_preprocessed.csv")
OUTPUT = Path("src/data/q2.csv")

def main():
    if not INPUT.exists():
        raise FileNotFoundError(f"cannot find: {INPUT.resolve()}")

    df = pd.read_csv(INPUT)

    # 需要的列：分箱 + 到期收益 + 两边的 bid/ask + 到期价
    need = [
        "DTE_bin", "log_m_bin",
        "return_exp_call", "return_exp_put",
        "C_BID", "C_ASK", "P_BID", "P_ASK",
        "S_exp"
    ]
    miss = [c for c in need if c not in df.columns]
    if miss:
        raise KeyError(f"preprocessed csv missing: {miss}")

    # ---------- 构造 CALL 部分 ----------
    call = df[["DTE_bin", "log_m_bin",
               "return_exp_call", "C_BID", "C_ASK", "S_exp"]].copy()
    call["option_type"] = "CALL"
    call["return_exp"] = pd.to_numeric(call["return_exp_call"], errors="coerce")
    call["mid"] = (
        pd.to_numeric(call["C_BID"], errors="coerce") +
        pd.to_numeric(call["C_ASK"], errors="coerce")
    ) / 2

    call = call[["option_type", "DTE_bin", "log_m_bin",
                 "return_exp", "mid", "S_exp"]]

    # ---------- 构造 PUT 部分 ----------
    put = df[["DTE_bin", "log_m_bin",
              "return_exp_put", "P_BID", "P_ASK", "S_exp"]].copy()
    put["option_type"] = "PUT"
    put["return_exp"] = pd.to_numeric(put["return_exp_put"], errors="coerce")
    put["mid"] = (
        pd.to_numeric(put["P_BID"], errors="coerce") +
        pd.to_numeric(put["P_ASK"], errors="coerce")
    ) / 2

    put = put[["option_type", "DTE_bin", "log_m_bin",
               "return_exp", "mid", "S_exp"]]

    # 合并 CALL + PUT，得到长表
    d = pd.concat([call, put], ignore_index=True)

    # 过滤无效值和极小权利金（避免爆炸的 return）
    d = d[
        d["option_type"].notna()
        & d["DTE_bin"].notna()
        & d["log_m_bin"].notna()
        & d["return_exp"].notna()
        & d["mid"].notna()
        & (d["mid"] > 0.1)
        & d["S_exp"].notna()
    ].copy()

    # 截断极端 return，保持与 Q1 一致
    d["return_exp_cap"] = d["return_exp"].clip(lower=-1, upper=10)

    # ---------- 按组合聚合 ----------
    rows = []
    grouped = d.groupby(
        ["option_type", "DTE_bin", "log_m_bin"],
        observed=True
    )

    for (opt, dte, logm), g in grouped:
        arr = g["return_exp_cap"].to_numpy()
        arr = arr[np.isfinite(arr)]
        if arr.size == 0:
            continue

        n = int(arr.size)
        mean_ret = float(arr.mean())
        std_ret  = float(arr.std(ddof=1)) if n > 1 else np.nan

        downside = arr[arr < 0]
        if downside.size > 1:
            dstd = float(downside.std(ddof=1))
        else:
            dstd = np.nan

        sharpe = mean_ret / std_ret if (std_ret and np.isfinite(std_ret) and std_ret > 0) else np.nan
        sortino = mean_ret / dstd     if (dstd and np.isfinite(dstd) and dstd > 0) else np.nan

        rows.append({
            "option_type": opt,
            "DTE_bin": dte,
            "log_m_bin": logm,
            "n": n,
            "mean_return": mean_ret,
            "std_return": std_ret,
            "downside_std": dstd,
            "sharpe": sharpe,
            "sortino": sortino,
        })

    out = pd.DataFrame(rows)

    # 排序顺序与 Q1 保持一致
    dte_order = ["0-7","8-14","15-30","31-60","61-120","121-365",">365"]
    log_order = ["≤-0.6","-0.6 – -0.3","-0.3 – -0.1","-0.1 – 0.1",
                 "0.1 – 0.3","0.3 – 0.6","> 0.6"]

    if "DTE_bin" in out.columns:
        out["DTE_bin"] = pd.Categorical(out["DTE_bin"], categories=dte_order, ordered=True)
    if "log_m_bin" in out.columns:
        out["log_m_bin"] = pd.Categorical(out["log_m_bin"], categories=log_order, ordered=True)

    out = out.sort_values(["option_type", "DTE_bin", "log_m_bin"])

    out.to_csv(OUTPUT, index=False)
    print(f"wrote q2.csv (rows={len(out):,})")


if __name__ == "__main__":
    main()
