import * as d3 from "npm:d3";
import { svgWithMargin } from "./utils.js";
import { gradientLegend, sizeLegend } from "./legends.js";
import { applySvgTheme } from "./theme.js";

export function renderBubbleChart(data, {
  title = "",
  dteOrder, logOrder,
  width = 800, height = 480,
  margin = {top: 40, right: 260, bottom: 56, left: 140},
  sizeRange = [6,24],
  colorScheme = d3.interpolatePRGn,
  valueField = "mean",       // expects fields: n, mean
  legendTitles = {color: "mean return", size: "n"}
} = {}) {
  const {svg, root, W, H, m} = svgWithMargin({width, height, margin});

  const x = d3.scaleBand().domain(dteOrder).range([0, W-m.left-m.right]).padding(0.4);
  const y = d3.scaleBand().domain(logOrder).range([H-m.top-m.bottom, 0]).padding(0.4);

  const nMax = d3.max(data, d => d.n) || 1;
  const r    = d3.scaleSqrt().domain([0, nMax]).range(sizeRange);

  const absMax = d3.max(data, d => Math.abs(d[valueField])) || 1e-6;
  // const color  = d3.scaleDiverging(colorScheme).domain([-absMax, 0, absMax]);
  const color = d3.scaleDiverging()
    .domain([-absMax, 0, absMax])
    .interpolator(t => {
      if (t < 0.5) return d3.interpolateRgb("#F3A0F4", "#EEE")(t * 2);
      else return d3.interpolateRgb("#EEE", "#6DFFC4")((t - 0.5) * 2);
    });

  svg.append("text")
    .attr("x", m.left).attr("y", 26)
    .attr("font-weight", 700).attr("font-size", 18)
    .text(title);

  // axes
  root.append("g")
    .attr("transform", `translate(0,${H-m.top-m.bottom})`)
    .call(d3.axisBottom(x).tickSizeOuter(0))
    .selectAll("text").attr("font-size", 12);

  root.append("g")
    .call(d3.axisLeft(y).tickSizeOuter(0))
    .selectAll("text").attr("font-size", 12);

  root.append("text")
    .attr("x", (W-m.left-m.right)/2).attr("y", H-m.top-m.bottom+40)
    .attr("text-anchor","middle").attr("font-weight",600).text("DTE bin");

  root.append("text")
    .attr("transform", `translate(${-90}, ${(H-m.top-m.bottom)/2}) rotate(-90)`)
    .attr("text-anchor","middle").attr("font-weight",600)
    .text("log(moneyness) bin");

  // circles
  root.append("g")
    .selectAll("circle")
    .data(data)
    .join("circle")
      .attr("cx", d => x(d.DTE_bin) + x.bandwidth()/2)
      .attr("cy", d => y(d.log_m_bin) + y.bandwidth()/2)
      .attr("r",  d => r(d.n))
      .attr("fill", d => color(d[valueField]))
      .attr("fill-opacity", 0.9)
      .attr("stroke", "#000")
      .attr("stroke-opacity", 0.22)
    .append("title")
      .text(d => [
        `DTE: ${d.DTE_bin}`,
        `log m bin: ${d.log_m_bin}`,
        `count: ${d.n}`,
        `${legendTitles.color}: ${d3.format(".4f")(d[valueField])}`
      ].join("\n"));

  // legends on the right
  const legendX = W - m.right + 24;
  gradientLegend(svg, {
    x: legendX, y: m.top, width: 18, height: 180,
    scale: color, title: legendTitles.color
  });
  sizeLegend(svg, {
    x: legendX, y: m.top + 220,
    r, nMax, label: legendTitles.size
  });

  applySvgTheme(svg);
  return svg.node();
}
