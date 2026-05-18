import { Group } from "@visx/group"
import { LinePath } from "@visx/shape"
import { scaleLinear } from "@visx/scale"
import { AxisBottom, AxisLeft } from "@visx/axis"
import { GridRows } from "@visx/grid"
import { ParentSize } from "@visx/responsive"
import { curveMonotoneX } from "@visx/curve"
import type { Series, Unit, YearValue } from "../../types/series"
import { UNIT_LABEL, formatAxisValue } from "../../types/series"

export type ChartMode = "indexed" | "raw"

interface ChartProps {
  series: Series[]
  mode: ChartMode
  baseYear: number
  fromYear?: number
  toYear?: number
}

const MUTED = "#9ca3af"
const GRID = "#2a2c36"

export function Chart({ series, mode, baseYear, fromYear, toYear }: ChartProps) {
  if (mode === "indexed") {
    return <IndexedView series={series} baseYear={baseYear} fromYear={fromYear} toYear={toYear} />
  }
  return <RawView series={series} fromYear={fromYear} toYear={toYear} />
}

// ─── Indexed: every series rebased to baseYear=100, one shared axis ──────────

interface NormalizedSeries {
  meta: Series
  baseYearActual: number
  points: YearValue[]
}

function normalize(s: Series, baseYear: number, fromYear: number): NormalizedSeries | null {
  let base = s.points.find((p) => p.year === baseYear)
  if (!base) {
    base = s.points.find((p) => p.year > baseYear && p.year <= baseYear + 3)
  }
  if (!base || base.value === 0) return null
  const points = s.points
    .filter((p) => p.year >= fromYear)
    .map((p) => ({ year: p.year, value: (p.value / base!.value) * 100 }))
  return { meta: s, baseYearActual: base.year, points }
}

function IndexedView({
  series,
  baseYear,
  fromYear,
  toYear,
}: {
  series: Series[]
  baseYear: number
  fromYear?: number
  toYear?: number
}) {
  const startYear = fromYear ?? baseYear
  const normalized = series
    .map((s) => normalize(s, baseYear, startYear))
    .filter((s): s is NormalizedSeries => s !== null && s.points.length > 1)

  return (
    <ParentSize>
      {({ width }) => {
        if (width === 0) return null
        const height = Math.max(340, Math.min(540, width * 0.55))
        const margin = { top: 20, right: 92, bottom: 36, left: 56 }
        const innerW = width - margin.left - margin.right
        const innerH = height - margin.top - margin.bottom

        if (normalized.length === 0) {
          return (
            <svg width={width} height={height}>
              <text
                x={width / 2}
                y={height / 2}
                fill={MUTED}
                fontSize={13}
                textAnchor="middle"
              >
                No series have data at base year {baseYear}. Pick an earlier base or different series.
              </text>
            </svg>
          )
        }

        const allYears = normalized.flatMap((s) => s.points.map((p) => p.year))
        const allValues = normalized.flatMap((s) => s.points.map((p) => p.value))
        const endYear = toYear ?? Math.max(...allYears)

        const xScale = scaleLinear<number>({ domain: [startYear, endYear], range: [0, innerW] })
        const yScale = scaleLinear<number>({
          domain: [0, Math.max(...allValues) * 1.05],
          range: [innerH, 0],
          nice: true,
        })

        return (
          <svg width={width} height={height} role="img" aria-label={`Series indexed to ${baseYear} = 100`}>
            <Group left={margin.left} top={margin.top}>
              <GridRows scale={yScale} width={innerW} stroke={GRID} strokeDasharray="2,4" numTicks={5} />

              <line
                x1={0}
                x2={innerW}
                y1={yScale(100)}
                y2={yScale(100)}
                stroke={MUTED}
                strokeOpacity={0.5}
                strokeDasharray="3,3"
              />

              {baseYear >= startYear && baseYear <= endYear && (
                <>
                  <line
                    x1={xScale(baseYear)}
                    x2={xScale(baseYear)}
                    y1={0}
                    y2={innerH}
                    stroke={MUTED}
                    strokeOpacity={0.3}
                    strokeDasharray="2,3"
                  />
                  <text x={xScale(baseYear) + 4} y={14} fill={MUTED} fontSize={11} opacity={0.8}>
                    {baseYear} = 100
                  </text>
                </>
              )}

              <AxisBottom
                top={innerH}
                scale={xScale}
                numTicks={Math.min(8, endYear - startYear)}
                tickFormat={(v) => `${v}`}
                stroke={GRID}
                tickStroke={GRID}
                tickLabelProps={{ fill: MUTED, fontSize: 12, textAnchor: "middle" }}
              />
              <AxisLeft
                scale={yScale}
                numTicks={5}
                tickFormat={(v) => `${v}`}
                stroke={GRID}
                tickStroke={GRID}
                tickLabelProps={{ fill: MUTED, fontSize: 12, dx: -4, dy: 4, textAnchor: "end" }}
              />

              {normalized.map((s) => (
                <LinePath
                  key={s.meta.id}
                  data={s.points}
                  x={(p) => xScale(p.year)}
                  y={(p) => yScale(p.value)}
                  stroke={s.meta.color}
                  strokeWidth={2.5}
                  curve={curveMonotoneX}
                />
              ))}

              {normalized.map((s) => {
                const last = s.points[s.points.length - 1]
                if (!last) return null
                return (
                  <g key={`${s.meta.id}-label`}>
                    <circle cx={xScale(last.year)} cy={yScale(last.value)} r={3.5} fill={s.meta.color} />
                    <text
                      x={xScale(last.year) + 8}
                      y={yScale(last.value) + 4}
                      fill={s.meta.color}
                      fontSize={12}
                      fontWeight={600}
                    >
                      {Math.round(last.value)}
                    </text>
                  </g>
                )
              })}
            </Group>
          </svg>
        )
      }}
    </ParentSize>
  )
}

