import { Group } from "@visx/group"
import { LinePath } from "@visx/shape"
import { scaleLinear } from "@visx/scale"
import { AxisBottom, AxisLeft } from "@visx/axis"
import { GridRows } from "@visx/grid"
import { ParentSize } from "@visx/responsive"
import { curveMonotoneX } from "@visx/curve"
import type { Series, YearValue } from "../../types/series"

interface Props {
  series: Series[]
  baseYear: number
  fromYear?: number
  toYear?: number
}

const MUTED = "#9ca3af"
const GRID = "#2a2c36"

interface NormalizedSeries {
  meta: Series
  baseValue: number
  baseYearActual: number
  points: YearValue[]
}

// Normalize a series so its value at (or near) baseYear becomes 100.
// Tolerates baseYear being slightly before the series starts (within +3 years).
function normalize(s: Series, baseYear: number, fromYear: number): NormalizedSeries | null {
  let base = s.points.find((p) => p.year === baseYear)
  if (!base) {
    base = s.points.find((p) => p.year > baseYear && p.year <= baseYear + 3)
  }
  if (!base || base.value === 0) return null

  const points = s.points
    .filter((p) => p.year >= fromYear)
    .map((p) => ({ year: p.year, value: (p.value / base!.value) * 100 }))

  return { meta: s, baseValue: base.value, baseYearActual: base.year, points }
}

export function LayeredChart({ series, baseYear, fromYear, toYear }: Props) {
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
              <text x={width / 2} y={height / 2} fill={MUTED} fontSize={13} textAnchor="middle">
                No series have data at base year {baseYear}. Pick an earlier base or different series.
              </text>
            </svg>
          )
        }

        const allYears = normalized.flatMap((s) => s.points.map((p) => p.year))
        const allValues = normalized.flatMap((s) => s.points.map((p) => p.value))
        const endYear = toYear ?? Math.max(...allYears)

        const xScale = scaleLinear<number>({
          domain: [startYear, endYear],
          range: [0, innerW],
        })
        const yMax = Math.max(...allValues)
        const yScale = scaleLinear<number>({
          domain: [0, yMax * 1.05],
          range: [innerH, 0],
          nice: true,
        })

        return (
          <svg
            width={width}
            height={height}
            role="img"
            aria-label={`Series indexed to ${baseYear} = 100`}
          >
            <Group left={margin.left} top={margin.top}>
              <GridRows
                scale={yScale}
                width={innerW}
                stroke={GRID}
                strokeDasharray="2,4"
                numTicks={5}
              />

              {/* 100 reference line — every series equals this at baseYear. */}
              <line
                x1={0}
                x2={innerW}
                y1={yScale(100)}
                y2={yScale(100)}
                stroke={MUTED}
                strokeOpacity={0.5}
                strokeDasharray="3,3"
              />

              {/* Base year vertical marker. */}
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
                  <text
                    x={xScale(baseYear) + 4}
                    y={14}
                    fill={MUTED}
                    fontSize={11}
                    opacity={0.8}
                  >
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
                    <circle
                      cx={xScale(last.year)}
                      cy={yScale(last.value)}
                      r={3.5}
                      fill={s.meta.color}
                    />
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
