import type { Series } from "../types/series"

/**
 * The most recent year for which every given series has a data point.
 * Used instead of a hardcoded "current year" so copy and maths follow the data
 * as the ETL is refreshed. Missing/empty series are ignored; returns null if
 * nothing usable is passed.
 */
export function latestCommonYear(...series: Array<Series | undefined>): number | null {
  const lasts = series
    .filter((s): s is Series => !!s && s.points.length > 0)
    .map((s) => Math.max(...s.points.map((p) => p.year)))
  return lasts.length > 0 ? Math.min(...lasts) : null
}
