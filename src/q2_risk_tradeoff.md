# Q2 · Which combinations are more desirable when taking risks into consideration?

We use the pre-aggregated q2.csv (one row per option_type × DTE_bin × log_m_bin)
and plot risk vs return.

```js
import { renderRiskReturnScatter } from "./charts/index.js";

const q2 = await FileAttachment("./data/q2.csv").csv({typed:true});
const clean = q2.filter(d => +d.n>0 && Number.isFinite(+d.std_return) && Number.isFinite(+d.mean_return));
display(renderRiskReturnScatter(clean.filter(d=>d.option_type==="CALL"), { title: "CALL · risk vs return" }));
display(renderRiskReturnScatter(clean.filter(d=>d.option_type==="PUT"),  { title: "PUT · risk vs return"  }));


```
