import { useEffect, useRef, useState } from "react"
import { useChartColors } from "../lib/useChartColors"

interface Props {
  min: number
  max: number
  value: [number, number]
  onChange: (next: [number, number]) => void
  presets?: { label: string; range: [number, number] }[]
}

const ACCENT = "#c084fc"
const TRACK_HEIGHT = 8
const HANDLE_R = 11
// The track is inset by the handle radius so handles and their year labels
// stay fully inside the SVG at both extremes instead of being clipped.
const PAD = HANDLE_R + 3

export function YearRangeBrush({ min, max, value, onChange, presets = [] }: Props) {
  const { border: BORDER, bg: BG, muted: MUTED } = useChartColors()
  const ref = useRef<SVGSVGElement>(null)
  const [width, setWidth] = useState(0)
  const [drag, setDrag] = useState<"from" | "to" | "window" | null>(null)
  const dragStart = useRef<{ clientX: number; from: number; to: number } | null>(null)

  const [from, to] = value
  const clampedFrom = Math.max(min, Math.min(from, to))
  const clampedTo = Math.min(max, Math.max(to, from))

  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width)
    })
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])

  const trackW = Math.max(0, width - PAD * 2)
  function xAt(year: number): number {
    if (max === min) return PAD
    return PAD + ((year - min) / (max - min)) * trackW
  }

  function handleDown(which: "from" | "to" | "window", e: React.PointerEvent) {
    e.preventDefault()
    setDrag(which)
    dragStart.current = { clientX: e.clientX, from: clampedFrom, to: clampedTo }
  }

  useEffect(() => {
    if (!drag) return
    function yearAt(clientX: number): number {
      const rect = ref.current?.getBoundingClientRect()
      if (!rect || rect.width === 0) return min
      const usable = rect.width - PAD * 2
      if (usable <= 0) return min
      const t = Math.max(0, Math.min(1, (clientX - rect.left - PAD) / usable))
      return Math.round(min + t * (max - min))
    }
    function move(e: PointerEvent) {
      if (!dragStart.current) return
      const start = dragStart.current
      if (drag === "from") {
        const y = yearAt(e.clientX)
        const next: [number, number] = [Math.min(y, start.to - 1), start.to]
        onChange([Math.max(min, next[0]), next[1]])
      } else if (drag === "to") {
        const y = yearAt(e.clientX)
        const next: [number, number] = [start.from, Math.max(y, start.from + 1)]
        onChange([next[0], Math.min(max, next[1])])
      } else {
        const dxYears =
          ((e.clientX - start.clientX) /
            Math.max(1, (ref.current?.getBoundingClientRect().width ?? 0) - PAD * 2)) *
          (max - min)
        const len = start.to - start.from
        let newFrom = Math.round(start.from + dxYears)
        let newTo = newFrom + len
        if (newFrom < min) {
          newFrom = min
          newTo = min + len
        }
        if (newTo > max) {
          newTo = max
          newFrom = max - len
        }
        onChange([newFrom, newTo])
      }
    }
    function up() {
      setDrag(null)
      dragStart.current = null
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
    return () => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
    }
  }, [drag, max, min, onChange])

  function handleKeyFrom(e: React.KeyboardEvent) {
    const step = e.shiftKey ? 5 : 1
    if (e.key === "ArrowLeft") { e.preventDefault(); onChange([Math.max(min, clampedFrom - step), clampedTo]) }
    if (e.key === "ArrowRight") { e.preventDefault(); onChange([Math.min(clampedTo - 1, clampedFrom + step), clampedTo]) }
  }

  function handleKeyTo(e: React.KeyboardEvent) {
    const step = e.shiftKey ? 5 : 1
    if (e.key === "ArrowLeft") { e.preventDefault(); onChange([clampedFrom, Math.max(clampedFrom + 1, clampedTo - step)]) }
    if (e.key === "ArrowRight") { e.preventDefault(); onChange([clampedFrom, Math.min(max, clampedTo + step)]) }
  }

  const height = 44
  const trackY = 16

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
      <div className="flex-1 min-w-0 w-full">
        <svg
          ref={ref}
          width="100%"
          height={height}
          style={{ touchAction: "none", cursor: drag === "window" ? "grabbing" : "default" }}
        >
          {/* Track */}
          <rect
            x={PAD}
            y={trackY - TRACK_HEIGHT / 2}
            width={trackW}
            height={TRACK_HEIGHT}
            rx={TRACK_HEIGHT / 2}
            fill={BORDER}
          />
          {/* Selected window */}
          <rect
            x={xAt(clampedFrom)}
            y={trackY - TRACK_HEIGHT / 2}
            width={Math.max(0, xAt(clampedTo) - xAt(clampedFrom))}
            height={TRACK_HEIGHT}
            rx={TRACK_HEIGHT / 2}
            fill={ACCENT}
            opacity={0.85}
            style={{ cursor: "grab" }}
            onPointerDown={(e) => handleDown("window", e)}
          />
          {/* Handles */}
          <circle
            cx={xAt(clampedFrom)}
            cy={trackY}
            r={HANDLE_R}
            fill={BG}
            stroke={ACCENT}
            strokeWidth={2.5}
            style={{ cursor: "ew-resize" }}
            tabIndex={0}
            role="slider"
            aria-label="Start year"
            aria-valuemin={min}
            aria-valuemax={clampedTo - 1}
            aria-valuenow={clampedFrom}
            aria-valuetext={String(clampedFrom)}
            onPointerDown={(e) => handleDown("from", e)}
            onKeyDown={handleKeyFrom}
          />
          <circle
            cx={xAt(clampedTo)}
            cy={trackY}
            r={HANDLE_R}
            fill={BG}
            stroke={ACCENT}
            strokeWidth={2.5}
            style={{ cursor: "ew-resize" }}
            tabIndex={0}
            role="slider"
            aria-label="End year"
            aria-valuemin={clampedFrom + 1}
            aria-valuemax={max}
            aria-valuenow={clampedTo}
            aria-valuetext={String(clampedTo)}
            onPointerDown={(e) => handleDown("to", e)}
            onKeyDown={handleKeyTo}
          />
          {/* Year labels */}
          <text
            x={xAt(clampedFrom)}
            y={height - 1}
            fill={MUTED}
            fontSize={10}
            textAnchor="middle"
            fontFamily="ui-monospace, monospace"
          >
            {clampedFrom}
          </text>
          <text
            x={xAt(clampedTo)}
            y={height - 1}
            fill={MUTED}
            fontSize={10}
            textAnchor="middle"
            fontFamily="ui-monospace, monospace"
          >
            {clampedTo}
          </text>
        </svg>
      </div>
      {presets.length > 0 && (
        <div className="flex gap-1">
          {presets.map((p) => (
            <button
              key={p.label}
              onClick={() => onChange(p.range)}
              className="px-3 py-2 rounded-md font-mono text-xs bg-(--color-bg) text-(--color-muted) hover:text-(--color-text) transition"
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
