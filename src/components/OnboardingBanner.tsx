import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

const STORAGE_KEY = "avos-flix.onboarding.seen.v1"

export function OnboardingBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const seen = window.localStorage.getItem(STORAGE_KEY)
    if (!seen) setVisible(true)
  }, [])

  function dismiss() {
    setVisible(false)
    try {
      window.localStorage.setItem(STORAGE_KEY, "1")
    } catch {
      // private mode etc — ignore
    }
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
          className="mb-6 rounded-xl border border-(--color-accent-border) bg-(--color-surface) px-4 py-3 flex items-start gap-3 text-sm"
          style={{ borderColor: "rgba(192, 132, 252, 0.4)" }}
        >
          <span className="text-(--color-accent) text-lg leading-none mt-0.5">★</span>
          <div className="flex-1 text-(--color-text) leading-relaxed">
            <strong className="text-(--color-text)">First time here?</strong> Hover the
            chart to read exact values. Click the series chips below the chart
            to toggle them. Drag the year-range slider to zoom. Every control
            persists in the URL — share a link to share a view.
          </div>
          <button
            onClick={dismiss}
            className="text-(--color-muted) hover:text-(--color-text) px-2 py-0.5 leading-none text-lg"
            aria-label="Dismiss"
          >
            ×
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
