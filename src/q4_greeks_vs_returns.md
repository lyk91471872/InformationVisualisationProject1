# Q4 · How are Greeks related to returns?

```js
import * as d3 from "npm:d3";
import { scatterPlot } from "./charts/scatter.js";
```

```js
const q4 = await FileAttachment("./data/q4.csv").csv({typed: true});
console.log("Loaded", q4.length, "rows");

q4.forEach(d => {
  d.delta = +d.delta;
  d.gamma = +d.gamma;
  d.theta = +d.theta;
  d.vega  = +d.vega;
  d.iv    = +d.iv;
  d.return_exp = +d.return_exp;
});

const calls = q4.filter(d => d.option_type === "CALL");
const puts  = q4.filter(d => d.option_type === "PUT");
```

```js
display(
  scatterPlot({
    data: calls,
    xField: "delta",
    xLabel: "Δ",
    yField: "return_exp",
    yLabel: "Return to Expiration",
    sizeField: "gamma",
    sizeLabel: "|Γ|",
    colorField: "iv",
    colorLabel: "Implied Volatility",
    title: "CALL · Return vs Δ"
  })
);

display(
  scatterPlot({
    data: puts,
    xField: "vega",
    xLabel: "ν",
    yField: "return_exp",
    yLabel: "Return to Expiration",
    sizeField: "theta",
    sizeLabel: "|θ|",
    colorField: "iv",
    colorLabel: "Implied Volatility",
    title: "PUT · Return vs ν (size ~ |θ|, color ~ IV)"
  })
);
```
