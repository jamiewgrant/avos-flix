import { useState, useEffect, useRef } from "react"
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

function buildShareText(stat: Stat): string {
  const hint = stat.hint ? ` (${stat.hint})` : ""
  return `${stat.caption}: ${stat.headline}${hint} — avos-flix.vercel.app`
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <button
      onClick={handleCopy}
      aria-label="Copy stat"
      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity duration-150 p-1 rounded text-(--color-muted) hover:text-(--color-text) touch-device:opacity-100"
      style={{ touchAction: "manipulation" }}
    >
      {copied ? (
        <span className="text-xs leading-none select-none">✓</span>
      ) : (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  )
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
  const displayStats = stats.slice(0, 4)

  return <StatGrid displayStats={displayStats} />
}

function StatGrid({ displayStats }: { displayStats: Stat[] }) {
  const gridRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = gridRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.2 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={gridRef}
      className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6"
      role="region"
      aria-label="Key statistics"
      aria-live="polite"
      aria-atomic="true"
    >
      {displayStats.map((s, i) => (
        <div
          key={i}
          className="card card-hover rounded-xl p-4 relative group cursor-default"
        >
          <CopyButton text={buildShareText(s)} />
          <div
            className="text-2xl md:text-3xl font-semibold text-(--color-accent) group-hover:text-(--color-text) transition-colors duration-150 tabular-nums tracking-tight"
            style={
              visible
                ? { animation: "stat-in 400ms ease both", animationDelay: `${i * 80}ms` }
                : { opacity: 0, transform: "translateY(6px)" }
            }
          >
            {s.headline}
          </div>
          <div className="text-xs text-(--color-text) mt-1.5 leading-snug font-medium">{s.caption}</div>
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
