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

    // Original: house price if it had grown at wage rate
    const counterfactualHouse = houseBase * (wageLatest.value / wageBase)
    // Reverse: wage if it had grown at house price rate
    const counterfactualWage = wageBase * (houseLatest.value / houseBase)

    return {
      houseYear: houseLatest.year,
      actualHouse: houseLatest.value,
      counterHouse: counterfactualHouse,
      houseGap: houseLatest.value - counterfactualHouse,
      wageYear: wageLatest.year,
      actualWage: wageLatest.value,
      counterWage: counterfactualWage,
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
        since {stat.baseYear}, the average home in {stat.houseYear} would cost{" "}
        <span className="text-(--color-accent) font-semibold tabular-nums">
          {formatValue(stat.counterHouse, "GBP")}
        </span>
        .
      </p>
      <p className="mt-3 text-(--color-muted) text-sm">
        It actually costs <span className="text-(--color-text) font-semibold tabular-nums">{formatValue(stat.actualHouse, "GBP")}</span>.
        That gap — <span className="text-(--color-text) font-semibold tabular-nums">{formatValue(stat.houseGap, "GBP")}</span> —
        is what every UK first-time buyer is now borrowing on top of "if things had stayed normal".
      </p>
      <hr className="my-6 border-(--color-border)" />
      <p className="text-xl md:text-2xl text-(--color-text) leading-relaxed max-w-2xl mx-auto">
        Flip it around: if wages had grown at <span className="font-semibold">the same rate as house prices</span>{" "}
        since {stat.baseYear}, the median salary in {stat.wageYear} would be{" "}
        <span className="font-semibold tabular-nums" style={{ color: "#f59e0b" }}>
          {formatValue(stat.counterWage, "GBP")}
        </span>
        .
      </p>
      <p className="mt-3 text-(--color-muted) text-sm">
        It is actually <span className="text-(--color-text) font-semibold tabular-nums">{formatValue(stat.actualWage, "GBP")}</span> —
        meaning workers would need to earn{" "}
        <span className="text-(--color-text) font-semibold tabular-nums">{formatValue(stat.counterWage - stat.actualWage, "GBP")}</span>{" "}
        more per year just to have kept pace with the homes they are trying to buy.
      </p>
    </div>
  )
}
