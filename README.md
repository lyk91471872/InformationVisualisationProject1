# NVDA Options Data Explorer (Q1–Q5)

This repo explores NVIDIA (NVDA) option chains (2020–2022) and answers five domain questions with **Python preprocessing** + **D3 (Observable)** visuals.

---

## Repository layout

```
src/
  charts/
    bubble.js
    facet.js
    greek.js
    index.js
    legends.js
    orders.js
    risk.js
    theme.js
    utils.js

  data/

  scripts/
    preprocess_data.py                  # master preprocessing (keeps ALL raw columns; adds bins/greeks/derived)
    q1.py                              # make data/q1.csv
    q2.py                              # make data/q2.csv
    q3.py                              # make data/q3.csv
    q4.py                              # make data/q4.csv
    q5.py                              # make data/q5.csv

  index.md
  q1_moneyness_dte.md                # Observable page
  q2_risk_tradeoff.md                # Observable page
  q3_stability_over_time.md          # Observable page
  q4_greeks_vs_returns.md            # Observable page
  q5_earnings_effects.md             # Observable page

  styles.css
```
