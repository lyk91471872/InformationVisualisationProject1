# Q5 · How do things change around earnings dates?

There is no significant difference between near earnings (true) and not (false), which makes sense because the significant change in stock price and thus high profit/loss is canceled by the expensive premium (the denominator of return), which goes up as the volatility rises.

```js
import { DTE_ORDER, LOG_ORDER, renderFacetedBubbles } from "./charts/index.js";

const q5 = await FileAttachment("./data/q5.csv").csv({typed:true});
const nearOrder = Array.from(new Set(q5.map(d=>String(d.near_earn||"").trim()))).sort();

display(renderFacetedBubbles(q5.filter(d=>d.option_type==="CALL"), {
  title: "CALL · Mean Return vs Earnings Dates",
  facetField: "near_earn", facetOrder: nearOrder,
  dteOrder: DTE_ORDER, logOrder: LOG_ORDER
}));
display(renderFacetedBubbles(q5.filter(d=>d.option_type==="PUT"), {
  title: "PUT · Mean Return vs Earnings Dates",
  facetField: "near_earn", facetOrder: nearOrder,
  dteOrder: DTE_ORDER, logOrder: LOG_ORDER
}));


```
