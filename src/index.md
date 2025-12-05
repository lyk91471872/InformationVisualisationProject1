# NVDA Options Data Explorer (D3)

```js

import * as d3 from "npm:d3";
import * as Inputs from "npm:@observablehq/inputs";

/*
const options = await FileAttachment("./data/nvda_2020_2022.csv").csv({typed: true});

display(Inputs.table(options.slice(0, 10)));

const options_p = await FileAttachment("./data/nvda_2020_2022_preprocessed.csv").csv({typed: true});

display(Inputs.table(options_p.slice(0, 10)));
*/

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

## Dataset
https://www.kaggle.com/datasets/kylegraupe/nvda-daily-option-chains-q1-2020-to-q4-2022

This dataset is a combination of three years of NVIDIA ($NVDA) option chain end of day quotes ranging from 01-2020 to 12-2022. Each row represents the information associated with one contract's strike price and a given expiration date.

---

## Options
Options are contracts betting on a specific stock. The price point we bet on is called **strike price**, and the cost of the option contract itself is called **premium**.
* **calls** grant the right to **buy** 100 shares of the underlying stock at the strike price before expiration
* **puts** grant the right to **sell** 100 shares of the underlying stock at the strike price before expiration


---

## Strike Map
This tool is helpful for most of the questions. The plots for the individual questions only care about the moneyness because it's a more abstract concept and thus can be better generalized to any underlying asset at any time, but we do need this tool to intuitively map moneyness to strike price at specific underlying stock prices, so that our observation can make sense in real world market.

The grid is for quick reference and the tooltip shows the exact values.

```js
import { strikeMap } from "./charts/index.js";

display(
  strikeMap({
    width: 960,
    height: 260,
    sMin: 100,
    sMax: 300,
    sBins: 20,
    heatResolution: 80
  })
);
```

---

## Pages

- [Q1 · Moneyness × DTE → Expected Return](./q1_moneyness_dte)
- [Q2 · Risk/Return Trade-off](./q2_risk_tradeoff)
- [Q3 · Stability Over Time](./q3_stability_over_time)
- [Q4 · Greeks vs Returns](./q4_greeks_vs_returns)
- [Q5 · Earnings Effects](./q5_earnings_effects)
