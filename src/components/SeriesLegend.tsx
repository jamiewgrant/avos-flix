import { useState } from "react"
import { CATEGORY_LABELS, CATEGORY_ORDER, categoryOf, type Category } from "../lib/categories"
import type { Series } from "../types/series"

interface SeriesLegendProps {
  allSeries: Series[]
  palettedAllSeries: Series[]
  hiddenIds: Set<string>
  spotlightId: string | null
  search: string
  onSearch: (q: string) => void
  onToggle: (id: string) => void
  onSpotlight: (id: string | null) => void
  visibleCount: number
}

export function SeriesLegend({
  allSeries,
  palettedAllSeries,
  hiddenIds,
  spotlightId,
  search,
  onSearch,
  onToggle,
  onSpotlight,
  visibleCount,
}: SeriesLegendProps) {
  // All categories expanded by default
  const [collapsed, setCollapsed] = useState<Set<Category>>(new Set())

  function toggleCategory(cat: Category) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  // Group series by category, filtered by search
  const grouped = new Map<Category, Series[]>()
  const q = search.trim().toLowerCase()
  for (const s of allSeries) {
    if (q && !s.name.toLowerCase().includes(q) && !s.id.toLowerCase().includes(q)) continue
    const cat = categoryOf(s.id)
    const arr = grouped.get(cat) ?? []
    arr.push(s)
    grouped.set(cat, arr)
  }

  const noResults = grouped.size === 0

  return (
    <div className="mt-5 px-1 chart-legend">
      {/* Search + summary bar */}
      <div className="mb-3 flex items-center gap-2 flex-wrap">
        <input
          type="search"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Filter series…"
          className="flex-1 max-w-xs bg-(--color-surface-2) border border-(--color-border) rounded-md px-3 py-1.5 text-xs text-(--color-text) placeholder:text-(--color-muted) focus:outline-none focus:border-(--color-accent) transition"
        />
        <span className="text-[10px] text-(--color-muted) font-mono">
          {visibleCount}/{allSeries.length} on · shift-click to spotlight
        </span>
        {spotlightId && (
          <button
            onClick={() => onSpotlight(null)}
            className="text-[10px] font-mono text-(--color-accent) hover:opacity-80 underline underline-offset-2"
          >
            clear spotlight
          </button>
        )}
      </div>

      {/* Category groups */}
      {CATEGORY_ORDER.map((cat) => {
        const items = grouped.get(cat)
        if (!items || items.length === 0) return null

        const isCollapsed = collapsed.has(cat)

        // Count how many series in this category are currently visible (not hidden)
        const visibleInGroup = items.filter((s) => !hiddenIds.has(s.id) && s.points.length > 0).length

        return (
          <div key={cat} className="mb-2">
            {/* Category header — click to collapse/expand */}
            <button
              onClick={() => toggleCategory(cat)}
              className="w-full flex items-center gap-2 py-1 mb-1 text-left group focus:outline-none"
              aria-expanded={!isCollapsed}
            >
              {/* Chevron icon */}
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`text-(--color-muted) shrink-0 transition-transform duration-200 ${isCollapsed ? "-rotate-90" : ""}`}
              >
                <polyline points="2,3.5 5,6.5 8,3.5" />
              </svg>

              <span className="text-[10px] uppercase tracking-wider text-(--color-muted) font-mono opacity-70 group-hover:opacity-100 transition-opacity">
                {CATEGORY_LABELS[cat]}
              </span>

              {/* Visible count badge */}
              <span className="text-[9px] font-mono text-(--color-muted) opacity-50 group-hover:opacity-70 transition-opacity">
                {visibleInGroup}/{items.length}
              </span>
            </button>

            {/* Collapsible series list */}
            <div
              className={`overflow-hidden transition-all duration-200 ease-in-out ${
                isCollapsed ? "max-h-0 opacity-0" : "max-h-[400px] opacity-100"
              }`}
            >
              <div className="flex flex-wrap gap-2 pb-1">
                {items.map((sOrig) => {
                  const s = palettedAllSeries.find((x) => x.id === sOrig.id) ?? sOrig
                  const isOn = !hiddenIds.has(s.id)
                  const hasData = s.points.length > 0
                  const isSpot = spotlightId === s.id
                  return (
                    <button
                      key={s.id}
                      onClick={(e) => {
                        if (e.shiftKey) {
                          onSpotlight(spotlightId === s.id ? null : s.id)
                        } else {
                          onToggle(s.id)
                        }
                      }}
                      disabled={!hasData}
                      title={`${s.description}\n\nClick to toggle. Shift-click to spotlight.`}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs transition ${
                        isSpot ? "border-(--color-accent) ring-1 ring-(--color-accent)" : "border-(--color-border)"
                      } ${
                        isOn && hasData
                          ? "bg-(--color-surface-2) text-(--color-text)"
                          : "bg-transparent text-(--color-muted) opacity-50 hover:opacity-80"
                      } ${!hasData ? "cursor-not-allowed" : "cursor-pointer"}`}
                      style={isSpot ? { borderColor: "var(--color-accent)" } : undefined}
                    >
                      <span className="size-2.5 rounded-full" style={{ background: s.color }} />
                      {s.name}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )
      })}

      {noResults && (
        <div className="text-xs text-(--color-muted) py-2">
          No series match "{search}".
        </div>
      )}
    </div>
  )
}
