// Formatters for the personal snapshot UI. Extracted so the negative-sign
// behaviour can be regression-tested — a previous version stripped the sign
// via Math.abs() and made a £228 deficit display as a £228 surplus.

export function fmt(n: number): string {
  const rounded = Math.round(n)
  if (rounded < 0) return "−£" + Math.abs(rounded).toLocaleString("en-GB")
  return "£" + rounded.toLocaleString("en-GB")
}

export function pct(n: number): string {
  return n.toFixed(1) + "%"
}
