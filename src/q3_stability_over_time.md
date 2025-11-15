# Q3 · How stable are patterns across time?

```js
import * as d3 from "npm:d3";

const q3 = (await FileAttachment("./data/q3.csv").csv({typed: true}))
  .map(d => ({
    option_type: String(d.option_type || "").trim(),
    quarter: String(d.quarter || "").trim(),
    DTE_bin: String(d.DTE_bin || "").trim(),
    log_m_bin: String(d.log_m_bin || "").trim(),
    n: +d.n,
    mean_return: +d.mean_return
  }))
  .filter(d => d.option_type && d.quarter && d.DTE_bin && d.log_m_bin && Number.isFinite(d.n) && Number.isFinite(d.mean_return));

const dteOrder = ["0-7","8-14","15-30","31-60","61-120","121-365",">365"];
const logOrder = ["≤-0.6","-0.6 – -0.3","-0.3 – -0.1","-0.1 – 0.1","0.1 – 0.3","0.3 – 0.6","> 0.6"];
const quarters = Array.from(new Set(q3.map(d => d.quarter))).sort();

const calls = q3.filter(d => d.option_type === "CALL");
const puts  = q3.filter(d => d.option_type === "PUT");

function renderFacetGrid(rows, {title}) {
  const facetCols = 4;
  const facetRows = Math.ceil(quarters.length / facetCols);

  const Wp = 200, Hp = 200;                 // larger panel size
  const m  = {top: 48, right: 10, bottom: 40, left: 58}; // larger top/bot margins
  const legendW = 220;                      // more room for legends
  const gapX = 28, gapY = 36;               // bigger gutters between panels

  const W = facetCols * (Wp + gapX) - gapX + m.left + m.right + legendW + 36;
  const H = facetRows * (Hp + gapY) - gapY + m.top + m.bottom;

  const x = d3.scaleBand().domain(dteOrder).range([0, Wp]).padding(0.35);
  const y = d3.scaleBand().domain(logOrder).range([Hp, 0]).padding(0.35);

  const nMax = d3.max(rows, d => d.n) ?? 1;
  const r = d3.scaleSqrt().domain([0, nMax]).range([4, 16]);

  const absMax = d3.max(rows, d => Math.abs(d.mean_return)) ?? 1e-6;
  const color = d3.scaleDiverging(d3.interpolatePRGn).domain([-absMax, 0, absMax]);

  //const svg = d3.create("svg").attr("width", W).attr("height", H);
  const svg = d3.create("svg")
    .attr("viewBox", [0,0,W,H])
    .attr("width", W)
    .attr("height", H)
    .style("color", "var(--text-color)");

  svg.append("text")
    .attr("x", m.left)
    .attr("y", 28)
    .attr("font-weight", 700)
    .attr("font-size", 22)
    .text(title);

  const root = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);

  quarters.forEach((q, idx) => {
    const col = idx % facetCols;
    const row = Math.floor(idx / facetCols);
    const gx = col * (Wp + gapX);
    const gy = row * (Hp + gapY);

    const g = root.append("g").attr("transform", `translate(${gx},${gy})`);

    // axes
    const gxAxis = g.append("g")
      .attr("transform", `translate(0,${Hp})`)
      .call(d3.axisBottom(x).tickSizeOuter(0));
    gxAxis.selectAll("text")
      .attr("font-size", 11)
      .attr("text-anchor","end")
      .attr("transform","rotate(-28)")
      .attr("dx","-0.35em")
      .attr("dy","0.15em");

    const gyAxis = g.append("g")
      .call(d3.axisLeft(y).tickSizeOuter(0));
    gyAxis.selectAll("text").attr("font-size", 11);

    // panel title with subtle backdrop to avoid collisions
    const titleG = g.append("g");
    titleG.append("rect")
      .attr("x", -2).attr("y", -22)
      .attr("width", Math.min(Wp, 72)).attr("height", 18)
      .attr("fill", "white").attr("opacity", 0.8);
    titleG.append("text")
      .attr("x", 0).attr("y", -8)
      .attr("font-size", 12).attr("font-weight", 600)
      .text(q);

    // bubbles
    const panelData = rows.filter(d => d.quarter === q);
    g.append("g")
      .selectAll("circle")
      .data(panelData)
      .join("circle")
      .attr("cx", d => x(d.DTE_bin) + x.bandwidth()/2)
      .attr("cy", d => y(d.log_m_bin) + y.bandwidth()/2)
      .attr("r", d => r(d.n))
      .attr("fill", d => color(d.mean_return))
      .attr("fill-opacity", 0.9)
      .attr("stroke", "#000")
      .attr("stroke-opacity", 0.12)
      .append("title")
      .text(d => [
        `Quarter: ${d.quarter}`,
        `DTE: ${d.DTE_bin}`,
        `log(m) bin: ${d.log_m_bin}`,
        `n: ${d3.format(",")(d.n)}`,
        `mean return: ${d3.format(".4f")(d.mean_return)}`
      ].join("\n"));
  });

  // legends (right column)
  const lgX = W - legendW, lgY = m.top + 6;

  // color legend
  const defs = svg.append("defs");
  const gradId = `grad-${Math.random().toString(36).slice(2)}`;
  const grad = defs.append("linearGradient")
    .attr("id", gradId).attr("x1","0").attr("x2","0").attr("y1","1").attr("y2","0");
  const steps = 80;
  for (let i=0;i<=steps;i++){
    const t = i/steps;
    const v = -absMax + t*(2*absMax);
    grad.append("stop").attr("offset", `${t*100}%`).attr("stop-color", color(v));
  }
  const barW = 20, barH = 190;
  svg.append("text")
    .attr("x", lgX).attr("y", lgY - 10)
    .attr("font-size", 12).attr("font-weight", 600)
    .text("mean return");
  svg.append("rect")
    .attr("x", lgX).attr("y", lgY)
    .attr("width", barW).attr("height", barH)
    .attr("stroke", "#ddd").attr("fill", `url(#${gradId})`);
  const cScale = d3.scaleLinear().domain([-absMax, absMax]).range([lgY+barH, lgY]);
  svg.append("g")
    .attr("transform", `translate(${lgX+barW+5},0)`)
    .call(d3.axisRight(cScale).ticks(6).tickFormat(d3.format(".2f")))
    .selectAll("text").attr("font-size", 11);

  // size legend
  const sG = svg.append("g").attr("transform", `translate(${lgX}, ${lgY + barH + 46})`);
  sG.append("text")
    .attr("x", 0).attr("y", -12)
    .attr("font-size", 12).attr("font-weight", 600)
    .text("n");
  const sVals = [Math.round(nMax*0.2), Math.round(nMax*0.5), nMax];
  const cx = 26; // fixed center so labels don't collide
  const rowGap = 44;
  const rowsG = sG.selectAll("g.row").data(sVals).join("g")
    .attr("class","row")
    .attr("transform", (d,i)=>`translate(0, ${i*rowGap})`);
  rowsG.append("circle")
    .attr("cx", cx).attr("cy", 0)
    .attr("r", d => r(d))
    .attr("fill", "none").attr("stroke", "#444");
  rowsG.append("text")
    .attr("x", cx + 22).attr("y", 4)
    .attr("font-size", 12)
    .text(d => d3.format(",")(d));

  svg.selectAll("text").attr("fill", "currentColor");
  
  return svg.node();
}

display(renderFacetGrid(calls, {title: "CALL · mean return across quarters"}));
display(renderFacetGrid(puts,  {title: "PUT · mean return across quarters"}));


```