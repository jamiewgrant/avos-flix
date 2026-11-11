import { PRESETS } from "../lib/presets"
import type { Preset } from "../lib/presets"

interface Props {
  activePresetId: string
  onSelect: (preset: Preset) => void
}

export function StoryPresets({ activePresetId, onSelect }: Props) {
  const active = PRESETS.find((p) => p.id === activePresetId)

  return (
    <div className="mb-5">
      {/* Pill row — scrollable with right-edge fade hint */}
      <div className="relative">
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {PRESETS.map((preset) => {
            const isActive = preset.id === activePresetId
            return (
              <button
                key={preset.id}
                onClick={() => onSelect(preset)}
                className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  isActive
                    ? "bg-(--color-accent) border-(--color-accent) text-white shadow-sm"
                    : "bg-(--color-surface-2) border-(--color-border) text-(--color-muted) hover:text-(--color-text) hover:border-(--color-muted)"
                }`}
              >
                {preset.label}
                {preset.id === "custom" && <span className="ml-1 opacity-70">⚙</span>}
              </button>
            )
          })}
        </div>
        {/* Fade hint — only visible when content overflows (masked on md+ where all pills show) */}
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-8 md:hidden"
          style={{ background: "linear-gradient(to right, transparent, var(--color-surface))" }}
        />
      </div>

      {/* Description of active preset */}
      {active && (
        <p className="mt-2 text-[11px] text-(--color-muted) font-mono leading-relaxed">
          {active.description}
        </p>
      )}
    </div>
  )
}
