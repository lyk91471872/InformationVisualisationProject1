// Canonical categorical orders used across pages
export const DTE_ORDER = ["0-7","8-14","15-30","31-60","61-120","121-365",">365"];

export const LOG_ORDER = [
  "≤-0.6","-0.6 – -0.3","-0.3 – -0.1","-0.1 – 0.1","0.1 – 0.3","0.3 – 0.6","> 0.6"
];

// Derive a sorted 'quarter' order from data
export function quarterOrderFrom(data, field = "quarter") {
  return Array.from(new Set(data.map(d => d[field]))).sort();
}
