import { useEffect } from "react"
import type { Series } from "../types/series"
import { categoryOf, CATEGORY_LABELS, CATEGORY_ORDER } from "../lib/categories"

interface Props {
  open: boolean
  onClose: () => void
  series: Series[]
}

export function MethodologyModal({ open, onClose, series }: Props) {
  // Close on Escape key
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [open, onClose])

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  if (!open) return null

  // Group series by category in display order
  const grouped = CATEGORY_ORDER.map((cat) => ({
    cat,
    label: CATEGORY_LABELS[cat],
    items: series.filter((s) => categoryOf(s.id) === cat),
  })).filter((g) => g.items.length > 0)

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12 backdrop-blur-sm bg-black/60"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-label="Data sources and methodology"
    >
      <div
        className="relative w-full max-w-2xl mx-auto bg-(--color-surface) border border-(--color-border) rounded-2xl shadow-2xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--color-border) shrink-0">
          <h2 className="text-base font-semibold text-(--color-text)">
            Data sources &amp; methodology
          </h2>
          <button
            onClick={onClose}
            className="text-(--color-muted) hover:text-(--color-text) transition-colors text-xl leading-none"
            aria-label="Close methodology modal"
          >
            ×
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-scroll flex-1 px-6 py-4 space-y-6">
          {/* Legend note */}
          <p className="text-xs text-(--color-muted) bg-(--color-border)/30 rounded-lg px-3 py-2 leading-relaxed">
            <span className="text-(--color-text) font-medium">Solid lines</span> = ONS-published statistics.{" "}
            <span className="text-(--color-text) font-medium">Dashed lines</span> = modelled estimates or proxies.
          </p>

          {grouped.map(({ cat, label, items }) => (
            <section key={cat}>
              <h3 className="font-mono uppercase text-xs text-(--color-muted) tracking-widest mb-3">
                {label}
              </h3>
              <ul className="space-y-4">
                {items.map((s) => (
                  <li key={s.id} className="flex gap-3">
                    {/* Colour swatch */}
                    <span
                      className="mt-1 size-2 rounded-full shrink-0"
                      style={{ background: s.color }}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-(--color-text) leading-snug">
                        {s.name}
                      </p>
                      {s.description && (
                        <p className="text-xs text-(--color-muted) mt-0.5 leading-relaxed">
                          {s.description}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                        <a
                          href={s.source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-(--color-muted) underline underline-offset-2 hover:text-(--color-text) transition-colors"
                        >
                          {s.source.name}
                        </a>
                        {s.estimated && (
                          <span className="text-xs text-(--color-muted) italic">
                            Hand-compiled / illustrative · drawn dashed throughout
                          </span>
                        )}
                        {!s.estimated && s.verifiedFrom && (
                          <span className="text-xs text-(--color-muted) italic">
                            Verified from {s.verifiedFrom} · estimated/modelled pre-{s.verifiedFrom}
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
