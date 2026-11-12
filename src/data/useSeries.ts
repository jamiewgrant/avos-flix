import { useEffect, useState } from "react"
import type { SeriesData } from "../types/series"

// `initial` is supplied when the data is already in hand — by the pre-render
// script at build time, and by main.tsx which fetches before first render.
export function useSeries(initial?: SeriesData | null) {
  const [data, setData] = useState<SeriesData | null>(initial ?? null)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (initial) return
    let cancelled = false
    fetch("/data/series.json")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<SeriesData>
      })
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)))
      })
    return () => {
      cancelled = true
    }
  }, [initial])

  return { data, error, loading: !data && !error }
}
