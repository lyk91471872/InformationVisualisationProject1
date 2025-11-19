// src/charts/strikeMap.js
import * as d3 from "npm:d3";
import { gradientLegend } from "./legends.js";
import { readTheme } from "../theme.js";

export function strikeMap({
  width = 900,
  height = 260,
  sMin = 100,
  sMax = 300,
  sBins = 20,
  heatResolution = 80
} = {}) {
  const theme = readTheme();

  const mEdges = [-0.8, -0.6, -0.3, -0.1, 0.1, 0.3, 0.6, 0.8];
  const mLabels = [
    "≤ -0.6",
    "-0.6 – -0.3",
    "-0.3 – -0.1",
    "-0.1 – 0.1",
    "0.1 – 0.3",
    "0.3 – 0.6",
    "> 0.6"
  ];
  const mMin = mEdges[0];
  const mMax = mEdges[mEdges.length - 1];

  const margin = { top: 28, right: 160, bottom: 40, left: 70 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const svg = d3.create("svg")
    .attr("width", width)
    .attr("height", height)
    .style("background-color", theme.bg)
    .style("font-family", theme.font);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear()
    .domain([sMin, sMax])
    .range([0, innerW]);

  const y = d3.scaleLinear()
    .domain([mMin, mMax])
    .range([innerH, 0]);

  const minK = sMin * Math.exp(mMin);
  const maxK = sMax * Math.exp(mMax);

  const color = d3.scaleSequential()
    .domain([minK, maxK])
    .interpolator(d3.interpolateInferno);

  const xAxis = d3.axisBottom(x)
    .ticks(6)
    .tickFormat(d3.format(".0f"));

  const yAxis = d3.axisLeft(y)
    .ticks(7)
    .tickFormat(d3.format(".2f"));

  g.append("g")
    .attr("transform", `translate(0,${innerH})`)
    .call(xAxis)
    .call(sel => sel.selectAll("text").style("fill", theme.fg))
    .call(sel => sel.selectAll("line, path").style("stroke", theme.muted));

  g.append("g")
    .call(yAxis)
    .call(sel => sel.selectAll("text").style("fill", theme.fg))
    .call(sel => sel.selectAll("line, path").style("stroke", theme.muted));

  g.append("text")
    .attr("x", innerW / 2)
    .attr("y", innerH + 30)
    .attr("text-anchor", "middle")
    .attr("fill", theme.fg)
    .style("font-size", "12px")
    .text("Underlying price S");

  g.append("text")
    .attr("x", -innerH / 2)
    .attr("y", -50)
    .attr("text-anchor", "middle")
    .attr("fill", theme.fg)
    .attr("transform", "rotate(-90)")
    .style("font-size", "12px")
    .text("Log moneyness m");

  svg.append("text")
    .attr("x", margin.left + innerW / 2)
    .attr("y", 18)
    .attr("text-anchor", "middle")
    .attr("fill", theme.fg)
    .style("font-size", "14px")
    .style("font-weight", "600")
    .text("Strike surface K = S · e^m (heatmap + binned grid)");

  const heat = g.append("g");

  const cols = heatResolution;
  const rows = heatResolution;
  const sStep = (sMax - sMin) / cols;
  const mStep = (mMax - mMin) / rows;

  for (let i = 0; i < cols; i++) {
    const s0 = sMin + i * sStep;
    const s1 = s0 + sStep;
    const sC = s0 + sStep / 2;

    for (let j = 0; j < rows; j++) {
      const m0 = mMin + j * mStep;
      const m1 = m0 + mStep;
      const mC = m0 + mStep / 2;
      const k = sC * Math.exp(mC);

      heat.append("rect")
        .attr("x", x(s0))
        .attr("y", y(m1))
        .attr("width", x(s1) - x(s0))
        .attr("height", y(m0) - y(m1))
        .attr("fill", color(k));
    }
  }

  const grid = g.append("g");
  const sBinWidth = (sMax - sMin) / sBins;

  for (let i = 0; i <= sBins; i++) {
    const s = sMin + i * sBinWidth;
    grid.append("line")
      .attr("x1", x(s))
      .attr("x2", x(s))
      .attr("y1", y(mMin))
      .attr("y2", y(mMax))
      .attr("stroke", theme.bg === "#121212" ? "#444444" : "#eeeeee")
      .attr("stroke-width", 0.7);
  }

  for (let k = 0; k < mEdges.length; k++) {
    const m = mEdges[k];
    grid.append("line")
      .attr("x1", x(sMin))
      .attr("x2", x(sMax))
      .attr("y1", y(m))
      .attr("y2", y(m))
      .attr("stroke", theme.bg === "#121212" ? "#444444" : "#eeeeee")
      .attr("stroke-width", 0.7);
  }

  const labels = g.append("g");

  for (let j = 0; j < mLabels.length; j++) {
    const m0 = mEdges[j];
    const m1 = mEdges[j + 1];
    const mC = (m0 + m1) / 2;

    for (let i = 0; i < sBins; i++) {
      const sC = sMin + (i + 0.5) * sBinWidth;
      const k = sC * Math.exp(mC);
      const kRounded = Math.round(k);

      labels.append("text")
        .attr("x", x(sC))
        .attr("y", y(mC))
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("fill", theme.fg)
        .style("font-size", "9px")
        .text(kRounded);
    }
  }

  const mLabelGroup = g.append("g");
  for (let j = 0; j < mLabels.length; j++) {
    const m0 = mEdges[j];
    const m1 = mEdges[j + 1];
    const mC = (m0 + m1) / 2;

    mLabelGroup.append("text")
      .attr("x", -6)
      .attr("y", y(mC))
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "middle")
      .attr("fill", theme.muted)
      .style("font-size", "10px")
      .text(mLabels[j]);
  }

  const legendX = margin.left + innerW + 20;
  const legendY = margin.top + 10;

  gradientLegend(svg, {
    x: legendX,
    y: legendY,
    width: 18,
    height: 140,
    scale: color,
    ticks: 6,
    tickFormat: d3.format(".0f"),
    title: "Strike K"
  });

  let tooltip = d3.select("body").select(".strike-map-tooltip");
  if (tooltip.empty()) {
    tooltip = d3.select("body")
      .append("div")
      .attr("class", "strike-map-tooltip")
      .style("position", "fixed")
      .style("pointer-events", "none")
      .style("padding", "4px 6px")
      .style("border-radius", "4px")
      .style("font-size", "11px")
      .style("z-index", 9999);
  }

  const overlay = g.append("rect")
    .attr("x", x(sMin))
    .attr("y", y(mMax))
    .attr("width", x(sMax) - x(sMin))
    .attr("height", y(mMin) - y(mMax))
    .attr("fill", "transparent")
    .style("cursor", "crosshair");

  overlay
    .on("mousemove", (event) => {
      const [px, py] = d3.pointer(event, g.node());
      const sVal = x.invert(px);
      const mVal = y.invert(py);
      if (sVal < sMin || sVal > sMax || mVal < mMin || mVal > mMax) {
        tooltip.style("opacity", 0);
        return;
      }
      const kVal = sVal * Math.exp(mVal);

      tooltip
        .style("opacity", 1)
        .style("background-color", theme.bg)
        .style("color", theme.fg)
        .style("border", `1px solid ${theme.muted}`)
        .style("left", `${event.clientX + 10}px`)
        .style("top", `${event.clientY + 10}px`)
        .html(
          `S ≈ ${sVal.toFixed(2)}<br>` +
          `m ≈ ${mVal.toFixed(3)}<br>` +
          `K ≈ ${kVal.toFixed(2)}`
        );
    })
    .on("mouseleave", () => {
      tooltip.style("opacity", 0);
    });

  return svg.node();
}
