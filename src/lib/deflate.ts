import type { Series, YearValue } from "../types/series"

// Strip inflation from price-like series so the chart can compare real growth.
// Applies to:
//   - GBP series: become constant-£ of the reference year ("X today buys what Y did then")
//   - Index series: rescaled so changes show real growth above CPIH
//     (CPIH deflated by itself becomes a flat reference line — useful baseline)
// Percent, count, and rate units pass through unchanged.
// Years outside CPIH coverage are dropped.
export function deflateSeries(
  series: Series[],
  cpih: YearValue[],
): { series: Series[]; refYear: number } {
  if (cpih.length === 0) return { series, refYear: new Date().getFullYear() }
  const refPoint = cpih[cpih.length - 1]
  const refValue = refPoint.value
  const refYear = refPoint.year
  const cpihByYear = new Map(cpih.map((p) => [p.year, p.value]))

  const transformed = series.map((s) => {
    if (s.unit !== "GBP" && s.unit !== "index") return s
    const points: YearValue[] = []
    for (const p of s.points) {
      const c = cpihByYear.get(p.year)
      if (!c) continue
      const deflated = (p.value * refValue) / c
      points.push({
        year: p.year,
        value: s.unit === "GBP" ? Math.round(deflated) : Math.round(deflated * 100) / 100,
      })
    }
    return { ...s, points }
  })

  return { series: transformed, refYear }
}
