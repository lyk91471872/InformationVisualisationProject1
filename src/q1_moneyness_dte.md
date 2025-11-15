# Q1 · Which moneyness & DTE combos have higher expected return?

```js
import * as d3 from "npm:d3";
import { DTE_ORDER, LOG_ORDER, groupStats, renderBubbleChart } from "./charts/index.js";

const q1 = await FileAttachment("./data/q1.csv").csv({typed:true});
const calls = q1.filter(d => d.option_type === "CALL" && d.DTE_bin && d.log_m_bin && Number.isFinite(+d.return_exp));
const puts  = q1.filter(d => d.option_type === "PUT"  && d.DTE_bin && d.log_m_bin && Number.isFinite(+d.return_exp));

const callAgg = groupStats(calls, { dteOrder: DTE_ORDER, logOrder: LOG_ORDER, valueField: "return_exp" });
const putAgg  = groupStats(puts,  { dteOrder: DTE_ORDER, logOrder: LOG_ORDER, valueField: "return_exp" });

display(renderBubbleChart(callAgg, { title: "CALL · log moneyness", dteOrder: DTE_ORDER, logOrder: LOG_ORDER }));
display(renderBubbleChart(putAgg,  { title: "PUT · log moneyness (mirrored)", dteOrder: DTE_ORDER, logOrder: LOG_ORDER }));


```