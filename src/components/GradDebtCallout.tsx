import { useMemo } from "react"
import type { Series } from "../types/series"
import { formatValue } from "../types/series"

interface Props {
  series: Series[]
}

function valueAt(series: Series[], id: string, year: number): number | null {
  const s = series.find((x) => x.id === id)
  if (!s) return null
  for (const offset of [0, 1, -1, 2, -2]) {
    const p = s.points.find((p) => p.year === year + offset)
    if (p) return p.value
  }
  return null
}

export function GradDebtCallout({ series }: Props) {
  const data = useMemo(() => {
    const debtSeries = series.find((s) => s.id === "student-debt")
    const salarySeries = series.find((s) => s.id === "grad-salary")
    if (!debtSeries || !salarySeries) return null

    // Build ratio per year where both have data
    const salaryYears = new Set(salarySeries.points.map((p) => p.year))
    const ratioPoints: { year: number; ratio: number }[] = []

    for (const dp of debtSeries.points) {
      if (!salaryYears.has(dp.year)) continue
      const salary = valueAt(series, "grad-salary", dp.year)
      if (!salary || salary === 0) continue
      ratioPoints.push({ year: dp.year, ratio: dp.value / salary })
    }

    if (ratioPoints.length === 0) return null

    const latest = ratioPoints[ratioPoints.length - 1]
    const allYears = debtSeries.points.map((p) => p.year)
    const latestYear = Math.max(...allYears)
    const latestDebt = valueAt(series, "student-debt", latestYear)
    const latestSalary = valueAt(series, "grad-salary", latestYear)

    return { ratioPoints, latest, latestYear, latestDebt, latestSalary }
  }, [series])

  if (!data) return null

  const { ratioPoints, latestYear, latestDebt, latestSalary } = data

  // Max ratio for bar scaling — cap at 1.5× for visual clarity
  const maxRatio = 1.5
  const maxBarRatio = Math.max(...ratioPoints.map((p) => p.ratio), maxRatio)
  const scaleFactor = maxRatio / maxBarRatio

  const latestRatio = ratioPoints[ratioPoints.length - 1].ratio
  const ratioStr = latestRatio >= 10 ? latestRatio.toFixed(0) : latestRatio.toFixed(1)

  const debtStr = latestDebt
    ? formatValue(latestDebt, "GBP")
    : "£47,800"
  const salaryStr = latestSalary
    ? formatValue(latestSalary, "GBP")
    : "£28,500"

  return (
    <div className="rounded-2xl border border-(--color-border) bg-(--color-surface) p-6 mb-8">
      <p className="text-lg md:text-xl font-semibold text-(--color-text) leading-snug">
        In {latestYear}, the average graduate debt (
        <span className="text-(--color-accent)">{debtStr}</span>) is{" "}
        <span className="text-(--color-accent)">{ratioStr}×</span> of starting
        salary (<span className="text-(--color-muted)">{salaryStr}</span>).
      </p>
      <p className="text-sm text-(--color-muted) mt-2">
        In 1995 it was close to zero — there were no tuition fees and maintenance loans were small.
      </p>

      {/* Sparkline bar chart */}
      <div className="mt-4 flex items-end gap-px" aria-hidden="true" style={{ height: "28px" }}>
        {ratioPoints.map((p) => {
          const pct = Math.min((p.ratio / maxRatio) * scaleFactor * 100, 100)
          return (
            <div
              key={p.year}
              title={`${p.year}: ${p.ratio.toFixed(2)}×`}
              style={{
                flex: 1,
                height: `${Math.max(pct, 4)}%`,
                backgroundColor: "var(--color-accent)",
                opacity: 0.7,
                minWidth: "2px",
              }}
            />
          )
        })}
      </div>
      <div className="flex justify-between text-[10px] text-(--color-muted) mt-1 font-mono">
        <span>{ratioPoints[0].year}</span>
        <span>debt-to-salary ratio</span>
        <span>{ratioPoints[ratioPoints.length - 1].year}</span>
      </div>
    </div>
  )
}
