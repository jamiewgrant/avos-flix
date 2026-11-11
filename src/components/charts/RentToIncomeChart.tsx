import { useMemo, useState } from "react"
import { Group } from "@visx/group"
import { LinePath } from "@visx/shape"
import { splitAtVerified, verifiedBoundary } from "../../lib/splitAtVerified"
import { scaleLinear } from "@visx/scale"
import { AxisBottom, AxisLeft } from "@visx/axis"
import { GridRows } from "@visx/grid"
import { ParentSize } from "@visx/responsive"
import { curveMonotoneX } from "@visx/curve"
import { useChartColors } from "../../lib/useChartColors"
import type { Series, YearValue } from "../../types/series"

interface Props {
  rentIndex: Series
  wage: Series
}

const ACCENT = "#fb923c"
const REF = "#9ca3af"

const RENT_REF_YEAR = 2015
const RENT_REF_MONTHLY = 750
const NET_FACTOR = 0.78

export function RentToIncomeChart({ rentIndex, wage }: Props) {
  const { muted: MUTED, grid: GRID, surface: SURFACE, border: BORDER, text: TEXT } = useChartColors()
  const [hovered, setHovered] = useState<number | null>(null)

  const ratio = useMemo<YearValue[]>(() => {
    const refIdx = rentIndex.points.find((p) => p.year === RENT_REF_YEAR)?.value
    if (!refIdx) return []
    const wageByYear = new Map(wage.points.map((p) => [p.year, p.value]))
    return rentIndex.points
      .map((p) => {
        const w = wageByYear.get(p.year)
        if (!w) return null
        const monthlyRent = (RENT_REF_MONTHLY * p.value) / refIdx
        const monthlyNet = (w * NET_FACTOR) / 12
        return { year: p.year, value: (monthlyRent / monthlyNet) * 100 }
      })
      .filter((p): p is YearValue => p !== null)
  }, [rentIndex, wage])

  if (ratio.length === 0) return null

  return (
    <ParentSize>
      {({ width }) => {
        if (width === 0) return null
        const height = Math.max(320, Math.min(440, width * 0.45))
        const margin = { top: 24, right: 24, bottom: 36, left: 56 }
        const innerW = width - margin.left - margin.right
        const innerH = height - margin.top - margin.bottom

        const years = ratio.map((p) => p.year)
        const xScale = scaleLinear<number>({ domain: [Math.min(...years), Math.max(...years)], range: [0, innerW] })
        const maxVal = Math.max(35, ...ratio.map((p) => p.value)) * 1.1
        const yScale = scaleLinear<number>({ domain: [0, maxVal], range: [innerH, 0], nice: true })

        function handleMove(e: React.PointerEvent<SVGRectElement>) {
          const rect = e.currentTarget.getBoundingClientRect()
          const x = e.clientX - rect.left
          const year = Math.round(xScale.invert(x))
          if (year < years[0] || year > years[years.length - 1]) setHovered(null)
          else setHovered(year)
        }

        const point = hovered === null ? null : ratio.find((p) => p.year === hovered)

        return (
          <svg width={width} height={height} role="img" aria-label="Rent as a share of median net pay">
            <Group left={margin.left} top={margin.top}>
              <GridRows scale={yScale} width={innerW} stroke={GRID} strokeDasharray="2,4" numTicks={5} />

              <line
                x1={0}
                x2={innerW}
                y1={yScale(30)}
                y2={yScale(30)}
                stroke={REF}
                strokeOpacity={0.5}
                strokeDasharray="4,4"
              />
              <text x={innerW - 4} y={yScale(30) - 4} fill={REF} fontSize={10} textAnchor="end">
                30% — conventional affordability ceiling
              </text>

              <AxisBottom
                top={innerH}
                scale={xScale}
                numTicks={8}
                tickFormat={(v) => `${v}`}
                stroke={GRID}
                tickStroke={GRID}
                tickLabelProps={{ fill: MUTED, fontSize: 12, textAnchor: "middle" }}
              />
              <AxisLeft
                scale={yScale}
                numTicks={5}
                tickFormat={(v) => `${Math.round(v as number)}%`}
                stroke={GRID}
                tickStroke={GRID}
                tickLabelProps={{ fill: MUTED, fontSize: 12, dx: -4, dy: 4, textAnchor: "end" }}
              />

              {/* Rent before the index's verifiedFrom year is an estimate — dashed. */}
              {(() => {
                const { estimated, verified } = splitAtVerified(ratio, verifiedBoundary(rentIndex))
                return (
                  <>
                    {estimated.length > 1 && (
                      <LinePath
                        data={estimated}
                        x={(p) => xScale(p.year)}
                        y={(p) => yScale(p.value)}
                        stroke={ACCENT}
                        strokeWidth={2}
                        strokeDasharray="5,4"
                        opacity={0.6}
                        curve={curveMonotoneX}
                      />
                    )}
                    {verified.length > 1 && (
                      <LinePath
                        data={verified}
                        x={(p) => xScale(p.year)}
                        y={(p) => yScale(p.value)}
                        stroke={ACCENT}
                        strokeWidth={2.5}
                        curve={curveMonotoneX}
                      />
                    )}
                  </>
                )
              })()}

              {point && (
                <g>
                  <line
                    x1={xScale(point.year)}
                    x2={xScale(point.year)}
                    y1={0}
                    y2={innerH}
                    stroke={TEXT}
                    strokeOpacity={0.4}
                  />
                  <circle cx={xScale(point.year)} cy={yScale(point.value)} r={5} fill={ACCENT} stroke={SURFACE} strokeWidth={2} />
                  <g transform={`translate(${Math.min(xScale(point.year) + 10, innerW - 110)}, 8)`}>
                    <rect width={110} height={36} rx={6} fill={SURFACE} stroke={BORDER} />
                    <text x={8} y={15} fill={TEXT} fontSize={11} fontWeight={600}>{point.year}</text>
                    <text x={8} y={29} fill={ACCENT} fontSize={11}>{point.value.toFixed(1)}% of net pay</text>
                  </g>
                </g>
              )}

              <rect
                x={0}
                y={0}
                width={innerW}
                height={innerH}
                fill="transparent"
                onPointerMove={handleMove}
                onPointerLeave={() => setHovered(null)}
              />
            </Group>
          </svg>
        )
      }}
    </ParentSize>
  )
}
