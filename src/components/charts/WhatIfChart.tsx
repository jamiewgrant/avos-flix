import { useMemo, useState } from "react"
import { Group } from "@visx/group"
import { LinePath, Area } from "@visx/shape"
import { scaleLinear } from "@visx/scale"
import { AxisBottom, AxisLeft } from "@visx/axis"
import { GridRows } from "@visx/grid"
import { ParentSize } from "@visx/responsive"
import { curveMonotoneX } from "@visx/curve"
import type { Series, YearValue } from "../../types/series"
import { formatValue } from "../../types/series"

interface Props {
  housePrice: Series
  wage: Series
  baseYear?: number
}

const ACTUAL = "#a78bfa"
const COUNTERFACTUAL = "#34d399"
const MUTED = "#9ca3af"
const GRID = "#2a2c36"
const TEXT = "#e8e6e3"
const SURFACE = "#16171d"
const BORDER = "#2e303a"

export function WhatIfChart({ housePrice, wage, baseYear = 1995 }: Props) {
  const [hovered, setHovered] = useState<number | null>(null)

  const data = useMemo(() => {
    const wageBase = wage.points.find((p) => p.year === baseYear)?.value
    const houseBase = housePrice.points.find((p) => p.year === baseYear)?.value
    if (!wageBase || !houseBase) return null
    const wageByYear = new Map(wage.points.map((p) => [p.year, p.value]))

    const actual: YearValue[] = []
    const counterfactual: YearValue[] = []
    for (const p of housePrice.points) {
      if (p.year < baseYear) continue
      const w = wageByYear.get(p.year)
      if (!w) continue
      actual.push({ year: p.year, value: p.value })
      counterfactual.push({ year: p.year, value: houseBase * (w / wageBase) })
    }
    return { actual, counterfactual }
  }, [housePrice, wage, baseYear])

  if (!data || data.actual.length === 0) return null

  const latest = data.actual[data.actual.length - 1]
  const latestCounter = data.counterfactual[data.counterfactual.length - 1]
  const gap = latest.value - latestCounter.value

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="rounded-xl bg-(--color-bg) border border-(--color-border) p-3">
          <div className="text-xs text-(--color-muted) mb-1">Actual {latest.year}</div>
          <div className="text-xl font-semibold text-white tabular-nums">{formatValue(latest.value, "GBP")}</div>
        </div>
        <div className="rounded-xl bg-(--color-bg) border border-(--color-border) p-3">
          <div className="text-xs text-(--color-muted) mb-1">If grown at wage rate</div>
          <div className="text-xl font-semibold tabular-nums" style={{ color: COUNTERFACTUAL }}>
            {formatValue(latestCounter.value, "GBP")}
          </div>
        </div>
        <div className="rounded-xl bg-(--color-bg) border border-(--color-border) p-3">
          <div className="text-xs text-(--color-muted) mb-1">Gap</div>
          <div className="text-xl font-semibold text-white tabular-nums">{formatValue(gap, "GBP")}</div>
        </div>
      </div>

      <ParentSize>
        {({ width }) => {
          if (width === 0) return null
          const height = Math.max(280, Math.min(380, width * 0.4))
          const margin = { top: 16, right: 16, bottom: 32, left: 64 }
          const innerW = width - margin.left - margin.right
          const innerH = height - margin.top - margin.bottom

          const years = data.actual.map((p) => p.year)
          const xScale = scaleLinear<number>({ domain: [Math.min(...years), Math.max(...years)], range: [0, innerW] })
          const maxVal = Math.max(...data.actual.map((p) => p.value)) * 1.05
          const yScale = scaleLinear<number>({ domain: [0, maxVal], range: [innerH, 0], nice: true })

          function handleMove(e: React.PointerEvent<SVGRectElement>) {
            const rect = e.currentTarget.getBoundingClientRect()
            const x = e.clientX - rect.left
            const year = Math.round(xScale.invert(x))
            if (year < years[0] || year > years[years.length - 1]) setHovered(null)
            else setHovered(year)
          }

          const gapArea = data.actual.map((p, i) => ({
            year: p.year,
            actual: p.value,
            counter: data.counterfactual[i]?.value ?? p.value,
          }))

          const hoverActual = hovered === null ? null : data.actual.find((p) => p.year === hovered)
          const hoverCounter = hovered === null ? null : data.counterfactual.find((p) => p.year === hovered)

          return (
            <svg width={width} height={height} role="img" aria-label="Actual vs counterfactual house prices">
              <Group left={margin.left} top={margin.top}>
                <GridRows scale={yScale} width={innerW} stroke={GRID} strokeDasharray="2,4" numTicks={5} />

                <Area
                  data={gapArea}
                  x={(p) => xScale(p.year)}
                  y0={(p) => yScale(p.counter)}
                  y1={(p) => yScale(p.actual)}
                  fill={ACTUAL}
                  opacity={0.12}
                  curve={curveMonotoneX}
                />

                <AxisBottom
                  top={innerH}
                  scale={xScale}
                  numTicks={6}
                  tickFormat={(v) => `${v}`}
                  stroke={GRID}
                  tickStroke={GRID}
                  tickLabelProps={{ fill: MUTED, fontSize: 11, textAnchor: "middle" }}
                />
                <AxisLeft
                  scale={yScale}
                  numTicks={5}
                  tickFormat={(v) => `£${Math.round((v as number) / 1000)}k`}
                  stroke={GRID}
                  tickStroke={GRID}
                  tickLabelProps={{ fill: MUTED, fontSize: 11, dx: -4, dy: 4, textAnchor: "end" }}
                />

                <LinePath
                  data={data.counterfactual}
                  x={(p) => xScale(p.year)}
                  y={(p) => yScale(p.value)}
                  stroke={COUNTERFACTUAL}
                  strokeWidth={2.5}
                  strokeDasharray="6,4"
                  curve={curveMonotoneX}
                />
                <LinePath
                  data={data.actual}
                  x={(p) => xScale(p.year)}
                  y={(p) => yScale(p.value)}
                  stroke={ACTUAL}
                  strokeWidth={2.5}
                  curve={curveMonotoneX}
                />

                {hoverActual && hoverCounter && (
                  <g>
                    <line
                      x1={xScale(hoverActual.year)}
                      x2={xScale(hoverActual.year)}
                      y1={0}
                      y2={innerH}
                      stroke={TEXT}
                      strokeOpacity={0.4}
                    />
                    <circle cx={xScale(hoverActual.year)} cy={yScale(hoverActual.value)} r={4} fill={ACTUAL} stroke={SURFACE} strokeWidth={2} />
                    <circle cx={xScale(hoverCounter.year)} cy={yScale(hoverCounter.value)} r={4} fill={COUNTERFACTUAL} stroke={SURFACE} strokeWidth={2} />
                    <g transform={`translate(${Math.min(xScale(hoverActual.year) + 10, innerW - 150)}, 8)`}>
                      <rect width={148} height={54} rx={6} fill={SURFACE} stroke={BORDER} />
                      <text x={8} y={15} fill={TEXT} fontSize={11} fontWeight={600}>{hoverActual.year}</text>
                      <text x={8} y={31} fill={ACTUAL} fontSize={11}>Actual: {formatValue(hoverActual.value, "GBP")}</text>
                      <text x={8} y={46} fill={COUNTERFACTUAL} fontSize={11}>If wage-paced: {formatValue(hoverCounter.value, "GBP")}</text>
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

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-(--color-muted) px-1">
        <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-[2px]" style={{ background: ACTUAL }} /> Actual house price</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-[2px] border-t border-dashed" style={{ borderColor: COUNTERFACTUAL }} /> If grown at wage rate since {baseYear}</span>
      </div>
    </div>
  )
}
