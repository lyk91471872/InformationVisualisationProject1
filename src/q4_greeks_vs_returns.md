# Q4 · How are Greeks related to returns?

Across both calls and puts, option returns exhibit only weak relationships with the Greeks.
For calls, higher deltas are generally associated with lower expected expiration returns, reflecting that deep-in-the-money calls behave more like stock and therefore show smaller payoff asymmetry. Most large-return points cluster near very low delta values, where cheap far-OTM options can generate outsized payoffs when large price moves occur. Implied volatility is strongly linked to dispersion: higher-IV regions show wider spreads of returns but no consistent improvement in average outcomes.
For puts, the pattern is similar when viewed against vega: high-vega contracts (typically long-dated or ATM) show wide variability but do not systematically yield higher returns. Extreme positive returns again occur mainly in low-delta, low-vega zones where option prices are smallest. Overall, Greeks primarily shape risk and variability, but they do not reliably predict higher mean returns.


# Q4 · How are Greeks related to returns?

We visualize CALL options in a 3D scatter (θ, Δ, Γ) and encode payoff as color and size:
- **Color:** magenta for loss at expiration, green for gain
- **Size:** proportional to |return_exp|
- **Vibration frequency:** proportional to vega (higher vega → faster vibration)

```js
import { renderGreeks3DOptions } from "./charts/index.js";

const q4 = await FileAttachment("./data/q4.csv").csv({ typed: true });

// Calls only for now; we can add puts later with a separate view.
// const calls = q4.filter(d => d.option_type === "CALL");

// 3D scatter: x = theta, y = delta, z = gamma, vega = vibration frequency
display(
  renderGreeks3DOptions(q4, {
    width: 800,
    height: 600,
    title: "CALL · 3D Greeks vs Expiration Return (θ, Δ, Γ, ν)",
    xLabel: "θ (Theta)",
    yLabel: "Δ (Delta)",
    zLabel: "Γ (Gamma)"
  })
);


```
