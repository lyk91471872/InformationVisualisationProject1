from pathlib import Path
import pandas as pd
import numpy as np

INPUT  = Path("data/nvda_2020_2022_preprocessed.csv")
OUTPUT = Path("data/q2.csv")

def main():
    if not INPUT.exists():
        raise FileNotFoundError(f"cannot find: {INPUT.resolve()}")

    df = pd.read_csv(INPUT)

    need = ["option_type", "DTE_bin", "log_m_bin",
            "return_exp", "mid", "S_exp"]
    miss = [c for c in need if c not in df.columns]
    if miss:
        raise KeyError(f"preprocessed csv missing: {miss}")

    d = df.copy()
    d["return_exp"] = pd.to_numeric(d["return_exp"], errors="coerce")
    d["mid"]        = pd.to_numeric(d["mid"], errors="coerce")

    d = d[
        d["option_type"].notna()
        & d["DTE_bin"].notna()
        & d["log_m_bin"].notna()
        & d["return_exp"].notna()
        & d["mid"].notna()
        & (d["mid"] > 0.1)
        & d["S_exp"].notna()
    ].copy()

    d["return_exp_cap"] = d["return_exp"].clip(lower=-1, upper=10)

    rows = []
    for (opt, dte, logm), g in d.groupby(["option_type", "DTE_bin", "log_m_bin"], observed=True):
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

    dte_order = ["0-7","8-14","15-30","31-60","61-120","121-365",">365"]
    log_order = ["≤-0.6","-0.6 – -0.3","-0.3 – -0.1","-0.1 – 0.1",
                 "0.1 – 0.3","0.3 – 0.6","> 0.6"]

    if "DTE_bin" in out.columns:
        out["DTE_bin"] = pd.Categorical(out["DTE_bin"], categories=dte_order, ordered=True)
    if "log_m_bin" in out.columns:
        out["log_m_bin"] = pd.Categorical(out["log_m_bin"], categories=log_order, ordered=True)

    out = out.sort_values(["option_type","DTE_bin","log_m_bin"])
    out.to_csv(OUTPUT, index=False)
    print(f"wrote q2.csv (rows={len(out):,})")


if __name__ == "__main__":
    main()
