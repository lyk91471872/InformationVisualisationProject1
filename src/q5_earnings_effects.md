# Q5 · How do things change around earnings dates?
```js
const q5 = await FileAttachment("./data/q5.csv").csv({typed:true});
q5.forEach(d => { d.n = +d.n; d.mean_return = +d.mean_return; });

const dteOrder = ["0-7","8-14","15-30","31-60","61-120","121-365",">365"];
const logOrder = ["≤-0.6","-0.6 – -0.3","-0.3 – -0.1","-0.1 – 0.1","0.1 – 0.3","0.3 – 0.6","> 0.6"];

const calls = q5.filter(d => d.option_type === "CALL");
const puts  = q5.filter(d => d.option_type === "PUT");
```

```js
import { q5Grid } from "./charts/q5Grid.js";

display(q5Grid({
  data: calls,
  dteOrder,
  logOrder,
  title: "CALL · Mean Return vs Earnings Dates"
}));

display(q5Grid({
  data: puts,
  dteOrder,
  logOrder,
  title: "PUT · Mean Return vs Earnings Dates"
}));
```
