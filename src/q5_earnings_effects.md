# Q5 · How do things change around earnings dates?
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
