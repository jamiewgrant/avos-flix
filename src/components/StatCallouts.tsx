import type { Series } from "../types/series"

interface Props {
  series: Series[]
  baseYear: number
  endYear?: number
}

interface Stat {
  headline: string
  caption: string
  hint?: string
}

function valueAt(series: Series[], id: string, year: number): number | null {
  const s = series.find((s) => s.id === id)
  if (!s) return null
  const exact = s.points.find((p) => p.year === year)
  if (exact) return exact.value
  // Tolerate up to 2-year drift
  for (const offset of [1, -1, 2, -2]) {
    const near = s.points.find((p) => p.year === year + offset)
    if (near) return near.value
  }
  return null
}

function fmtMultiple(x: number): string {
  return x >= 10 ? `${x.toFixed(0)}×` : `${x.toFixed(1)}×`
}

export function StatCallouts({ series, baseYear, endYear }: Props) {
  if (series.length === 0) return null

  const allYears = series.flatMap((s) => s.points.map((p) => p.year))
  if (allYears.length === 0) return null
  const latest = endYear ?? Math.max(...allYears)

  const wageBase = valueAt(series, "median-wage", baseYear)
  const wageLatest = valueAt(series, "median-wage", latest)
  const houseBase =
    valueAt(series, "house-price-nationwide", baseYear) ??
    valueAt(series, "house-price-landreg", baseYear)
  const houseLatest =
    valueAt(series, "house-price-nationwide", latest) ??
    valueAt(series, "house-price-landreg", latest)
  const cpihBase = valueAt(series, "cpih", baseYear)
  const cpihLatest = valueAt(series, "cpih", latest)
  const rentBase = valueAt(series, "rent-index", baseYear)
  const rentLatest = valueAt(series, "rent-index", latest)

  const stats: Stat[] = []

  if (houseBase && houseLatest && wageBase && wageLatest) {
    const ratioBase = houseBase / wageBase
    const ratioLatest = houseLatest / wageLatest
    stats.push({
      headline: `${fmtMultiple(ratioBase)} → ${fmtMultiple(ratioLatest)}`,
      caption: "Years of median wage to buy the average UK house",
      hint: `${baseYear} → ${latest}`,
    })
  }

  if (houseBase && houseLatest) {
    stats.push({
      headline: fmtMultiple(houseLatest / houseBase),
      caption: "House prices",
      hint: `${baseYear} → ${latest}`,
    })
  }

  if (wageBase && wageLatest) {
    stats.push({
      headline: fmtMultiple(wageLatest / wageBase),
      caption: "Median wages",
      hint: `${baseYear} → ${latest}`,
    })
  }

  if (cpihBase && cpihLatest) {
    stats.push({
      headline: fmtMultiple(cpihLatest / cpihBase),
      caption: "General inflation (CPIH)",
      hint: `${baseYear} → ${latest}`,
    })
  }

  if (rentBase && rentLatest && stats.length < 4) {
    stats.push({
      headline: fmtMultiple(rentLatest / rentBase),
      caption: "Private rent index",
      hint: `${baseYear} → ${latest}`,
    })
  }

  if (stats.length === 0) return null

  // Cap at 4 so the grid stays clean
  const visible = stats.slice(0, 4)

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
      {visible.map((s, i) => (
        <div
          key={i}
          className="rounded-xl bg-(--color-bg) border border-(--color-border) p-4 transition-colors hover:border-(--color-accent-border)"
        >
          <div className="text-2xl md:text-3xl font-semibold text-(--color-text) tabular-nums tracking-tight">
            {s.headline}
          </div>
          <div className="text-xs text-(--color-muted) mt-1 leading-snug">{s.caption}</div>
          {s.hint && (
            <div className="text-[10px] text-(--color-muted) opacity-60 mt-1 font-mono">
              {s.hint}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
