# Q1 · Which moneyness & DTE combos have higher expected return?

```js
import * as d3 from "npm:d3";
import * as Inputs from "npm:@observablehq/inputs";

const q1 = await FileAttachment("./data/q1.csv").csv({typed: true});
display(Inputs.table(q1.slice(0, 20)));

const dteOrder = ["0-7","8-14","15-30","31-60","61-120","121-365",">365"];
const logOrder = ["≤-0.6","-0.6 – -0.3","-0.3 – -0.1","-0.1 – 0.1","0.1 – 0.3","0.3 – 0.6","> 0.6"];

const calls = q1.filter(d => d.option_type === "CALL" && d.DTE_bin && d.log_m_bin && Number.isFinite(d.return_exp));
const puts  = q1.filter(d => d.option_type === "PUT"  && d.DTE_bin && d.log_m_bin && Number.isFinite(d.return_exp));

function groupStats(rows){
  const roll = d3.rollup(
    rows,
    v => ({ n: v.length, mean: d3.mean(v, d=>d.return_exp) }),
    d => d.DTE_bin, d => d.log_m_bin
  );
  const out = [];
  for (const xb of dteOrder){
    const byY = roll.get(xb);
    for (const yb of logOrder){
      const cell = byY?.get(yb);
      if (cell) out.push({ DTE_bin: xb, log_m_bin: yb, n: cell.n, mean: cell.mean });
    }
  }
  return out;
}

function renderBubble(data, {title}){
  const W = 800, H = 480, m = {top: 40, right: 240, bottom: 60, left: 140};

  const x = d3.scaleBand().domain(dteOrder).range([m.left, W-m.right]).padding(0.4);
  const y = d3.scaleBand().domain(logOrder).range([H-m.bottom, m.top]).padding(0.4);

  const nMax = d3.max(data, d => d.n) ?? 1;
  const r = d3.scaleSqrt().domain([0, nMax]).range([6, 24]);

  const absMax = d3.max(data, d => Math.abs(d.mean)) ?? 1e-6;
  const color = d3.scaleDiverging(d3.interpolatePRGn).domain([-absMax, 0, absMax]);

  //const svg = d3.create("svg").attr("viewBox", [0,0,W,H]).attr("width", W).attr("height", H);
  const svg = d3.create("svg")
    .attr("viewBox", [0,0,W,H])
    .attr("width", W)
    .attr("height", H)
    .style("color", "var(--text-color)");


  svg.append("text")
     .attr("x", m.left).attr("y", 24)
     .attr("font-weight", 700).attr("font-size", 18)
     .text(title);

  svg.append("g")
     .attr("transform", `translate(0,${H-m.bottom})`)
     .call(d3.axisBottom(x).tickSizeOuter(0))
     .selectAll("text").attr("font-size", 12);

  svg.append("g")
     .attr("transform", `translate(${m.left},0)`)
     .call(d3.axisLeft(y).tickSizeOuter(0))
     .selectAll("text").attr("font-size", 12);

  svg.append("text")
     .attr("x", (W-m.right+m.left)/2).attr("y", H-20).attr("text-anchor","middle")
     .attr("font-weight",600).text("DTE bin");

  svg.append("text")
     .attr("transform", `translate(24, ${(H-m.bottom+m.top)/2}) rotate(-90)`)
     .attr("text-anchor","middle").attr("font-weight",600)
     .text("log(moneyness) bin");

  svg.append("g")
     .selectAll("circle")
     .data(data)
     .join("circle")
     .attr("cx", d => x(d.DTE_bin) + x.bandwidth()/2)
     .attr("cy", d => y(d.log_m_bin) + y.bandwidth()/2)
     .attr("r",  d => r(d.n))
     .attr("fill", d => color(d.mean))
     .attr("fill-opacity", 0.9)
     .attr("stroke", "#000")
     .attr("stroke-opacity", 0.2)
     .append("title")
     .text(d => [
       `DTE: ${d.DTE_bin}`,
       `log(m) bin: ${d.log_m_bin}`,
       `count: ${d.n}`,
       `mean return_exp: ${d3.format(".4f")(d.mean)}`
     ].join("\n"));

  // ---------- LEGENDS (pure D3) ----------
  const legendX = W - m.right + 20;

  // Color legend (gradient bar + axis)
  const lg = {x: legendX, y: m.top, w: 20, h: 170};

  const defs = svg.append("defs");
  const gradId = `grad-${Math.random().toString(36).slice(2)}`;
  const grad = defs.append("linearGradient")
    .attr("id", gradId)
    .attr("x1","0").attr("x2","0").attr("y1","1").attr("y2","0");

  const steps = 80;
  for (let i=0;i<=steps;i++){
    const t = i/steps;
    const v = -absMax + t*(2*absMax);
    grad.append("stop")
      .attr("offset", `${t*100}%`)
      .attr("stop-color", color(v));
  }

  svg.append("text")
    .attr("x", lg.x).attr("y", lg.y - 8)
    .attr("font-size", 12).attr("font-weight", 600)
    .text("mean return");

  svg.append("rect")
    .attr("x", lg.x).attr("y", lg.y)
    .attr("width", lg.w).attr("height", lg.h)
    .attr("stroke", "#ddd")
    .attr("fill", `url(#${gradId})`);

  const cScale = d3.scaleLinear().domain([-absMax, absMax]).range([lg.y+lg.h, lg.y]);
  svg.append("g")
    .attr("transform", `translate(${lg.x+lg.w+4},0)`)
    .call(d3.axisRight(cScale).ticks(5).tickFormat(d3.format(".2f")))
    .selectAll("text").attr("font-size", 11);

  // Size legend (three bubbles)
  const sX = legendX, sY = lg.y + lg.h + 36;
  const sizes = [Math.round(nMax*0.2), Math.round(nMax*0.5), nMax];
  const rowGap = 38;
  const cx = r(nMax); // center anchor

  svg.append("text")
    .attr("x", sX).attr("y", sY - 12)
    .attr("font-size", 12).attr("font-weight", 600)
    .text("count");

  svg.append("g")
    .attr("transform", `translate(${sX},${sY})`)
    .selectAll("circle")
    .data(sizes)
    .join("circle")
    .attr("cx", cx)
    //.attr("cy", (d,i)=> i*rowGap)
    .attr("cy", (d,i)=> i*(r(d)+24)+16)
    .attr("r", d=>r(d))
    .attr("fill","none")
    .attr("stroke","#444");

  svg.append("g")
    .attr("transform", `translate(${sX},${sY})`)
    .selectAll("text.size-label")
    .data(sizes)
    .join("text")
    .attr("class","size-label")
    //.attr("x", cx + r(nMax) + 10)
    .attr("x", 30).attr("y", (d,i)=> i*(r(d)+24)+18)
    .attr("y", (d,i)=> i*rowGap + 4)
    .attr("font-size", 12)
    .text(d => d3.format(",")(d));

  svg.selectAll("text").attr("fill", "currentColor");
  
  return svg.node();
}

const callAgg = groupStats(calls);
const putAgg  = groupStats(puts);

display(renderBubble(callAgg, {title: "CALL · log moneyness"}));
display(renderBubble(putAgg,  {title: "PUT · log moneyness (mirrored)"}));


```