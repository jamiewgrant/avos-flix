import { useMemo, useState } from "react"
import { Group } from "@visx/group"
import { LinePath } from "@visx/shape"
import { scaleLinear } from "@visx/scale"
import { AxisBottom, AxisLeft } from "@visx/axis"
import { GridRows } from "@visx/grid"
import { ParentSize } from "@visx/responsive"
import { curveMonotoneX } from "@visx/curve"
import type { Series, YearValue } from "../../types/series"

interface Props {
  housePrice: Series
  wage: Series
  boeRate: Series
  ltv?: number // loan-to-value, default 0.90
  termYears?: number // mortgage term, default 25
  rateSpread?: number // bps over Bank Rate, default 100bps
  takeHomeFactor?: number // gross→net take-home, default 0.72
}

const ACCENT = "#fda4af"
const MUTED = "#9ca3af"
const GRID = "#2a2c36"
const TEXT = "#e8e6e3"
const SURFACE = "#16171d"
const BORDER = "#2e303a"
const DANGER = "#ef4444"

// Captures the rate-vs-principal trade-off explicitly. High rates with low
// principal (1980s) and low rates with high principal (2020s) both produce
// painful payments — and you can see which decade was worse on the same axis.
export function MortgageChart({
  housePrice,
  wage,
  boeRate,
  ltv = 0.9,
  termYears = 25,
  rateSpread = 1.0,
  takeHomeFactor = 0.72,
}: Props) {
  const [hovered, setHovered] = useState<number | null>(null)

  const burdenByYear = useMemo<YearValue[]>(() => {
    const wageByYear = new Map(wage.points.map((p) => [p.year, p.value]))
    const rateByYear = new Map(boeRate.points.map((p) => [p.year, p.value]))
    const n = termYears * 12
    return housePrice.points
      .map((hp) => {
        const w = wageByYear.get(hp.year)
        const r = rateByYear.get(hp.year)
        if (w === undefined || r === undefined || w === 0) return null
        const principal = hp.value * ltv
        const monthlyRate = (r + rateSpread) / 100 / 12
        const monthlyPayment =
          monthlyRate === 0
            ? principal / n
            : (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -n))
        const monthlyTakeHome = (w * takeHomeFactor) / 12
        const burden = (monthlyPayment / monthlyTakeHome) * 100
        return { year: hp.year, value: burden }
      })
      .filter((p): p is YearValue => p !== null)
  }, [housePrice, wage, boeRate, ltv, termYears, rateSpread, takeHomeFactor])

  if (burdenByYear.length === 0) return null

  return (
    <ParentSize>
      {({ width }) => {
        if (width === 0) return null
        const height = Math.max(300, Math.min(420, width * 0.42))
        const margin = { top: 24, right: 40, bottom: 36, left: 56 }
        const innerW = width - margin.left - margin.right
        const innerH = height - margin.top - margin.bottom

        const startYear = burdenByYear[0].year
        const endYear = burdenByYear[burdenByYear.length - 1].year
        const xScale = scaleLinear<number>({ domain: [startYear, endYear], range: [0, innerW] })
        const maxBurden = Math.max(...burdenByYear.map((p) => p.value))
        const yScale = scaleLinear<number>({
          domain: [0, Math.ceil(maxBurden / 10) * 10 + 10],
          range: [innerH, 0],
          nice: true,
        })

        function handleMove(e: React.PointerEvent<SVGRectElement>) {
          const rect = e.currentTarget.getBoundingClientRect()
          const x = e.clientX - rect.left
          const year = Math.round(xScale.invert(x))
          if (year >= startYear && year <= endYear) setHovered(year)
          else setHovered(null)
        }

        const hoverPoint = hovered === null ? null : burdenByYear.find((p) => p.year === hovered)

        return (
          <svg width={width} height={height} role="img" aria-label="Mortgage payment burden over time">
            <Group left={margin.left} top={margin.top}>
              <GridRows scale={yScale} width={innerW} stroke={GRID} strokeDasharray="2,4" numTicks={6} />

              {/* 30% affordability threshold reference line */}
              {30 < yScale.domain()[1] && (
                <>
                  <line
                    x1={0}
                    x2={innerW}
                    y1={yScale(30)}
                    y2={yScale(30)}
                    stroke={DANGER}
                    strokeOpacity={0.45}
                    strokeDasharray="4,4"
                  />
                  <text x={4} y={yScale(30) - 6} fill={DANGER} fontSize={11} opacity={0.7}>
                    30% — "affordable" threshold
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
                numTicks={6}
                tickFormat={(v) => `${v}%`}
                stroke={GRID}
                tickStroke={GRID}
                tickLabelProps={{ fill: MUTED, fontSize: 12, dx: -4, dy: 4, textAnchor: "end" }}
              />

              <LinePath
                data={burdenByYear}
                x={(p) => xScale(p.year)}
                y={(p) => yScale(p.value)}
                stroke={ACCENT}
                strokeWidth={2.5}
                curve={curveMonotoneX}
              />

              {hovered !== null && hoverPoint && (
                <>
                  <line
                    x1={xScale(hovered)}
                    x2={xScale(hovered)}
                    y1={0}
                    y2={innerH}
                    stroke={TEXT}
                    strokeOpacity={0.4}
                  />
                  <circle
                    cx={xScale(hoverPoint.year)}
                    cy={yScale(hoverPoint.value)}
                    r={4}
                    fill={ACCENT}
                    stroke={SURFACE}
                    strokeWidth={2}
                  />
                  <g
                    transform={`translate(${xScale(hovered) + (xScale(hovered) > innerW - 200 ? -210 : 12)}, 0)`}
                  >
                    <rect width={200} height={56} rx={8} fill={SURFACE} stroke={BORDER} opacity={0.97} />
                    <text x={10} y={18} fill={TEXT} fontSize={12} fontWeight={700}>
                      {hovered}
                    </text>
                    <text x={10} y={38} fill={MUTED} fontSize={11}>
                      Mortgage payment
                    </text>
                    <text x={190} y={38} fill={ACCENT} fontSize={13} fontWeight={700} textAnchor="end">
                      {hoverPoint.value.toFixed(0)}% of take-home
                    </text>
                  </g>
                </>
              )}

              {hovered === null && (
                <>
                  <circle
                    cx={xScale(burdenByYear[burdenByYear.length - 1].year)}
                    cy={yScale(burdenByYear[burdenByYear.length - 1].value)}
                    r={4}
                    fill={ACCENT}
                  />
                  <text
                    x={xScale(burdenByYear[burdenByYear.length - 1].year) - 8}
                    y={yScale(burdenByYear[burdenByYear.length - 1].value) - 8}
                    fill={ACCENT}
                    fontSize={13}
                    fontWeight={700}
                    textAnchor="end"
                  >
                    {burdenByYear[burdenByYear.length - 1].value.toFixed(0)}%
                  </text>
                </>
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
