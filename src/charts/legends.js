// legends.js
import * as d3 from "d3";
import { readTheme } from "../theme.js";

export function drawColorLegend(svg, {
  x, y, height = 140, width = 18,
  scale,
  label = "Color",
  theme
}) {
  const id = "grad-" + Math.random().toString(36).slice(2);

  const defs = svg.append("defs");
  const gradient = defs.append("linearGradient")
    .attr("id", id)
    .attr("x1", "0%").attr("y1", "100%")
    .attr("x2", "0%").attr("y2", "0%");

  const [lo, hi] = scale.domain();
  const n = 16;

  d3.range(n).forEach(i => {
    const t = i / (n - 1);
    gradient.append("stop")
      .attr("offset", `${t * 100}%`)
      .attr("stop-color", scale(lo + (hi - lo) * t));
  });

  svg.append("text")
    .attr("x", x)
    .attr("y", y - 8)
    .style("font-weight", "600")
    .style("fill", theme.fg)
    .style("font-family", theme.font)
    .text(label);

  svg.append("rect")
    .attr("x", x)
    .attr("y", y)
    .attr("width", width)
    .attr("height", height)
    .attr("fill", `url(#${id})`);

  const axis = d3.axisRight(
    d3.scaleLinear().domain([lo, hi]).range([height, 0])
  ).ticks(6);

  const g = svg.append("g")
    .attr("transform", `translate(${x + width},${y})`)
    .call(axis);

  g.selectAll("text")
    .style("fill", theme.fg)
    .style("font-family", theme.font);

  g.selectAll(".domain, .tick line")
    .style("stroke", theme.fg);
}

export function drawSizeLegend(svg, {
  x, y, scale,
  values = [], label = "Size",
  theme
}) {
  svg.append("text")
    .attr("x", x)
    .attr("y", y - 10)
    .style("font-weight", "600")
    .style("fill", theme.fg)
    .style("font-family", theme.font)
    .text(label);

  values.forEach((v, i) => {
    const cy = y + i * 40;

    svg.append("circle")
      .attr("cx", x + 15)
      .attr("cy", cy)
      .attr("r", scale(v))
      .attr("fill", theme.fg)
      .attr("opacity", 0.25);

    svg.append("text")
      .attr("x", x + 40)
      .attr("y", cy + 5)
      .style("fill", theme.fg)
      .style("font-family", theme.font)
      .text(v.toFixed(3));
  });
}