// ─── Raw: small multiples, one panel per unit, native scales ─────────────────

function RawView({
  series,
  fromYear,
  toYear,
}: {
  series: Series[]
  fromYear?: number
  toYear?: number
}) {
  const groups = new Map<Unit, Series[]>()
  for (const s of series) {
    if (s.points.length === 0) continue
    const arr = groups.get(s.unit) ?? []
    arr.push(s)
    groups.set(s.unit, arr)
  }

  if (groups.size === 0) {
    return (
      <div className="h-[300px] grid place-items-center text-(--color-muted) text-sm">
        No series selected.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {[...groups.entries()].map(([unit, ser]) => (
        <UnitPanel key={unit} unit={unit} series={ser} fromYear={fromYear} toYear={toYear} />
      ))}
    </div>
  )
}

function UnitPanel({
  unit,
  series,
  fromYear,
  toYear,
}: {
  unit: Unit
  series: Series[]
  fromYear?: number
  toYear?: number
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="text-xs text-(--color-muted) font-mono uppercase tracking-wide">
          {UNIT_LABEL[unit]}
        </div>
        <div className="flex flex-wrap gap-3 text-xs">
          {series.map((s) => (
            <span key={s.id} className="flex items-center gap-1.5" style={{ color: s.color }}>
              <span className="size-2 rounded-full" style={{ background: s.color }} />
              {s.name}
            </span>
          ))}
        </div>
      </div>
      <ParentSize>
        {({ width }) => {
          if (width === 0) return null
          const height = Math.max(160, Math.min(260, width * 0.28))
          const margin = { top: 8, right: 56, bottom: 24, left: 56 }
          const innerW = width - margin.left - margin.right
          const innerH = height - margin.top - margin.bottom

          const allPoints = series.flatMap((s) => s.points)
          const allYears = allPoints.map((p) => p.year)
          const allValues = allPoints.map((p) => p.value)
          const startYear = fromYear ?? Math.min(...allYears)
          const endYear = toYear ?? Math.max(...allYears)

          const xScale = scaleLinear<number>({
            domain: [startYear, endYear],
            range: [0, innerW],
          })

          const yMin = Math.min(0, ...allValues)
          const yMax = Math.max(...allValues)
          const yScale = scaleLinear<number>({
            domain: [yMin, yMax * 1.05],
            range: [innerH, 0],
            nice: true,
          })

          return (
            <svg width={width} height={height} role="img" aria-label={`${UNIT_LABEL[unit]} time series`}>
              <Group left={margin.left} top={margin.top}>
                <GridRows scale={yScale} width={innerW} stroke={GRID} strokeDasharray="2,4" numTicks={4} />
                <AxisBottom
                  top={innerH}
                  scale={xScale}
                  numTicks={Math.min(7, endYear - startYear)}
                  tickFormat={(v) => `${v}`}
                  stroke={GRID}
                  tickStroke={GRID}
                  tickLabelProps={{ fill: MUTED, fontSize: 11, textAnchor: "middle" }}
                />
                <AxisLeft
                  scale={yScale}
                  numTicks={4}
                  tickFormat={(v) => formatAxisValue(v as number, unit)}
                  stroke={GRID}
                  tickStroke={GRID}
                  tickLabelProps={{
                    fill: MUTED,
                    fontSize: 11,
                    dx: -4,
                    dy: 4,
                    textAnchor: "end",
                  }}
                />
                {series.map((s) => (
                  <LinePath
                    key={s.id}
                    data={s.points.filter((p) => p.year >= startYear && p.year <= endYear)}
                    x={(p) => xScale(p.year)}
                    y={(p) => yScale(p.value)}
                    stroke={s.color}
                    strokeWidth={2}
                    curve={curveMonotoneX}
                  />
                ))}
                {series.map((s) => {
                  const inRange = s.points.filter((p) => p.year >= startYear && p.year <= endYear)
                  const last = inRange[inRange.length - 1]
                  if (!last) return null
                  return (
                    <g key={`${s.id}-tail`}>
                      <circle cx={xScale(last.year)} cy={yScale(last.value)} r={2.5} fill={s.color} />
                    </g>
                  )
                })}
              </Group>
            </svg>
          )
        }}
      </ParentSize>
    </div>
  )
}
