// Split a sorted points array at the verifiedFrom boundary so the chart can
// render the pre-verified portion dashed. The last estimated point is duplicated
// into both halves so the dashed and solid segments visually meet.
export function splitAtVerified<T extends { year: number }>(
  points: T[],
  verifiedFrom: number | undefined,
): { estimated: T[]; verified: T[] } {
  if (verifiedFrom === undefined) return { estimated: [], verified: points }
  const idx = points.findIndex((p) => p.year >= verifiedFrom)
  if (idx === -1) return { estimated: points, verified: [] }
  if (idx === 0) return { estimated: [], verified: points }
  return {
    estimated: points.slice(0, idx + 1),
    verified: points.slice(idx),
  }
}
