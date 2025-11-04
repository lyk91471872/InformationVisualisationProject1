# Q3 · How stable are patterns across time?

```js
const q3 = await FileAttachment("./data/q3.csv").csv({typed: true});
const dteOrder = ["0-7","8-14","15-30","31-60","61-120","121-365",">365"];
const logOrder = ["≤-0.6","-0.6 – -0.3","-0.3 – -0.1","-0.1 – 0.1","0.1 – 0.3","0.3 – 0.6","> 0.6"];
const sizeScale = {range:[100,2500]};
const quarters = Array.from(new Set(q3.map(d => d.quarter))).sort();

```

```js
// ---- FIX EMPTY FACETS ----
q3.forEach(d => { d.n = +d.n; d.mean_return = +d.mean_return; });

const calls = q3.filter(d => d.option_type === "CALL");
const puts = q3.filter(d => d.option_type === "PUT");

console.log("CALLs:", calls.length, "PUTs:", puts.length);

const callFacet = vl.markCircle({opacity:0.9})
.data(calls)
.facet({column:{field:"quarter",sort:quarters,title:null}})
.spec(
  vl.markCircle().encode(
    vl.x({field:"DTE_bin",type:"ordinal",sort:dteOrder}),
    vl.y({field:"log_m_bin",type:"ordinal",sort:logOrder}),
    vl.size({field:"n",type:"quantitative",scale:sizeScale}),
    vl.color({field:"mean_return",type:"quantitative",scale:{scheme:"inferno",domainMid:0}})
  ).width(160).height(160)
)
.title("CALL · mean return across quarters");
display(await callFacet.render());


```

```js
const putFacet = vl.markCircle({opacity:0.9})
.data(puts)
.facet({column:{field:"quarter",sort:quarters,title:null}})
.spec(
  vl.markCircle().encode(
    vl.x({field:"DTE_bin",type:"ordinal",sort:dteOrder}),
    vl.y({field:"log_m_bin",type:"ordinal",sort:logOrder}),
    vl.size({field:"n",type:"quantitative",scale:sizeScale}),
    vl.color({field:"mean_return",type:"quantitative",scale:{scheme:"inferno",domainMid:0}})
  ).width(160).height(160)
)
.title("PUT · mean return across quarters");
display(await putFacet.render());


```
