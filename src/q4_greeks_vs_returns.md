# Q4 · How are Greeks related to returns?

**Premium: V**
> The market value of the option.

**Stock Price: S**
> The market value of the underlying stock.

**Delta: Δ = ∂V / ∂S**
> The option value moves up by ~$Δ when the stock moves up by $1.

**Gamma: Γ = ∂²V / ∂S² = ∂Δ / ∂S**
> Δ moves up by ~Γ when the stock moves up by $1.

**Theta: Θ = ∂V / ∂t**
> The option value changes by ~$Θ tomorrow if everything else stays the same.

**Vega: ν = ∂V / ∂σ**
> Sensitivity of the option value to volatility.

**Implied Volatility: IV = σ**
> The volatility value that makes the model price match the market price.

We visualize CALL options in a 3D (θ, Δ, Γ) bubble plot and encode payoff as color and size:

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
