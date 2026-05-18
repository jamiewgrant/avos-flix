import { useMemo, useState } from "react"
import { Group } from "@visx/group"
import { LinePath } from "@visx/shape"
import { scaleLinear } from "@visx/scale"
import { AxisBottom, AxisLeft, AxisRight } from "@visx/axis"
import { GridRows } from "@visx/grid"
import { ParentSize } from "@visx/responsive"
import { curveMonotoneX } from "@visx/curve"
import type { Series, YearValue } from "../../types/series"

interface Props {
  housePrice: Series
  wage: Series
  boeRate: Series
}

const ACCENT = "#c084fc"
const RATE_COLOR = "#fb923c"
const MUTED = "#9ca3af"
const GRID = "#2a2c36"
const TEXT = "#e8e6e3"
const SURFACE = "#16171d"
const BORDER = "#2e303a"

export function AffordabilityChart({ housePrice, wage, boeRate }: Props) {
  const [hovered, setHovered] = useState<number | null>(null)

  const affordability = useMemo<YearValue[]>(() => {
    const wageByYear = new Map(wage.points.map((p) => [p.year, p.value]))
    return housePrice.points
      .map((p) => {
        const w = wageByYear.get(p.year)
        if (!w || w === 0) return null
        return { year: p.year, value: p.value / w }
      })
      .filter((p): p is YearValue => p !== null)
  }, [housePrice, wage])

  if (affordability.length === 0) return null

  return (
    <ParentSize>
      {({ width }) => {
        if (width === 0) return null
        const height = Math.max(320, Math.min(440, width * 0.45))
        const margin = { top: 24, right: 64, bottom: 36, left: 56 }
        const innerW = width - margin.left - margin.right
        const innerH = height - margin.top - margin.bottom

        const startYear = affordability[0].year
        const endYear = affordability[affordability.length - 1].year

        // Trim BoE to the affordability range.
        const boeInRange = boeRate.points.filter(
          (p) => p.year >= startYear && p.year <= endYear,
        )

        const xScale = scaleLinear<number>({ domain: [startYear, endYear], range: [0, innerW] })

        const affMax = Math.max(...affordability.map((p) => p.value))
        const yLeft = scaleLinear<number>({
          domain: [0, Math.ceil(affMax * 1.05)],
          range: [innerH, 0],
          nice: true,
        })

        const rateMax = Math.max(...boeInRange.map((p) => p.value), 1)
        const yRight = scaleLinear<number>({
          domain: [0, Math.ceil(rateMax * 1.1)],
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

        const affAt = hovered === null ? null : affordability.find((p) => p.year === hovered)
        const rateAt =
          hovered === null
            ? null
            : boeRate.points.reduce<YearValue | null>(
                (best, p) =>
                  p.year <= hovered && (!best || p.year > best.year) ? p : best,
                null,
              )

        return (
          <svg width={width} height={height} role="img" aria-label="UK affordability ratio vs Bank Rate">
            <Group left={margin.left} top={margin.top}>
              <GridRows
                scale={yLeft}
                width={innerW}
                stroke={GRID}
                strokeDasharray="2,4"
                numTicks={5}
              />

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
                scale={yLeft}
                numTicks={5}
                tickFormat={(v) => `${v}×`}
                stroke={GRID}
                tickStroke={GRID}
                tickLabelProps={{ fill: ACCENT, fontSize: 12, dx: -4, dy: 4, textAnchor: "end" }}
              />
              <AxisRight
                left={innerW}
                scale={yRight}
                numTicks={5}
                tickFormat={(v) => `${v}%`}
                stroke={GRID}
                tickStroke={GRID}
                tickLabelProps={{ fill: RATE_COLOR, fontSize: 12, dx: 4, dy: 4, textAnchor: "start" }}
              />

              {/* BoE rate underneath (visually backgrounded) */}
              <LinePath
                data={boeInRange}
                x={(p) => xScale(p.year)}
                y={(p) => yRight(p.value)}
                stroke={RATE_COLOR}
                strokeWidth={1.75}
                strokeDasharray="4,4"
                curve={curveMonotoneX}
                opacity={0.85}
              />

              {/* Affordability ratio on top */}
              <LinePath
                data={affordability}
                x={(p) => xScale(p.year)}
                y={(p) => yLeft(p.value)}
                stroke={ACCENT}
                strokeWidth={2.75}
                curve={curveMonotoneX}
              />

              {/* End label */}
              {hovered === null && (
                <>
                  <circle
                    cx={xScale(affordability[affordability.length - 1].year)}
                    cy={yLeft(affordability[affordability.length - 1].value)}
                    r={4}
                    fill={ACCENT}
                  />
                  <text
                    x={xScale(affordability[affordability.length - 1].year) - 8}
                    y={yLeft(affordability[affordability.length - 1].value) - 8}
                    fill={ACCENT}
                    fontSize={13}
                    fontWeight={700}
                    textAnchor="end"
                  >
                    {affordability[affordability.length - 1].value.toFixed(1)}× salary
                  </text>
                </>
              )}

              {/* Crosshair */}
              {hovered !== null && (
                <>
                  <line
                    x1={xScale(hovered)}
                    x2={xScale(hovered)}
                    y1={0}
                    y2={innerH}
                    stroke={TEXT}
                    strokeOpacity={0.4}
                  />
                  {affAt && (
                    <circle cx={xScale(affAt.year)} cy={yLeft(affAt.value)} r={4} fill={ACCENT} stroke={SURFACE} strokeWidth={2} />
                  )}
                  {rateAt && (
                    <circle cx={xScale(hovered)} cy={yRight(rateAt.value)} r={4} fill={RATE_COLOR} stroke={SURFACE} strokeWidth={2} />
                  )}
                  <g transform={`translate(${xScale(hovered) + (xScale(hovered) > innerW - 180 ? -190 : 10)}, 0)`}>
                    <rect width={180} height={66} rx={8} fill={SURFACE} stroke={BORDER} opacity={0.97} />
                    <text x={10} y={18} fill={TEXT} fontSize={12} fontWeight={700}>{hovered}</text>
                    {affAt && (
                      <g transform="translate(10, 36)">
                        <circle cx={4} cy={-4} r={3.5} fill={ACCENT} />
                        <text x={14} y={0} fill={MUTED} fontSize={11}>Affordability</text>
                        <text x={170} y={0} fill={TEXT} fontSize={11} fontWeight={700} textAnchor="end">{affAt.value.toFixed(1)}× salary</text>
                      </g>
                    )}
                    {rateAt && (
                      <g transform="translate(10, 54)">
                        <circle cx={4} cy={-4} r={3.5} fill={RATE_COLOR} />
                        <text x={14} y={0} fill={MUTED} fontSize={11}>Bank Rate</text>
                        <text x={170} y={0} fill={TEXT} fontSize={11} fontWeight={700} textAnchor="end">{rateAt.value.toFixed(2)}%</text>
                      </g>
                    )}
                  </g>
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
