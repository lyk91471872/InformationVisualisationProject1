# Q3 · How stable are patterns across time?

The pattern is stable for majority of the period, but have extreme outliers. Basically, you make money by buying calls near the lowest time before the market rises (2020 Q1, Q2) and buying put before the highest time when the market turn down (2021 Q2). But most of the times, the premium is priced just right so that the buy-side lose money overall.

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