import { useMemo, useState } from "react"
import type { Series } from "../types/series"

interface Props {
  cpih: Series
}

export function TodaysMoney({ cpih }: Props) {
  const years = useMemo(() => cpih.points.map((p) => p.year), [cpih])
  const minYear = years[0]
  const maxYear = years[years.length - 1]

  const [amount, setAmount] = useState(1000)
  const [year, setYear] = useState(1995)

  const result = useMemo(() => {
    const from = cpih.points.find((p) => p.year === year)
    const to = cpih.points[cpih.points.length - 1]
    if (!from || !to) return null
    return {
      converted: (amount * to.value) / from.value,
      refYear: to.year,
    }
  }, [amount, year, cpih])

  return (
    <div className="rounded-2xl border border-(--color-border) bg-(--color-surface) p-5 md:p-6">
      <div className="text-xs text-(--color-muted) font-mono uppercase tracking-wide mb-3">
        Today's money
      </div>
      <div className="flex flex-wrap items-center gap-3 text-lg md:text-xl">
        <span className="text-(--color-muted)">£</span>
        <input
          type="number"
          min={1}
          value={amount}
          onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
          className="w-28 bg-(--color-bg) border border-(--color-border) rounded-lg px-3 py-1.5 text-white tabular-nums focus:outline-none focus:border-(--color-accent)"
        />
        <span className="text-(--color-muted)">in</span>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="bg-(--color-bg) border border-(--color-border) rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-(--color-accent)"
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <span className="text-(--color-muted)">≈</span>
        <span className="text-(--color-accent) font-semibold tabular-nums">
          {result
            ? `£${Math.round(result.converted).toLocaleString("en-GB")}`
            : "—"}
        </span>
        <span className="text-(--color-muted) text-sm">in {result?.refYear ?? maxYear}</span>
      </div>
      <p className="mt-4 text-xs text-(--color-muted) leading-relaxed">
        Inflation conversion via CPIH. Covers {minYear}–{maxYear}. Useful when somebody
        quotes a 1970s price as if it's still 1970s money.
      </p>
    </div>
  )
}
