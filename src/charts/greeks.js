import * as d3 from "npm:d3";
import { svgWithMargin } from "./utils.js";
import { gradientLegend, sizeLegend } from "./legends.js";
import { applySvgTheme } from "./theme.js";

// Generic "Greeks vs. returns" scatter
export function renderGreeksScatter(data, {
  title = "",
  xField = "delta",
  yField = "return_exp",
  sizeField = "gamma",
  colorField = "iv",
  xLabel = "Δ",
  yLabel = "Return to Expiration",
  sizeLabel = "|Γ|",
  colorLabel = "Implied Volatility",
  width = 860, height = 520,
  margin = {top: 50, right: 280, bottom: 56, left: 70},
  sizeRange = [6, 26],
  colorScheme = d3.interpolateInferno,
  sizeAbs = true   // take absolute value for size encodings (Γ, θ)
} = {}) {
  const rows = data
    .map(d => ({
      x: +d[xField],
      y: +d[yField],
      s: sizeAbs ? Math.abs(+d[sizeField]) : +d[sizeField],
      c: +d[colorField]
    }))
    .filter(d => Number.isFinite(d.x) && Number.isFinite(d.y) && Number.isFinite(d.s) && Number.isFinite(d.c));

  const {svg, root, W, H, m} = svgWithMargin({width, height, margin});

  const X = d3.extent(rows, d => d.x); if (X[0] === X[1]) X[1] += 1e-6;
  const Y = d3.extent(rows, d => d.y); if (Y[0] === Y[1]) Y[1] += 1e-6;

  const x = d3.scaleLinear().domain(X).nice().range([0, W-m.left-m.right]);
  const y = d3.scaleLinear().domain(Y).nice().range([H-m.top-m.bottom, 0]);

  const sMax = d3.max(rows, d => d.s) || 1;
  const r = d3.scaleSqrt().domain([0, sMax]).range(sizeRange);

  const cMin = d3.min(rows, d => d.c) ?? 0;
  const cMax = d3.max(rows, d => d.c) ?? 1;
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
    .text(xLabel);

  root.append("text")
    .attr("transform", `translate(-42, ${(H-m.top-m.bottom)/2}) rotate(-90)`)
    .attr("text-anchor","middle").attr("font-weight",600)
    .text(yLabel);

  root.append("g")
    .selectAll("circle")
    .data(rows)
    .join("circle")
      .attr("cx", d => x(d.x))
      .attr("cy", d => y(d.y))
      .attr("r",  d => r(d.s))
      .attr("fill", d => color(d.c))
      .attr("fill-opacity", 0.55)
      .attr("stroke", "#000").attr("stroke-opacity", 0.12);

  const legendX = W - m.right + 24;
  gradientLegend(svg, {
    x: legendX, y: m.top, width: 18, height: 200,
    scale: color, title: colorLabel, ticks: 6, tickFormat: d3.format(".2f")
  });
  sizeLegend(svg, {
    x: legendX, y: m.top + 240,
    r, nMax: sMax, label: sizeLabel, steps: [0.25, 0.6, 1]
  });

  applySvgTheme(svg);
  return svg.node();
}
