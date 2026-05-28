export interface Preset {
  id: string
  label: string
  description: string
  visibleIds: string[] | null // null = custom, user-controlled
}

export const PRESETS: Preset[] = [
  {
    id: "wages-vs-houses",
    label: "Wages vs Houses",
    description: "The core thesis: house prices outran wages 5× since 1995",
    visibleIds: ["median-wage", "house-price-nationwide", "cpih"],
  },
  {
    id: "cost-squeeze",
    label: "Cost Squeeze",
    description: "Energy, childcare, rail, council tax — the costs that actually ate your pay",
    visibleIds: ["median-wage", "energy-cost", "childcare-cost", "rail-fares", "council-tax", "cpih"],
  },
  {
    id: "student-trap",
    label: "Student Trap",
    description: "Tuition tripled, debt compounded, graduate salaries didn't follow",
    visibleIds: ["median-wage", "tuition-uk", "student-debt", "grad-salary"],
  },
  {
    id: "housing-market",
    label: "Housing Market",
    description: "Prices, rents, ownership rates and the age you finally get on the ladder",
    visibleIds: ["house-price-nationwide", "rent-index", "homeownership-25-34", "ftb-age", "median-wage"],
  },
  {
    id: "custom",
    label: "Custom",
    description: "Pick your own combination of series",
    visibleIds: null,
  },
]

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
