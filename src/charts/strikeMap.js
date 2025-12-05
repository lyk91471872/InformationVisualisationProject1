import * as d3 from "npm:d3";
import { svgWithMargin } from "./utils.js";
import { gradientLegend } from "./legends.js";
import { applySvgTheme } from "./theme.js";

export function strikeMap({
  width = 900,
  height = 260,
  sMin = 100,
  sMax = 300,
  sBins = 20,
  heatResolution = 80,
  margin = { top: 28, right: 160, bottom: 40, left: 100 }
} = {}) {
  // moneyness bins (7 bins, 8 edges)
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
  const mCenters = mEdges.slice(0, -1).map((d, i) => (d + mEdges[i + 1]) / 2);

  // shared SVG framing utilities (same pattern as Q5)
  const { svg, root, W, H, m } = svgWithMargin({ width, height, margin });
  const innerW = W - m.left - m.right;
  const innerH = H - m.top - m.bottom;

  // scales
  const x = d3.scaleLinear().domain([sMin, sMax]).range([0, innerW]);
  const y = d3.scaleLinear().domain([mMin, mMax]).range([innerH, 0]);

  const minK = sMin * Math.exp(mMin);
  const maxK = sMax * Math.exp(mMax);

  const color = d3.scaleDiverging()
    .domain([minK, 200, maxK])
    .interpolator(t => {
      if (t < 0.5) return d3.interpolateRgb("#F3A0F4", "#EEE")(t * 2);
      else return d3.interpolateRgb("#EEE", "#6DFFC4")((t - 0.5) * 2);
    });

  // axes
  root
    .append("g")
    .attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(x).ticks(6).tickFormat(d3.format(".0f")))
    .selectAll("text")
    .attr("font-size", 12);

  // Y ticks only at moneyness bins (single set of labels)
  root
    .append("g")
    .call(
      d3
        .axisLeft(y)
        .tickValues(mCenters)
        .tickFormat((d, i) => mLabels[i])
        .tickSizeOuter(0)
    )
    .selectAll("text")
    .attr("font-size", 12);

  // axis titles
  root
    .append("text")
    .attr("x", innerW / 2)
    .attr("y", innerH + 32)
    .attr("text-anchor", "middle")
    .attr("font-weight", 600)
    .text("Underlying price S");

  root
    .append("text")
    .attr(
      "transform",
      `translate(${-70},${innerH / 2}) rotate(-90)`
    )
    .attr("text-anchor", "middle")
    .attr("font-weight", 600)
    .text("log moneyness m");

  svg
    .append("text")
    .attr("x", m.left + innerW / 2)
    .attr("y", m.top - 8)
    .attr("text-anchor", "middle")
    .attr("font-weight", 600)
    .attr("font-size", 16)
    .text("Strike surface K = S · e^m (heatmap + binned grid)");

  // continuous heatmap
  const heat = root.append("g");

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

      heat
        .append("rect")
        .attr("x", x(s0))
        .attr("y", y(m1))
        .attr("width", x(s1) - x(s0))
        .attr("height", y(m0) - y(m1))
        .attr("fill", color(k));
    }
  }

  // overlaid 20×7 grid
  const grid = root.append("g");
  const sBinWidth = (sMax - sMin) / sBins;

  // vertical grid lines (S-bins)
  for (let i = 0; i <= sBins; i++) {
    const s = sMin + i * sBinWidth;
    grid
      .append("line")
      .attr("x1", x(s))
      .attr("x2", x(s))
      .attr("y1", y(mMin))
      .attr("y2", y(mMax))
      .attr("stroke", "currentColor")
      .attr("stroke-opacity", 0.2)
      .attr("stroke-width", 0.7);
  }

  // horizontal grid lines only at moneyness bin boundaries
  for (const mVal of mEdges) {
    grid
      .append("line")
      .attr("x1", x(sMin))
      .attr("x2", x(sMax))
      .attr("y1", y(mVal))
      .attr("y2", y(mVal))
      .attr("stroke", "currentColor")
      .attr("stroke-opacity", 0.2)
      .attr("stroke-width", 0.7);
  }

  // labels inside each grid cell (K rounded)
  const labels = root.append("g");
  for (let j = 0; j < mLabels.length; j++) {
    const m0 = mEdges[j];
    const m1 = mEdges[j + 1];
    const mC = (m0 + m1) / 2;

    for (let i = 0; i < sBins; i++) {
      const sC = sMin + (i + 0.5) * sBinWidth;
      const k = sC * Math.exp(mC);
      const kRounded = Math.round(k);

      labels
        .append("text")
        .attr("x", x(sC))
        .attr("y", y(mC))
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("font-size", 9)
        .attr("color", "#000")
        .text(kRounded);
    }
  }

  // legend – uses same helper as Q5 so “Strike K” text color follows the theme
  const legendX = W - m.right + 24;
  gradientLegend(svg, {
    x: legendX,
    y: m.top,
    width: 18,
    height: 180,
    scale: color,
    ticks: 6,
    tickFormat: d3.format(".0f"),
    title: "Strike K"
  });

  // tooltip with continuous K(S, m)
  let tooltip = d3.select("body").select(".strike-map-tooltip");
  if (tooltip.empty()) {
    tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "strike-map-tooltip")
      .style("position", "fixed")
      .style("pointer-events", "none")
      .style("padding", "4px 6px")
      .style("border-radius", "4px")
      .style("font-size", "11px")
      .style("z-index", 9999);
  }

  const overlay = root
    .append("rect")
    .attr("x", x(sMin))
    .attr("y", y(mMax))
    .attr("width", x(sMax) - x(sMin))
    .attr("height", y(mMin) - y(mMax))
    .attr("fill", "transparent")
    .style("cursor", "crosshair");

  overlay
    .on("mousemove", (event) => {
      const [px, py] = d3.pointer(event, root.node());
      const sVal = x.invert(px);
      const mVal = y.invert(py);
      if (sVal < sMin || sVal > sMax || mVal < mMin || mVal > mMax) {
        tooltip.style("opacity", 0);
        return;
      }
      const kVal = sVal * Math.exp(mVal);

      tooltip
        .style("opacity", 1)
        .style("background-color", "var(--background-color, white)")
        .style("color", "var(--text-color, #111)")
        .style("border", "1px solid var(--muted-color, #aaa)")
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

  // let CSS / theme drive all text colors, including the legend
  applySvgTheme(svg);
  return svg.node();
}
