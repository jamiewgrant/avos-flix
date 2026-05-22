import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"

const ROWS: Array<{ keys: string[]; description: string }> = [
  { keys: ["?"], description: "Open this cheatsheet" },
  { keys: ["i"], description: "Switch to Indexed mode" },
  { keys: ["r"], description: "Switch to Raw mode" },
  { keys: ["1", "2", "3", "4", "5"], description: "Set base year (1953, 1970, 1980, 1995, 2008)" },
  { keys: ["←", "→"], description: "Move brush handles (when focused)" },
  { keys: ["Shift + ←/→"], description: "Move brush in 5-year steps" },
  { keys: ["Esc"], description: "Close any open modal" },
]

function dispatchShortcut(action: string, value: string | number) {
  window.dispatchEvent(
    new CustomEvent("avos:shortcut", { detail: { action, value } }),
  )
}

const BASE_YEARS: Record<string, number> = {
  "1": 1953,
  "2": 1970,
  "3": 1980,
  "4": 1995,
  "5": 2008,
}

export function KeyboardShortcuts() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      // Ignore keystrokes inside inputs / textareas / contenteditable
      const target = e.target as HTMLElement
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return
      }

      if (e.key === "Escape") {
        setOpen(false)
        return
      }

      // Don't handle shortcuts if a modifier other than Shift is held
      if (e.ctrlKey || e.metaKey || e.altKey) return

      switch (e.key) {
        case "?":
          setOpen((prev) => !prev)
          break
        case "i":
          dispatchShortcut("setMode", "indexed")
          break
        case "r":
          dispatchShortcut("setMode", "raw")
          break
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
          dispatchShortcut("setBaseYear", BASE_YEARS[e.key])
          break
      }
    }

    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [])

  return (
    <>
      {/* Fixed trigger button — bottom-right corner */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Keyboard shortcuts"
        className="fixed bottom-4 right-4 z-40 w-9 h-9 rounded-full border border-(--color-border) bg-(--color-surface) text-(--color-muted) hover:text-(--color-text) text-sm font-mono transition"
      >
        ?
      </button>

      {/* Modal */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />

            {/* Card */}
            <motion.div
              key="card"
              role="dialog"
              aria-modal="true"
              aria-label="Keyboard shortcuts"
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
            >
              <div
                className="pointer-events-auto w-full max-w-sm mx-4 rounded-2xl border border-(--color-border) bg-(--color-surface) shadow-lg p-5"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-(--color-text)">
                    Keyboard shortcuts
                  </h2>
                  <button
                    onClick={() => setOpen(false)}
                    aria-label="Close keyboard shortcuts"
                    className="text-(--color-muted) hover:text-(--color-text) text-lg leading-none transition"
                  >
                    ×
                  </button>
                </div>

                {/* 2-column grid: keys | description */}
                <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5">
                  {ROWS.map((row) => (
                    <ShortcutRow
                      key={row.description}
                      keys={row.keys}
                      description={row.description}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

function ShortcutRow({ keys, description }: { keys: string[]; description: string }) {
  return (
    <>
      <div className="flex items-center gap-1 flex-wrap">
        {keys.map((k) => (
          <kbd
            key={k}
            className="bg-(--color-surface-2) border border-(--color-border) text-xs font-mono px-1.5 py-0.5 rounded text-(--color-text)"
          >
            {k}
          </kbd>
        ))}
      </div>
      <span className="text-sm text-(--color-muted) leading-tight self-center">
        {description}
      </span>
    </>
  )
}
