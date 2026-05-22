import { useMemo, useRef, useEffect, useState } from "react"
import type { Series } from "../types/series"
import { formatValue } from "../types/series"

interface Props {
  series: Series[]
}

function valueAt(series: Series[], id: string, year: number): number | null {
  const s = series.find((x) => x.id === id)
  if (!s) return null
  for (const offset of [0, 1, -1, 2, -2]) {
    const p = s.points.find((p) => p.year === year + offset)
    if (p) return p.value
  }
  return null
}

const BAR_YOUNG = "#38bdf8"
const BAR_OLDER = "#fb923c"

export function WealthGapSection({ series }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(600)

  useEffect(() => {
    if (!containerRef.current) return
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width)
      }
    })
    obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  const data = useMemo(() => {
    const young = series.find((s) => s.id === "wealth-25-34")
    const older = series.find((s) => s.id === "wealth-55-64")
    if (!young || !older) return null

    const youngYears = new Set(young.points.map((p) => p.year))
    const sharedYears = older.points
      .filter((p) => youngYears.has(p.year))
      .map((p) => p.year)
      .sort((a, b) => a - b)

    if (sharedYears.length === 0) return null

    const paired = sharedYears.map((year) => ({
      year,
      young: valueAt(series, "wealth-25-34", year) ?? 0,
      older: valueAt(series, "wealth-55-64", year) ?? 0,
    }))

    const latestYear = sharedYears[sharedYears.length - 1]
    const latestYoung = valueAt(series, "wealth-25-34", latestYear) ?? 0
    const latestOlder = valueAt(series, "wealth-55-64", latestYear) ?? 0
    const multiplier = latestOlder / latestYoung

    return { paired, latestYear, latestYoung, latestOlder, multiplier }
  }, [series])

  if (!data) return null

  const { paired, latestYear, latestYoung, latestOlder, multiplier } = data

  const MARGIN = { top: 16, right: 16, bottom: 36, left: 56 }
  const HEIGHT = 200
  const innerW = Math.max(width - MARGIN.left - MARGIN.right, 100)
  const innerH = HEIGHT - MARGIN.top - MARGIN.bottom

  const allValues = paired.flatMap((p) => [p.young, p.older])
  const maxVal = Math.max(...allValues)

  const n = paired.length
  const groupW = innerW / n
  const barW = Math.max(Math.min(groupW * 0.35, 24), 4)
  const gap = Math.max(groupW * 0.08, 2)

  // Y-axis ticks
  const tickCount = 4
  const ticks: number[] = []
  for (let i = 0; i <= tickCount; i++) {
    ticks.push((maxVal / tickCount) * i)
  }

  const multStr = multiplier >= 10 ? multiplier.toFixed(0) : multiplier.toFixed(1)

  return (
    <div className="rounded-2xl border border-(--color-border) bg-(--color-surface) p-6 md:p-8 mb-20">
      <h3 className="text-xl md:text-2xl font-semibold text-(--color-text) mb-1">
        The inheritance economy.
      </h3>
      <p className="text-sm text-(--color-muted) mb-6">
        Net household wealth by age group — the gap has widened every survey year.
      </p>

      <div ref={containerRef} className="w-full">
        <svg
          width="100%"
          height={HEIGHT}
          viewBox={`0 0 ${width} ${HEIGHT}`}
          aria-label="Wealth by age group chart"
          role="img"
        >
          <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
            {/* Y-axis ticks */}
            {ticks.map((t) => {
              const y = innerH - (t / maxVal) * innerH
              return (
                <g key={t}>
                  <line
                    x1={0}
                    x2={innerW}
                    y1={y}
                    y2={y}
                    stroke="var(--color-border)"
                    strokeWidth={0.5}
                  />
                  <text
                    x={-6}
                    y={y + 4}
                    textAnchor="end"
                    fontSize={10}
                    fill="var(--color-muted)"
                    fontFamily="monospace"
                  >
                    {t >= 1_000_000
                      ? `£${(t / 1_000_000).toFixed(1)}M`
                      : t >= 1000
                      ? `£${(t / 1000).toFixed(0)}k`
                      : `£${t}`}
                  </text>
                </g>
              )
            })}

            {/* Bars */}
            {paired.map((p, i) => {
              const cx = (i + 0.5) * groupW
              const youngH = (p.young / maxVal) * innerH
              const olderH = (p.older / maxVal) * innerH

              return (
                <g key={p.year}>
                  {/* young bar */}
                  <rect
                    x={cx - barW - gap / 2}
                    y={innerH - youngH}
                    width={barW}
                    height={youngH}
                    fill={BAR_YOUNG}
                    rx={2}
                  />
                  {/* older bar */}
                  <rect
                    x={cx + gap / 2}
                    y={innerH - olderH}
                    width={barW}
                    height={olderH}
                    fill={BAR_OLDER}
                    rx={2}
                  />
                  {/* x-axis label */}
                  <text
                    x={cx}
                    y={innerH + 16}
                    textAnchor="middle"
                    fontSize={10}
                    fill="var(--color-muted)"
                    fontFamily="monospace"
                  >
                    {p.year}
                  </text>
                </g>
              )
            })}
          </g>
        </svg>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-2 mb-4">
        <span className="flex items-center gap-1.5 text-xs text-(--color-muted)">
          <span
            className="inline-block w-3 h-3 rounded-sm"
            style={{ backgroundColor: BAR_YOUNG }}
          />
          Age 25–34
        </span>
        <span className="flex items-center gap-1.5 text-xs text-(--color-muted)">
          <span
            className="inline-block w-3 h-3 rounded-sm"
            style={{ backgroundColor: BAR_OLDER }}
          />
          Age 55–64
        </span>
      </div>

      <p className="text-sm text-(--color-text)">
        In {latestYear}, households aged 55–64 held{" "}
        <span className="font-semibold text-(--color-accent)">{multStr}×</span> more wealth (
        <span className="font-mono">{formatValue(latestOlder, "GBP")}</span>) than those aged 25–34 (
        <span className="font-mono">{formatValue(latestYoung, "GBP")}</span>).
      </p>
    </div>
  )
}
