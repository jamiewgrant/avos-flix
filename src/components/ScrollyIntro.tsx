import { useEffect, useMemo, useRef, useState } from "react"
import { motion } from "framer-motion"
import { Chart } from "./charts/Chart"
import type { Series, SeriesData } from "../types/series"

interface Scene {
  id: string
  headline: string
  body: string
  visibleIds: string[]
  baseYear: number
}

const SCENES: Scene[] = [
  {
    id: "claim",
    headline: "“It's the avocado toast.”",
    body: "For a decade, older commentators have argued that younger workers' financial struggles come down to discretionary spending. We plotted the actual numbers to see if the rebuttal holds.",
    visibleIds: ["median-wage"],
    baseYear: 1995,
  },
  {
    id: "wages",
    headline: "Wages did this.",
    body: "Median UK full-time wages grew about 2.5× since 1995. Visible motion — but a backdrop, not a sprint.",
    visibleIds: ["median-wage"],
    baseYear: 1995,
  },
  {
    id: "houses",
    headline: "Houses did this.",
    body: "Over the same window, the average UK house price grew roughly 5×. The gap between the lines is what cannot be closed by skipping toast.",
    visibleIds: ["median-wage", "house-price-nationwide"],
    baseYear: 1995,
  },
  {
    id: "rest",
    headline: "And so did the rest.",
    body: "Rent, energy bills, the general price level — all moved against you.",
    visibleIds: ["median-wage", "house-price-nationwide", "rent-index", "cpih", "energy-cost"],
    baseYear: 1995,
  },
  {
    id: "tuition",
    headline: "Then they added bills that didn't exist.",
    body: "A degree cost £0 a year in 1997 and £9,535 by 2025. Today's graduates walk into work owing ~£47,000 before they earn a pound. There's no equivalent line on a boomer's chart.",
    visibleIds: ["tuition-uk", "student-debt", "median-wage"],
    baseYear: 1997,
  },
]

interface Props {
  data: SeriesData
}

export function ScrollyIntro({ data }: Props) {
  const [activeIdx, setActiveIdx] = useState(0)
  const activeScene = SCENES[activeIdx]

  const allSeries = useMemo<Series[]>(() => Object.values(data.series), [data])
  const visible = useMemo(
    () =>
      allSeries.filter(
        (s) => activeScene.visibleIds.includes(s.id) && s.points.length > 0,
      ),
    [allSeries, activeScene],
  )

  return (
    <section className="mb-24">
      <div className="grid md:grid-cols-[1fr_1fr] gap-8">
        <div className="md:sticky md:top-4 self-start md:z-10">
          <div className="rounded-2xl border border-(--color-border) bg-(--color-surface) p-4 md:p-6">
            <div className="text-xs text-(--color-muted) font-mono uppercase tracking-wide mb-2">
              {activeIdx + 1} / {SCENES.length}
            </div>
            <Chart
              series={visible}
              mode="indexed"
              baseYear={activeScene.baseYear}
              fromYear={activeScene.baseYear}
            />
          </div>
        </div>

        <div>
          {SCENES.map((scene, i) => (
            <SceneBlock
              key={scene.id}
              scene={scene}
              isActive={i === activeIdx}
              onEnter={() => setActiveIdx(i)}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

function SceneBlock({
  scene,
  isActive,
  onEnter,
}: {
  scene: Scene
  isActive: boolean
  onEnter: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) onEnter()
      },
      { rootMargin: "-40% 0px -40% 0px" },
    )
    obs.observe(node)
    return () => obs.disconnect()
  }, [onEnter])

  return (
    <div ref={ref} className="min-h-[55vh] md:min-h-[80vh] flex flex-col justify-center py-8">
      <motion.div
        animate={{
          opacity: isActive ? 1 : 0.35,
          x: isActive ? 0 : 10,
        }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <h3 className="text-3xl md:text-4xl font-semibold text-(--color-text) leading-tight">
          {scene.headline}
        </h3>
        <p className="mt-5 text-(--color-muted) text-lg leading-relaxed max-w-md">
          {scene.body}
        </p>
      </motion.div>
    </div>
  )
}
