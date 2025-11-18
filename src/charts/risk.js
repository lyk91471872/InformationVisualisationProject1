import * as d3 from "npm:d3";
import { svgWithMargin } from "./utils.js";
import { gradientLegend, sizeLegend } from "./legends.js";
import { applySvgTheme } from "./theme.js";

export function renderRiskReturnScatter(data, {
  title = "",
  xField = "std_return",
  yField = "mean_return",
  colorField = "sharpe",
  sizeField = "n",
  width = 900, height = 520,
  margin = {top: 50, right: 280, bottom: 56, left: 70},
  sizeRange = [3, 15],
  colorScheme = d3.interpolateInferno
} = {}) {
  const {svg, root, W, H, m} = svgWithMargin({width, height, margin});

  const X = d3.extent(data, d => +d[xField]); if (!X[0] && !X[1]) X[1] = 1;
  const Y = d3.extent(data, d => +d[yField]); if (Y[0] === Y[1]) Y[1] += 1e-6;

  const x = d3.scaleLinear().domain([Math.min(0, X[0]), X[1]]).nice().range([0, W-m.left-m.right]);
  const y = d3.scaleLinear().domain([Y[0], Y[1]]).nice().range([H-m.top-m.bottom, 0]);

  const nMax = d3.max(data, d => +d[sizeField]) || 1;
  const r = d3.scaleSqrt().domain([0, nMax]).range(sizeRange);

  const cMin = d3.min(data, d => +d[colorField]) ?? 0;
  const cMax = d3.max(data, d => +d[colorField]) ?? 1;
  const color = d3.scaleSequential(colorScheme).domain([cMin, cMax]);

  svg.append("text")
    .attr("x", m.left).attr("y", 28)
    .attr("font-size", 22).attr("font-weight", 700)
    .text(title);

  root.append("g")
    .attr("transform", `translate(0,${H-m.top-m.bottom})`)
    .call(d3.axisBottom(x));

  root.append("g").call(d3.axisLeft(y));

  root.append("text")
    .attr("x", (W-m.left-m.right)/2).attr("y", H-m.top-m.bottom+40)
    .attr("text-anchor","middle").attr("font-weight",600)
    .text("risk (std of return_exp)");

  root.append("text")
    .attr("transform", `translate(-42, ${(H-m.top-m.bottom)/2}) rotate(-90)`)
    .attr("text-anchor","middle").attr("font-weight",600)
    .text("expected return (mean of return_exp)");

  root.append("g")
    .selectAll("circle")
    .data(data)
    .join("circle")
      .attr("cx", d => x(+d[xField]))
      .attr("cy", d => y(+d[yField]))
      .attr("r",  d => r(+d[sizeField]))
      .attr("fill", d => color(+d[colorField]))
      .attr("fill-opacity", 0.9)
      .attr("stroke", "#000").attr("stroke-opacity", 0.15)
    .append("title")
      .text(d => [
        `risk: ${d3.format(".3f")(+d[xField])}`,
        `return: ${d3.format(".3f")(+d[yField])}`,
        `n: ${d3.format(",")(+d[sizeField])}`,
        `sharpe: ${d3.format(".2f")(+d[colorField])}`
      ].join("\n"));

  const legendX = W - m.right + 24;
  gradientLegend(svg, { x: legendX, y: m.top, width: 18, height: 200, scale: color, title: "sharpe (mean/std)", ticks: 6, tickFormat: d3.format(".2f") });
  sizeLegend(svg,     { x: legendX, y: m.top + 240, r, nMax, label: "n" });

  applySvgTheme(svg);
  return svg.node();
}
