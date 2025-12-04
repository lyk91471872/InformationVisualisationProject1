import * as d3 from "npm:d3";
import { svgWithMargin } from "./utils.js";
import { gradientLegend, sizeLegend } from "./legends.js";
import { applySvgTheme } from "./theme.js";

export function renderFacetedBubbles(data, {
  title = "",
  facetField = "quarter",     // e.g., "quarter" or "near_earn"
  facetOrder,                 // array order for columns
  dteOrder, logOrder,
  panel = {width: 360, height: 270, gap: 40},
  margin = {top: 56, right: 260, bottom: 48, left: 120},
  sizeRange = [4,16],
  valueField = "mean_return",
  legendTitles = {color: "mean return", size: "n"},
  hideYAxisIn = i => i > 0       // function: which panels hide y axis ticks
} = {}) {
  const cols = facetOrder.length;
  const gridW = panel.width*cols + panel.gap*(cols-1);

  const width  = margin.left + gridW + margin.right;
  const height = margin.top  + panel.height + margin.bottom;

  const {svg, W, H, m} = svgWithMargin({width, height, margin});
  const root = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);

  svg.append("text")
    .attr("x", m.left).attr("y", 28)
    .attr("font-size", 24).attr("font-weight", 700)
    .text(title);

  const x = d3.scaleBand().domain(dteOrder).range([0, panel.width]).padding(0.38);
  const y = d3.scaleBand().domain(logOrder).range([panel.height, 0]).padding(0.38);

  const nMax = d3.max(data, d => d.n) || 1;
  const r    = d3.scaleSqrt().domain([0, nMax]).range(sizeRange);

  const absMax = d3.max(data, d => Math.abs(d[valueField])) || 1e-6;
  const color = d3.scaleDiverging()
    .domain([-absMax, 0, absMax])
    .interpolator(t => {
      if (t < 0.5) return d3.interpolateRgb("#F3A0F4", "#EEE")(t * 2);
      else return d3.interpolateRgb("#EEE", "#6DFFC4")((t - 0.5) * 2);
    });

  facetOrder.forEach((key, i) => {
    const gx = i*(panel.width + panel.gap);
    const g = root.append("g").attr("transform", `translate(${gx},0)`);

    g.append("text")
      .attr("x", panel.width/2).attr("y", 0)
      .attr("text-anchor","middle").attr("font-size", 14).attr("font-weight", 600)
      .text(key);

    g.append("g")
      .attr("transform", `translate(0,${panel.height})`)
      .call(d3.axisBottom(x).tickSizeOuter(0))
      .selectAll("text").attr("font-size", 11);

    const yAxis = g.append("g").call(d3.axisLeft(y).tickSizeOuter(0));
    if (hideYAxisIn(i)) {
      yAxis.selectAll("text").remove();
      yAxis.selectAll(".tick line").remove();
    } else {
      g.append("text")
        .attr("transform", `translate(-74, ${panel.height/2}) rotate(-90)`)
        .attr("text-anchor","middle").attr("font-weight",600)
        .text("log moneyness bin");
    }

    g.append("text")
      .attr("x", panel.width/2).attr("y", panel.height+34)
      .attr("text-anchor","middle").attr("font-weight",600)
      .text("DTE bin");

    g.append("g")
      .selectAll("circle")
      .data(data.filter(d => d[facetField] === key))
      .join("circle")
        .attr("cx", d => x(d.DTE_bin) + x.bandwidth()/2)
        .attr("cy", d => y(d.log_m_bin) + y.bandwidth()/2)
        .attr("r",  d => r(d.n))
        .attr("fill", d => color(d[valueField]))
        .attr("fill-opacity", 0.9)
        .attr("stroke", "#000").attr("stroke-opacity", 0.22)
      .append("title")
        .text(d => [
          `${facetField}: ${key}`,
          `DTE: ${d.DTE_bin}`,
          `log m bin: ${d.log_m_bin}`,
          `count: ${d.n}`,
          `${legendTitles.color}: ${d3.format(".4f")(d[valueField])}`
        ].join("\n"));
  });

  const legendX = m.left + gridW + 24;
  gradientLegend(svg, { x: legendX, y: m.top, width: 18, height: 180, scale: color, title: legendTitles.color });
  sizeLegend(svg,     { x: legendX, y: m.top + 220, r, nMax, label: legendTitles.size });

  applySvgTheme(svg);
  return svg.node();
}
