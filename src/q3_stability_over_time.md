# Q3 · How stable are patterns across time?


```js
const q3 = await FileAttachment("./data/q3.csv").csv({typed: true});
const calls = q3.filter(d => d.option_type === "CALL");
const puts = q3.filter(d => d.option_type === "PUT");
const sizeScale = { range: [100, 2500] };
const quarterOrder = Array.from(new Set(q3.map(d => d.quarter))).sort();
const dteOrder = ["0-7","8-14","15-30","31-60","61-120","121-365",">365"];
const logOrder = ["≤-0.6","-0.6 – -0.3","-0.3 – -0.1","-0.1 – 0.1","0.1 – 0.3","0.3 – 0.6","> 0.6"];
```

```js
const callFacet = vl.markCircle({opacity: 0.9}).data(calls)
.facet({column: {field: "quarter", sort: quarterOrder, title: null}})
.spec(vl.markCircle().encode(
  vl.x({field: "DTE_bin", type: "ordinal", sort: dteOrder}),
  vl.y({field: "log_m_bin", type: "ordinal", sort: logOrder}),
  vl.size({field: "n", type: "quantitative", scale: sizeScale}),
  vl.color({field: "mean_return", type: "quantitative", scale: {scheme: "inferno", domainMid: 0}})
).width(180).height(180)).title("CALL · stability across quarters");
display(await callFacet.render());

```

```js
const putFacet = vl.markCircle({opacity: 0.9}).data(puts)
.facet({column: {field: "quarter", sort: quarterOrder, title: null}})
.spec(vl.markCircle().encode(
  vl.x({field: "DTE_bin", type: "ordinal", sort: dteOrder}),
  vl.y({field: "log_m_bin", type: "ordinal", sort: logOrder}),
  vl.size({field: "n", type: "quantitative", scale: sizeScale}),
  vl.color({field: "mean_return", type: "quantitative", scale: {scheme: "inferno", domainMid: 0}})
).width(180).height(180)).title("PUT · stability across quarters");
display(await putFacet.render());
```
