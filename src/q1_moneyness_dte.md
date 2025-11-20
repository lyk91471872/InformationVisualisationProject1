# Q1 · Which moneyness & DTE combos have higher expected return?

Calls mostly have mild positive returns, but only long-term far out of the money (fotm) calls, the most aggressive long-term strategy makes the most percent, as their premium are extremely cheap. Short-term fotm calls loses the most, as their premiums are quite high, yet they are betting on unlikely odds.

Long term puts returns are quite high because the market sentiment is generally quite bullish, so puts, especially fotm, are very cheap, leading to higher return percentages during the 2022 market crash.

```js
import * as d3 from "npm:d3";
import { DTE_ORDER, LOG_ORDER, groupStats, renderBubbleChart } from "./charts/index.js";

const q1 = await FileAttachment("./data/q1.csv").csv({typed:true});
const calls = q1.filter(d => d.option_type === "CALL" && d.DTE_bin && d.log_m_bin && Number.isFinite(+d.return_exp));
const puts  = q1.filter(d => d.option_type === "PUT"  && d.DTE_bin && d.log_m_bin && Number.isFinite(+d.return_exp));

const callAgg = groupStats(calls, { dteOrder: DTE_ORDER, logOrder: LOG_ORDER, valueField: "return_exp" });
const putAgg  = groupStats(puts,  { dteOrder: DTE_ORDER, logOrder: LOG_ORDER, valueField: "return_exp" });

display(renderBubbleChart(callAgg, { title: "CALL · log moneyness", dteOrder: DTE_ORDER, logOrder: LOG_ORDER }));
display(renderBubbleChart(putAgg,  { title: "PUT · log moneyness", dteOrder: DTE_ORDER, logOrder: LOG_ORDER }));


```