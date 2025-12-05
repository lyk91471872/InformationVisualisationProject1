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

export function renderGreeks3DOptions(
  data,
  {
    width = 800,
    height = 600,
    title = "3D Greeks vs Expiration Return (θ, Δ, Γ, ν)",
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
    yaw: -1.57,
    pitch: -2.88,
    distance: 1.25,
    fov: 1.2,
    panX: 20,
    panY: 50,
    panZ: 0
  };

  data = data.filter(d =>
    Number.isFinite(d.theta) &&
    Number.isFinite(d.delta) &&
    Number.isFinite(d.gamma) &&
    d.iv > 0.001 && // <--- Filter out IV=0 (dead options)
    !(d.theta === 0 && d.gamma === 0) // <--- Filter out points stuck on the axis
  );

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
    const isVegaOut = d.vega < 0;
    const out = isThetaOut || isGammaOut || isVegaOut;
    if (out) outliers.push(d);
    return !out;
  });

  // 如果极端情况 clean 为空，就退回全数据
  const baseForScale = clean.length > 0 ? clean : data;
  data = clean.length > 0 ? clean : data;

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
  const color = d => (d.return_exp >= 0 ? "#6DFFC4" : "#F3A0F4");

  // vega → vibration frequency
  const vegaMax = d3.max(data, d => d.vega);
  const vegaDomain = [0, vegaMax];
  const vegaScale = d3
    .scaleLinear()
    .domain(vegaDomain)
    .range([0.5, 100]);

  // iv → vibration amplitude
  const ivExtent = d3.extent(data, d => d.iv);
  const ivAmpScale = d3.scaleLinear()
    .domain([0, ivExtent[1] || 1])
    .range([0.1, 10]);

  const fmtGreek = d3.format(".3f");
  const fmtReturn = d3.format("+.2%");
  const fmtIV = d3.format(".2%");

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
    const isVegaOut = d.vega < 0;
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
      isVegaOut,
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
  let hoveredDatum = null;

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
    .attr("font-size", 11)
    .text("Color: gain/loss");

  let ly = 18;

  const colorLegend = legend.append("g").attr("transform", `translate(0, ${ly})`);
  colorLegend
    .append("circle")
    .attr("cx", 8)
    .attr("cy", 6)
    .attr("r", 3)
    .attr("fill", "#6DFFC4");
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
    .attr("r", 3)
    .attr("fill", "#F3A0F4");
  colorLegend2
    .append("text")
    .attr("x", 18)
    .attr("y", 10)
    .attr("fill", "white")
    .attr("font-size", 11)
    .text("Return < 0 (loss)");

  ly += 64;

  const rqSmall = 1;
  const rqMid = 4;
  const rqLarge = 8;

  legend
    .append("text")
    .attr("x", 0)
    .attr("y", ly)
    .attr("fill", "white")
    .attr("font-size", 11)
    .text("Size: |Return| at expiry");

  const sizeLegend = legend
    .append("g")
    .attr("transform", `translate(0, ${ly})`);

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
      .attr("fill", "#6DFFC4")
      .attr("stroke", "#888")
      .attr("stroke-width", 0.5);

    sizeLegend
      .append("text")
      .attr("x", 25)
      .attr("y", sy + 4)
      .attr("fill", "white")
      .attr("font-size", 10)
      .text(s.label);

    sy += s.r * 2 + 8;
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
    const visiblePoints = points.filter(d => d.depth > 0.1);

    // Define this OUTSIDE the render function (along with baseY, etc.)
    // let hoveredDatum = null;

    // Inside render():
    circles = pointGroup
      .selectAll("circle")
      .data(visiblePoints)
      .join(
        enter =>
          enter
            .append("circle")
            .attr("cx", d => d.proj.sx)
            .attr("cy", d => d.proj.sy)
            .attr("r", d => d.baseRadius)
            .on("pointerenter", (event, d) => {
              hoveredDatum = d.datum; // <--- 1. Lock the specific data object
              render();               // <--- 2. Force immediate re-render

              const { datum } = d;
              tooltip
                .style("opacity", 1)
                .html(
                  [
                    `<b>${datum.option_type}</b>`,
                    `Return@exp: ${fmtReturn(datum.return_exp)}`,
                    `θ (theta): ${fmtGreek(datum.theta)}`,
                    `Δ (delta): ${fmtGreek(datum.delta)}`,
                    `Γ (gamma): ${fmtGreek(datum.gamma)}`,
                    `ν (vega): ${fmtGreek(datum.vega)}`,
                    `IV: ${fmtIV(datum.iv)}`,
                    d.isThetaOut || d.isGammaOut || d.isVegaOut
                      ? `<span style="color:#ffcc00">OUTLIER</span>`
                      : ""
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
              hoveredDatum = null; // <--- 3. Unlock
              tooltip.style("opacity", 0);
              render();            // <--- 4. Restore colors
            }),
        update => update,
        exit => exit.remove()
      )

      // === MAIN ANIMATION LOOP ===
      .attr("cx", d => d.proj.sx)
      .attr("cy", d => d.proj.sy)
      .attr("r", d => d.baseRadius)
      // Check for match using the data object itself
      .attr("fill", d =>
        d.datum === hoveredDatum ? "#ffffff" : color(d.datum)
      )
      .attr("fill-opacity", d => {
        if (d.datum === hoveredDatum) return 1.0;
        return d.isThetaOut || d.isGammaOut || d.isVegaOut ? 1.0 : 0.7;
      })
      .attr("stroke", d => {
        if (d.datum === hoveredDatum) return "#ffffff";
        return d.isThetaOut || d.isGammaOut || d.isVegaOut ? "#ffcc00" : "#111";
      })
      .attr("stroke-width", d => {
        if (d.datum === hoveredDatum) return 3.0;
        return d.isThetaOut || d.isGammaOut || d.isVegaOut ? 1.2 : 0.5;
      });

    baseY = visiblePoints.map(d => d.proj.sy);
  }

  render();

  // === 8. Organic Vega Tremble (Scaled by IV) ===
  d3.timer(elapsed => {
    const t = elapsed / 1000;
    if (!circles || !isTrembling) return;

    circles
      .attr("cx", (d, i) => {
        // Calculate amplitude based on this point's IV
        const iv = d.datum.iv;
        const ivSafe = Number.isFinite(iv) ? iv : 0;
        const amp = ivAmpScale(iv);
        const offsetX = Math.cos(t * d.freq * 0.7 + i);
        return d.proj.sx + amp * offsetX;
      })
      .attr("cy", (d, i) => {
        const iv = d.datum.iv;
        const ivSafe = Number.isFinite(iv) ? iv : 0;
        const amp = ivAmpScale(iv);
        const offsetY = Math.sin(t * d.freq + i);
        return d.proj.sy + amp * offsetY;
      });
  });

  // === 9. View Control ===
  function makeSlider(labelText, min, max, step, initial, onChange) {
    const wrap = controls
      .append("label")
      .style("display", "flex")
      .style("alignItems", "center")
      .style("gap", "0.25rem")
      .style("font-size", "12px")
      .style("color", "#888");

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

    // CRITICAL: Return the input/span so the spin timer can update them
    return { input, valueSpan };
  }

  // 1. Yaw (We capture this one into 'yawUI' to control it later)
  const yawUI = makeSlider(
    "Yaw (°)",
    -180,
    180,
    1,
    Math.round((camera.yaw * 180) / Math.PI),
    v => {
      camera.yaw = (v * Math.PI) / 180;
    }
  );

  // 2. Pitch
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

  // 3. Zoom
  makeSlider("Zoom", 0.05, 2.0, 0.1, camera.distance, v => {
    camera.distance = v;
  });

  // 4. Pans
  makeSlider("Pan X", -width, width, 10, camera.panX, v => {
    camera.panX = v;
  });

  makeSlider("Pan Y", -height, height, 10, camera.panY, v => {
    camera.panY = v;
  });

  makeSlider("Pan Z", -2.0, 2.0, 0.05, camera.panZ, v => {
    camera.panZ = v;
  });

  // === 10. Auto-Spin Button (Default: ON) ===
  const btn = controls
    .append("button")
    .text("Auto Spin: ON")          // <--- Default text ON
    .style("padding", "4px 8px")
    .style("font-size", "11px")
    .style("cursor", "pointer")
    .style("background", "#0066cc") // <--- Default blue (active)
    .style("color", "white")
    .style("border", "1px solid #666")
    .style("width", "200px")
    .style("text-align", "center");

  // Define the spin function so we can use it for both init and click
  const spinTick = () => {
    camera.yaw += 0.005;
    if (camera.yaw > Math.PI) camera.yaw -= 2 * Math.PI;

    const deg = Math.round((camera.yaw * 180) / Math.PI);
    yawUI.input.property("value", deg);
    yawUI.valueSpan.text(deg);

    render();
  };

  // Start timer immediately
  let spinTimer = d3.timer(spinTick);

  btn.on("click", () => {
    if (spinTimer) {
      spinTimer.stop();
      spinTimer = null;
      btn.text("Auto Spin: OFF").style("background", "#333");
    } else {
      btn.text("Auto Spin: ON").style("background", "#0066cc");
      spinTimer = d3.timer(spinTick);
    }
  });

  // === 10b. Tremble Toggle Button (Default: ON) ===
  let isTrembling = true; // <--- Default true

  const trembleBtn = controls
    .append("button")
    .text("Tremble: ON")            // <--- Default text ON
    .style("padding", "4px 8px")
    .style("font-size", "11px")
    .style("cursor", "pointer")
    .style("background", "#9900cc") // <--- Default purple (active)
    .style("color", "white")
    .style("border", "1px solid #666")
    .style("width", "200px")
    .style("text-align", "center");

  trembleBtn.on("click", () => {
    isTrembling = !isTrembling;
    if (isTrembling) {
      trembleBtn.text("Tremble: ON").style("background", "#9900cc");
    } else {
      trembleBtn.text("Tremble: OFF").style("background", "#333");
      render(); // Snap back to clean grid immediately
    }
  });

  // === 11. 把 outliers print 出来（DOM + console） ===
  if (outliers.length > 0) {
    console.log(
      "Theta/Gamma/Vega outliers excluded from scale:",
      outliers.map(d => ({
        return_exp: d.return_exp,
        delta: d.delta,
        theta: d.theta,
        gamma: d.gamma,
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
        `Outliers (theta/gamma/vega) excluded from axis scale: ${outliers.length}`,
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
