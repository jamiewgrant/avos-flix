import { useMemo } from "react"
import type { Series } from "../types/series"
import { formatValue } from "../types/series"

interface Props {
  housePrice: Series
  wage: Series
  baseYear?: number
}

export function WhatIfCallout({ housePrice, wage, baseYear = 1995 }: Props) {
  const stat = useMemo(() => {
    const wageBase = wage.points.find((p) => p.year === baseYear)?.value
    const wageLatest = wage.points[wage.points.length - 1]
    const houseBase = housePrice.points.find((p) => p.year === baseYear)?.value
    const houseLatest = housePrice.points[housePrice.points.length - 1]
    if (!wageBase || !wageLatest || !houseBase || !houseLatest) return null
    const counterfactual = houseBase * (wageLatest.value / wageBase)
    return {
      year: houseLatest.year,
      actual: houseLatest.value,
      counter: counterfactual,
      gap: houseLatest.value - counterfactual,
      baseYear,
    }
  }, [housePrice, wage, baseYear])

  if (!stat) return null

  return (
    <div className="rounded-2xl border border-(--color-border) bg-(--color-surface) p-6 md:p-8 text-center">
      <div className="text-xs text-(--color-muted) font-mono uppercase tracking-wide mb-4">
        Counterfactual
      </div>
      <p className="text-xl md:text-2xl text-(--color-text) leading-relaxed max-w-2xl mx-auto">
        If UK house prices had grown at <span className="font-semibold">the same rate as wages</span>{" "}
        since {stat.baseYear}, the average home in {stat.year} would cost{" "}
        <span className="text-(--color-accent) font-semibold tabular-nums">
          {formatValue(stat.counter, "GBP")}
        </span>
        .
      </p>
      <p className="mt-3 text-(--color-muted) text-sm">
        It actually costs <span className="text-(--color-text) font-semibold tabular-nums">{formatValue(stat.actual, "GBP")}</span>.
        That gap — <span className="text-(--color-text) font-semibold tabular-nums">{formatValue(stat.gap, "GBP")}</span> —
        is what every UK first-time buyer is now borrowing on top of "if things had stayed normal".
      </p>
    </div>
  )
}
