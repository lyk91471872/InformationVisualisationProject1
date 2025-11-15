# Q2 · Which combinations are more desirable when taking risks into consideration?

We use the pre-aggregated q2.csv (one row per option_type × DTE_bin × log_m_bin)
and plot risk vs return.

```js
import * as d3 from "npm:d3";

const q2 = await FileAttachment("./data/q2.csv").csv({ typed: true });

const rows = q2.filter(d => {
  const n  = +d.n;
  const mu = +d.mean_return;
  const sd = +d.std_return;
  return Number.isFinite(n) && n > 0 && Number.isFinite(mu) && Number.isFinite(sd) && sd > 0;
});

const calls = rows.filter(d => d.option_type === "CALL");
const puts  = rows.filter(d => d.option_type === "PUT");

function renderRisk(data, {title}) {
  const W = 860, H = 520, m = {top: 50, right: 260, bottom: 60, left: 80};

  const xMax = d3.max(data, d => +d.std_return) ?? 1;
  const yMin = d3.min(data, d => +d.mean_return) ?? 0;
  const yMax = d3.max(data, d => +d.mean_return) ?? 1;
  const nMax = d3.max(data, d => +d.n) ?? 1;
  let cMin = d3.min(data, d => +d.sharpe);
  let cMax = d3.max(data, d => +d.sharpe);
  if (!(Number.isFinite(cMin) && Number.isFinite(cMax))) { cMin = 0; cMax = 1; }
  if (cMin === cMax) { cMin -= 0.001; cMax += 0.001; }

  const x = d3.scaleLinear().domain([0, xMax * 1.05]).nice().range([m.left, W - m.right]);
  const y = d3.scaleLinear().domain([yMin - Math.abs(yMax - yMin) * 0.05, yMax + Math.abs(yMax - yMin) * 0.05]).nice().range([H - m.bottom, m.top]);
  const r = d3.scaleSqrt().domain([0, nMax]).range([3, 15]);
  const color = d3.scaleSequential(d3.interpolateInferno).domain([cMin, cMax]);

  const svg = d3.create("svg").attr("viewBox", [0, 0, W, H]).attr("width", W).attr("height", H);

  svg.append("text")
    .attr("x", m.left).attr("y", 24)
    .attr("font-weight", 700).attr("font-size", 18)
    .text(title);

  svg.append("g")
    .attr("transform", `translate(0,${H - m.bottom})`)
    .call(d3.axisBottom(x))
    .call(g => g.append("text")
      .attr("x", (W - m.right + m.left) / 2)
      .attr("y", 40)
      .attr("fill", "currentColor")
      .attr("text-anchor", "middle")
      .attr("font-weight", 600)
      .text("risk (std of return_exp)"));

  svg.append("g")
    .attr("transform", `translate(${m.left},0)`)
    .call(d3.axisLeft(y))
    .call(g => g.append("text")
      .attr("transform", `rotate(-90)`)
      .attr("x", -(H - m.bottom + m.top) / 2)
      .attr("y", -48)
      .attr("fill", "currentColor")
      .attr("text-anchor", "middle")
      .attr("font-weight", 600)
      .text("expected return (mean of return_exp)"));

  svg.append("g")
    .attr("fill-opacity", 0.9)
    .attr("stroke", "#000")
    .attr("stroke-opacity", 0.15)
    .selectAll("circle")
    .data(data)
    .join("circle")
      .attr("cx", d => x(+d.std_return))
      .attr("cy", d => y(+d.mean_return))
      .attr("r",  d => r(+d.n))
      .attr("fill", d => color(+d.sharpe))
    .append("title")
      .text(d => [
        `DTE: ${d.DTE_bin}`,
        `log(m) bin: ${d.log_m_bin}`,
        `n: ${d3.format(",")(d.n)}`,
        `μ (mean): ${d3.format(".4f")(d.mean_return)}`,
        `σ (std): ${d3.format(".4f")(d.std_return)}`,
        `Sharpe: ${Number.isFinite(+d.sharpe) ? d3.format(".3f")(+d.sharpe) : "NA"}`
      ].join("\n"));

  // ----- legends (pure D3) -----

  // Color legend (gradient bar + axis)
  const lg = { x: W - m.right + 30, y: m.top, w: 18, h: 200 };

  const defs = svg.append("defs");
  const gradId = `grad-${Math.random().toString(36).slice(2)}`;
  const grad = defs.append("linearGradient")
    .attr("id", gradId)
    .attr("x1", "0").attr("x2", "0")
    .attr("y1", "1").attr("y2", "0");

  const steps = 80;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const v = cMin + t * (cMax - cMin);
    grad.append("stop")
      .attr("offset", `${t * 100}%`)
      .attr("stop-color", color(v));
  }

  svg.append("text")
    .attr("x", lg.x)
    .attr("y", lg.y - 10)
    .attr("font-size", 12)
    .attr("font-weight", 600)
    .text("sharpe (mean/std)");

  svg.append("rect")
    .attr("x", lg.x)
    .attr("y", lg.y)
    .attr("width", lg.w)
    .attr("height", lg.h)
    .attr("stroke", "#ddd")
    .attr("fill", `url(#${gradId})`);

  const cScale = d3.scaleLinear().domain([cMin, cMax]).range([lg.y + lg.h, lg.y]);
  svg.append("g")
    .attr("transform", `translate(${lg.x + lg.w + 4},0)`)
    .call(d3.axisRight(cScale).ticks(6).tickFormat(d3.format(".2f")))
    .selectAll("text").attr("font-size", 11);

  // Size legend (three bubbles)
  const sX = lg.x, sY = lg.y + lg.h + 50;
  const sizeVals = [Math.round(nMax * 0.2), Math.round(nMax * 0.5), nMax];
  const cx = r(nMax), rowGap = 42;

  svg.append("text")
    .attr("x", sX)
    .attr("y", sY - 14)
    .attr("font-size", 12)
    .attr("font-weight", 600)
    .text("n");

  const rows = svg.append("g")
    .attr("transform", `translate(${sX}, ${sY})`)
    .selectAll("g.row")
    .data(sizeVals)
    .join("g")
      .attr("class", "row")
      .attr("transform", (d, i) => `translate(0, ${i * rowGap})`);

  rows.append("circle")
    .attr("cx", cx)
    .attr("cy", 0)
    .attr("r", d => r(d))
    .attr("fill", "none")
    .attr("stroke", "#444");

  rows.append("text")
    .attr("x", cx + r(nMax) + 10)
    .attr("y", 4)
    .attr("font-size", 12)
    .text(d => d3.format(",")(d));

  return svg.node();
}

display(renderRisk(calls, { title: "CALL · risk vs return" }));
display(renderRisk(puts,  { title: "PUT · risk vs return" }));

```
