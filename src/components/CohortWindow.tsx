import { useState, useEffect, useRef } from "react"
import type { Series } from "../types/series"
import { fmt } from "../lib/format"
import { latestCommonYear } from "../lib/latestYear"

interface Props {
  series: Series[]
  /** Birth year restored from the URL (?born=), if any. */
  initialBirthYear?: number | null
  onApply: (from: number, to: number) => void
  onClear: () => void
}

function valueAt(series: Series, year: number): number | null {
  const exact = series.points.find((p) => p.year === year)
  if (exact) return exact.value
  // Tolerate up to 2-year drift
  for (const offset of [1, -1, 2, -2]) {
    const near = series.points.find((p) => p.year === year + offset)
    if (near) return near.value
  }
  return null
}

function fmtMultiple(x: number): string {
  return x >= 10 ? `${x.toFixed(0)}×` : `${x.toFixed(1)}×`
}

export function CohortWindow({ series, initialBirthYear = null, onApply, onClear }: Props) {
  const [input, setInput] = useState(initialBirthYear !== null ? String(initialBirthYear) : "")
  const [applied, setApplied] = useState<number | null>(initialBirthYear)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const houseSeries = series.find((s) => s.id === "house-price-nationwide")
  const wageSeries = series.find((s) => s.id === "median-wage")
  // Latest year both series cover — the end of the "working life" window.
  const CURRENT_YEAR = latestCommonYear(houseSeries, wageSeries) ?? new Date().getFullYear()

  function computeCallout(birthYear: number): {
    from: number
    houseMultiple: string
    wageMultiple: string
    houseFrom: string
    houseTo: string
    wageFrom: string
    wageTo: string
  } | null {
    const from = birthYear + 22
    if (from >= CURRENT_YEAR) return null
    if (!houseSeries || !wageSeries) return null
    const houseFromVal = valueAt(houseSeries, from)
    const houseToVal = valueAt(houseSeries, CURRENT_YEAR)
    const wageFromVal = valueAt(wageSeries, from)
    const wageToVal = valueAt(wageSeries, CURRENT_YEAR)
    if (!houseFromVal || !houseToVal || !wageFromVal || !wageToVal) return null
    return {
      from,
      houseMultiple: fmtMultiple(houseToVal / houseFromVal),
      wageMultiple: fmtMultiple(wageToVal / wageFromVal),
      houseFrom: fmt(houseFromVal),
      houseTo: fmt(houseToVal),
      wageFrom: fmt(wageFromVal),
      wageTo: fmt(wageToVal),
    }
  }

  function handleChange(raw: string) {
    setInput(raw)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const parsed = parseInt(raw, 10)
    if (!Number.isFinite(parsed) || parsed < 1940 || parsed > 2005) {
      return
    }
    debounceRef.current = setTimeout(() => {
      const from = parsed + 22
      setApplied(parsed)
      onApply(from, CURRENT_YEAR)
    }, 300)
  }

  function handleClear() {
    setInput("")
    setApplied(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    onClear()
  }

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const callout = applied !== null ? computeCallout(applied) : null

  return (
    <section className="rounded-2xl border border-(--color-border) bg-(--color-surface) p-6 md:p-8">
      <div className="text-xs text-(--color-muted) font-mono uppercase tracking-wide mb-2">
        Cohort window
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-3 text-base text-(--color-text)">
        <span>I was born in</span>
        <input
          type="number"
          min={1940}
          max={2005}
          value={input}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="e.g. 1985"
          className="bg-(--color-bg) border border-(--color-border) text-(--color-text) w-28 px-3 py-1.5 rounded-md text-base tabular-nums placeholder:text-(--color-muted) focus:outline-none focus:border-(--color-accent) transition-colors"
        />
        {applied !== null && (
          <button
            onClick={handleClear}
            className="text-xs text-(--color-muted) hover:text-(--color-text) border border-(--color-border) rounded-md px-2.5 py-1.5 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {callout && (
        <div className="mt-4 rounded-xl border border-(--color-border) bg-(--color-surface-2) px-4 py-3 text-sm text-(--color-muted) leading-relaxed">
          <span className="text-(--color-text) font-medium">Your working life: {callout.from} → {CURRENT_YEAR}.</span>
          {" "}House prices grew{" "}
          <span className="text-(--color-accent) font-semibold tabular-nums">{callout.houseMultiple}</span>
          {" "}({callout.houseFrom} → {callout.houseTo}), wages grew{" "}
          <span className="font-semibold tabular-nums" style={{ color: "#f59e0b" }}>{callout.wageMultiple}</span>
          {" "}({callout.wageFrom} → {callout.wageTo}) in that window.
        </div>
      )}
    </section>
  )
}
