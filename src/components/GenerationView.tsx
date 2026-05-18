import { useMemo, useState } from "react"
import type { Series, SeriesData } from "../types/series"
import { formatValue } from "../types/series"

interface Props {
  data: SeriesData
}

interface Milestone {
  age: number
  label: string
  description: string
  seriesIds: string[]
}

const MILESTONES: Milestone[] = [
  {
    age: 18,
    label: "School-leaving age",
    description: "Starting independent earning",
    seriesIds: ["median-wage", "cpih"],
  },
  {
    age: 25,
    label: "Renting peak",
    description: "Typical age renters spend the largest share of income on housing",
    seriesIds: ["rent-index", "median-wage"],
  },
  {
    age: 32,
    label: "Average first-time buyer",
    description: "UK average age of a first-time buyer (Halifax / FCA stats)",
    seriesIds: ["house-price-nationwide", "median-wage", "boe-rate"],
  },
  {
    age: 45,
    label: "Peak earnings + costs",
    description: "Mortgage halfway, children, peak energy/food spend",
    seriesIds: ["median-wage", "energy-cost"],
  },
]

const BIRTH_YEAR_OPTIONS = [1955, 1965, 1975, 1985, 1995, 2000]

function findNearest(series: Series, year: number): { value: number; year: number } | null {
  let best: { value: number; year: number } | null = null
  let bestDiff = Infinity
  for (const p of series.points) {
    const diff = Math.abs(p.year - year)
    if (diff < bestDiff) {
      bestDiff = diff
      best = { value: p.value, year: p.year }
    }
  }
  if (!best || bestDiff > 3) return null
  return best
}

export function GenerationView({ data }: Props) {
  const [birthYear, setBirthYear] = useState(1985)

  const rows = useMemo(() => {
    return MILESTONES.map((m) => {
      const targetYear = birthYear + m.age
      const series = m.seriesIds
        .map((id) => data.series[id])
        .filter((s): s is Series => Boolean(s))
      const values = series
        .map((s) => {
          const point = findNearest(s, targetYear)
          if (!point) return null
          return { meta: s, point }
        })
        .filter((v): v is { meta: Series; point: { value: number; year: number } } => v !== null)
      return { milestone: m, targetYear, values }
    })
  }, [birthYear, data])

  const today = new Date().getFullYear()
  const ageNow = today - birthYear

  return (
    <section className="rounded-2xl border border-(--color-border) bg-(--color-surface) p-6 md:p-10">
      <div className="text-xs text-(--color-muted) font-mono uppercase tracking-wide mb-2">
        Generation view
      </div>
      <h3 className="text-2xl md:text-3xl font-semibold text-white">
        Born in{" "}
        <select
          value={birthYear}
          onChange={(e) => setBirthYear(Number(e.target.value))}
          className="bg-(--color-bg) border border-(--color-border) text-(--color-accent) px-3 py-1 rounded-md cursor-pointer hover:border-(--color-accent) transition-colors text-2xl md:text-3xl font-semibold"
        >
          {BIRTH_YEAR_OPTIONS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        ?
      </h3>
      <p className="mt-3 text-(--color-muted)">
        You're {ageNow < 0 ? "not born yet" : `${ageNow} this year`}. Here's the UK
        economy at each of your milestones.
      </p>

      <div className="mt-8 space-y-4">
        {rows.map(({ milestone, targetYear, values }) => (
          <div
            key={milestone.age}
            className="grid md:grid-cols-[140px_1fr_auto] gap-x-6 gap-y-2 items-baseline py-4 border-t border-(--color-border)"
          >
            <div>
              <div className="text-(--color-accent) font-mono text-sm">
                age {milestone.age}
              </div>
              <div className="text-(--color-muted) text-xs font-mono">
                {targetYear}
              </div>
            </div>
            <div>
              <div className="text-white font-semibold">{milestone.label}</div>
              <div className="text-(--color-muted) text-sm leading-snug">
                {milestone.description}
              </div>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 md:justify-end text-sm">
              {values.length === 0 ? (
                <span className="text-(--color-muted) italic">no data</span>
              ) : (
                values.map(({ meta, point }) => (
                  <span key={meta.id} className="font-mono">
                    <span style={{ color: meta.color }}>
                      {formatValue(point.value, meta.unit)}
                    </span>
                    <span className="text-(--color-muted) text-xs ml-1.5">
                      {meta.name.split(" (")[0]}
                      {point.year !== targetYear && (
                        <span className="opacity-50"> ({point.year})</span>
                      )}
                    </span>
                  </span>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
