import * as d3 from "npm:d3";

// Continuous gradient + axis (diverging or linear)
export function gradientLegend(svg, {
  x, y, width = 18, height = 160,
  scale, ticks = 5, tickFormat = d3.format(".2f"),
  title = ""
}) {
  const defs = svg.append("defs");
  const gradId = `grad-${Math.random().toString(36).slice(2)}`;
  const grad = defs.append("linearGradient")
    .attr("id", gradId).attr("x1","0").attr("x2","0").attr("y1","1").attr("y2","0");

  const domain = scale.domain();
  const a = domain[0], b = domain[domain.length - 1];
  const steps = 120;
  for (let i=0;i<=steps;i++){
    const t = i/steps;
    const v = a + t*(b-a);
    grad.append("stop").attr("offset", `${t*100}%`).attr("stop-color", scale(v));
  }

  if (title) {
    svg.append("text")
      .attr("x", x).attr("y", y-8)
      .attr("font-size", 12).attr("font-weight", 600)
      .text(title);
  }

  svg.append("rect")
    .attr("x", x).attr("y", y)
    .attr("width", width).attr("height", height)
    .attr("stroke", "#ddd").attr("fill", `url(#${gradId})`);

  const axisScale = d3.scaleLinear().domain([a, b]).range([y+height, y]);
  svg.append("g")
    .attr("transform", `translate(${x+width+5},0)`)
    .call(d3.axisRight(axisScale).ticks(ticks).tickFormat(tickFormat))
    .selectAll("text").attr("font-size", 11);
}

// Three-circle size legend
export function sizeLegend(svg, {
  x, y, r, nMax, label = "n",
  steps = [0.25, 0.6, 1]
}) {
  const values = steps.map(t => Math.round(t*nMax));
  const g = svg.append("g").attr("transform", `translate(${x},${y})`);

  g.append("text")
    .attr("x", 0).attr("y", -12)
    .attr("font-size", 12).attr("font-weight", 600)
    .text(label);

  const cx = r(nMax), rowGap = 24;
  const rows = g.selectAll("g.row").data(values).join("g")
    .attr("class","row").attr("transform",(d,i)=>`translate(0,${i*(r(d)+cx)+8})`);

  rows.append("circle")
    .attr("cx", cx).attr("cy", 0).attr("r", d => r(d))
    .attr("fill","none").attr("stroke","#444");

  rows.append("text")
    .attr("x", cx + r(nMax) + 10).attr("y", 4)
    .attr("font-size", 12)
    .text(d => d3.format(",")(d));
}
