# Q2 · Which combinations are more desirable when taking risks into consideration?

Risk–return patterns show that short-dated calls have the lowest risk but also the most negative returns. As DTE increases, both risk and return rise, producing a mild upward-sloping risk–return relationship for calls. High-Sharpe regions cluster around long-dated, slightly OTM calls, where risk is moderate and returns turn positive.
For puts, risk increases sharply for longer DTE buckets, and the distribution is more dispersed. Although some long-dated ITM puts show high average returns, their volatility is extremely large, resulting in low or negative Sharpe ratios overall. Thus, calls provide more stable risk-adjusted performance than puts.

```js
import { renderRiskReturnScatter } from "./charts/index.js";

const q2 = await FileAttachment("./data/q2.csv").csv({typed:true});
const clean = q2.filter(d => +d.n>0 && Number.isFinite(+d.std_return) && Number.isFinite(+d.mean_return));
display(renderRiskReturnScatter(clean.filter(d=>d.option_type==="CALL"), { title: "CALL · risk vs return" }));
display(renderRiskReturnScatter(clean.filter(d=>d.option_type==="PUT"),  { title: "PUT · risk vs return"  }));


```
