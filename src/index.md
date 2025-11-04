# NVDA Options Data Explorer (Vega-Lite API v5)

```js

import * as d3 from "npm:d3";
import * as Inputs from "npm:@observablehq/inputs";
/*
const raw  = await FileAttachment("./data/nvda_2020_2022.csv").csv({ typed: true });
const rows = computeNextDayReturns(prepareRows(raw));

display(Inputs.table(rows.slice(0, 10)));

const numericCols = ["mid","delta","gamma","theta","vega","iv","volume","open_interest"].filter(c => rows.some(d => Number.isFinite(d[c])));

for (const col of numericCols){
  const values = rows.filter(d => Number.isFinite(d[col]));
  const view = vl.markBar()
    .data(values)
    .width(680).height(240)
    .encode(
      vl.x().fieldQ(col).bin({maxbins: 40}).title(col),
      vl.y().count().title("Count")
    );
  display(await view.render());
}
*/
```

---

## Pages

- [Q1 · Moneyness × DTE → Expected Return](./q1_moneyness_dte)
- [Q2 · Risk/Return Trade-off](./q2_risk_tradeoff)
- [Q3 · Stability Over Time](./q3_stability_over_time)
- [Q4 · Greeks vs Returns](./q4_greeks_vs_returns)
- [Q5 · Earnings Effects](./q5_earnings_effects)
