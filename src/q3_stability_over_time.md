# Q3 · How stable are patterns across time?

```js
const q3 = (await FileAttachment("./data/q3.csv").csv({typed: true}))
  .map(d => {
    const obj = {};
    for (const k in d) obj[k.trim()] = d[k];
    obj.n = +d.n;
    obj.mean_return = +d.mean_return;
    obj.option_type = (d.option_type || "").trim();
    return obj;
  });

const dteOrder = ["0-7","8-14","15-30","31-60","61-120","121-365",">365"];
const logOrder = ["≤-0.6","-0.6 – -0.3","-0.3 – -0.1","-0.1 – 0.1","0.1 – 0.3","0.3 – 0.6","> 0.6"];
const sizeScale = {range:[100,700]};
const quarters = Array.from(new Set(q3.map(d => d.quarter))).sort();

const calls = q3.filter(d => d.option_type === "CALL");
const puts = q3.filter(d => d.option_type === "PUT");
```

```js
const callFacet = vl
  .vconcat(
    vl.markCircle({opacity: 0.9})
      .data(calls)
      .encode(
        vl.column({field: "quarter", type: "nominal", sort: quarters, title: null}),
        vl.x({field: "DTE_bin", type: "ordinal", sort: dteOrder, title: "DTE bin"}),
        vl.y({field: "log_m_bin", type: "ordinal", sort: logOrder, title: "log moneyness bin"}),
        vl.size({field: "n", type: "quantitative", scale: sizeScale}),
        vl.color({
          field: "mean_return",
          type: "quantitative",
          scale: {scheme: "inferno", domainMid: 0},
          legend: {title: "mean return"}
        })
      )
      .width(160)
      .height(160)
  )
  .title("CALL · mean return across quarters");

display(await callFacet.render());
```

```js
const putFacet = vl
  .vconcat(
    vl.markCircle({opacity: 0.9})
      .data(puts)
      .encode(
        vl.column({field: "quarter", type: "nominal", sort: quarters, title: null}),
        vl.x({field: "DTE_bin", type: "ordinal", sort: dteOrder, title: "DTE bin"}),
        vl.y({field: "log_m_bin", type: "ordinal", sort: logOrder, title: "log moneyness bin"}),
        vl.size({field: "n", type: "quantitative", scale: sizeScale}),
        vl.color({
          field: "mean_return",
          type: "quantitative",
          scale: {scheme: "inferno", domainMid: 0},
          legend: {title: "mean return"}
        })
      )
      .width(160)
      .height(160)
  )
  .title("PUT · mean return across quarters");

display(await putFacet.render());
```