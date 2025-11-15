// src/charts/theme.js
export function applySvgTheme(svg) {
  svg.style("color", "var(--text-color)");
  svg.selectAll("text").attr("fill", "currentColor");
  //svg.selectAll(".domain, .tick line").attr("stroke", "var(--muted-text-color)");
  //svg.selectAll(".tick text").attr("fill", "currentColor");
  //svg.selectAll(".legend-axis .domain, .legend-axis .tick line")
     //.attr("stroke", "var(--muted-text-color)");
  //svg.selectAll(".legend-axis .tick text").attr("fill", "currentColor");
  //svg.selectAll("[stroke='#000'], [stroke='black']").attr("stroke", "var(--muted-text-color)");
}
