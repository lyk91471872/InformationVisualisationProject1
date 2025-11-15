# Q3 · How stable are patterns across time?

```js
import { DTE_ORDER, LOG_ORDER, quarterOrderFrom, renderFacetedBubbles } from "./charts/index.js";

const q3 = await FileAttachment("./data/q3.csv").csv({typed:true});
const quarters = quarterOrderFrom(q3);
display(renderFacetedBubbles(q3.filter(d=>d.option_type==="CALL"), {
  title: "CALL · mean return across quarters",
  facetField: "quarter", facetOrder: quarters,
  dteOrder: DTE_ORDER, logOrder: LOG_ORDER
}));
display(renderFacetedBubbles(q3.filter(d=>d.option_type==="PUT"), {
  title: "PUT · mean return across quarters",
  facetField: "quarter", facetOrder: quarters,
  dteOrder: DTE_ORDER, logOrder: LOG_ORDER
}));


```