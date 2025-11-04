# Q5 · How do things change around earnings dates?
```js
const q5 = await FileAttachment("./data/q5.csv").csv({typed:true});
q5.forEach(d => { d.n = +d.n; d.mean_return = +d.mean_return; });

const dteOrder = ["0-7","8-14","15-30","31-60","61-120","121-365",">365"];
const logOrder = ["≤-0.6","-0.6 – -0.3","-0.3 – -0.1","-0.1 – 0.1","0.1 – 0.3","0.3 – 0.6","> 0.6"];

const calls = q5.filter(d => d.option_type === "CALL");
const puts  = q5.filter(d => d.option_type === "PUT");

const callChart = vl.vconcat(
  vl.markCircle({opacity:0.9})
    .data(calls)
    .encode(
      vl.column({field:"near_earn", type:"nominal", title:"Earnings proximity"}),
      vl.x({field:"DTE_bin", type:"ordinal", sort:dteOrder, title:"DTE bin"}),
      vl.y({field:"log_m_bin", type:"ordinal", sort:logOrder, title:"log moneyness bin"}),
      vl.size({field:"n", type:"quantitative", scale:{range:[150,1500]}, legend:{title:"n"}}),
      vl.color({field:"mean_return", type:"quantitative", scale:{scheme:"inferno", domainMid:0}, legend:{title:"mean return"}})
    )
    .width(240)
    .height(240)
).title("CALL · Mean Return vs Earnings Dates");
display(await callChart.render());

const putChart = vl.vconcat(
  vl.markCircle({opacity:0.9})
    .data(puts)
    .encode(
      vl.column({field:"near_earn", type:"nominal", title:"Earnings proximity"}),
      vl.x({field:"DTE_bin", type:"ordinal", sort:dteOrder, title:"DTE bin"}),
      vl.y({field:"log_m_bin", type:"ordinal", sort:logOrder, title:"log moneyness bin"}),
      vl.size({field:"n", type:"quantitative", scale:{range:[150,1500]}, legend:{title:"n"}}),
      vl.color({field:"mean_return", type:"quantitative", scale:{scheme:"inferno", domainMid:0}, legend:{title:"mean return"}})
    )
    .width(240)
    .height(240)
).title("PUT · Mean Return vs Earnings Dates");
display(await putChart.render());


```