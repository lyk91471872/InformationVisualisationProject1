import * as d3 from "npm:d3";

// Make a fresh SVG with margins and color system integrated with style.css
export function svgWithMargin({width: W, height: H, margin: m}) {
  const svg = d3.create("svg")
    .attr("viewBox", [0,0,W,H])
    .attr("width", W)
    .attr("height", H)
    .style("color", "var(--text-color)");

  const root = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);
  // ensure all texts inherit currentColor
  svg.selectAll("text").attr("fill", "currentColor");
  return {svg, root, W, H, m};
}

// Coerce numeric fields in-place
export function coerceNumbers(row, fields) {
  fields.forEach(f => { if (f in row) row[f] = +row[f]; });
  return row;
}

// Aggregate q1/q3/q5 bubble cells: count + mean(valueField)
export function groupStats(rows, {dteOrder, logOrder, valueField = "return_exp"}) {
  const roll = d3.rollup(
    rows,
    v => ({ n: v.length, mean: d3.mean(v, d => +d[valueField]) }),
    d => d.DTE_bin,
    d => d.log_m_bin
  );
  const out = [];
  for (const x of dteOrder) {
    const mapY = roll.get(x);
    for (const y of logOrder) {
      const cell = mapY?.get(y);
      if (cell) out.push({ DTE_bin: x, log_m_bin: y, n: cell.n, mean: cell.mean });
    }
  }
  return out;
}
