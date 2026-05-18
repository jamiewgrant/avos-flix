import { useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Group } from "@visx/group"
import { LinePath } from "@visx/shape"
import { scaleLinear } from "@visx/scale"
import { AxisBottom, AxisLeft } from "@visx/axis"
import { GridRows } from "@visx/grid"
import { ParentSize } from "@visx/responsive"
import { curveMonotoneX } from "@visx/curve"
import type { Series, Unit, YearValue } from "../../types/series"
import { UNIT_LABEL, formatAxisValue, formatValue } from "../../types/series"
import { splitAtVerified } from "../../lib/splitAtVerified"

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
const SURFACE = "#16171d"
const BORDER = "#2e303a"
const TEXT = "#e8e6e3"

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
  baseValue: number
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
  return { meta: s, baseYearActual: base.year, baseValue: base.value, points }
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
  const [hovered, setHovered] = useState<number | null>(null)
  const startYear = fromYear ?? baseYear

  const normalized = useMemo(() => {
    return series
      .map((s) => normalize(s, baseYear, startYear))
      .filter((s): s is NormalizedSeries => s !== null && s.points.length > 1)
  }, [series, baseYear, startYear])

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

        const xScale = scaleLinear<number>({ domain: [startYear, endYear], range: [0, innerW] })
        const yScale = scaleLinear<number>({
          domain: [0, Math.max(...allValues) * 1.05],
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

        const tooltipItems = hovered === null
          ? []
          : normalized
              .map((s) => {
                const point = s.points.find((p) => p.year === hovered)
                if (!point) return null
                return {
                  id: s.meta.id,
                  name: s.meta.name,
                  color: s.meta.color,
                  display: `${Math.round(point.value)}`,
                  rawDisplay: formatValue(s.baseValue * (point.value / 100), s.meta.unit),
                  cy: yScale(point.value),
                }
              })
              .filter((x): x is NonNullable<typeof x> => x !== null)
              .sort((a, b) => a.cy - b.cy)

        return (
          <svg
            width={width}
            height={height}
            role="img"
            aria-label={`Series indexed to ${baseYear} = 100`}
          >
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

              <AnimatePresence>
                {normalized.map((s) => {
                  const sw = hovered === null ? 2.5 : 2
                  const { estimated, verified } = splitAtVerified(s.points, s.meta.verifiedFrom)
                  return (
                    <motion.g
                      key={`${s.meta.id}-${baseYear}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                    >
                      {estimated.length > 1 && (
                        <LinePath
                          data={estimated}
                          x={(p) => xScale(p.year)}
                          y={(p) => yScale(p.value)}
                          stroke={s.meta.color}
                          strokeWidth={sw}
                          strokeDasharray="5,4"
                          opacity={0.55}
                          curve={curveMonotoneX}
                        />
                      )}
                      {verified.length > 1 && (
                        <LinePath
                          data={verified}
                          x={(p) => xScale(p.year)}
                          y={(p) => yScale(p.value)}
                          stroke={s.meta.color}
                          strokeWidth={sw}
                          curve={curveMonotoneX}
                        />
                      )}
                    </motion.g>
                  )
                })}
              </AnimatePresence>

              {/* Right-hand value labels (only when no hover) */}
              {hovered === null &&
                normalized.map((s) => {
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

              {/* Crosshair */}
              {hovered !== null && (
                <g>
                  <line
                    x1={xScale(hovered)}
                    x2={xScale(hovered)}
                    y1={0}
                    y2={innerH}
                    stroke={TEXT}
                    strokeOpacity={0.4}
                    strokeWidth={1}
                  />
                  {tooltipItems.map((item) => (
                    <circle
                      key={item.id}
                      cx={xScale(hovered)}
                      cy={item.cy}
                      r={4}
                      fill={item.color}
                      stroke={SURFACE}
                      strokeWidth={2}
                    />
                  ))}
                </g>
              )}

              {/* Tooltip */}
              {hovered !== null && tooltipItems.length > 0 && (
                <TooltipBox
                  year={hovered}
                  items={tooltipItems.map((i) => ({
                    id: i.id,
                    name: i.name,
                    color: i.color,
                    value: `${i.display} (${i.rawDisplay})`,
                  }))}
                  anchorX={xScale(hovered)}
                  innerW={innerW}
                />
              )}

              {/* Overlay rect captures pointer */}
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
  const [hovered, setHovered] = useState<number | null>(null)
  const groups = useMemo(() => {
    const out = new Map<Unit, Series[]>()
    for (const s of series) {
      if (s.points.length === 0) continue
      const arr = out.get(s.unit) ?? []
      arr.push(s)
      out.set(s.unit, arr)
    }
    return out
  }, [series])

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
        <UnitPanel
          key={unit}
          unit={unit}
          series={ser}
          fromYear={fromYear}
          toYear={toYear}
          hovered={hovered}
          onHover={setHovered}
        />
      ))}
    </div>
  )
}

function UnitPanel({
  unit,
  series,
  fromYear,
  toYear,
  hovered,
  onHover,
}: {
  unit: Unit
  series: Series[]
  fromYear?: number
  toYear?: number
  hovered: number | null
  onHover: (year: number | null) => void
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

          const xScale = scaleLinear<number>({ domain: [startYear, endYear], range: [0, innerW] })
          const yMin = Math.min(0, ...allValues)
          const yMax = Math.max(...allValues)
          const yScale = scaleLinear<number>({
            domain: [yMin, yMax * 1.05],
            range: [innerH, 0],
            nice: true,
          })

          function handleMove(e: React.PointerEvent<SVGRectElement>) {
            const rect = e.currentTarget.getBoundingClientRect()
            const x = e.clientX - rect.left
            const year = Math.round(xScale.invert(x))
            if (year >= startYear && year <= endYear) onHover(year)
            else onHover(null)
          }

          const tooltipItems = hovered === null
            ? []
            : series
                .map((s) => {
                  const point = s.points.find((p) => p.year === hovered)
                  if (!point) return null
                  return {
                    id: s.id,
                    name: s.name,
                    color: s.color,
                    value: formatValue(point.value, s.unit),
                    cy: yScale(point.value),
                  }
                })
                .filter((x): x is NonNullable<typeof x> => x !== null)
                .sort((a, b) => a.cy - b.cy)

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
                  tickLabelProps={{ fill: MUTED, fontSize: 11, dx: -4, dy: 4, textAnchor: "end" }}
                />

                <AnimatePresence>
                  {series.map((s) => {
                    const inRange = s.points.filter((p) => p.year >= startYear && p.year <= endYear)
                    const { estimated, verified } = splitAtVerified(inRange, s.verifiedFrom)
                    return (
                      <motion.g
                        key={s.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                      >
                        {estimated.length > 1 && (
                          <LinePath
                            data={estimated}
                            x={(p) => xScale(p.year)}
                            y={(p) => yScale(p.value)}
                            stroke={s.color}
                            strokeWidth={2}
                            strokeDasharray="5,4"
                            opacity={0.55}
                            curve={curveMonotoneX}
                          />
                        )}
                        {verified.length > 1 && (
                          <LinePath
                            data={verified}
                            x={(p) => xScale(p.year)}
                            y={(p) => yScale(p.value)}
                            stroke={s.color}
                            strokeWidth={2}
                            curve={curveMonotoneX}
                          />
                        )}
                      </motion.g>
                    )
                  })}
                </AnimatePresence>

                {/* Trailing dots when not hovered */}
                {hovered === null &&
                  series.map((s) => {
                    const inRange = s.points.filter((p) => p.year >= startYear && p.year <= endYear)
                    const last = inRange[inRange.length - 1]
                    if (!last) return null
                    return <circle key={`${s.id}-tail`} cx={xScale(last.year)} cy={yScale(last.value)} r={2.5} fill={s.color} />
                  })}

                {/* Crosshair */}
                {hovered !== null && hovered >= startYear && hovered <= endYear && (
                  <g>
                    <line
                      x1={xScale(hovered)}
                      x2={xScale(hovered)}
                      y1={0}
                      y2={innerH}
                      stroke={TEXT}
                      strokeOpacity={0.4}
                      strokeWidth={1}
                    />
                    {tooltipItems.map((item) => (
                      <circle
                        key={item.id}
                        cx={xScale(hovered)}
                        cy={item.cy}
                        r={3.5}
                        fill={item.color}
                        stroke={SURFACE}
                        strokeWidth={2}
                      />
                    ))}
                  </g>
                )}

                {hovered !== null && hovered >= startYear && hovered <= endYear && tooltipItems.length > 0 && (
                  <TooltipBox
                    year={hovered}
                    items={tooltipItems}
                    anchorX={xScale(hovered)}
                    innerW={innerW}
                    compact
                  />
                )}

                <rect
                  x={0}
                  y={0}
                  width={innerW}
                  height={innerH}
                  fill="transparent"
                  onPointerMove={handleMove}
                  onPointerLeave={() => onHover(null)}
                />
              </Group>
            </svg>
          )
        }}
      </ParentSize>
    </div>
  )
}

// ─── Shared tooltip box (SVG-native, auto-flips at right edge) ──────────────

interface TooltipItem {
  id: string
  name: string
  color: string
  value: string
}

function TooltipBox({
  year,
  items,
  anchorX,
  innerW,
  compact = false,
}: {
  year: number
  items: TooltipItem[]
  anchorX: number
  innerW: number
  compact?: boolean
}) {
  const rowH = compact ? 16 : 18
  const padding = 10
  const headerH = compact ? 18 : 22
  const w = compact ? 200 : 240
  const h = headerH + items.length * rowH + padding

  const flipLeft = anchorX + w + 12 > innerW
  const x = flipLeft ? anchorX - w - 10 : anchorX + 10
  const y = 4

  return (
    <g transform={`translate(${x}, ${y})`} pointerEvents="none">
      <rect
        width={w}
        height={h}
        rx={8}
        fill={SURFACE}
        stroke={BORDER}
        strokeWidth={1}
        opacity={0.97}
      />
      <text x={padding} y={headerH - 6} fill={TEXT} fontSize={compact ? 11 : 12} fontWeight={700}>
        {year}
      </text>
      {items.map((item, i) => (
        <g key={item.id} transform={`translate(${padding}, ${headerH + i * rowH + 4})`}>
          <circle cx={4} cy={-4} r={3.5} fill={item.color} />
          <text x={14} y={0} fill={MUTED} fontSize={compact ? 10 : 11}>
            {item.name.length > 26 ? item.name.slice(0, 24) + "…" : item.name}
          </text>
          <text x={w - padding - 4} y={0} fill={TEXT} fontSize={compact ? 10 : 11} fontWeight={600} textAnchor="end">
            {item.value}
          </text>
        </g>
      ))}
    </g>
  )
}
