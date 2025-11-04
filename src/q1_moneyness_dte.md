# Q1 · Which moneyness & DTE combos have higher expected return?
# · Moneyness × DTE → hold-till-expiration return

```js
import * as Inputs from "npm:@observablehq/inputs";

// 读预处理后的 CSV
const raw = await FileAttachment("./data/nvda_2020_2022_preprocessed.csv").csv({typed: true});

// 看一眼
display(Inputs.table(raw.slice(0, 20)));

// 轴顺序
const dteOrder = ["0-7","8-14","15-30","31-60","61-120","121-365",">365"];
const monOrder = ["<0.7","0.7-0.85","0.85-0.95","0.95-1.05","1.05-1.15","1.15-1.3",">1.3"];

// 分成两套数据（这里用数组 filter，简单粗暴）
const calls = raw.filter(d => d.option_type === "CALL");
const puts  = raw.filter(d => d.option_type === "PUT");

```

```js
// CALL 图
const callBubble = vl
  .markCircle({opacity: 0.9})
  .data(calls)
  .width(720)
  .height(460)
  .title("CALL only")
  .encode(
    vl.x({field: "DTE_bin", type: "ordinal", sort: dteOrder, title: "DTE bin"}),
    vl.y({field: "moneyness_bin", type: "ordinal", sort: monOrder, title: "Moneyness bin (stock/strike)"}),
    vl.size({aggregate: "count", title: "count"}),
    vl.color({
      aggregate: "mean",
      field: "return_exp",
      type: "quantitative",
      // 0 居中，看得出谁亏谁赚
      scale: {scheme: "inferno", domainMid: 0},
      title: "mean return @ expiration"
    }),
    vl.tooltip([
      {aggregate: "count", title: "count"},
      {aggregate: "mean", field: "return_exp", format: ".4f", title: "mean return_exp"},
      {field: "DTE_bin", title: "DTE_bin"},
      {field: "moneyness_bin", title: "moneyness_bin"}
    ])
  );

display(await callBubble.render());

```

```js
// PUT 图
const putBubble = vl
  .markCircle({opacity: 0.9})
  .data(puts)
  .width(720)
  .height(460)
  .title("PUT only")
  .encode(
    vl.x({field: "DTE_bin", type: "ordinal", sort: dteOrder, title: "DTE bin"}),
    vl.y({field: "moneyness_bin", type: "ordinal", sort: monOrder, title: "Moneyness bin (stock/strike)"}),
    vl.size({aggregate: "count", title: "count"}),
    vl.color({
      aggregate: "mean",
      field: "return_exp",
      type: "quantitative",
      scale: {scheme: "inferno", domainMid: 0},
      title: "mean return @ expiration"
    }),
    vl.tooltip([
      {aggregate: "count", title: "count"},
      {aggregate: "mean", field: "return_exp", format: ".4f", title: "mean return_exp"},
      {field: "DTE_bin", title: "DTE_bin"},
      {field: "moneyness_bin", title: "moneyness_bin"}
    ])
  );

display(await putBubble.render());
```