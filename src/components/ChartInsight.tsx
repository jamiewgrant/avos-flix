import type { Series } from "../types/series"

interface Props {
  series: Series[]
  baseYear: number
  fromYear: number
  toYear: number
  mode: "indexed" | "raw"
}

function valueAt(s: Series, year: number): number | null {
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

export function ChartInsight({ series, baseYear, fromYear, toYear, mode }: Props) {
  if (series.length === 0) return null

  // For indexed mode use baseYear as the start, otherwise fromYear
  const startYear = mode === "indexed" ? baseYear : fromYear

  // Compute growth ratio for each series that has data at both ends
  const withRatios = series.flatMap((s) => {
    const start = valueAt(s, startYear)
    const end = valueAt(s, toYear)
    if (start == null || end == null || start === 0) return []
    return [{ s, ratio: end / start }]
  })

  if (withRatios.length === 0) return null

  if (withRatios.length === 1) {
    const { s, ratio } = withRatios[0]
    return (
      <p className="text-sm text-(--color-muted)">
        {s.name} grew{" "}
        <strong className="text-(--color-text)">{fmtMultiple(ratio)}</strong>{" "}
        from {startYear} to {toYear}.
      </p>
    )
  }

  // Find highest and lowest growth series
  const sorted = [...withRatios].sort((a, b) => b.ratio - a.ratio)
  const highest = sorted[0]
  const lowest = sorted[sorted.length - 1]

  // Avoid showing the same series twice if they happen to be equal
  if (highest.s.id === lowest.s.id) {
    return (
      <p className="text-sm text-(--color-muted)">
        {highest.s.name} grew{" "}
        <strong className="text-(--color-text)">{fmtMultiple(highest.ratio)}</strong>{" "}
        from {startYear} to {toYear}.
      </p>
    )
  }

  const gap = highest.ratio / lowest.ratio

  return (
    <p className="text-sm text-(--color-muted)">
      From {startYear} to {toYear}: {highest.s.name} grew{" "}
      <strong className="text-(--color-text)">{fmtMultiple(highest.ratio)}</strong> — {lowest.s.name}{" "}
      grew{" "}
      <strong className="text-(--color-text)">{fmtMultiple(lowest.ratio)}</strong>. That&apos;s a{" "}
      <strong className="text-(--color-text)">{fmtMultiple(gap)}</strong> gap.
    </p>
  )
}
