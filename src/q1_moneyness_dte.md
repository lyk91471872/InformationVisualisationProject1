# Q1 · Which moneyness & DTE combos have higher expected return?
# · Moneyness × DTE → hold-till-expiration return

```js
import * as Inputs from "npm:@observablehq/inputs";

const q1 = await FileAttachment("./data/q1.csv").csv({ typed: true });

display(Inputs.table(q1.slice(0, 20)));

const dteOrder = ["0-7","8-14","15-30","31-60","61-120","121-365",">365"];
const logOrder = ["≤-0.6","-0.6 – -0.3","-0.3 – -0.1","-0.1 – 0.1","0.1 – 0.3","0.3 – 0.6","> 0.6"];

const calls = q1.filter(d => d.option_type === "CALL" && d.DTE_bin && d.log_m_bin && Number.isFinite(d.return_exp));
const puts  = q1.filter(d => d.option_type === "PUT"  && d.DTE_bin && d.log_m_bin && Number.isFinite(d.return_exp));

const sizeScale = { range: [200, 3000] };


```

```js
// CALL
const callBubble = vl
  .markCircle({ opacity: 0.9 })
  .data(calls)
  .width(720).height(460)
  .title("CALL · log moneyness")
  .encode(
    vl.x({ field: "DTE_bin", type: "ordinal", sort: dteOrder, title: "DTE bin" }),
    vl.y({ field: "log_m_bin", type: "ordinal", sort: logOrder, title: "log(moneyness) bin" }),
    vl.size({ aggregate: "count", scale: sizeScale, title: "count" }),
    vl.color({
      aggregate: "mean", field: "return_exp", type: "quantitative",
      scale: { scheme: "inferno", domainMid: 0 }, title: "mean return @ expiration"
    }),
    vl.tooltip([
      { aggregate: "count", title: "count" },
      { aggregate: "mean", field: "return_exp", format: ".4f", title: "mean return_exp" },
      { field: "DTE_bin" }, { field: "log_m_bin" }
    ])
  );

display(await callBubble.render());


```

```js
// PUT 
const putBubble = vl
  .markCircle({ opacity: 0.9 })
  .data(puts)
  .width(720).height(460)
  .title("PUT · log moneyness (mirrored)")
  .encode(
    vl.x({ field: "DTE_bin", type: "ordinal", sort: dteOrder, title: "DTE bin" }),
    vl.y({ field: "log_m_bin", type: "ordinal", sort: logOrder, title: "-log(moneyness) bin" }),
    vl.size({ aggregate: "count", scale: sizeScale, title: "count" }),
    vl.color({
      aggregate: "mean", field: "return_exp", type: "quantitative",
      scale: { scheme: "inferno", domainMid: 0 }, title: "mean return @ expiration"
    }),
    vl.tooltip([
      { aggregate: "count", title: "count" },
      { aggregate: "mean", field: "return_exp", format: ".4f", title: "mean return_exp" },
      { field: "DTE_bin" }, { field: "log_m_bin" }
    ])
  );

display(await putBubble.render());


```