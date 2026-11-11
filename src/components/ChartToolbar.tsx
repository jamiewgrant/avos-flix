import type { ReactNode } from "react"
import { EmbedCodeButton } from "./EmbedCodeButton"
import { ShareButton } from "./ShareButton"
import type { PaletteMode } from "../lib/palette"
import { BASE_YEAR_OPTIONS } from "../lib/presets"

export type RegionKey = "uk" | "london" | "northeast"

interface Props {
  mode: "indexed" | "raw"
  onMode: (m: "indexed" | "raw") => void
  baseYear: number
  onBaseYear: (y: number) => void
  showAnnotations: boolean
  onToggleAnnotations: () => void
  regions: { key: RegionKey; label: string }[]
  /** null when no house-price series is on the chart. */
  activeRegion: RegionKey | null
  onRegion: (key: RegionKey) => void
  realTerms: boolean
  onRealTerms: (v: boolean) => void
  refYear: number
  palette: PaletteMode
  onTogglePalette: () => void
  shareTitle: string
  shareStats: string[]
  snapshotting: boolean
  onFullscreen: () => void
  onExportCsv: () => void
  onCopyLink: () => void
  onReset: () => void
  onSnapshot: () => void
}

const PILL = "px-2.5 py-1.5 rounded-md font-mono text-xs transition"
const PILL_ON = "bg-(--color-accent) text-white"
const PILL_OFF = "bg-(--color-surface-2) hover:text-(--color-text)"
const ACTION =
  "px-3 py-1.5 rounded-md font-mono text-xs bg-(--color-surface-2) border border-(--color-border) text-(--color-muted) hover:text-(--color-text) hover:border-(--color-muted) transition"

function Pill({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean
  onClick: () => void
  title?: string
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      title={title}
      className={`${PILL} ${active ? PILL_ON : PILL_OFF}`}
    >
      {children}
    </button>
  )
}

function Group({ label, className = "", children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div className={`flex items-center gap-2 text-(--color-muted) ${className}`}>
      <span className="text-xs">{label}</span>
      <div className="flex gap-1">{children}</div>
    </div>
  )
}

/** View / base-year / region / inflation controls plus the export-and-share actions. */
export function ChartToolbar(p: Props) {
  return (
    <>
      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 px-1 text-sm">
        <Group label="View">
          <Pill active={p.mode === "indexed"} onClick={() => p.onMode("indexed")}>Indexed</Pill>
          <Pill active={p.mode === "raw"} onClick={() => p.onMode("raw")}>Raw</Pill>
        </Group>

        {p.mode === "indexed" && (
          <Group label="Base">
            {BASE_YEAR_OPTIONS.map((y) => (
              <Pill key={y} active={p.baseYear === y} onClick={() => p.onBaseYear(y)}>
                {y}
              </Pill>
            ))}
          </Group>
        )}

        <Group label="Events">
          <Pill
            active={p.showAnnotations}
            onClick={p.onToggleAnnotations}
            title="Show/hide historical event markers"
          >
            {p.showAnnotations ? "On" : "Off"}
          </Pill>
        </Group>

        <Group label="House prices">
          {p.regions.map((r) => (
            <Pill
              key={r.key}
              active={p.activeRegion === r.key}
              onClick={() => p.onRegion(r.key)}
              title={`Show ${r.label} house prices`}
            >
              {r.label}
            </Pill>
          ))}
        </Group>

        <Group label="Strip inflation">
          <Pill active={!p.realTerms} onClick={() => p.onRealTerms(false)} title="Show values as published">
            Off
          </Pill>
          <Pill
            active={p.realTerms}
            onClick={() => p.onRealTerms(true)}
            title={`Divide every price-like series by CPIH so growth is in real terms (${p.refYear}=ref)`}
          >
            On
          </Pill>
        </Group>

        <Group label="Palette" className="hidden md:flex">
          <Pill
            active={p.palette === "cb"}
            onClick={p.onTogglePalette}
            title="Swap to a colour-blind-safe (Okabe-Ito) palette"
          >
            {p.palette === "cb" ? "CB-safe" : "Default"}
          </Pill>
        </Group>
      </div>

      {/* Action buttons — own row, right-aligned */}
      <div className="mt-2 flex flex-wrap items-center justify-end gap-1.5 px-1 chart-actions">
        <span className="hidden md:contents">
          <EmbedCodeButton />
        </span>
        <button
          onClick={p.onFullscreen}
          aria-label="Toggle fullscreen for the main chart"
          className={`hidden md:block ${ACTION}`}
          title="Toggle fullscreen"
        >
          ⤢ Full
        </button>
        <button
          onClick={p.onExportCsv}
          aria-label="Download visible series as CSV"
          className={ACTION}
          title="Download visible series as CSV"
        >
          ↓ CSV
        </button>
        <button
          onClick={p.onCopyLink}
          aria-label="Copy a link to this exact view"
          className={ACTION}
          title="Copy a link to this exact view"
        >
          ↗ Copy link
        </button>
        <ShareButton
          title={p.shareTitle}
          stats={p.shareStats}
          label="Share image"
          className={`hidden md:inline-flex items-center gap-1.5 ${ACTION}`}
        />
        <button
          onClick={p.onReset}
          aria-label="Reset all controls to defaults"
          className={ACTION}
          title="Reset all controls to defaults"
        >
          ↺ Reset
        </button>
        <button
          onClick={p.onSnapshot}
          disabled={p.snapshotting}
          aria-label="Download this chart as a PNG"
          className={`hidden md:block ${ACTION} disabled:opacity-40`}
          title="Download this chart as a PNG"
        >
          {p.snapshotting ? "saving…" : "↓ PNG"}
        </button>
      </div>
    </>
  )
}
