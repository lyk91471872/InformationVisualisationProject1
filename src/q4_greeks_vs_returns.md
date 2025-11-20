# Q4 · How are Greeks related to returns?

Across both calls and puts, option returns exhibit only weak relationships with the Greeks.
For calls, higher deltas are generally associated with lower expected expiration returns, reflecting that deep-in-the-money calls behave more like stock and therefore show smaller payoff asymmetry. Most large-return points cluster near very low delta values, where cheap far-OTM options can generate outsized payoffs when large price moves occur. Implied volatility is strongly linked to dispersion: higher-IV regions show wider spreads of returns but no consistent improvement in average outcomes.
For puts, the pattern is similar when viewed against vega: high-vega contracts (typically long-dated or ATM) show wide variability but do not systematically yield higher returns. Extreme positive returns again occur mainly in low-delta, low-vega zones where option prices are smallest. Overall, Greeks primarily shape risk and variability, but they do not reliably predict higher mean returns.

```js
import { renderGreeksScatter } from "./charts/index.js";

const q4 = await FileAttachment("./data/q4.csv").csv({typed: true});

// Split by option type
const calls = q4.filter(d => d.option_type === "CALL");
const puts  = q4.filter(d => d.option_type === "PUT");

// CALL: x = delta, size ~ |gamma|, color ~ iv
display(renderGreeksScatter(calls, {
  title: "CALL · Return vs Δ (size ~ |Γ|, color ~ IV)",
  xField: "delta",
  sizeField: "gamma",
  colorField: "iv",
  xLabel: "Δ",
  sizeLabel: "|Γ|",
  colorLabel: "Implied Volatility"
}));

// PUT:  x = vega, size ~ |theta|, color ~ iv
display(renderGreeksScatter(puts, {
  title: "PUT · Return vs ν (size ~ |θ|, color ~ IV)",
  xField: "vega",
  sizeField: "theta",
  colorField: "iv",
  xLabel: "ν (vega)",
  sizeLabel: "|θ|",
  colorLabel: "Implied Volatility"
}));


```
