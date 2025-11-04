# Q2 · Which combinations are more desirable when taking risks into consideration?

We use the pre-aggregated q2.csv (one row per option_type × DTE_bin × log_m_bin)
and plot risk vs return.

```js

// load the pre-aggregated csv from python (q2_make_csv.py)
const q2 = await FileAttachment("./data/q2.csv").csv({ typed: true });

// keep only usable rows
const q2filtered = q2.filter(d => {
  const n  = +d.n;
  const mu = +d.mean_return;
  const sd = +d.std_return;
  return Number.isFinite(n) && n > 0 &&
         Number.isFinite(mu) &&
         Number.isFinite(sd) && sd > 0;
});

// split
const calls = q2filtered.filter(d => d.option_type === "CALL");
const puts  = q2filtered.filter(d => d.option_type === "PUT");

// bubble size
const sizeScale = { range: [200, 3500] };


```

```js
// CALL
const callRisk = vl
  .markCircle({ opacity: 0.9 })
  .data(calls)
  .width(720)
  .height(460)
  .title("CALL · risk vs return")
  .encode(
    vl.x({
      field: "std_return",
      type: "quantitative",
      title: "risk (std of return_exp)"
    }),
    vl.y({
      field: "mean_return",
      type: "quantitative",
      title: "expected return (mean of return_exp)"
    }),
    vl.size({
      field: "n",
      type: "quantitative",
      scale: sizeScale,
      title: "n"
    }),
    vl.color({
      field: "sharpe",
      type: "quantitative",
      scale: { scheme: "inferno" },
      title: "sharpe (mean/std)"
    })
  );

display(await callRisk.render());


```

```js
// PUT chart
const putRisk = vl
  .markCircle({ opacity: 0.9 })
  .data(puts)
  .width(720)
  .height(460)
  .title("PUT · risk vs return")
  .encode(
    vl.x({
      field: "std_return",
      type: "quantitative",
      title: "risk (std of return_exp)"
    }),
    vl.y({
      field: "mean_return",
      type: "quantitative",
      title: "expected return (mean of return_exp)"
    }),
    vl.size({
      field: "n",
      type: "quantitative",
      scale: sizeScale,
      title: "n"
    }),
    vl.color({
      field: "sharpe",
      type: "quantitative",
      scale: { scheme: "inferno" },
      title: "sharpe (mean/std)"
    })
  );

display(await putRisk.render());


```
