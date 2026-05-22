import { useMemo } from "react"
import type { Series } from "../types/series"

interface Props {
  series: Series[]
}

const SERIES_CONFIG = [
  { id: "intl-hpw-uk", label: "UK" },
  { id: "intl-hpw-germany", label: "Germany" },
  { id: "intl-hpw-canada", label: "Canada" },
]

const CHART_W = 600
const CHART_H = 260
const PAD = { top: 16, right: 24, bottom: 40, left: 48 }

function maxOf(nums: number[]): number {
  return nums.reduce((a, b) => Math.max(a, b), -Infinity)
}
function minOf(nums: number[]): number {
  return nums.reduce((a, b) => Math.min(a, b), Infinity)
}

export function InternationalComparison({ series }: Props) {
  const resolved = useMemo(
    () =>
      SERIES_CONFIG.map(({ id, label }) => ({
        label,
        s: series.find((s) => s.id === id),
      })).filter((r): r is { label: string; s: Series } => r.s !== undefined),
    [series],
  )

  const allPoints = useMemo(() => resolved.flatMap((r) => r.s.points), [resolved])

  const allYears = useMemo(() => allPoints.map((p) => p.year), [allPoints])
  const allValues = useMemo(() => allPoints.map((p) => p.value), [allPoints])

  const minYear = minOf(allYears)
  const maxYear = maxOf(allYears)
  const minVal = Math.floor(minOf(allValues)) - 0.5
  const maxVal = Math.ceil(maxOf(allValues)) + 0.5

  const xScale = (year: number) =>
    PAD.left + ((year - minYear) / (maxYear - minYear)) * (CHART_W - PAD.left - PAD.right)

  const yScale = (val: number) =>
    PAD.top + (1 - (val - minVal) / (maxVal - minVal)) * (CHART_H - PAD.top - PAD.bottom)

  const yTicks = useMemo(() => {
    const ticks: number[] = []
    const step = 2
    const start = Math.ceil(minVal / step) * step
    for (let v = start; v <= maxVal; v += step) ticks.push(v)
    return ticks
  }, [minVal, maxVal])

  const xTicks = useMemo(() => {
    const ticks: number[] = []
    for (let y = Math.ceil(minYear / 5) * 5; y <= maxYear; y += 5) ticks.push(y)
    return ticks
  }, [minYear, maxYear])

  if (resolved.length === 0) return null

  const ukSeries = resolved.find((r) => r.label === "UK")
  const ukPeak = ukSeries
    ? maxOf(ukSeries.s.points.map((p) => p.value))
    : null
  const germanyLatest = resolved.find((r) => r.label === "Germany")
  const germanyVal = germanyLatest
    ? germanyLatest.s.points[germanyLatest.s.points.length - 1].value
    : null

  return (
    <section
      className="rounded-2xl border border-(--color-border) bg-(--color-surface) p-6 md:p-8 mb-20"
      aria-label="International house-price-to-wage comparison"
    >
      <h2 className="text-xl md:text-2xl font-semibold text-(--color-text) mb-1">
        Is this just a UK problem?
      </h2>
      <p className="text-sm text-(--color-muted) mb-6">
        House-price-to-median-wage ratio across comparable economies.
      </p>

      {/* Chart */}
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          preserveAspectRatio="xMidYMid meet"
          className="w-full"
          style={{ minWidth: 280, maxHeight: 300 }}
          role="img"
          aria-label="Line chart comparing house-price-to-wage ratios for UK, Germany, and Canada"
        >
          {/* Grid lines */}
          {yTicks.map((v) => (
            <line
              key={v}
              x1={PAD.left}
              x2={CHART_W - PAD.right}
              y1={yScale(v)}
              y2={yScale(v)}
              stroke="currentColor"
              strokeOpacity={0.08}
              strokeWidth={1}
            />
          ))}

          {/* Y-axis labels */}
          {yTicks.map((v) => (
            <text
              key={v}
              x={PAD.left - 6}
              y={yScale(v)}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={11}
              fill="currentColor"
              opacity={0.5}
            >
              {v}×
            </text>
          ))}

          {/* X-axis labels */}
          {xTicks.map((y) => (
            <text
              key={y}
              x={xScale(y)}
              y={CHART_H - PAD.bottom + 14}
              textAnchor="middle"
              fontSize={11}
              fill="currentColor"
              opacity={0.5}
            >
              {y}
            </text>
          ))}

          {/* Series lines + labels */}
          {resolved.map(({ label, s }) => {
            const pts = [...s.points].sort((a, b) => a.year - b.year)
            const verifiedFrom = s.verifiedFrom ?? -Infinity

            // Split into dashed (before verifiedFrom) and solid (from verifiedFrom)
            const dashed = pts.filter((p) => p.year < verifiedFrom)
            const solid = pts.filter((p) => p.year >= verifiedFrom)
            // Ensure dashed connects to first solid point
            if (solid.length > 0 && dashed.length > 0) {
              dashed.push(solid[0])
            }

            const toPath = (arr: typeof pts) =>
              arr
                .map((p, i) => `${i === 0 ? "M" : "L"}${xScale(p.year).toFixed(1)},${yScale(p.value).toFixed(1)}`)
                .join(" ")

            const last = pts[pts.length - 1]
            const labelX = xScale(last.year) + 5
            const labelY = yScale(last.value)

            return (
              <g key={s.id}>
                {dashed.length > 1 && (
                  <path
                    d={toPath(dashed)}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={2}
                    strokeDasharray="4 3"
                    strokeOpacity={0.7}
                  />
                )}
                {solid.length > 1 && (
                  <path
                    d={toPath(solid)}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={2.5}
                  />
                )}
                <text
                  x={labelX}
                  y={labelY}
                  dominantBaseline="middle"
                  fontSize={11}
                  fontWeight={600}
                  fill={s.color}
                >
                  {label}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-4 mb-6">
        {resolved.map(({ label, s }) => (
          <div key={s.id} className="flex items-center gap-2 text-sm">
            <span
              className="inline-block w-5 h-0.5 rounded-full"
              style={{ backgroundColor: s.color, height: 2.5 }}
            />
            <span className="text-(--color-muted)">{label}</span>
          </div>
        ))}
      </div>

      {/* Callout */}
      {ukPeak !== null && germanyVal !== null && (
        <div className="rounded-xl bg-(--color-bg) border border-(--color-border) px-4 py-3 text-sm text-(--color-text)">
          The UK ratio peaked at{" "}
          <span className="font-semibold" style={{ color: "#c084fc" }}>
            {ukPeak.toFixed(1)}× wages
          </span>{" "}
          — Germany currently sits at{" "}
          <span className="font-semibold" style={{ color: "#fbbf24" }}>
            {germanyVal.toFixed(1)}×
          </span>
          .
        </div>
      )}
    </section>
  )
}
