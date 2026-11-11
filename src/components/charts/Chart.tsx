import { useMemo, useState, useRef } from "react"
import { useChartColors } from "../../lib/useChartColors"
import { motion, AnimatePresence } from "framer-motion"
import { Group } from "@visx/group"
import { LinePath, AreaClosed } from "@visx/shape"
import { scaleLinear } from "@visx/scale"
import { AxisBottom, AxisLeft } from "@visx/axis"
import { GridRows } from "@visx/grid"
import { ParentSize } from "@visx/responsive"
import { curveMonotoneX } from "@visx/curve"
import { line as d3Line, curveMonotoneX as d3CurveMonotoneX } from "d3-shape"
import type { Series, Unit, YearValue } from "../../types/series"
import { UNIT_LABEL, formatAxisValue, formatValue } from "../../types/series"
import { splitAtVerified, verifiedBoundary } from "../../lib/splitAtVerified"
import { basePoint } from "../../lib/indexing"
import type { Annotation } from "../../lib/annotations"

export type ChartMode = "indexed" | "raw"

interface ChartProps {
  series: Series[]
  mode: ChartMode
  baseYear: number
  fromYear?: number
  toYear?: number
  annotations?: Annotation[]
  spotlightId?: string | null
  onRangeChange?: (from: number, to: number) => void
}

// Colors injected via useChartColors at the component level

type LinearScale = (n: number) => number

function pathFromPoints(
  points: YearValue[],
  xScale: LinearScale,
  yScale: LinearScale,
): string {
  return (
    d3Line<YearValue>()
      .x((p) => xScale(p.year))
      .y((p) => yScale(p.value))
      .curve(d3CurveMonotoneX)(points) ?? ""
  )
}

export function Chart({ series, mode, baseYear, fromYear, toYear, annotations, spotlightId, onRangeChange }: ChartProps) {
  if (mode === "indexed") {
    return (
      <IndexedView
        series={series}
        baseYear={baseYear}
        fromYear={fromYear}
        toYear={toYear}
        annotations={annotations}
        spotlightId={spotlightId}
        onRangeChange={onRangeChange}
      />
    )
  }
  return <RawView series={series} fromYear={fromYear} toYear={toYear} spotlightId={spotlightId} />
}

// ─── Indexed: every series rebased to baseYear=100, one shared axis ──────────

interface NormalizedSeries {
  meta: Series
  baseYearActual: number
  baseValue: number
  points: YearValue[]
}

function normalize(s: Series, baseYear: number): NormalizedSeries | null {
  const base = basePoint(s, baseYear)
  if (!base) return null
  // Always include ALL points (no fromYear filter) so path topology stays
  // constant when startYear changes — the visible range is enforced by a
  // <clipPath> on the SVG instead, which lets motion.path interpolate smoothly.
  const points = s.points.map((p) => ({ year: p.year, value: (p.value / base.value) * 100 }))
  return { meta: s, baseYearActual: base.year, baseValue: base.value, points }
}

/** Pixel position of an active annotation popover, relative to the wrapper div. */
interface ActiveAnnotation {
  annotation: Annotation
  /** left px (already accounting for flip) */
  left: number
  /** top px */
  top: number
  /** whether the card opens to the left of the line */
  flipped: boolean
}

interface PinchState {
  initialDistance: number
  initialFrom: number
  initialTo: number
}

