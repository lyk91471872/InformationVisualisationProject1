from pathlib import Path
import pandas as pd
import numpy as np

INPUT = Path("src/data/nvda_2020_2022_preprocessed.csv")
OUTPUT = Path("src/data/q5.csv")

EARNINGS = [
    "2020-02-13","2020-05-21","2020-08-19","2020-11-18",
    "2021-02-24","2021-05-26","2021-08-18","2021-11-17",
    "2022-02-16","2022-05-25","2022-08-24","2022-11-16"
]

def main():
    earn = pd.to_datetime(EARNINGS)

    # --- load + ensure DATE is naive ---
    df = pd.read_csv(INPUT, parse_dates=["QUOTE_DATE"], low_memory=False)
    if df["QUOTE_DATE"].dt.tz is not None:
        df["QUOTE_DATE"] = df["QUOTE_DATE"].dt.tz_localize(None)

    # --- 必需列，使用 CALL/PUT 的独立到期收益 ---
    need = ["option_type","QUOTE_DATE","DTE_bin","log_m_bin",
            "return_exp_call","return_exp_put"]
    miss = [c for c in need if c not in df.columns]
    if miss:
        raise KeyError(f"Preprocessed CSV missing: {miss}")

    # --- 根据当前行的 option_type 选择正确的 return ---
    df["return_exp"] = np.where(
        df["option_type"].astype(str).str.upper().eq("CALL"),
        df["return_exp_call"],
        df["return_exp_put"]
    )
    df["return_exp"] = pd.to_numeric(df["return_exp"], errors="coerce")

    # --- 保留 q5 需要的列 ---
    df = df[["option_type","QUOTE_DATE","DTE_bin","log_m_bin","return_exp"]]
    df = df.dropna()

    # --- 截断极端 return，与 Q1–Q4 保持一致 ---
    df["return_exp"] = df["return_exp"].clip(-1, 10)

    # --- 计算与 earnings 的天数距离 ---
    dates = df["QUOTE_DATE"].values.astype("datetime64[D]")
    earn_arr = earn.values.astype("datetime64[D]")

    # dist[i,j] = abs(QUOTE_DATE_i - EARN_DATE_j)
    dist = np.abs(dates[:, None] - earn_arr[None, :]).astype("timedelta64[D]").astype(int)

    df["days_to_earn"] = dist.min(axis=1)
    df["near_earn"] = df["days_to_earn"] <= 3

    # --- 聚合 ---
    agg = (
        df.groupby(["option_type","near_earn","DTE_bin","log_m_bin"], observed=True)
          .agg(
              n=("return_exp","count"),
              mean_return=("return_exp","mean")
          )
          .reset_index()
    )

    agg.to_csv(OUTPUT, index=False)
    print(f"Saved {OUTPUT} with {len(agg):,} rows")

if __name__ == "__main__":
    main()
