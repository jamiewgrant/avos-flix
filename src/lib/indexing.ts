import type { Series, YearValue } from "../types/series"

/**
 * The point a series is rebased against in Indexed mode: the base year itself,
 * or the first point within the following 3 years for sparse series.
 * Returns null when the series has no usable data there — it can't be indexed.
 */
export function basePoint(s: Series, baseYear: number): YearValue | null {
  const base =
    s.points.find((p) => p.year === baseYear) ??
    s.points.find((p) => p.year > baseYear && p.year <= baseYear + 3)
  if (!base || base.value === 0) return null
  return base
}
