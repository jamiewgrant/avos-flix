import { useMemo, useState } from "react"
import { Group } from "@visx/group"
import { scaleLinear } from "@visx/scale"
import { AxisBottom, AxisLeft } from "@visx/axis"
import { GridRows } from "@visx/grid"
import { ParentSize } from "@visx/responsive"
import { line as d3Line, area as d3Area, curveMonotoneX } from "d3-shape"
import type { Series } from "../../types/series"
import { COST_LAYERS, buildStack, wageLine } from "../../lib/costBasket"

interface Props {
  series: Record<string, Series>
  wage: Series
}

const MUTED = "#9ca3af"
const GRID = "#2a2c36"
const TEXT = "#e8e6e3"
const SURFACE = "#16171d"
const BORDER = "#2e303a"
const WAGE = "#ffffff"

export function CostStackChart({ series, wage }: Props) {
  const [hovered, setHovered] = useState<number | null>(null)

  const stack = useMemo(() => buildStack(series), [series])
  const wageData = useMemo(() => wageLine(wage), [wage])

  const yearRange = useMemo<[number, number] | null>(() => {
    if (stack.length === 0) return null
    return [stack[0].year, stack[stack.length - 1].year]
  }, [stack])

  if (!yearRange || stack.length === 0) {
    return (
      <div className="h-[300px] grid place-items-center text-(--color-muted) text-sm">
        Not enough overlapping cost data to build the basket.
      </div>
    )
  }

  const [yearFrom, yearTo] = yearRange
  const wageInRange = wageData.filter((p) => p.year >= yearFrom && p.year <= yearTo)

  return (
    <ParentSize>
      {({ width }) => {
        if (width === 0) return null
        const height = Math.max(380, Math.min(520, width * 0.5))
        const margin = { top: 24, right: 24, bottom: 36, left: 72 }
        const innerW = width - margin.left - margin.right
        const innerH = height - margin.top - margin.bottom

        const xScale = scaleLinear<number>({ domain: [yearFrom, yearTo], range: [0, innerW] })
        const maxStack = Math.max(...stack.map((p) => p.total))
        const maxWage = Math.max(...wageInRange.map((p) => p.value))
        const yMax = Math.max(maxStack, maxWage) * 1.05
        const yScale = scaleLinear<number>({ domain: [0, yMax], range: [innerH, 0], nice: true })

        // Build cumulative offsets per year per layer for stacking.
        const stacked = stack.map((p) => {
          let acc = 0
          const cums: Record<string, [number, number]> = {}
          for (const layer of COST_LAYERS) {
            const v = p.layers[layer.id] ?? 0
            cums[layer.id] = [acc, acc + v]
            acc += v
          }
          return { year: p.year, cums, total: p.total }
        })

        const areaForLayer = (layerId: string) =>
          d3Area<typeof stacked[number]>()
            .x((p) => xScale(p.year))
            .y0((p) => yScale(p.cums[layerId][0]))
            .y1((p) => yScale(p.cums[layerId][1]))
            .curve(curveMonotoneX)(stacked) ?? ""

        const wagePath =
          d3Line<{ year: number; value: number }>()
            .x((p) => xScale(p.year))
            .y((p) => yScale(p.value))
            .curve(curveMonotoneX)(wageInRange) ?? ""

        function handleMove(e: React.PointerEvent<SVGRectElement>) {
          const rect = e.currentTarget.getBoundingClientRect()
          const x = e.clientX - rect.left
          const y = Math.round(xScale.invert(x))
          if (y < yearFrom || y > yearTo) setHovered(null)
          else setHovered(y)
        }

        const hoverStack = hovered === null ? null : stack.find((p) => p.year === hovered)
        const hoverWage = hovered === null ? null : wageData.find((p) => p.year === hovered)

        return (
          <svg width={width} height={height} role="img" aria-label="Cost-of-living basket stacked, with median net wage overlay">
            <Group left={margin.left} top={margin.top}>
              <GridRows scale={yScale} width={innerW} stroke={GRID} strokeDasharray="2,4" numTicks={5} />

              <AxisBottom
                top={innerH}
                scale={xScale}
                numTicks={Math.min(8, yearTo - yearFrom)}
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

              {COST_LAYERS.map((layer) => (
                <path
                  key={layer.id}
                  d={areaForLayer(layer.id)}
                  fill={layer.color}
                  opacity={0.85}
                  stroke={SURFACE}
                  strokeWidth={0.6}
                />
              ))}

              <path d={wagePath} stroke={WAGE} strokeWidth={2.5} fill="none" />
              <path d={wagePath} stroke="#000" strokeWidth={4} fill="none" opacity={0.3} style={{ filter: "blur(2px)" }} />
              <path d={wagePath} stroke={WAGE} strokeWidth={2.5} fill="none" />

              {hoverStack && (
                <g>
                  <line
                    x1={xScale(hoverStack.year)}
                    x2={xScale(hoverStack.year)}
                    y1={0}
                    y2={innerH}
                    stroke={TEXT}
                    strokeOpacity={0.5}
                  />
                  {hoverWage && (
                    <circle
                      cx={xScale(hoverStack.year)}
                      cy={yScale(hoverWage.value)}
                      r={4}
                      fill={WAGE}
                      stroke={SURFACE}
                      strokeWidth={2}
                    />
                  )}
                  <g
                    transform={`translate(${Math.min(xScale(hoverStack.year) + 12, innerW - 220)}, 8)`}
                    pointerEvents="none"
                  >
                    <rect width={216} height={20 + COST_LAYERS.length * 16 + 28} rx={8} fill={SURFACE} stroke={BORDER} />
                    <text x={10} y={16} fill={TEXT} fontSize={12} fontWeight={700}>
                      {hoverStack.year}
                    </text>
                    {COST_LAYERS.map((layer, i) => {
                      const v = hoverStack.layers[layer.id] ?? 0
                      const pct = (v / hoverStack.total) * 100
                      return (
                        <g key={layer.id} transform={`translate(10, ${30 + i * 16})`}>
                          <rect x={0} y={-9} width={9} height={9} fill={layer.color} />
                          <text x={14} y={0} fill={MUTED} fontSize={10}>
                            {layer.label.replace(/\(.+?\)/, "").trim()}
                          </text>
                          <text x={210 - 10} y={0} fill={TEXT} fontSize={10} fontWeight={600} textAnchor="end">
                            £{Math.round(v).toLocaleString("en-GB")} ({pct.toFixed(0)}%)
                          </text>
                        </g>
                      )
                    })}
                    <line x1={10} x2={206} y1={32 + COST_LAYERS.length * 16} y2={32 + COST_LAYERS.length * 16} stroke={BORDER} />
                    <text x={10} y={32 + COST_LAYERS.length * 16 + 14} fill={WAGE} fontSize={11} fontWeight={700}>
                      Total basket
                    </text>
                    <text x={206} y={32 + COST_LAYERS.length * 16 + 14} fill={WAGE} fontSize={11} fontWeight={700} textAnchor="end">
                      £{Math.round(hoverStack.total).toLocaleString("en-GB")}
                    </text>
                    {hoverWage && (
                      <>
                        <text x={10} y={32 + COST_LAYERS.length * 16 + 28} fill={MUTED} fontSize={10}>
                          Median net wage
                        </text>
                        <text x={206} y={32 + COST_LAYERS.length * 16 + 28} fill={MUTED} fontSize={10} textAnchor="end">
                          £{Math.round(hoverWage.value).toLocaleString("en-GB")}
                        </text>
                      </>
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
  )
}
