import { useEffect, useState } from "react"
import type { SeriesData } from "../types/series"

export function useSeries() {
  const [data, setData] = useState<SeriesData | null>(null)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
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
  }, [])

  return { data, error, loading: !data && !error }
}
