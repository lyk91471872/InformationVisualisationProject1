#!/usr/bin/env python3
# ===========================================
# Data Preprocessing for NVDA Options (Q1)
# Only Python for preprocessing; plotting via Vega-Lite API in Observable
# ===========================================

import pandas as pd
import numpy as np
from pathlib import Path

# ---------- [Part 0] Config ----------
INPUT_CSV  = "data/nvda_2020_2022.csv"         # ← 改成你的原始 CSV 路径
OUTPUT_CSV = "data/nvda_2020_2022_preprocessed.csv"

# ---------- [Part 1] Read & Header Cleaning (header-only) ----------
# 说明：
# 1) 使用 encoding="utf-8-sig" 自动剥离首行 BOM（U+FEFF）
# 2) 再统一去掉列名里的方括号，并 strip 首尾空白
def read_and_clean_header(path: str) -> pd.DataFrame:
    df = pd.read_csv(path, encoding="utf-8-sig", low_memory=False)
    # 仅清理列名，不逐行处理（更快）
    def _clean_col(c: str) -> str:
        if not isinstance(c, str):
            return c
        return c.replace("[", "").replace("]", "").strip()
    df.columns = [_clean_col(c) for c in df.columns]
    return df

# ---------- [Part 2] Minimal Type Coercion ----------
# 说明：把会用到的列强制成合适类型（能转就转，转不了留空）
def coerce_types(df: pd.DataFrame) -> pd.DataFrame:
    # 日期
    for c in ["QUOTE_DATE", "EXPIRE_DATE"]:
        if c in df.columns:
            df[c] = pd.to_datetime(df[c], errors="coerce", utc=True)

    # 数值
    numeric_cols = [
        "DTE", "UNDERLYING_LAST", "STRIKE",
        "C_BID","C_ASK","C_LAST","C_DELTA","C_GAMMA","C_THETA","C_VEGA","C_IV","C_VOLUME","C_OI",
        "P_BID","P_ASK","P_LAST","P_DELTA","P_GAMMA","P_THETA","P_VEGA","P_IV","P_VOLUME","P_OI"
    ]
    for c in numeric_cols:
        if c in df.columns:
            df[c] = pd.to_numeric(df[c], errors="coerce")
    return df

# ---------- [Part 3] Explode Call / Put + mid price ----------
# 说明：将一行同时含 Call/Put 的记录拆成两行（option_type=CALL/PUT），并为每行计算当日买入价 mid=(bid+ask)/2
def explode_calls_puts(df: pd.DataFrame) -> pd.DataFrame:
    common = ["QUOTE_DATE","EXPIRE_DATE","DTE","UNDERLYING_LAST","STRIKE"]
    # Call 侧
    call_cols = {
        "bid": "C_BID", "ask": "C_ASK", "last":"C_LAST",
        "delta":"C_DELTA","gamma":"C_GAMMA","theta":"C_THETA","vega":"C_VEGA","iv":"C_IV",
        "volume":"C_VOLUME","open_interest":"C_OI"
    }
    # Put 侧
    put_cols = {
        "bid": "P_BID", "ask": "P_ASK", "last":"P_LAST",
        "delta":"P_DELTA","gamma":"P_GAMMA","theta":"P_THETA","vega":"P_VEGA","iv":"P_IV",
        "volume":"P_VOLUME","open_interest":"P_OI"
    }

    def make_side(side_cols: dict, opt_type: str) -> pd.DataFrame:
        cols = common + list(side_cols.values())
        exist = [c for c in cols if c in df.columns]
        sub = df[exist].copy()
        # 统一命名
        rename_map = {side_cols[k]: k for k in side_cols if side_cols[k] in sub.columns}
        sub = sub.rename(columns=rename_map)
        sub["option_type"] = opt_type
        # mid价
        sub["mid"] = np.where(
            sub["bid"].notna() & sub["ask"].notna(),
            (sub["bid"] + sub["ask"]) / 2.0,
            np.nan
        )
        return sub

    df_call = make_side(call_cols, "CALL")
    df_put  = make_side(put_cols,  "PUT")

    # 对齐缺失列
    all_cols = sorted(set(df_call.columns) | set(df_put.columns))
    df_call = df_call.reindex(columns=all_cols)
    df_put  = df_put.reindex(columns=all_cols)

    out = pd.concat([df_call, df_put], ignore_index=True)
    return out

# ---------- [Part 4] DTE (int) / Moneyness & Bins ----------
# 说明：
# - DTE_int：四舍五入到整数（或直接取 floor/ceil，你可按需要改）
# - moneyness = stock/strike = UNDERLYING_LAST / STRIKE
# - 7 桶（<1 与 >1 都有）：[0,0.7,0.85,0.95,1.05,1.15,1.3,∞)
DTE_LABELS = ["0-7","8-14","15-30","31-60","61-120","121-365",">365"]
DTE_EDGES  = [0,7,14,30,60,120,365,10_000]

MONEY_EDGES  = [0,0.7,0.85,0.95,1.05,1.15,1.3,10_000]
MONEY_LABELS = ["<0.7","0.7-0.85","0.85-0.95","0.95-1.05","1.05-1.15","1.15-1.3",">1.3"]

