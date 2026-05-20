import { useMemo, useState } from "react"
import type { Series } from "../types/series"
import { formatValue } from "../types/series"

interface Props {
  series: Series[]
}

function nearestPoint(s: Series, year: number) {
  let best = s.points[0]
  if (!best) return null
  let bestDist = Math.abs(best.year - year)
  for (const p of s.points) {
    const d = Math.abs(p.year - year)
    if (d < bestDist) {
      best = p
      bestDist = d
    }
  }
  return bestDist <= 2 ? best : null
}

function fmtRatio(x: number): string {
  if (!Number.isFinite(x)) return "—"
  if (x >= 10) return `${x.toFixed(0)}×`
  return `${x.toFixed(1)}×`
}

export function ThenVsNow({ series }: Props) {
  const years = useMemo(() => {
    const set = new Set<number>()
    for (const s of series) for (const p of s.points) set.add(p.year)
    return [...set].sort((a, b) => a - b)
  }, [series])

  const [yearA, setYearA] = useState<number>(1995)
  const [yearB, setYearB] = useState<number>(years[years.length - 1] ?? 2025)

  const rows = useMemo(() => {
    return series
      .filter((s) => s.points.length > 1)
      .map((s) => {
        const a = nearestPoint(s, yearA)
        const b = nearestPoint(s, yearB)
        if (!a || !b) return null
        return {
          id: s.id,
          name: s.name,
          color: s.color,
          unit: s.unit,
          aValue: a.value,
          bValue: b.value,
          aYear: a.year,
          bYear: b.year,
          ratio: a.value === 0 ? Infinity : b.value / a.value,
        }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => b.ratio - a.ratio)
  }, [series, yearA, yearB])

  return (
    <div className="rounded-2xl border border-(--color-border) bg-(--color-surface) p-5 md:p-6">
      <div className="text-xs text-(--color-muted) font-mono uppercase tracking-wide mb-3">
        Then vs now
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm mb-4">
        <span className="text-(--color-muted)">Compare</span>
        <select
          value={yearA}
          onChange={(e) => setYearA(Number(e.target.value))}
          className="bg-(--color-bg) border border-(--color-border) rounded-lg px-3 py-1.5 text-(--color-text) focus:outline-none focus:border-(--color-accent)"
        >
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <span className="text-(--color-muted)">→</span>
        <select
          value={yearB}
          onChange={(e) => setYearB(Number(e.target.value))}
          className="bg-(--color-bg) border border-(--color-border) rounded-lg px-3 py-1.5 text-(--color-text) focus:outline-none focus:border-(--color-accent)"
        >
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <span className="text-(--color-muted) text-xs ml-auto">sorted by biggest change</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {rows.map((r) => (
          <div
            key={r.id}
            className="flex items-center gap-3 rounded-lg bg-(--color-bg) border border-(--color-border) px-3 py-2"
          >
            <span className="size-2.5 rounded-full shrink-0" style={{ background: r.color }} />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-(--color-text) truncate">{r.name}</div>
              <div className="text-[10px] text-(--color-muted) font-mono tabular-nums">
                {formatValue(r.aValue, r.unit)} → {formatValue(r.bValue, r.unit)}
              </div>
            </div>
            <div
              className="font-semibold tabular-nums text-sm shrink-0"
              style={{ color: r.ratio > 3 ? "var(--color-accent)" : "var(--color-text)" }}
            >
              {fmtRatio(r.ratio)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
