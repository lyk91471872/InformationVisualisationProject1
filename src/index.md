# NVDA Options Data Explorer

```js
import * as Plot from "npm:@observablehq/plot";
import * as d3 from "npm:d3";

const options = await FileAttachment("./data/nvda_2020_2022.csv").csv({typed: true});

// --- Preview first N rows ---
display(Inputs.table(options.slice(0, 10)));

// --- Detect numeric columns ---
const numericCols = Object.keys(options[0]).filter(
  c => typeof options[0][c] === "number" && !Number.isNaN(options[0][c])
);
display(numericCols);

// --- Create histograms for each numeric column ---
for (const col of numericCols) {
  const values = options.map(d => d[col]);
  const isUnix = d3.median(values) > 1e9 && d3.median(values) < 2e10;

  const xCfg = {
    label: col,
    tickFormat: isUnix
      ? d => d3.utcFormat("%Y-%m")(new Date(d * 1000))
      : undefined,
    ticks: isUnix ? 10 : undefined
  };

  const plot = Plot.plot({
    title: `Histogram of [${col}]`,
    marginLeft: 50,
    x: xCfg,
    y: { label: "Count" },
    marks: [Plot.rectY(options, Plot.binX({ y: "count" }, { x: col }))]
  });
  display(plot);
}

```
