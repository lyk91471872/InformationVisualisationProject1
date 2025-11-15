# Q4 · How are Greeks related to returns?

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
