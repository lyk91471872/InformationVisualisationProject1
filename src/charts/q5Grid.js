// charts/q5Grid.js
import * as d3 from "d3";
import { sizeScale, infernoDivergingScale } from "./scales.js";
import { drawColorLegend, drawSizeLegend } from "./legends.js";
import { readTheme } from "../theme.js";

export function q5Grid({
  data,
  dteOrder,
  logOrder,
  width = 1200,
  heightPerFacet = 240,
  facetPadding = 80,
  title = ""
}) {
  const theme = readTheme();

  const facets = Array.from(new Set(data.map(d => d.near_earn)));
  const facetCount = facets.length;

  const plotWidth = (width - 400) / facetCount;
  const plotHeight = 240;

  // ----- Global SVG -----
  const svg = d3.create("svg")
    .attr("width", width)
    .attr("height", plotHeight + 120);

  // Title
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", 30)
    .attr("text-anchor", "middle")
    .style("font-size", "18px")
    .style("font-weight", "600")
    .style("font-family", theme.font)
    .style("fill", theme.fg)
    .text(title);

  // ----- Shared scales -----
  const xScale = d3.scaleBand()
    .domain(dteOrder)
    .range([0, plotWidth])
    .padding(0.15);

  const yScale = d3.scaleBand()
    .domain(logOrder)
    .range([plotHeight, 0])
    .padding(0.15);

  const rScale = sizeScale(data.map(d => d.n), [6, 24]);

  const colorScale = infernoDivergingScale(data.map(d => d.mean_return));

  // ----- Faceted plots -----
  const facetGroup = svg.append("g")
    .attr("transform", `translate(50,60)`);

  facets.forEach((f, i) => {
    const colData = data.filter(d => d.near_earn === f);

    const g = facetGroup.append("g")
      .attr("transform", `translate(${i * (plotWidth + facetPadding) + 100},0)`);

    // Facet title
    g.append("text")
      .attr("x", plotWidth / 2)
      .attr("y", -20)
      .attr("text-anchor", "middle")
      .style("font-weight", "600")
      .style("font-family", theme.font)
      .style("fill", theme.fg)
      .text(f);

    // Axes
    const xAxis = d3.axisBottom(xScale).tickSize(4);
    const yAxis = d3.axisLeft(yScale).tickSize(4);

    g.append("g")
      .attr("transform", `translate(0,${plotHeight})`)
      .call(xAxis)
      .selectAll("text")
      .style("font-size", "10px")
      .style("font-family", theme.font)
      .style("fill", theme.fg);

    g.append("g")
      .call(yAxis)
      .selectAll("text")
      .style("font-size", "10px")
      .style("font-family", theme.font)
      .style("fill", theme.fg);

    g.selectAll(".domain, .tick line")
      .style("stroke", theme.fg);

    // Axis labels (only once)
    if (i === 0) {
      g.append("text")
        .attr("x", -plotHeight / 2)
        .attr("y", -35)
        .attr("transform", "rotate(-90)")
        .attr("text-anchor", "middle")
        .style("font-family", theme.font)
        .style("fill", theme.fg)
        .text("log moneyness bin");
    }

    g.append("text")
      .attr("x", plotWidth / 2)
      .attr("y", plotHeight + 35)
      .attr("text-anchor", "middle")
      .style("font-family", theme.font)
      .style("fill", theme.fg)
      .text("DTE bin");

    // Circles
    g.selectAll("circle")
      .data(colData)
      .join("circle")
        .attr("cx", d => xScale(d.DTE_bin) + xScale.bandwidth() / 2)
        .attr("cy", d => yScale(d.log_m_bin) + yScale.bandwidth() / 2)
        .attr("r", d => rScale(d.n))
        .attr("fill", d => colorScale(d.mean_return))
        .attr("opacity", 0.9);
  });

  // ----- Legend panel -----
  const legendX = facetCount * (plotWidth + facetPadding) + 80;
  const legendY = 60;

  drawColorLegend(svg, {
    x: legendX,
    y: legendY,
    scale: colorScale,
    height: 160,
    label: "mean return",
    theme
  });

  const nVals = data.map(d => d.n).sort((a, b) => a - b);
  const sizeTicks = [
    d3.quantile(nVals, 0.20),
    d3.quantile(nVals, 0.50),
    d3.quantile(nVals, 0.80)
  ];

  drawSizeLegend(svg, {
    x: legendX,
    y: legendY + 200,
    scale: rScale,
    values: sizeTicks,
    label: "n",
    theme
  });

  return svg.node();
}
