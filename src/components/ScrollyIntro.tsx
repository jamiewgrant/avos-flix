import { useEffect, useMemo, useRef, useState } from "react"
import { motion } from "framer-motion"
import { Chart } from "./charts/Chart"
import type { Series, SeriesData } from "../types/series"
import { HISTORICAL_EVENTS } from "../lib/annotations"

interface Scene {
  id: string
  headline: string
  body: string
  visibleIds: string[]
  baseYear: number
  annotationYears?: number[]
}

const SCENES: Scene[] = [
  {
    id: "claim",
    headline: "“It’s the avocado toast.”",
    body: "For a decade, older commentators have argued that younger workers’ financial struggles come down to discretionary spending. We plotted the actual numbers to see if the rebuttal holds.",
    visibleIds: ["median-wage"],
    baseYear: 1995,
  },
  {
    id: "wages",
    headline: "Wages did this.",
    body: "Median UK full-time wages grew about 2.5× since 1995. Visible motion — but a backdrop, not a sprint.",
    visibleIds: ["median-wage"],
    baseYear: 1995,
    annotationYears: [2008],
  },
  {
    id: "houses",
    headline: "Houses did this.",
    body: "Over the same window, the average UK house price grew roughly 5×. The gap between the lines is what cannot be closed by skipping toast.",
    visibleIds: ["median-wage", "house-price-nationwide"],
    baseYear: 1995,
    annotationYears: [1997, 2008, 2020, 2022],
  },
  {
    id: "rest",
    headline: "And so did the rest.",
    body: "Rent, energy bills, the general price level — all moved against you.",
    visibleIds: ["median-wage", "house-price-nationwide", "rent-index", "cpih", "energy-cost"],
    baseYear: 1995,
    annotationYears: [2008, 2020, 2022],
  },
  {
    id: "tuition",
    headline: "Then they added bills that didn’t exist.",
    body: "A degree cost £0 a year in 1997 and £9,535 by 2025. Today’s graduates walk into work owing ~£47,000 before they earn a pound. There’s no equivalent line on a boomer’s chart.",
    visibleIds: ["tuition-uk", "student-debt", "median-wage"],
    baseYear: 1997,
    annotationYears: [1998, 2012],
  },
  {
    id: "childcare",
    headline: "Then they had kids.",
    body: "Full-time nursery for one child under 2 now costs over £15,000 a year in England — before any government support. In 1995 the equivalent was around £3,000. That’s a cost that simply didn’t exist for most boomers at the same life stage.",
    visibleIds: ["childcare-cost", "median-wage"],
    baseYear: 1995,
    annotationYears: [2020],
  },
  {
    id: "total",
    headline: "This is the full picture.",
    body: "Stack it all together: house prices, rent, energy, childcare, tuition, student debt. Every line outpaced wages. This isn’t a spending problem. It’s a structural cost problem.",
    visibleIds: ["median-wage", "house-price-nationwide", "rent-index", "energy-cost", "childcare-cost", "tuition-uk"],
    baseYear: 1995,
    annotationYears: [2008, 2020, 2022],
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
  const activeAnnotations = useMemo(
    () =>
      activeScene.annotationYears
        ? HISTORICAL_EVENTS.filter((a) => activeScene.annotationYears!.includes(a.year))
        : [],
    [activeScene],
  )

  return (
    <section className="mb-24">
      <div className="grid md:grid-cols-[1fr_1fr] gap-8">
        <div className="sticky top-0 md:top-4 self-start z-10">
          <div className="rounded-2xl border border-(--color-border) bg-(--color-surface) p-3 md:p-6">
            {/* Scene progress dots — visible on mobile where text is below the fold */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-(--color-muted) font-mono uppercase tracking-wide">
                {activeIdx + 1} / {SCENES.length}
              </span>
              <div className="flex gap-0.5 ml-1">
                {SCENES.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveIdx(i)}
                    aria-label={`Go to scene ${i + 1}: ${SCENES[i].headline}`}
                    className="w-8 h-8 flex items-center justify-center rounded-full transition-all"
                  >
                    <span className={`rounded-full transition-all block ${i === activeIdx ? "w-4 h-2 bg-(--color-accent)" : "w-2 h-2 bg-(--color-border)"}`} />
                  </button>
                ))}
              </div>
            </div>
            <Chart
              series={visible}
              mode="indexed"
              baseYear={activeScene.baseYear}
              fromYear={activeScene.baseYear}
              annotations={activeAnnotations}
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
          {(() => {
            const [first, ...rest] = scene.headline.split(" ")
            return rest.length > 0 ? (
              <><span className="font-extrabold">{first}</span>{" "}{rest.join(" ")}</>
            ) : (
              scene.headline
            )
          })()}
        </h3>
        <p className="mt-5 text-(--color-muted) text-lg leading-relaxed max-w-md">
          {scene.body}
        </p>
      </motion.div>
    </div>
  )
}
