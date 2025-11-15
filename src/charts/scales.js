// scales.js
import * as d3 from "d3";

export function sizeScale(values, range = [4, 22]) {
  return d3.scaleSqrt()
    .domain(d3.extent(values))
    .range(range);
}

export function infernoScale(values) {
  const [lo, hi] = d3.extent(values);
  return d3.scaleSequential()
    .domain([hi, lo])
    .interpolator(d3.interpolateInferno);
}

export function infernoDivergingScale(values) {
  const [lo, hi] = d3.extent(values);
  const mid = 0;
  return d3.scaleDiverging()
    .domain([lo, mid, hi])
    .interpolator(t => d3.interpolateInferno(1 - t));
}

export function linearScale(values, range) {
  return d3.scaleLinear()
    .domain(d3.extent(values))
    .nice()
    .range(range);
}
