# NVDA Options Data Explorer (Vega-Lite API v5)

```js

import * as d3 from "npm:d3";
import * as Inputs from "npm:@observablehq/inputs";

const options = await FileAttachment("./data/nvda_2020_2022.csv").csv({typed: true});

display(Inputs.table(options.slice(0, 10)));

/*
const numericCols = Object.keys(options[0]).filter(
  c => typeof options[0][c] === "number" && !Number.isNaN(options[0][c])
);
display(numericCols);

for (const col of numericCols) {
  const values = options.map(d => d[col]);
  const isUnix = d3.median(values) > 1e9 && d3.median(values) < 2e10;

  const xCfg = {
    label: col,
    tickFormat: isUnix
      ? d => d3.utcFormat("%Y-%m")(new Date(d * 1000))
      : undefined,
    ticks: isUnix ? 10 : undefined
  };

  const plot = Plot.plot({
    title: `Histogram of [${col}]`,
    marginLeft: 50,
    x: xCfg,
    y: { label: "Count" },
    marks: [Plot.rectY(options, Plot.binX({ y: "count" }, { x: col }))]
  });
  display(plot);
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
