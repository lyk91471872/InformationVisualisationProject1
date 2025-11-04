# NVDA Options Data Explorer (Observable Framework)

A clean, multi-page Observable Framework project that answers domain questions with analysis tables and sketch visualizations.

## Structure

```
nvda-explorer/
  package.json
  observablehq.config.js
  src/
    index.md
    styles.css
    lib/
      utils.js
      transforms.js
    data/
      nvda_2020_2022.csv            # your dataset (copied here)
    q1_moneyness_dte.md
    q2_risk_tradeoff.md
    q3_stability_over_time.md
    q4_greeks_vs_returns.md
    q5_earnings_effects.md
```

## Run

1. Install Node.js 18+.
2. `npm install -g @observablehq/framework` (or use the local dependency via `npx`).
3. In this folder: `npm install`
4. Start the dev server: `npm run dev`
5. Open the local URL shown in the terminal.

## Notes

- Returns are **next-day change in mid price** within each contract key. Mid is computed from `(bid+ask)/2` if `mid` is missing.
- Moneyness = `strike / underlying_last` (fallbacks: `underlying_price`, `underlying_close`). DTE = days from `quote_date` to `expiration`.
- Binning: Moneyness and DTE are bucketed for heatmaps and bubble plots.
- For earnings analysis, provide a CSV at `src/data/earnings_nvda_2020_2022.csv` with a single header `date` and rows like:
  ```
  date
  2020-02-13
  2020-05-21
  ```
  If absent, the page gracefully skips proximity tagging.