def add_bins(df: pd.DataFrame) -> pd.DataFrame:
    # DTE_int
    if "DTE" in df.columns:
        # 有些数据 DTE 已是整数，这里统一到 int
        df["DTE_int"] = pd.to_numeric(df["DTE"], errors="coerce").round(0).astype("Int64")

        # DTE_bin
        df["DTE_bin"] = pd.cut(
            df["DTE_int"].astype("float"),
            bins=DTE_EDGES, right=True, include_lowest=True, labels=DTE_LABELS
        )
    else:
        df["DTE_int"] = pd.Series(dtype="Int64")
        df["DTE_bin"] = pd.Series(dtype="category")

    # moneyness = stock/strike
    if {"UNDERLYING_LAST","STRIKE"}.issubset(df.columns):
        df["moneyness"] = df["UNDERLYING_LAST"] / df["STRIKE"]
    else:
        df["moneyness"] = np.nan

    # 方便你后面用错别字字段：moneyless == moneyness
    df["moneyless"] = df["moneyness"]

    # moneyness_bin / moneyless_bin
    df["moneyness_bin"] = pd.cut(
        df["moneyness"].astype("float"),
        bins=MONEY_EDGES, right=False, include_lowest=True, labels=MONEY_LABELS
    )
    df["moneyless_bin"] = df["moneyness_bin"]
    return df

# ---------- [Part 5] Underlying @ Expiration & Return to Expiration ----------
# 说明：
# - 对每份合约，以 (STRIKE, EXPIRE_DATE) 为键，找到**到期日**(EXPIRE_DATE) 当天（或最近不晚于到期）的标的价格 S_exp
# - 对每一行（当日买入）计算若持有到到期的收益：
#   payoff_exp = max(0, S_exp - K) for CALL；max(0, K - S_exp) for PUT
#   return_exp = (payoff_exp - mid_today) / mid_today
def attach_expiration_payoff(df: pd.DataFrame) -> pd.DataFrame:
    # 仅用必要列构建键
    need = ["EXPIRE_DATE", "QUOTE_DATE", "UNDERLYING_LAST", "STRIKE"]
    have = [c for c in need if c in df.columns]
    base = df[have].copy()

    # 仅保留有到期日/行权价的行
    base = base.dropna(subset=["EXPIRE_DATE","STRIKE"])

    # 每个 (K, exp) 组内，找 quote_date <= exp 且最接近 exp 的那一天的 UNDERLYING_LAST
    # 如果组里没有任何 quote_date <= exp（极少数情况），则退而求其次选最接近 exp 的记录
    def pick_S_exp(group: pd.DataFrame) -> float:
        exp = group["EXPIRE_DATE"].iloc[0]
        g2  = group.dropna(subset=["QUOTE_DATE","UNDERLYING_LAST"]).copy()
        if g2.empty:
            return np.nan
        # 优先不晚于到期
        g2["diff"] = (exp - g2["QUOTE_DATE"]).dt.total_seconds()
        le_mask = g2["diff"] >= 0
        if le_mask.any():
            cand = g2.loc[le_mask].sort_values("diff", ascending=True).head(1)
        else:
            # 全部晚于到期，则选“最靠近到期日”的记录
            g2["adiff"] = g2["diff"].abs()
            cand = g2.sort_values("adiff", ascending=True).head(1)
        return float(cand["UNDERLYING_LAST"].iloc[0])

    key_cols = ["STRIKE","EXPIRE_DATE"]
    s_exp_map = (
        base.groupby(key_cols, as_index=False)
            .apply(pick_S_exp)
            .rename(columns={None: "S_exp"})
    )

    # 合并回主表
    df = df.merge(s_exp_map, on=key_cols, how="left")

    # payoff_exp
    K = df["STRIKE"]
    S = df["S_exp"]
    is_call = df["option_type"].eq("CALL")
    is_put  = df["option_type"].eq("PUT")

    payoff_call = np.maximum(0.0, S - K)
    payoff_put  = np.maximum(0.0, K - S)
    df["payoff_exp"] = np.where(is_call, payoff_call,
                         np.where(is_put,  payoff_put, np.nan))

    # return_exp：以当日 mid 为成本
    # mid<=0 或 NaN 时，return 置 NaN
    mid = df["mid"]
    df["return_exp"] = np.where(
        (mid > 0) & np.isfinite(mid) & np.isfinite(df["payoff_exp"]),
        (df["payoff_exp"] - mid) / mid,
        np.nan
    )
    return df

# ---------- [Part 6] Save ----------
def main():
    src = Path(INPUT_CSV)
    if not src.exists():
        raise FileNotFoundError(f"Input CSV not found: {src.resolve()}")

    df = read_and_clean_header(src)
    df = coerce_types(df)
    df = explode_calls_puts(df)
    df = add_bins(df)
    df = attach_expiration_payoff(df)

    # 仅保持可视化所需核心字段（也可全量输出）
    keep_cols = [
        # keys
        "QUOTE_DATE","EXPIRE_DATE","DTE","DTE_int","DTE_bin",
        "UNDERLYING_LAST","STRIKE",
        # option
        "option_type","bid","ask","last","mid",
        "delta","gamma","theta","vega","iv","volume","open_interest",
        # features for Q1
        "moneyness","moneyless","moneyness_bin","moneyless_bin",
        # expiration derived
        "S_exp","payoff_exp","return_exp"
    ]
    exist = [c for c in keep_cols if c in df.columns]
    df_out = df[exist].copy()

    # 写出
    df_out.to_csv(OUTPUT_CSV, index=False)
    print(f"Saved: {Path(OUTPUT_CSV).resolve()}  (rows={len(df_out):,})")

if __name__ == "__main__":
    main()
