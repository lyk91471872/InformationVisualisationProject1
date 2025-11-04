# Q4 · How are Greeks related to returns?

```js
const q4 = await FileAttachment("./data/q4.csv").csv({typed: true});
console.log("Loaded", q4.length, "rows");

q4.forEach(d => {
  d.delta = +d.delta;
  d.gamma = +d.gamma;
  d.theta = +d.theta;
  d.vega  = +d.vega;
  d.iv    = +d.iv;
  d.return_exp = +d.return_exp;
});
```

```js
const calls = q4.filter(d => d.option_type === "CALL");
const puts  = q4.filter(d => d.option_type === "PUT");
```

```js
const callScatter = vl.markCircle({opacity:0.5})
  .data(calls)
  .encode(
    vl.x({field:"delta", type:"quantitative", title:"Δ"}),
    vl.y({field:"return_exp", type:"quantitative", title:"Return to Expiration"}),
    vl.size({field:"gamma", type:"quantitative", title:"|Γ|", scale:{range:[10,150]}}),
    vl.color({field:"iv", type:"quantitative", title:"Implied Volatility", scale:{scheme:"inferno"}})
  )
  .width(500)
  .height(400)
  .title("CALL · Return vs Δ (size ~ |Γ|, color ~ IV)");
display(await callScatter.render());
```

```js
const putScatter = vl.markCircle({opacity:0.5})
  .data(puts)
  .encode(
    vl.x({field:"vega", type:"quantitative", title:"ν"}),
    vl.y({field:"return_exp", type:"quantitative", title:"Return to Expiration"}),
    vl.size({field:"theta", type:"quantitative", title:"|θ|", scale:{range:[10,150]}}),
    vl.color({field:"iv", type:"quantitative", title:"Implied Volatility", scale:{scheme:"inferno"}})
  )
  .width(500)
  .height(400)
  .title("PUT · Return vs ν (size ~ |θ|, color ~ IV)");
display(await putScatter.render());
```