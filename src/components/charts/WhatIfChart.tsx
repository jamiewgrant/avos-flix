import { useMemo, useState } from "react"
import { Group } from "@visx/group"
import { LinePath, Area } from "@visx/shape"
import { scaleLinear } from "@visx/scale"
import { AxisBottom, AxisLeft } from "@visx/axis"
import { GridRows } from "@visx/grid"
import { ParentSize } from "@visx/responsive"
import { curveMonotoneX } from "@visx/curve"
import { useChartColors } from "../../lib/useChartColors"
import type { Series, YearValue } from "../../types/series"
import { formatValue } from "../../types/series"

interface Props {
  housePrice: Series
  wage: Series
  baseYear?: number
}

const ACTUAL_HOUSE = "#a78bfa"
const COUNTERFACTUAL_HOUSE = "#34d399"
const ACTUAL_WAGE = "#60a5fa"
const COUNTERFACTUAL_WAGE = "#f59e0b"

export function WhatIfChart({ housePrice, wage, baseYear = 1995 }: Props) {
  const { muted: MUTED, grid: GRID, surface: SURFACE, border: BORDER, text: TEXT } = useChartColors()
  const [hovered, setHovered] = useState<number | null>(null)

  const data = useMemo(() => {
    const wageBase = wage.points.find((p) => p.year === baseYear)?.value
    const houseBase = housePrice.points.find((p) => p.year === baseYear)?.value
    if (!wageBase || !houseBase) return null
    const wageByYear = new Map(wage.points.map((p) => [p.year, p.value]))
    const housePriceByYear = new Map(housePrice.points.map((p) => [p.year, p.value]))

    const actualHouse: YearValue[] = []
    const counterfactualHouse: YearValue[] = []
    const actualWage: YearValue[] = []
    const counterfactualWage: YearValue[] = []

    // Build over years where both series have data
    for (const p of housePrice.points) {
      if (p.year < baseYear) continue
      const w = wageByYear.get(p.year)
      if (!w) continue
      actualHouse.push({ year: p.year, value: p.value })
      // House price if it had grown at wage rate
      counterfactualHouse.push({ year: p.year, value: houseBase * (w / wageBase) })
    }

    for (const p of wage.points) {
      if (p.year < baseYear) continue
      const h = housePriceByYear.get(p.year)
      if (!h) continue
      actualWage.push({ year: p.year, value: p.value })
      // Wage if it had grown at house price rate
      counterfactualWage.push({ year: p.year, value: wageBase * (h / houseBase) })
    }

    return { actualHouse, counterfactualHouse, actualWage, counterfactualWage }
  }, [housePrice, wage, baseYear])

  if (!data || data.actualHouse.length === 0) return null

  const latestHouse = data.actualHouse[data.actualHouse.length - 1]
  const latestHouseCounter = data.counterfactualHouse[data.counterfactualHouse.length - 1]
  const houseGap = latestHouse.value - latestHouseCounter.value

  const latestWage = data.actualWage[data.actualWage.length - 1]
  const latestWageCounter = data.counterfactualWage[data.counterfactualWage.length - 1]

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 mb-2">
        <div className="rounded-xl bg-(--color-bg) border border-(--color-border) p-3">
          <div className="text-xs text-(--color-muted) mb-1">Actual house price {latestHouse.year}</div>
          <div className="text-xl font-semibold tabular-nums" style={{ color: ACTUAL_HOUSE }}>{formatValue(latestHouse.value, "GBP")}</div>
        </div>
        <div className="rounded-xl bg-(--color-bg) border border-(--color-border) p-3">
          <div className="text-xs text-(--color-muted) mb-1">If grown at wage rate</div>
          <div className="text-xl font-semibold tabular-nums" style={{ color: COUNTERFACTUAL_HOUSE }}>
            {formatValue(latestHouseCounter.value, "GBP")}
          </div>
        </div>
        <div className="rounded-xl bg-(--color-bg) border border-(--color-border) p-3">
          <div className="text-xs text-(--color-muted) mb-1">Actual median wage {latestWage.year}</div>
          <div className="text-xl font-semibold tabular-nums" style={{ color: ACTUAL_WAGE }}>{formatValue(latestWage.value, "GBP")}</div>
        </div>
        <div className="rounded-xl bg-(--color-bg) border border-(--color-border) p-3">
          <div className="text-xs text-(--color-muted) mb-1">If wages tracked house prices</div>
          <div className="text-xl font-semibold tabular-nums" style={{ color: COUNTERFACTUAL_WAGE }}>
            {formatValue(latestWageCounter.value, "GBP")}
          </div>
        </div>
      </div>
      <div className="rounded-xl bg-(--color-bg) border border-(--color-border) p-3 mb-4">
        <div className="text-xs text-(--color-muted) mb-1">House price gap (actual vs wage-paced)</div>
        <div className="text-xl font-semibold text-(--color-text) tabular-nums">{formatValue(houseGap, "GBP")}</div>
      </div>

      <ParentSize>
        {({ width }) => {
          if (width === 0) return null
          const height = Math.max(320, Math.min(440, width * 0.5))
          const margin = { top: 16, right: 16, bottom: 32, left: 64 }
          const innerW = width - margin.left - margin.right
          const innerH = height - margin.top - margin.bottom

          const years = data.actualHouse.map((p) => p.year)
          const xScale = scaleLinear<number>({ domain: [Math.min(...years), Math.max(...years)], range: [0, innerW] })
          // Y domain must accommodate both house prices AND counterfactual wages
          const maxVal = Math.max(
            ...data.actualHouse.map((p) => p.value),
            ...data.counterfactualWage.map((p) => p.value),
          ) * 1.05
          const yScale = scaleLinear<number>({ domain: [0, maxVal], range: [innerH, 0], nice: true })

          function handleMove(e: React.PointerEvent<SVGRectElement>) {
            const rect = e.currentTarget.getBoundingClientRect()
            const x = e.clientX - rect.left
            const year = Math.round(xScale.invert(x))
            if (year < years[0] || year > years[years.length - 1]) setHovered(null)
            else setHovered(year)
          }

          const gapArea = data.actualHouse.map((p, i) => ({
            year: p.year,
            actual: p.value,
            counter: data.counterfactualHouse[i]?.value ?? p.value,
          }))

          const hoverActualHouse = hovered === null ? null : data.actualHouse.find((p) => p.year === hovered)
          const hoverCounterHouse = hovered === null ? null : data.counterfactualHouse.find((p) => p.year === hovered)
          const hoverActualWage = hovered === null ? null : data.actualWage.find((p) => p.year === hovered)
          const hoverCounterWage = hovered === null ? null : data.counterfactualWage.find((p) => p.year === hovered)

          return (
            <svg width={width} height={height} role="img" aria-label="Actual vs counterfactual house prices and wages">
              <Group left={margin.left} top={margin.top}>
                <GridRows scale={yScale} width={innerW} stroke={GRID} strokeDasharray="2,4" numTicks={5} />

                {/* Shaded gap between actual and wage-paced house price */}
                <Area
                  data={gapArea}
                  x={(p) => xScale(p.year)}
                  y0={(p) => yScale(p.counter)}
                  y1={(p) => yScale(p.actual)}
                  fill={ACTUAL_HOUSE}
                  opacity={0.10}
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

                {/* Counterfactual house price (wage-paced) — dashed */}
                <LinePath
                  data={data.counterfactualHouse}
                  x={(p) => xScale(p.year)}
                  y={(p) => yScale(p.value)}
                  stroke={COUNTERFACTUAL_HOUSE}
                  strokeWidth={2}
                  strokeDasharray="6,4"
                  curve={curveMonotoneX}
                />
                {/* Actual house price — solid */}
                <LinePath
                  data={data.actualHouse}
                  x={(p) => xScale(p.year)}
                  y={(p) => yScale(p.value)}
                  stroke={ACTUAL_HOUSE}
                  strokeWidth={2.5}
                  curve={curveMonotoneX}
                />
                {/* Actual median wage — solid */}
                <LinePath
                  data={data.actualWage}
                  x={(p) => xScale(p.year)}
                  y={(p) => yScale(p.value)}
                  stroke={ACTUAL_WAGE}
                  strokeWidth={2.5}
                  curve={curveMonotoneX}
                />
                {/* Counterfactual wage (house-price-paced) — dashed */}
                <LinePath
                  data={data.counterfactualWage}
                  x={(p) => xScale(p.year)}
                  y={(p) => yScale(p.value)}
                  stroke={COUNTERFACTUAL_WAGE}
                  strokeWidth={2}
                  strokeDasharray="6,4"
                  curve={curveMonotoneX}
                />

                {hoverActualHouse && hoverCounterHouse && (
                  <g>
                    <line
                      x1={xScale(hoverActualHouse.year)}
                      x2={xScale(hoverActualHouse.year)}
                      y1={0}
                      y2={innerH}
                      stroke={TEXT}
                      strokeOpacity={0.4}
                    />
                    <circle cx={xScale(hoverActualHouse.year)} cy={yScale(hoverActualHouse.value)} r={4} fill={ACTUAL_HOUSE} stroke={SURFACE} strokeWidth={2} />
                    <circle cx={xScale(hoverCounterHouse.year)} cy={yScale(hoverCounterHouse.value)} r={4} fill={COUNTERFACTUAL_HOUSE} stroke={SURFACE} strokeWidth={2} />
                    {hoverActualWage && (
                      <circle cx={xScale(hoverActualWage.year)} cy={yScale(hoverActualWage.value)} r={4} fill={ACTUAL_WAGE} stroke={SURFACE} strokeWidth={2} />
                    )}
                    {hoverCounterWage && (
                      <circle cx={xScale(hoverCounterWage.year)} cy={yScale(hoverCounterWage.value)} r={4} fill={COUNTERFACTUAL_WAGE} stroke={SURFACE} strokeWidth={2} />
                    )}
                    <g transform={`translate(${Math.min(xScale(hoverActualHouse.year) + 10, innerW - 180)}, 8)`}>
                      <rect width={178} height={84} rx={6} fill={SURFACE} stroke={BORDER} />
                      <text x={8} y={16} fill={TEXT} fontSize={11} fontWeight={600}>{hoverActualHouse.year}</text>
                      <text x={8} y={32} fill={ACTUAL_HOUSE} fontSize={11}>House price: {formatValue(hoverActualHouse.value, "GBP")}</text>
                      <text x={8} y={47} fill={COUNTERFACTUAL_HOUSE} fontSize={11}>If wage-paced: {formatValue(hoverCounterHouse.value, "GBP")}</text>
                      {hoverActualWage && (
                        <text x={8} y={62} fill={ACTUAL_WAGE} fontSize={11}>Wage: {formatValue(hoverActualWage.value, "GBP")}</text>
                      )}
                      {hoverCounterWage && (
                        <text x={8} y={77} fill={COUNTERFACTUAL_WAGE} fontSize={11}>If price-paced: {formatValue(hoverCounterWage.value, "GBP")}</text>
                      )}
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
        <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-[2px]" style={{ background: ACTUAL_HOUSE }} /> Actual house price</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-[2px] border-t border-dashed" style={{ borderColor: COUNTERFACTUAL_HOUSE }} /> If grown at wage rate since {baseYear}</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-[2px]" style={{ background: ACTUAL_WAGE }} /> Actual median wage</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-[2px] border-t border-dashed" style={{ borderColor: COUNTERFACTUAL_WAGE }} /> If wages tracked house prices since {baseYear}</span>
      </div>
    </div>
  )
}
