// scatter.js
import * as d3 from "d3";
import { sizeScale, infernoScale, linearScale } from "./scales.js";
import { drawColorLegend, drawSizeLegend } from "./legends.js";
import { readTheme } from "../theme.js";

export function scatterPlot({
  data,
  xField, xLabel,
  yField, yLabel,
  sizeField, sizeLabel,
  colorField, colorLabel,
  width = 700,
  height = 420,
  plotWidth = 500,
  title = ""
}) {
  const theme = readTheme();

  const margin = {top: 40, right: 10, bottom: 40, left: 55};
  const innerW = plotWidth - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const svg = d3.create("svg")
    .attr("width", width)
    .attr("height", height);

  const plot = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = linearScale(data.map(d => d[xField]), [0, innerW]);
  const y = linearScale(data.map(d => d[yField]), [innerH, 0]);
  const r = sizeScale(data.map(d => d[sizeField]));
  const color = infernoScale(data.map(d => d[colorField]));

  plot.append("g")
    .attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .style("fill", theme.fg)
    .style("font-family", theme.font);

  plot.append("g")
    .call(d3.axisLeft(y))
    .selectAll("text")
    .style("fill", theme.fg)
    .style("font-family", theme.font);

  plot.append("text")
    .attr("x", innerW / 2)
    .attr("y", innerH + 35)
    .attr("text-anchor", "middle")
    .style("fill", theme.fg)
    .style("font-family", theme.font)
    .text(xLabel);

  plot.append("text")
    .attr("x", -innerH / 2)
    .attr("y", -40)
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .style("fill", theme.fg)
    .style("font-family", theme.font)
    .text(yLabel);

  svg.append("text")
    .attr("x", plotWidth / 2)
    .attr("y", 25)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .style("font-weight", "600")
    .style("fill", theme.fg)
    .style("font-family", theme.font)
    .text(title);

  plot.selectAll("circle")
    .data(data)
    .join("circle")
      .attr("cx", d => x(d[xField]))
      .attr("cy", d => y(d[yField]))
      .attr("r", d => r(Math.abs(d[sizeField])))
      .attr("fill", d => color(d[colorField]))
      .attr("opacity", 0.5);

  const legendX = plotWidth + 20;
  const legendY = margin.top;

  drawColorLegend(svg, {
    x: legendX,
    y: legendY,
    scale: color,
    label: colorLabel,
    theme
  });

  const sVals = data.map(d => Math.abs(d[sizeField])).sort((a, b) => a - b);
  const sizeTicks = [
    d3.quantile(sVals, 0.15),
    d3.quantile(sVals, 0.50),
    d3.quantile(sVals, 0.85)
  ];

  drawSizeLegend(svg, {
    x: legendX,
    y: legendY + 160,
    scale: r,
    values: sizeTicks,
    label: sizeLabel,
    theme
  });

  return svg.node();
}