function IndexedView({
  series,
  baseYear,
  fromYear,
  toYear,
  annotations,
  spotlightId,
  onRangeChange,
}: {
  series: Series[]
  baseYear: number
  fromYear?: number
  toYear?: number
  annotations?: Annotation[]
  spotlightId?: string | null
  onRangeChange?: (from: number, to: number) => void
}) {
  const { muted: MUTED, grid: GRID, surface: SURFACE, text: TEXT } = useChartColors()
  const [hoveredAnno, setHoveredAnno] = useState<Annotation | null>(null)
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null)
  const [activeAnnoPos, setActiveAnnoPos] = useState<ActiveAnnotation | null>(null)
  const [hoveredRaw, setHoveredRaw] = useState<number | null>(null)
  const [pinned, setPinned] = useState<number | null>(null)
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null)
  const hovered = pinned ?? hoveredRaw
  const setHovered = setHoveredRaw
  const startYear = fromYear ?? baseYear
  const touchDismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const pinchRef = useRef<PinchState | null>(null)

  const normalized = useMemo(() => {
    return series
      .map((s) => normalize(s, baseYear))
      .filter((s): s is NormalizedSeries => s !== null && s.points.length > 1)
  }, [series, baseYear])

  function handleAnnotationClick(
    a: Annotation,
    annoId: string,
    cx: number,
    marginLeft: number,
    marginTop: number,
    innerW: number,
    innerH: number,
  ) {
    if (activeAnnotationId === annoId) {
      setActiveAnnotationId(null)
      setActiveAnnoPos(null)
      return
    }
    const popoverW = 200
    const absX = marginLeft + cx
    const flipped = absX + popoverW + 16 > marginLeft + innerW
    const left = flipped ? absX - popoverW - 8 : absX + 8
    // Position popover near the bottom of the chart inner area
    const top = marginTop + Math.max(0, innerH - 120)
    setActiveAnnotationId(annoId)
    setActiveAnnoPos({ annotation: a, left, top, flipped })
  }

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      {/* Legend — names each line; a dashed swatch marks wholly-estimated series. */}
      {normalized.length > 0 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 mb-2 px-1 text-xs list-none" aria-label="Chart legend">
          {normalized.map((s) => {
            const dimmed = !!spotlightId && spotlightId !== s.meta.id
            return (
              <li
                key={s.meta.id}
                className="flex items-center gap-1.5 text-(--color-text)"
                style={{ opacity: dimmed ? 0.35 : 1 }}
              >
                <span
                  aria-hidden="true"
                  className="inline-block w-4 shrink-0"
                  style={{ borderTop: `3px ${s.meta.estimated ? "dashed" : "solid"} ${s.meta.color}` }}
                />
                {s.meta.name}
              </li>
            )
          })}
        </ul>
      )}
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
                  No visible series has data at base year {baseYear}. Pick a later base year or different series.
                </text>
              </svg>
            )
          }

          // Use all years for domain calculation, but clip visible range via clipPath
          const allYears = normalized.flatMap((s) => s.points.map((p) => p.year))
          const endYear = toYear ?? Math.max(...allYears)
          // For y-scale domain, only consider points within the visible range
          const allValues = normalized.flatMap((s) =>
            s.points.filter((p) => p.year >= startYear && p.year <= endYear).map((p) => p.value)
          )

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
            if (year >= startYear && year <= endYear) {
              setHovered(year)
              setTooltipPos({ x: margin.left + x, y: margin.top })
            } else {
              setHovered(null)
              setTooltipPos(null)
            }
          }

          function yearFromTouchX(touch: React.Touch, currentTarget: SVGRectElement): number | null {
            const rect = currentTarget.getBoundingClientRect()
            const x = touch.clientX - rect.left
            const year = Math.round(xScale.invert(x))
            return year >= startYear && year <= endYear ? year : null
          }

          function scheduleTouchDismiss() {
            if (touchDismissTimer.current) clearTimeout(touchDismissTimer.current)
            touchDismissTimer.current = setTimeout(() => {
              setHovered(null)
            }, 2500)
          }

          function pinchDistance(touches: React.TouchList): number {
            const dx = touches[1].clientX - touches[0].clientX
            const dy = touches[1].clientY - touches[0].clientY
            return Math.sqrt(dx * dx + dy * dy)
          }

          function handleTouchStart(e: React.TouchEvent<SVGRectElement>) {
            e.preventDefault()
            if (e.touches.length === 2) {
              // Begin pinch — record initial state
              pinchRef.current = {
                initialDistance: pinchDistance(e.touches),
                initialFrom: startYear,
                initialTo: endYear,
              }
              // Clear tooltip during pinch
              if (touchDismissTimer.current) clearTimeout(touchDismissTimer.current)
              setHovered(null)
              return
            }
            if (touchDismissTimer.current) clearTimeout(touchDismissTimer.current)
            const year = yearFromTouchX(e.touches[0], e.currentTarget)
            setHovered(year)
            if (year !== null) scheduleTouchDismiss()
          }

          function handleTouchMove(e: React.TouchEvent<SVGRectElement>) {
            if (e.touches.length === 2 && pinchRef.current && onRangeChange) {
              const { initialDistance, initialFrom, initialTo } = pinchRef.current
              const currentDistance = pinchDistance(e.touches)
              const scale = initialDistance / currentDistance // >1 = zoom out, <1 = zoom in
              const mid = (initialFrom + initialTo) / 2
              const halfSpan = ((initialTo - initialFrom) / 2) * scale
              let newFrom = Math.round(mid - halfSpan)
              let newTo = Math.round(mid + halfSpan)
              // Clamp: minimum year 1970, minimum span 5 years
              newFrom = Math.max(1970, newFrom)
              newTo = Math.min(newTo, initialTo + 50) // don't expand beyond reasonable future
              if (newTo - newFrom < 5) {
                // Enforce min span of 5 symmetrically around mid
                const clampedMid = Math.round(mid)
                newFrom = clampedMid - 2
                newTo = clampedMid + 3
              }
              onRangeChange(newFrom, newTo)
              return
            }
            if (touchDismissTimer.current) clearTimeout(touchDismissTimer.current)
            const year = yearFromTouchX(e.touches[0], e.currentTarget)
            setHovered(year)
            if (year !== null) scheduleTouchDismiss()
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

          const chartTitleId = `chart-title-indexed-${baseYear}`
          const chartTitleText = `Indexed chart, base year ${baseYear}. ${normalized.length} series shown from ${startYear} to ${endYear}. ${normalized.slice(0, 3).map((s) => s.meta.name).join(", ")}${normalized.length > 3 ? ` and ${normalized.length - 3} more` : ""}.`

          return (
            <>
              <svg
                width={width}
                height={height}
                role="img"
                aria-labelledby={chartTitleId}
              >
                <title id={chartTitleId}>{chartTitleText}</title>
                <defs>
                  {normalized.map((s) => (
                    <linearGradient key={`grad-${s.meta.id}`} id={`area-grad-${s.meta.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={s.meta.color} stopOpacity={0.13} />
                      <stop offset="100%" stopColor={s.meta.color} stopOpacity={0} />
                    </linearGradient>
                  ))}
                  <filter id="line-glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <clipPath id="chart-area-indexed">
                    <rect x={0} y={0} width={innerW} height={innerH} />
                  </clipPath>
                </defs>
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

                  {annotations?.filter((a) => a.year >= startYear && a.year <= endYear).map((a) => {
                    const cx = xScale(a.year)
                    const annoId = `anno-${a.year}`
                    const isHovered = hoveredAnno?.year === a.year
                    const isActive = activeAnnotationId === annoId
                    return (
                      <g
                        key={annoId}
                        style={{ cursor: "pointer" }}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleAnnotationClick(
                            a,
                            annoId,
                            cx,
                            margin.left,
                            margin.top,
                            innerW,
                            innerH,
                          )
                        }}
                      >
                        <line
                          x1={cx}
                          x2={cx}
                          y1={0}
                          y2={innerH}
                          stroke={MUTED}
                          strokeOpacity={isActive ? 0.7 : isHovered ? 0.6 : 0.18}
                          strokeWidth={isActive ? 1.5 : 1}
                          strokeDasharray="2,3"
                        />
                        <circle
                          cx={cx}
                          cy={innerH - 4}
                          r={isActive ? 7 : isHovered ? 6 : 4}
                          fill={isActive ? MUTED : SURFACE}
                          stroke={MUTED}
                          strokeOpacity={isActive ? 1 : isHovered ? 1 : 0.6}
                          strokeWidth={1.5}
                          onPointerEnter={() => setHoveredAnno(a)}
                          onPointerLeave={() => setHoveredAnno(null)}
                        />
                        <text
                          x={cx}
                          y={innerH - 3}
                          fill={isActive ? SURFACE : MUTED}
                          fontSize={8}
                          textAnchor="middle"
                          pointerEvents="none"
                          opacity={isActive ? 1 : isHovered ? 1 : 0.7}
                        >
                          ⓘ
                        </text>
                      </g>
                    )
                  })}

                  <g clipPath="url(#chart-area-indexed)">
                    <AnimatePresence>
                      {normalized.map((s) => {
                        const dimmed = spotlightId !== null && spotlightId !== undefined && spotlightId !== s.meta.id
                        const baseOpacity = dimmed ? 0.12 : 1
                        const { estimated, verified } = splitAtVerified(s.points, verifiedBoundary(s.meta))
                        return (
                          <motion.g
                            key={s.meta.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: baseOpacity }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                          >
                            {verified.length > 1 && (
                              <AreaClosed
                                data={verified}
                                x={(p) => xScale(p.year)}
                                y={(p) => yScale(p.value)}
                                yScale={yScale}
                                fill={`url(#area-grad-${s.meta.id})`}
                                curve={curveMonotoneX}
                                opacity={dimmed ? 0.1 : 1}
                              />
                            )}
                            {estimated.length > 1 && (
                              <motion.path
                                d={pathFromPoints(estimated, xScale, yScale)}
                                stroke={s.meta.color}
                                strokeWidth={dimmed ? 1 : 2}
                                strokeDasharray="5,4"
                                opacity={0.55 * baseOpacity}
                                fill="none"
                                initial={false}
                                animate={{ d: pathFromPoints(estimated, xScale, yScale) }}
                                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                              />
                            )}
                            {verified.length > 1 && (
                              <motion.path
                                d={pathFromPoints(verified, xScale, yScale)}
                                stroke={s.meta.color}
                                strokeWidth={dimmed ? 1 : 2.5}
                                fill="none"
                                filter={dimmed ? undefined : "url(#line-glow)"}
                                initial={false}
                                animate={{ d: pathFromPoints(verified, xScale, yScale) }}
                                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                              />
                            )}
                          </motion.g>
                        )
                      })}
                    </AnimatePresence>
                  </g>

                  {/* Right-hand value labels — de-collided, highest values win */}
                  {hovered === null && (() => {
                    const candidates = normalized
                      .map((s) => {
                        const inRange = s.points.filter((p) => p.year <= endYear)
                        const last = inRange[inRange.length - 1]
                        if (!last) return null
                        return { s, last, y: yScale(last.value) }
                      })
                      .filter((x): x is NonNullable<typeof x> => x !== null)
                      .sort((a, b) => a.y - b.y) // top of chart first (lowest y px)
                    const MIN_GAP = 13
                    const placed: number[] = []
                    return candidates
                      .filter(({ y }) => {
                        const conflict = placed.some((py) => Math.abs(py - y) < MIN_GAP)
                        if (!conflict) placed.push(y)
                        return !conflict
                      })
                      .map(({ s, last, y }) => (
                        <g key={`${s.meta.id}-label`}>
                          <circle cx={xScale(last.year)} cy={y} r={3.5} fill={s.meta.color} />
                          <text x={xScale(last.year) + 8} y={y + 4} fill={s.meta.color} fontSize={12} fontWeight={600}>
                            {Math.round(last.value)}
                          </text>
                        </g>
                      ))
                  })()}

                  {hovered !== null && (
                    <g>
                      <line
                        x1={xScale(hovered)}
                        x2={xScale(hovered)}
                        y1={0}
                        y2={innerH}
                        stroke={pinned !== null ? "#c084fc" : TEXT}
                        strokeOpacity={pinned !== null ? 0.7 : 0.4}
                        strokeWidth={pinned !== null ? 1.5 : 1}
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

                  {hoveredAnno && !activeAnnotationId && (
                    <AnnotationTooltip
                      annotation={hoveredAnno}
                      anchorX={xScale(hoveredAnno.year)}
                      innerW={innerW}
                      innerH={innerH}
                    />
                  )}

                  <rect
                    x={0}
                    y={0}
                    width={innerW}
                    height={innerH}
                    fill="transparent"
                    tabIndex={0}
                    style={{ outline: "none", cursor: pinned !== null ? "crosshair" : "default", touchAction: "none" }}
                    onPointerMove={handleMove}
                    onPointerLeave={() => {
                      if (pinned === null) {
                        setHovered(null)
                        setTooltipPos(null)
                      }
                    }}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={() => {
                      pinchRef.current = null
                      /* tooltip dismiss handled by 2.5s timer */
                    }}
                    onClick={(e) => {
                      // Dismiss annotation popover when clicking the chart background
                      setActiveAnnotationId(null)
                      setActiveAnnoPos(null)

                      const rect = e.currentTarget.getBoundingClientRect()
                      const x = e.clientX - rect.left
                      const year = Math.round(xScale.invert(x))
                      if (year < startYear || year > endYear) {
                        setPinned(null)
                        return
                      }
                      setPinned((p) => (p === year ? null : year))
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        setPinned(null)
                        setHovered(null)
                        setTooltipPos(null)
                        setActiveAnnotationId(null)
                        setActiveAnnoPos(null)
                        return
                      }
                      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                        e.preventDefault()
                        const step = e.shiftKey ? 5 : 1
                        const dir = e.key === "ArrowLeft" ? -step : step
                        const current = hovered ?? Math.round((startYear + endYear) / 2)
                        const next = Math.min(endYear, Math.max(startYear, current + dir))
                        if (pinned !== null) setPinned(next)
                        else setHovered(next)
                      }
                    }}
                  />
                </Group>
              </svg>
              {hovered !== null && tooltipPos && tooltipItems.length > 0 && (
                <HtmlTooltip
                  year={hovered}
                  pinned={pinned !== null}
                  items={tooltipItems.map((i) => ({
                    id: i.id,
                    name: i.name,
                    color: i.color,
                    value: `${i.display} (${i.rawDisplay})`,
                  }))}
                  x={tooltipPos.x}
                  y={tooltipPos.y}
                  innerW={innerW + margin.left + margin.right}
                />
              )}
            </>
          )
        }}
      </ParentSize>

      {/* HTML annotation popover — position: absolute inside relative wrapper */}
      {activeAnnoPos && (
        <div
          style={{
            position: "absolute",
            left: activeAnnoPos.left,
            top: activeAnnoPos.top,
            maxWidth: 200,
            zIndex: 20,
            pointerEvents: "auto",
          }}
          className="bg-(--color-surface) border border-(--color-border) rounded-xl p-3 text-xs shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="font-bold text-(--color-text) mb-1">
            {activeAnnoPos.annotation.year} — {activeAnnoPos.annotation.label}
          </p>
          {activeAnnoPos.annotation.description && (
            <p className="text-(--color-muted) leading-relaxed">
              {activeAnnoPos.annotation.description}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Raw: small multiples, one panel per unit, native scales ─────────────────

function RawView({
  series,
  fromYear,
  toYear,
  spotlightId,
}: {
  series: Series[]
  fromYear?: number
  toYear?: number
  spotlightId?: string | null
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
          spotlightId={spotlightId}
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
  spotlightId,
}: {
  unit: Unit
  series: Series[]
  fromYear?: number
  toYear?: number
  hovered: number | null
  onHover: (year: number | null) => void
  spotlightId?: string | null
}) {
  const { muted: MUTED, grid: GRID, surface: SURFACE, text: TEXT } = useChartColors()
  const touchDismissTimerRaw = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null)
  return (
    <div style={{ position: "relative" }}>
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2 mb-2 px-1">
        <div className="shrink-0 text-xs text-(--color-muted) font-mono uppercase tracking-wide">
          {UNIT_LABEL[unit]}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs min-w-0">
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
            if (year >= startYear && year <= endYear) {
              onHover(year)
              setTooltipPos({ x: margin.left + x, y: margin.top })
            } else {
              onHover(null)
              setTooltipPos(null)
            }
          }

          function yearFromTouchXRaw(touch: React.Touch, currentTarget: SVGRectElement): number | null {
            const rect = currentTarget.getBoundingClientRect()
            const x = touch.clientX - rect.left
            const year = Math.round(xScale.invert(x))
            return year >= startYear && year <= endYear ? year : null
          }

          function scheduleTouchDismissRaw() {
            if (touchDismissTimerRaw.current) clearTimeout(touchDismissTimerRaw.current)
            touchDismissTimerRaw.current = setTimeout(() => {
              onHover(null)
            }, 2500)
          }

          function handleTouchStartRaw(e: React.TouchEvent<SVGRectElement>) {
            e.preventDefault()
            if (touchDismissTimerRaw.current) clearTimeout(touchDismissTimerRaw.current)
            const year = yearFromTouchXRaw(e.touches[0], e.currentTarget)
            onHover(year)
            if (year !== null) scheduleTouchDismissRaw()
          }

          function handleTouchMoveRaw(e: React.TouchEvent<SVGRectElement>) {
            if (touchDismissTimerRaw.current) clearTimeout(touchDismissTimerRaw.current)
            const year = yearFromTouchXRaw(e.touches[0], e.currentTarget)
            onHover(year)
            if (year !== null) scheduleTouchDismissRaw()
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
            <>
              <svg
                width={width}
                height={height}
                role="img"
                aria-labelledby={`chart-title-raw-${unit}`}
              >
                <title id={`chart-title-raw-${unit}`}>
                  {`${UNIT_LABEL[unit]} time series from ${startYear} to ${endYear}. ${series.map((s) => s.name).join(", ")}.`}
                </title>
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
                      const { estimated, verified } = splitAtVerified(inRange, verifiedBoundary(s))
                      const dimmed = spotlightId !== null && spotlightId !== undefined && spotlightId !== s.id
                      return (
                        <motion.g
                          key={s.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: dimmed ? 0.12 : 1 }}
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

                  <rect
                    x={0}
                    y={0}
                    width={innerW}
                    height={innerH}
                    fill="transparent"
                    style={{ touchAction: "none" }}
                    onPointerMove={handleMove}
                    onPointerLeave={() => {
                      onHover(null)
                      setTooltipPos(null)
                    }}
                    onTouchStart={handleTouchStartRaw}
                    onTouchMove={handleTouchMoveRaw}
                    onTouchEnd={() => { /* dismiss handled by 2.5s timer */ }}
                  />
                </Group>
              </svg>
              {hovered !== null && hovered >= startYear && hovered <= endYear && tooltipPos && tooltipItems.length > 0 && (
                <HtmlTooltip
                  year={hovered}
                  items={tooltipItems.map((i) => ({
                    id: i.id,
                    name: i.name,
                    color: i.color,
                    value: i.value,
                  }))}
                  x={tooltipPos.x}
                  y={tooltipPos.y}
                  innerW={innerW + margin.left + margin.right}
                />
              )}
            </>
          )
        }}
      </ParentSize>
    </div>
  )
}

