export function pct(v: number) {
  return `${Math.round(v * 100)}%`;
}

export function signed(v: number, decimals = 1) {
  const s = v.toFixed(decimals);
  return v > 0 ? `+${s}` : s;
}
