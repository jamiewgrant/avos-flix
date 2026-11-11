import { useMemo, useState } from "react"
import { Group } from "@visx/group"
import { scaleLinear } from "@visx/scale"
import { AxisBottom, AxisLeft } from "@visx/axis"
import { GridRows } from "@visx/grid"
import { ParentSize } from "@visx/responsive"
import { line as d3Line, area as d3Area, curveMonotoneX } from "d3-shape"
import { useChartColors } from "../../lib/useChartColors"
import type { Series } from "../../types/series"
import { buildStack, type MortgageRegion, type Persona, type WageBenchmark, type WagePoint } from "../../lib/costBasket"

interface Props {
  series: Record<string, Series>
  persona: Persona
  wageData: WagePoint[]
  earners: 1 | 2
  benchmark: WageBenchmark
  housingMode?: "mortgage" | "rent"
  mortgageRegion?: MortgageRegion
  startYear?: number
  realTerms?: boolean
  cpihMap?: Map<number, number>
  cpihRef?: number
}

const WAGE = "#ffffff"
const ACCENT = "#c084fc"

export function CostStackChart({ series, persona, wageData, earners, benchmark, housingMode = "mortgage", mortgageRegion = "national", startYear = 1995, realTerms = false, cpihMap, cpihRef = 1 }: Props) {
  const { muted: MUTED, grid: GRID, surface: SURFACE, border: BORDER, text: TEXT } = useChartColors()
  const [hovered, setHovered] = useState<number | null>(null)
  const [pinnedYear, setPinnedYear] = useState<number | null>(null)

  const stack = useMemo(
    () => buildStack(series, persona.layers, { housingMode, mortgageRegion }),
    [series, persona, housingMode, mortgageRegion],
  )

  // Deflation helper: when realTerms=true, scale values to cpihRef money.
  function deflate(v: number, year: number): number {
    if (!realTerms || !cpihMap) return v
    const idx = cpihMap.get(year)
    if (!idx) return v
    return v * (cpihRef / idx)
  }

  const filteredStack = useMemo(
    () => stack.filter((p) => p.year >= startYear),
    [stack, startYear],
  )

  const yearRange = useMemo<[number, number] | null>(() => {
    if (filteredStack.length === 0) return null
    return [filteredStack[0].year, filteredStack[filteredStack.length - 1].year]
  }, [filteredStack])

  if (!yearRange || filteredStack.length === 0) {
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

        // Apply real-terms deflation to stacked and wage data.
        const deflatedStack = filteredStack.map((p) => {
          const layerVals: Record<string, number> = {}
          let total = 0
          for (const layer of persona.layers) {
            const v = deflate(p.layers[layer.id] ?? 0, p.year)
            layerVals[layer.id] = v
            total += v
          }
          return { year: p.year, layers: layerVals, total }
        })
        const deflatedWage = wageInRange.map((p) => ({
          ...p,
          value: deflate(p.value, p.year),
        }))

        const maxStack = Math.max(...deflatedStack.map((p) => p.total))
        const maxWage = Math.max(...deflatedWage.map((p) => p.value))
        const yMax = Math.max(maxStack, maxWage) * 1.05
        const yScale = scaleLinear<number>({ domain: [0, yMax], range: [innerH, 0], nice: true })

        const stacked = deflatedStack.map((p) => {
          let acc = 0
          const cums: Record<string, [number, number]> = {}
          for (const layer of persona.layers) {
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
            .curve(curveMonotoneX)(deflatedWage) ?? ""

        function handleMove(e: React.PointerEvent<SVGRectElement>) {
          if (e.pointerType === "touch") return
          const rect = e.currentTarget.getBoundingClientRect()
          const x = e.clientX - rect.left
          const y = Math.round(xScale.invert(x))
          if (y < yearFrom || y > yearTo) setHovered(null)
          else setHovered(y)
        }

        function handlePointerDown(e: React.PointerEvent<SVGRectElement>) {
          if (e.pointerType !== "touch") return
          const rect = e.currentTarget.getBoundingClientRect()
          const x = e.clientX - rect.left
          const y = Math.round(xScale.invert(x))
          if (y < yearFrom || y > yearTo) return
          setPinnedYear((prev) => (prev === y ? null : y))
        }

        function handleKeyDown(e: React.KeyboardEvent<SVGSVGElement>) {
          if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return
          e.preventDefault()
          setHovered((prev) => {
            const current = prev ?? Math.round((yearFrom + yearTo) / 2)
            return Math.max(yearFrom, Math.min(yearTo, current + (e.key === "ArrowRight" ? 1 : -1)))
          })
        }

        const activeYear = pinnedYear ?? hovered
        const hoverStack = activeYear === null ? null : deflatedStack.find((p) => p.year === activeYear)
        const hoverWageRaw = activeYear === null ? null : wageData.find((p) => p.year === activeYear)
        const hoverWage = hoverWageRaw
          ? { ...hoverWageRaw, value: deflate(hoverWageRaw.value, hoverWageRaw.year) }
          : null
        const shareOfWage = hoverStack && hoverWage ? Math.round((hoverStack.total / hoverWage.value) * 100) : null
        const tooltipRows = persona.layers.length + 3
        const tooltipH = 24 + tooltipRows * 16 + 48

        const wageLineLabel =
          earners === 2
            ? benchmark.isAlreadyNet
              ? `${benchmark.shortLabel} × 2 adults`
              : `${benchmark.shortLabel} × 2 earners (net)`
            : benchmark.isAlreadyNet
            ? benchmark.shortLabel
            : `${benchmark.shortLabel} (net)`

        return (
          <svg
            width={width}
            height={height}
            role="img"
            aria-label="Cost-of-living basket stacked area chart with wage overlay. Use arrow keys to step through years."
            tabIndex={0}
            onKeyDown={handleKeyDown}
            style={{ outline: "none" }}
          >
            <title>Cost-of-living basket vs take-home pay, {yearFrom}–{yearTo}</title>
            <Group left={margin.left} top={margin.top}>
              <GridRows scale={yScale} width={innerW} stroke={GRID} strokeDasharray="2,4" numTicks={5} />

              {/* 2022-23 energy + rate crisis band */}
              {yearFrom <= 2022 && yearTo >= 2022 && (
                <>
                  <rect
                    x={xScale(2022)}
                    width={Math.max(0, xScale(Math.min(2024, yearTo)) - xScale(2022))}
                    y={0}
                    height={innerH}
                    fill="#ef4444"
                    opacity={0.06}
                  />
                  <text x={(xScale(2022) + xScale(Math.min(2024, yearTo))) / 2} y={14} fill="#ef4444" fontSize={9} textAnchor="middle" opacity={0.5}>
                    rate shock
                  </text>
                </>
              )}

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
                tickFormat={(v) => `£${Math.round((v as number) / 1000)}k${realTerms ? " (real)" : ""}`}
                stroke={GRID}
                tickStroke={GRID}
                tickLabelProps={{ fill: MUTED, fontSize: 11, dx: -4, dy: 4, textAnchor: "end" }}
              />

              {persona.layers.map((layer) => (
                <path
                  key={layer.id}
                  d={areaForLayer(layer.id)}
                  fill={layer.color}
                  opacity={0.85}
                  stroke={SURFACE}
                  strokeWidth={0.6}
                />
              ))}

              {/* Wage line with glow */}
              <path d={wagePath} stroke="#000" strokeWidth={4} fill="none" opacity={0.3} style={{ filter: "blur(2px)" }} />
              <path d={wagePath} stroke={WAGE} strokeWidth={2.5} fill="none" />

              {/* Wage line label at right edge */}
              {deflatedWage.length > 0 && (() => {
                const last = deflatedWage[deflatedWage.length - 1]
                const ly = yScale(last.value)
                return (
                  <text
                    x={innerW - 4}
                    y={ly - 6}
                    fill={WAGE}
                    fontSize={9}
                    textAnchor="end"
                    opacity={0.7}
                  >
                    {wageLineLabel}
                  </text>
                )
              })()}

              {hoverStack && (
                <g>
                  <line x1={xScale(hoverStack.year)} x2={xScale(hoverStack.year)} y1={0} y2={innerH} stroke={TEXT} strokeOpacity={0.5} />
                  {hoverWage && (
                    <circle cx={xScale(hoverStack.year)} cy={yScale(hoverWage.value)} r={4} fill={WAGE} stroke={SURFACE} strokeWidth={2} />
                  )}
                  {/* Pinned indicator */}
                  {pinnedYear !== null && (
                    <circle cx={xScale(hoverStack.year)} cy={innerH - 8} r={3} fill={ACCENT} opacity={0.8} />
                  )}
                  <g
                    transform={`translate(${Math.min(xScale(hoverStack.year) + 12, innerW - 236)}, 8)`}
                    pointerEvents="none"
                  >
                    <rect width={232} height={tooltipH} rx={8} fill={SURFACE} stroke={BORDER} />
                    <text x={10} y={16} fill={TEXT} fontSize={12} fontWeight={700}>{hoverStack.year}</text>

                    {persona.layers.map((layer, i) => {
                      const v = hoverStack.layers[layer.id] ?? 0
                      const pct = (v / hoverStack.total) * 100
                      const displayLabel =
                        layer.id === "housing"
                          ? housingMode === "rent"
                            ? "Housing — private rental"
                            : "Housing — FTB mortgage"
                          : layer.label
                      return (
                        <g key={layer.id} transform={`translate(10, ${30 + i * 16})`}>
                          <rect x={0} y={-9} width={9} height={9} fill={layer.color} />
                          <text x={14} y={0} fill={MUTED} fontSize={10}>
                            {displayLabel.replace(/\(.+?\)/, "").trim()}
                          </text>
                          <text x={214} y={0} fill={TEXT} fontSize={10} fontWeight={600} textAnchor="end">
                            £{Math.round(v).toLocaleString("en-GB")} ({pct.toFixed(0)}%)
                          </text>
                        </g>
                      )
                    })}

                    <line x1={10} x2={222} y1={32 + persona.layers.length * 16} y2={32 + persona.layers.length * 16} stroke={BORDER} />
                    <text x={10} y={32 + persona.layers.length * 16 + 14} fill={WAGE} fontSize={11} fontWeight={700}>Total basket</text>
                    <text x={222} y={32 + persona.layers.length * 16 + 14} fill={WAGE} fontSize={11} fontWeight={700} textAnchor="end">
                      £{Math.round(hoverStack.total).toLocaleString("en-GB")}
                    </text>

                    {hoverWage && (
                      <>
                        <text x={10} y={32 + persona.layers.length * 16 + 30} fill={MUTED} fontSize={10}>
                          {wageLineLabel}
                        </text>
                        <text x={222} y={32 + persona.layers.length * 16 + 30} fill={MUTED} fontSize={10} textAnchor="end">
                          £{Math.round(hoverWage.value).toLocaleString("en-GB")}
                          {earners === 2 && !benchmark.isAlreadyNet
                            ? ` (£${Math.round(hoverWage.netPerEarner).toLocaleString("en-GB")} ea)`
                            : !benchmark.isAlreadyNet
                            ? ` of £${Math.round(hoverWage.grossPerEarner).toLocaleString("en-GB")}`
                            : ""}
                        </text>
                      </>
                    )}

                    {shareOfWage !== null && (
                      <>
                        <line x1={10} x2={222} y1={32 + persona.layers.length * 16 + 40} y2={32 + persona.layers.length * 16 + 40} stroke={BORDER} />
                        <text x={10} y={32 + persona.layers.length * 16 + 54} fill={ACCENT} fontSize={11} fontWeight={700}>
                          Basket share of income
                        </text>
                        <text x={222} y={32 + persona.layers.length * 16 + 54} fill={ACCENT} fontSize={12} fontWeight={700} textAnchor="end">
                          {shareOfWage}%
                        </text>
                      </>
                    )}
                  </g>
                </g>
              )}

              <rect
                x={0} y={0} width={innerW} height={innerH}
                fill="transparent"
                onPointerMove={handleMove}
                onPointerDown={handlePointerDown}
                onPointerLeave={() => setHovered(null)}
              />
            </Group>
          </svg>
        )
      }}
    </ParentSize>
  )
}