// ─── HTML Tooltip (replaces SVG TooltipBox for interactive charts) ────────────

function HtmlTooltip({
  year,
  pinned,
  items,
  x,
  y,
  innerW,
}: {
  year: number
  pinned?: boolean
  items: { id: string; name: string; color: string; value: string }[]
  x: number
  y: number
  innerW: number
}) {
  const tooltipW = 240
  const flipLeft = x + tooltipW + 16 > innerW
  const left = flipLeft ? x - tooltipW - 8 : x + 8
  return (
    <div
      style={{
        position: "absolute",
        left,
        top: y + 4,
        width: tooltipW,
        zIndex: 30,
        pointerEvents: "none",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
      className="rounded-xl border border-(--color-border) bg-(--color-surface)/85 shadow-lg px-3 py-2.5"
    >
      <div className="text-xs font-mono font-bold text-(--color-text) mb-2 pb-1.5 border-b border-(--color-border)">
        {year}{pinned ? " · pinned" : ""}
      </div>
      {items.map((item) => (
        <div key={item.id} className="flex items-center justify-between gap-3 py-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
            <span className="text-[11px] text-(--color-muted) truncate">
              {item.name.length > 24 ? item.name.slice(0, 22) + "…" : item.name}
            </span>
          </div>
          <span className="text-[11px] font-semibold text-(--color-text) tabular-nums flex-shrink-0">
            {item.value}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Shared tooltip box (SVG-native, auto-flips at right edge) ──────────────

function AnnotationTooltip({
  annotation,
  anchorX,
  innerW,
  innerH,
}: {
  annotation: Annotation
  anchorX: number
  innerW: number
  innerH: number
}) {
  const { muted: MUTED, surface: SURFACE, border: BORDER, text: TEXT } = useChartColors()
  const w = 240
  const flipLeft = anchorX + w + 12 > innerW
  const x = flipLeft ? anchorX - w - 10 : anchorX + 10
  const lines = wrapText(annotation.description ?? "", 36)
  const headerH = 22
  const lineH = 14
  const h = headerH + lines.length * lineH + 12
  const y = Math.max(4, innerH - h - 24)

  return (
    <g transform={`translate(${x}, ${y})`} pointerEvents="none">
      <rect width={w} height={h} rx={8} fill={SURFACE} stroke={BORDER} strokeWidth={1} opacity={0.97} />
      <text x={10} y={headerH - 6} fill={TEXT} fontSize={12} fontWeight={700}>
        {annotation.year} — {annotation.label}
      </text>
      {lines.map((line, i) => (
        <text key={i} x={10} y={headerH + 6 + i * lineH} fill={MUTED} fontSize={11}>
          {line}
        </text>
      ))}
    </g>
  )
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ""
  for (const w of words) {
    if (current.length + w.length + 1 > maxChars) {
      if (current) lines.push(current)
      current = w
    } else {
      current = current ? `${current} ${w}` : w
    }
  }
  if (current) lines.push(current)
  return lines
}
