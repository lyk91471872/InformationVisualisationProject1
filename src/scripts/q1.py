from pathlib import Path
import pandas as pd
import numpy as np

INPUT  = Path("src/data/nvda_2020_2022_preprocessed.csv")
OUTPUT = Path("src/data/q1.csv")

DTE_ORDER = ["0-7","8-14","15-30","31-60","61-120","121-365",">365"]
LOG_ORDER = ["≤-0.6","-0.6 – -0.3","-0.3 – -0.1","-0.1 – 0.1","0.1 – 0.3","0.3 – 0.6","> 0.6"]

def group_stats(df, value_field):
    """Replicates the JS groupStats behavior in pandas."""
    # compute n and mean per (DTE_bin, log_m_bin)
    g = (
        df.groupby(["DTE_bin", "log_m_bin"])[value_field]
          .agg(n="count", mean="mean")
          .reset_index()
    )

    # reorder and prune to match JS order-preserving output
    # only keep combinations that appear in DTE_ORDER × LOG_ORDER
    g = g[
        g["DTE_bin"].isin(DTE_ORDER) &
        g["log_m_bin"].isin(LOG_ORDER)
    ].copy()

    # enforce ordering exactly like the JS ordered loops
    g["DTE_bin"]    = pd.Categorical(g["DTE_bin"], categories=DTE_ORDER, ordered=True)
    g["log_m_bin"]  = pd.Categorical(g["log_m_bin"], categories=LOG_ORDER, ordered=True)
    g = g.sort_values(["DTE_bin", "log_m_bin"])

    return g


def main():
    if not INPUT.exists():
        raise FileNotFoundError(f"Cannot find preprocessed file: {INPUT.resolve()}")

    df = pd.read_csv(INPUT)

    required = ["DTE_bin", "log_m_bin", "return_exp_call", "return_exp_put"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise KeyError(f"Preprocessed CSV missing: {missing}")

    # filter valid rows exactly like the JS logic
    ok = (
        df["DTE_bin"].notna()
        & df["log_m_bin"].notna()
        & np.isfinite(pd.to_numeric(df["return_exp_call"], errors="coerce"))
        & np.isfinite(pd.to_numeric(df["return_exp_put"],  errors="coerce"))
    )
    df = df[ok].copy()

    # aggregate CALL
    call_agg = group_stats(
        df[["DTE_bin", "log_m_bin", "return_exp_call"]],
        value_field="return_exp_call"
    )
    call_agg.insert(0, "option_type", "CALL")

    # aggregate PUT
    put_agg = group_stats(
        df[["DTE_bin", "log_m_bin", "return_exp_put"]],
        value_field="return_exp_put"
    )
    put_agg.insert(0, "option_type", "PUT")

    # combine
    out = pd.concat([call_agg, put_agg], ignore_index=True)

    out.to_csv(OUTPUT, index=False)
    print(f"Aggregated q1.csv written to {OUTPUT.resolve()} (rows={len(out):,})")


if __name__ == "__main__":
    main()
