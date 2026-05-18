import type { Series, YearValue } from "../types/series"

// Convert nominal £ series into constant-£ of a reference year, using CPIH.
// Series in other units (percent, index, count, rate) pass through unchanged.
// Years outside CPIH coverage are dropped — methodologically honest.
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
    if (s.unit !== "GBP") return s
    const points: YearValue[] = []
    for (const p of s.points) {
      const c = cpihByYear.get(p.year)
      if (!c) continue
      points.push({ year: p.year, value: Math.round((p.value * refValue) / c) })
    }
    return { ...s, points }
  })

  return { series: transformed, refYear }
}
