// src/charts/index.js
export { DTE_ORDER, LOG_ORDER, quarterOrderFrom } from "./orders.js";
export { strikeMap } from "./strikeMap.js";
export { svgWithMargin, coerceNumbers, groupStats } from "./utils.js";
export { gradientLegend, sizeLegend } from "./legends.js";
export { renderBubbleChart } from "./bubble.js";
export { renderFacetedBubbles } from "./facet.js";
export { renderRiskReturnScatter } from "./risk.js";
export { renderGreeksScatter } from "./greeks.js";
export { applySvgTheme } from "./theme.js";


import * as d3 from "d3";

/**
 * 3D Greeks scatter for CALLs
 * x = theta, y = delta, z = gamma
 * color & size ~ return_exp
 * vibration frequency ~ vega
 *
 * - 用 IQR fence 找出 theta/gamma 的 outliers
 * - scale 只用非 outlier 的值，domain 对称 [-maxAbs, +maxAbs]
 * - 三轴交点 = (0,0,0)，outliers 被 clamp 在轴端
 */
export function renderGreeks3DOptions(
  data,
  {
    width = 800,
    height = 600,
    title = "CALL · 3D Greeks vs Expiration Return (θ, Δ, Γ, ν)",
    xLabel = "θ (Theta)",
    yLabel = "Δ (Delta)",
    zLabel = "Γ (Gamma)"
  } = {}
) {
  const margin = { top: 40, right: 160, bottom: 40, left: 60 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // --- Camera state ---
  const camera = {
    yaw: 1.745,
    pitch: -2.967,
    distance: 1,
    fov: 1.2,
    panX: -80,
    panY: 100,
    panZ: 0
  };

  // === 1. 用 IQR 找 outliers（theta & gamma） ===
  function iqrBounds(values) {
    const v = values.slice().sort(d3.ascending);
    const q1 = d3.quantile(v, 0.25);
    const q3 = d3.quantile(v, 0.75);
    const iqr = (q3 ?? 0) - (q1 ?? 0);
    if (!isFinite(iqr) || iqr === 0) {
      // 如果没有离散度，就不做 fence
      return { lower: d3.min(v) ?? 0, upper: d3.max(v) ?? 0, q1, q3, iqr };
    }
    const lower = (q1 ?? 0) - 20 * iqr;
    const upper = (q3 ?? 0) + 20 * iqr;
    return { lower, upper, q1, q3, iqr };
  }

  const thetaAll = data.map(d => d.theta);
  const gammaAll = data.map(d => d.gamma);

  const thetaFence = iqrBounds(thetaAll);
  const gammaFence = iqrBounds(gammaAll);

  // 标记 outliers
  const outliers = [];
  const clean = data.filter(d => {
    const isThetaOut =
      d.theta < thetaFence.lower || d.theta > thetaFence.upper;
    const isGammaOut =
      d.gamma < gammaFence.lower || d.gamma > gammaFence.upper;
    const out = isThetaOut || isGammaOut;
    if (out) outliers.push(d);
    return !out;
  });

  // 如果极端情况 clean 为空，就退回全数据
  const baseForScale = clean.length > 0 ? clean : data;

  // === 2. 对称 domain：只用非 outlier 值，保证 0 在中点 ===
  function symmetricDomain(values) {
    const ext = d3.extent(values);
    const lo = ext[0] ?? 0;
    const hi = ext[1] ?? 0;
    const maxAbs = Math.max(Math.abs(lo), Math.abs(hi), 1e-9);
    return [-maxAbs, maxAbs];
  }

  const xDomain = symmetricDomain(baseForScale.map(d => d.theta)); // θ
  const yDomain = symmetricDomain(baseForScale.map(d => d.delta)); // Δ
  const zDomain = symmetricDomain(baseForScale.map(d => d.gamma)); // Γ

  const xScale = d3
    .scaleLinear()
    .domain(xDomain)
    .range([-1, 1])
    .clamp(true); // clamp 让 outliers 停在端点
  const yScale = d3
    .scaleLinear()
    .domain(yDomain)
    .range([-1, 1])
    .clamp(true);
  const zScale = d3
    .scaleLinear()
    .domain(zDomain)
    .range([-1, 1])
    .clamp(true);

  // return → size & color
  const absReturns = data.map(d => Math.abs(d.return_exp));
  const maxAbsReturn = d3.max(absReturns) || 1;
  const rScale = d3.scaleSqrt().domain([0, maxAbsReturn]).range([1, 8]);
  const color = d => (d.return_exp >= 0 ? "#00ff66" : "#ff00ff");

  // vega → vibration frequency
  const vegaExtent = d3.extent(data, d => d.vega);
  const vegaDomain = [vegaExtent[0] ?? 0, vegaExtent[1] ?? 0];
  const vegaScale = d3
    .scaleLinear()
    .domain(vegaDomain)
    .range([0.5, 100.0]);

  const fmtGreek = d3.format(".3f");
  const fmtReturn = d3.format("+.3f");
  const fmtIV = d3.format(".3f");

  // === 3. 3D helpers ===
  function rotateY([x, y, z], angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const nx = x * c + z * s;
    const nz = -x * s + z * c;
    return [nx, y, nz];
  }

  function rotateX([x, y, z], angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const ny = y * c - z * s;
    const nz = y * s + z * c;
    return [x, ny, nz];
  }

  function project([x, y, z], { distance, fov, panX, panY, panZ }) {
    // Add panZ to the depth calculation
    const zc = z + distance + (panZ || 0);
    const scale = fov / zc;
    return {
      // Add panX and panY to the 2D screen coordinates
      sx: (x * scale * innerWidth * 0.4) + (innerWidth / 2) + (panX || 0),
      sy: (y * scale * innerHeight * 0.4) + (innerHeight / 2) + (panY || 0),
      depth: zc
    };
  }

  // === 4. 点数据（含 outlier 标记） ===
  const points = data.map(d => {
    const isThetaOut =
      d.theta < thetaFence.lower || d.theta > thetaFence.upper;
    const isGammaOut =
      d.gamma < gammaFence.lower || d.gamma > gammaFence.upper;
    const model = [
      xScale(d.theta),
      yScale(d.delta),
      zScale(d.gamma)
    ];
    return {
      datum: d,
      model,
      isThetaOut,
      isGammaOut,
      freq: vegaScale(d.vega),
      baseRadius: rScale(Math.abs(d.return_exp)),
      proj: null,
      depth: null
    };
  });

  const axesModel = [
    { name: "x", from: [-1, 0, 0], to: [1, 0, 0], label: xLabel, color: "#ff4444" },
    { name: "y", from: [0, -1, 0], to: [0, 1, 0], label: yLabel, color: "#44ff44" },
    { name: "z", from: [0, 0, -1], to: [0, 0, 1], label: zLabel, color: "#4488ff" }
  ];

  // === 5. DOM Structure ===
  const container = document.createElement("div");
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.gap = "0.5rem";
  container.style.color = "white";
  container.style.fontFamily = "system-ui, sans-serif";
  container.style.position = "relative";
  // Ensure container fits within window/parent
  container.style.maxWidth = "100%";

  const controls = d3
    .select(container)
    .append("div")
    .style("display", "grid")
    .style("grid-template-columns", "repeat(3, 1fr)") // Force 3 equal columns
    .style("gap", "0.5rem")
    .style("width", "100%")  // Take full width of parent
    .style("box-sizing", "border-box") // Handle padding/border correctly
    .style("alignItems", "center");

  const svg = d3
    .create("svg")
    .attr("width", width)
    .attr("height", height)
    .style("background", "black");

  container.appendChild(svg.node());

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", margin.top / 2)
    .attr("text-anchor", "middle")
    .attr("fill", "white")
    .attr("font-size", 14)
    .attr("font-weight", "bold")
    .text(title);

  const axisGroup = g.append("g").attr("class", "axes");
  const pointGroup = g.append("g").attr("class", "points");

  const tooltip = d3
    .select(container)
    .append("div")
    .style("position", "absolute")
    .style("pointerEvents", "none")
    .style("background", "rgba(0,0,0,0.85)")
    .style("color", "#fff")
    .style("padding", "6px 8px")
    .style("border-radius", "4px")
    .style("font-size", "11px")
    .style("border", "1px solid #666")
    .style("opacity", 0);

  let baseY = [];
  let circles;

  // === 6. Legend（保持不变） ===
  const legend = g
    .append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${innerWidth + 20}, 10)`);

  legend
    .append("text")
    .attr("x", 0)
    .attr("y", 0)
    .attr("fill", "white")
    .attr("font-size", 12)
    .attr("font-weight", "bold")
    .text("Encoding");

  let ly = 18;

  const colorLegend = legend.append("g").attr("transform", `translate(0, ${ly})`);
  colorLegend
    .append("circle")
    .attr("cx", 8)
    .attr("cy", 6)
    .attr("r", 5)
    .attr("fill", "#00ff66");
  colorLegend
    .append("text")
    .attr("x", 18)
    .attr("y", 10)
    .attr("fill", "white")
    .attr("font-size", 11)
    .text("Return ≥ 0 (gain)");

  const colorLegend2 = legend.append("g").attr("transform", `translate(0, ${ly + 18})`);
  colorLegend2
    .append("circle")
    .attr("cx", 8)
    .attr("cy", 6)
    .attr("r", 5)
    .attr("fill", "#ff00ff");
  colorLegend2
    .append("text")
    .attr("x", 18)
    .attr("y", 10)
    .attr("fill", "white")
    .attr("font-size", 11)
    .text("Return < 0 (loss)");

  ly += 40;

  const rqSmall = d3.quantile(absReturns, 0.25) || 0.1;
  const rqMid = d3.quantile(absReturns, 0.5) || 0.5;
  const rqLarge = d3.quantile(absReturns, 0.9) || maxAbsReturn;

  legend
    .append("text")
    .attr("x", 0)
    .attr("y", ly)
    .attr("fill", "white")
    .attr("font-size", 11)
    .text("|Return| at expiry");

  const sizeLegend = legend
    .append("g")
    .attr("transform", `translate(0, ${ly + 6})`);

  const sizeSamples = [
    { label: fmtReturn(rqSmall), r: rScale(rqSmall) },
    { label: fmtReturn(rqMid), r: rScale(rqMid) },
    { label: fmtReturn(rqLarge), r: rScale(rqLarge) }
  ];

  let sy = 18;
  sizeSamples.forEach(s => {
    sizeLegend
      .append("circle")
      .attr("cx", 10)
      .attr("cy", sy)
      .attr("r", s.r)
      .attr("fill", "#00ff66")
      .attr("fill-opacity", 0.5)
      .attr("stroke", "#888")
      .attr("stroke-width", 0.5);

    sizeLegend
      .append("text")
      .attr("x", 25)
      .attr("y", sy + 4)
      .attr("fill", "white")
      .attr("font-size", 10)
      .text(s.label);

    sy += s.r * 2 + 6;
  });

  ly += 60;

  const vegaLegend = legend
    .append("g")
    .attr("transform", `translate(0, ${ly + 30})`);

  vegaLegend
    .append("text")
    .attr("x", 0)
    .attr("y", 0)
    .attr("fill", "white")
    .attr("font-size", 11)
    .text("Vibration speed ∝ vega");

  vegaLegend
    .append("text")
    .attr("x", 0)
    .attr("y", 16)
    .attr("fill", "#aaaaaa")
    .attr("font-size", 10)
    .text(`ν range: [${fmtGreek(vegaDomain[0])}, ${fmtGreek(vegaDomain[1])}]`);

  // === 7. 渲染（三轴 + ticks + 点） ===
  function render() {
    axisGroup.selectAll("*").remove();

    axesModel.forEach(axis => {
      let a = rotateY(axis.from, camera.yaw);
      let b = rotateY(axis.to, camera.yaw);
      a = rotateX(a, camera.pitch);
      b = rotateX(b, camera.pitch);

      const A = project(a, camera);
      const B = project(b, camera);

      axisGroup
        .append("line")
        .attr("x1", A.sx)
        .attr("y1", A.sy)
        .attr("x2", B.sx)
        .attr("y2", B.sy)
        .attr("stroke", axis.color)
        .attr("stroke-width", 2)
        .attr("opacity", 0.9);

      axisGroup
        .append("text")
        .attr("x", B.sx)
        .attr("y", B.sy)
        .attr("dx", 4)
        .attr("dy", -4)
        .attr("fill", "white")
        .attr("font-size", 11)
        .text(axis.label);

      let ticks, toModel;
      if (axis.name === "x") {
        ticks = xScale.ticks(5);
        toModel = v => [xScale(v), 0, 0];
      } else if (axis.name === "y") {
        ticks = yScale.ticks(5);
        toModel = v => [0, yScale(v), 0];
      } else {
        ticks = zScale.ticks(5);
        toModel = v => [0, 0, zScale(v)];
      }

      ticks.forEach(val => {
        let m = toModel(val);
        m = rotateY(m, camera.yaw);
        m = rotateX(m, camera.pitch);
        const P = project(m, camera);

        axisGroup
          .append("circle")
          .attr("cx", P.sx)
          .attr("cy", P.sy)
          .attr("r", 2)
          .attr("fill", axis.color);

        axisGroup
          .append("text")
          .attr("x", P.sx - 4)
          .attr("y", P.sy - 2)
          .attr("text-anchor", "end")
          .attr("fill", "#cccccc")
          .attr("font-size", 9)
          .text(fmtGreek(val));
      });
    });

    // 原点
    let origin = [0, 0, 0];
    origin = rotateY(origin, camera.yaw);
    origin = rotateX(origin, camera.pitch);
    const O = project(origin, camera);
    axisGroup
      .append("circle")
      .attr("cx", O.sx)
      .attr("cy", O.sy)
      .attr("r", 3)
      .attr("fill", "white");
    axisGroup
      .append("text")
      .attr("x", O.sx + 6)
      .attr("y", O.sy - 4)
      .attr("fill", "white")
      .attr("font-size", 9)
      .text("0,0,0");

    // 点
    points.forEach(p => {
      let v = rotateY(p.model, camera.yaw);
      v = rotateX(v, camera.pitch);
      const proj = project(v, camera);
      p.proj = proj;
      p.depth = proj.depth;
    });

    points.sort((a, b) => b.depth - a.depth);

    circles = pointGroup
      .selectAll("circle")
      .data(points)
      .join(
        enter =>
          enter
            .append("circle")
            .attr("cx", d => d.proj.sx)
            .attr("cy", d => d.proj.sy)
            .attr("r", d => d.baseRadius)
            .attr("fill", d => color(d.datum))
            .attr("fill-opacity", d =>
              d.isThetaOut || d.isGammaOut ? 1.0 : 0.7
            ) // outlier 亮一点
            .attr("stroke", d =>
              d.isThetaOut || d.isGammaOut ? "#ffcc00" : "#111"
            )
            .attr("stroke-width", d =>
              d.isThetaOut || d.isGammaOut ? 1.2 : 0.5
            )
            .on("pointerenter", (event, d) => {
              const { datum } = d;
              tooltip
                .style("opacity", 1)
                .html(
                  [
                    `<b>CALL</b>`,
                    `Return@exp: ${fmtReturn(datum.return_exp)}`,
                    `θ (theta): ${fmtGreek(datum.theta)}`,
                    `Δ (delta): ${fmtGreek(datum.delta)}`,
                    `Γ (gamma): ${fmtGreek(datum.gamma)}`,
                    `ν (vega): ${fmtGreek(datum.vega)}`,
                    `IV: ${fmtIV(datum.iv)}`,
                    d.isThetaOut || d.isGammaOut ? `<span style="color:#ffcc00">OUTLIER (θ/Γ)</span>` : ""
                  ].join("<br>")
                );
            })
            .on("pointermove", event => {
              const { offsetX, offsetY } = event;
              tooltip
                .style("left", `${offsetX + 20}px`)
                .style("top", `${offsetY + 20}px`);
            })
            .on("pointerleave", () => {
              tooltip.style("opacity", 0);
            }),
        update => update,
        exit => exit.remove()
      )
      .attr("cx", d => d.proj.sx)
      .attr("cy", d => d.proj.sy)
      .attr("r", d => d.baseRadius)
      .attr("fill", d => color(d.datum));

    baseY = points.map(d => d.proj.sy);
  }

  render();

  // === 8. vega 抖动 ===
  const amp = 0.5;
  d3.timer(elapsed => {
    const t = elapsed / 1000;
    if (!circles) return;
    circles.attr("cy", (d, i) => {
      const offset = amp * Math.sin(t * d.freq);
      return (baseY[i] ?? d.proj.sy) + offset;
    });
  });

  // === 9. 视角控制 ===
  function makeSlider(labelText, min, max, step, initial, onChange) {
    const wrap = controls
      .append("label")
      .style("display", "flex")
      .style("alignItems", "center")
      .style("gap", "0.25rem")
      .style("font-size", "12px");

    wrap.append("span").text(labelText);

    const input = wrap
      .append("input")
      .attr("type", "range")
      .attr("min", min)
      .attr("max", max)
      .attr("step", step)
      .attr("value", initial);

    const valueSpan = wrap
      .append("span")
      .text(initial)
      .style("min-width", "2.5rem");

    input.on("input", function () {
      const v = +this.value;
      valueSpan.text(v);
      onChange(v);
      render();
    });
  }

  makeSlider(
    "Yaw (°)",
    -180,
    180,
    1,
    Math.round((camera.yaw * 180) / Math.PI),
    v => {
      camera.yaw = (v * Math.PI) / 180;
    }
  );

  makeSlider(
    "Pitch (°)",
    -180,
    180,
    1,
    Math.round((camera.pitch * 180) / Math.PI),
    v => {
      camera.pitch = (v * Math.PI) / 180;
    }
  );

  makeSlider("Zoom", 0.05, 2.0, 0.1, camera.distance, v => {
    camera.distance = v;
  });

  makeSlider("Pan X", -width, width, 10, camera.panX, v => {
    camera.panX = v;
  });

  makeSlider("Pan Y", -height, height, 10, camera.panY, v => {
    camera.panY = v;
  });

  makeSlider("Pan Z", -2.0, 2.0, 0.05, camera.panZ, v => {
    camera.panZ = v;
  });

  // === 10. 把 outliers print 出来（DOM + console） ===
  if (outliers.length > 0) {
    console.log(
      "Theta/Gamma outliers excluded from scale:",
      outliers.map(d => ({
        theta: d.theta,
        gamma: d.gamma,
        delta: d.delta,
        return_exp: d.return_exp,
        vega: d.vega,
        iv: d.iv
      }))
    );

    const pre = d3
      .select(container)
      .append("pre")
      .style("marginTop", "8px")
      .style("font-size", "11px")
      .style("max-height", "160px")
      .style("overflow", "auto")
      .style("background", "#111")
      .style("padding", "6px 8px")
      .style("border", "1px solid #444");

    pre.text(
      [
        `Outliers (theta/gamma) excluded from axis scale: ${outliers.length}`,
        "",
        ...outliers.slice(0, 50).map(d =>
          [
            `θ=${fmtGreek(d.theta)}`,
            `Δ=${fmtGreek(d.delta)}`,
            `Γ=${fmtGreek(d.gamma)}`,
            `ν=${fmtGreek(d.vega)}`,
            `ret=${fmtReturn(d.return_exp)}`,
            `iv=${fmtIV(d.iv)}`
          ].join("  |  ")
        ),
        outliers.length > 50
          ? `... (${outliers.length - 50} more)`
          : ""
      ].join("\n")
    );
  }

  return container;
}
