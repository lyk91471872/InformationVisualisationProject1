# NVDA Options Data Explorer (Q1–Q5)

This repo explores NVIDIA (NVDA) option chains (2020–2022) and answers five domain questions with **Python preprocessing** + **Vega‑Lite (Observable)** visuals.

---

## Repository layout

```
data/
  nvda_2020_2022.csv                 # raw dataset (input)
  nvda_2020_2022_preprocessed.csv    # unified, binned, derivations added (output of PreprocessData.py)
  q1.csv                             # aggregates for Q1
  q2.csv                             # aggregates for Q2
  q3.csv                             # aggregates for Q3
  q4.csv                             # sampled rows for Greeks scatter (Q4)
  q5.csv                             # aggregates for earnings proximity (Q5)
src/
  PreprocessData.py                  # master preprocessing (keeps ALL raw columns; adds bins/greeks/derived)
  Q1.py                              # make data/q1.csv
  Q2.py                              # make data/q2.csv
  Q3.py                              # make data/q3.csv
  Q4.py                              # make data/q4.csv
  Q5.py                              # make data/q5.csv
  q1_moneyness_dte.md                # Observable page
  q2_risk_tradeoff.md                # Observable page
  q3_stability_over_time.md          # Observable page
  q4_greeks_vs_returns.md            # Observable page
  q5_earnings_effects.md             # Observable page
```

> **Note**: We keep the raw columns intact in `nvda_2020_2022_preprocessed.csv` and only drop columns when writing the Q#.csv files for each specific question.

---

## Prerequisites

- Python 3.9+ with `pandas`, `numpy`
- Node 18+ if you use Observable Framework locally (optional; visuals also run on observablehq.com)
- The raw CSV at `data/nvda_2020_2022.csv`

Install Python deps:
```bash
pip install -U pandas numpy
```

---

## 0) Preprocess once

This step cleans headers, parses dates, computes derived fields, **preserves all raw columns**, and adds the columns required by Q1–Q5.

**Adds/ensures**:
- `DTE_int`, `DTE_bin`
- `moneyness`, `log_m`, `log_m_bin`
- `mid` (=(bid+ask)/2 with fallbacks), `S_exp`
- `return_exp` (clipped [-1, 10])
- Greeks `delta`, `gamma`, `theta`, `vega`, `iv` (from `C_*` / `P_*` when present)
- Keeps `QUOTE_DATE`, `EXPIRE_DATE`, `STRIKE`, `UNDERLYING_LAST`, etc.

Run:
```bash
python src/PreprocessData.py
```

Outputs:
```
data/nvda_2020_2022_preprocessed.csv
```

---

## 1) Build Q# datasets

Each script reads **data/nvda_2020_2022_preprocessed.csv** and writes a compact CSV for the visualization.

```bash
# Q1 – Moneyness × DTE → mean hold‑till‑expiration return
python src/Q1.py   # => data/q1.csv

# Q2 – Risk vs return (Sharpe-like summaries per (DTE_bin, log_m_bin, option_type))
python src/Q2.py   # => data/q2.csv

# Q3 – Same as Q1 but faceted by quarter (stability over time)
python src/Q3.py   # => data/q3.csv

# Q4 – Greeks vs returns (sampled rows with unified greeks)
python src/Q4.py   # => data/q4.csv

# Q5 – Near‑earnings vs normal periods (±3 days)
python src/Q5.py   # => data/q5.csv
```

If a Q# script complains about missing columns, re‑run **PreprocessData.py** and ensure the raw file is at `data/nvda_2020_2022.csv`.

---

## 2) View the visuals (Observable + Vega‑Lite)

Open the corresponding `.md` pages in Observable (or in your Observable Framework app) and ensure the `FileAttachment` paths point to `./data/q#.csv`.

- **Q1**: `src/q1_moneyness_dte.md`
- **Q2**: `src/q2_risk_tradeoff.md`
- **Q3**: `src/q3_stability_over_time.md`
- **Q4**: `src/q4_greeks_vs_returns.md`
- **Q5**: `src/q5_earnings_effects.md`

Each page uses the native `vl` API with `vl.render()` (no `vega-embed` required).

> Tip: If marks render empty, check column names in the CSV (`q#.columns`), coerce numeric fields, and trim strings; see each page’s loading block.

---

## Data assumptions

- “Hold‑till‑expiration return” uses `return_exp` computed from (`payoff_exp`/`S_exp`−1) if available, otherwise a reasonable surrogate from underlying/strike; it’s clipped to `[-1, 10]` for robust aggregations.
- DTE bins: `["0-7","8-14","15-30","31-60","61-120","121-365",">365"]`
- Log‑moneyness bins: `["≤-0.6","-0.6 – -0.3","-0.3 – -0.1","-0.1 – 0.1","0.1 – 0.3","0.3 – 0.6","> 0.6"]`
- Q5 “near earnings” = within **3 calendar days** of the nearest earnings date.

---

## Troubleshooting

- **Empty charts**: Mismatched field names or string/number types. In the JS loader, coerce numeric fields and trim strings.
- **Q4 “no valid rows”**: Ensure Greeks exist in the preprocessed CSV (columns like `C_DELTA/P_DELTA` or unified `delta`). Re‑run `PreprocessData.py`.
- **Timeouts**: The Python scripts down‑sample where needed (e.g., Q4). Reduce sample size or filter dates if necessary.

---

## Repro checklist

1. Place raw CSV at `data/nvda_2020_2022.csv`.
2. `python src/PreprocessData.py`.
3. Run `python src/Q1.py` … `python src/Q5.py`.
4. Open the `src/q*.md` pages in Observable; ensure they read from `./data/q*.csv`.
5. Iterate on the binning or color scales as desired.

---
