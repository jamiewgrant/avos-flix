import { useEffect, useRef, useState } from "react"

interface Props {
  min: number
  max: number
  value: [number, number]
  onChange: (next: [number, number]) => void
  presets?: { label: string; range: [number, number] }[]
}

const ACCENT = "#c084fc"
const BG = "#0a0a0a"
const BORDER = "#2e303a"
const MUTED = "#9ca3af"
const TRACK_HEIGHT = 8
const HANDLE_R = 11

export function YearRangeBrush({ min, max, value, onChange, presets = [] }: Props) {
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

  function yearAt(clientX: number): number {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return min
    const x = clientX - rect.left
    const t = Math.max(0, Math.min(1, x / rect.width))
    return Math.round(min + t * (max - min))
  }

  function xAt(year: number): number {
    if (max === min) return 0
    return ((year - min) / (max - min)) * width
  }

  function handleDown(which: "from" | "to" | "window", e: React.PointerEvent) {
    e.preventDefault()
    setDrag(which)
    dragStart.current = { clientX: e.clientX, from: clampedFrom, to: clampedTo }
  }

  useEffect(() => {
    if (!drag) return
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
          ((e.clientX - start.clientX) / (ref.current?.getBoundingClientRect().width || 1)) *
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

  const height = 36
  const trackY = height / 2

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
      <div className="flex-1 min-w-[260px]">
        <svg
          ref={ref}
          width="100%"
          height={height}
          style={{ touchAction: "none", cursor: drag === "window" ? "grabbing" : "default" }}
        >
          {/* Track */}
          <rect
            x={0}
            y={trackY - TRACK_HEIGHT / 2}
            width={width}
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
            onPointerDown={(e) => handleDown("from", e)}
          />
          <circle
            cx={xAt(clampedTo)}
            cy={trackY}
            r={HANDLE_R}
            fill={BG}
            stroke={ACCENT}
            strokeWidth={2.5}
            style={{ cursor: "ew-resize" }}
            onPointerDown={(e) => handleDown("to", e)}
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
              className="px-2.5 py-1 rounded-md font-mono text-xs bg-(--color-bg) text-(--color-muted) hover:text-(--color-text) transition"
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
