# Q4 · How are Greeks related to returns?

**Delta: Δ = ∂V / ∂S**
> Sensitivity of the option value to the underlying price.

**Gamma: Γ = ∂²V / ∂S²**
> Curvature of the option value with respect to the underlying price.

**Theta: Θ = ∂V / ∂t**
> Sensitivity of the option value to the passage of time.

**Vega: ν = ∂V / ∂σ**
> Sensitivity of the option value to volatility.

**Implied Volatility: IV = σ**
> The volatility value that makes the model price match the market price.

We visualize CALL options in a 3D scatter (θ, Δ, Γ) and encode payoff as color and size:

```js
import { renderGreeks3DOptions } from "./charts/index.js";

const q4 = await FileAttachment("./data/q4.csv").csv({ typed: true });

// Calls only for now; we can add puts later with a separate view.
// const calls = q4.filter(d => d.option_type === "CALL");

// 3D scatter: x = theta, y = delta, z = gamma, vega = vibration frequency
display(
  renderGreeks3DOptions(q4, {
    width: 800,
    height: 800,
    title: "3D Greeks vs Expiration Return (θ, Δ, Γ, ν)",
    xLabel: "θ (Theta)",
    yLabel: "Δ (Delta)",
    zLabel: "Γ (Gamma)"
  })
);
```

Options with very low delta, calls especially are mostly losses, despite the few low-delta gains all provide high returns, but overall, delta alone is not a very good predictor.

Options that yields more positive returns in general are
* low |theta| calls
* low gamma puts
* low vega calls
* high vega puts
