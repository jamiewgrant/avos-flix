import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"

import { QAS } from "../lib/faq"

export function Faq() {
  const [openIdx, setOpenIdx] = useState<number | null>(0)

  return (
    <section className="mb-20">
      <h2 className="text-3xl md:text-4xl font-semibold text-(--color-text) mb-3">The usual rebuttals.</h2>
      <p className="text-(--color-muted) mb-8 max-w-2xl text-lg leading-relaxed">
        Every dinner-party objection, pre-answered with the data.
      </p>
      <div className="rounded-2xl border border-(--color-border) bg-(--color-surface) divide-y divide-(--color-border)">
        {QAS.map((qa, i) => {
          const open = openIdx === i
          return (
            <div key={i}>
              <button
                onClick={() => setOpenIdx(open ? null : i)}
                aria-expanded={open}
                aria-controls={`faq-answer-${i}`}
                className="w-full text-left px-5 py-4 flex items-start gap-3 hover:bg-(--color-surface-2) transition"
              >
                <span
                  aria-hidden="true"
                  className={`text-(--color-accent) text-xl leading-none transition-transform duration-200 ${open ? "rotate-45" : ""}`}
                >
                  +
                </span>
                <span className="text-(--color-text) font-medium flex-1">{qa.q}</span>
              </button>
              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    id={`faq-answer-${i}`}
                    key="body"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: "easeInOut" }}
                    style={{ overflow: "hidden" }}
                  >
                    <div className="px-5 pb-5 pl-12 text-(--color-muted) text-sm leading-relaxed">
                      {qa.a}
                      {qa.chartLink && (
                        <a
                          href={qa.chartLink.href}
                          className="mt-3 inline-flex items-center gap-1.5 text-xs text-(--color-accent) font-medium hover:underline"
                        >
                          {qa.chartLink.label}
                        </a>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </section>
  )
}
