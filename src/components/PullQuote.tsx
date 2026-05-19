import { useMemo } from "react"
import type { Series } from "../types/series"

interface Props {
  series: Series[]
  baseYear: number
  endYear?: number
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

function fmtMul(x: number): string {
  return x >= 10 ? `${x.toFixed(0)}×` : `${x.toFixed(1)}×`
}

export function PullQuote({ series, baseYear, endYear }: Props) {
  const sentence = useMemo(() => {
    const allYears = series.flatMap((s) => s.points.map((p) => p.year))
    if (allYears.length === 0) return null
    const latest = endYear ?? Math.max(...allYears)

    const wageBase = valueAt(series, "median-wage", baseYear)
    const wageLatest = valueAt(series, "median-wage", latest)
    const houseBase = valueAt(series, "house-price-nationwide", baseYear)
    const houseLatest = valueAt(series, "house-price-nationwide", latest)
    const cpihBase = valueAt(series, "cpih", baseYear)
    const cpihLatest = valueAt(series, "cpih", latest)

    if (!wageBase || !wageLatest || !houseBase || !houseLatest) return null

    const wageGrowth = wageLatest / wageBase
    const houseGrowth = houseLatest / houseBase
    const cpihGrowth = cpihBase && cpihLatest ? cpihLatest / cpihBase : null

    return {
      baseYear,
      latest,
      wage: fmtMul(wageGrowth),
      house: fmtMul(houseGrowth),
      cpih: cpihGrowth ? fmtMul(cpihGrowth) : null,
    }
  }, [series, baseYear, endYear])

  if (!sentence) return null

  return (
    <div className="mb-6 rounded-2xl border border-(--color-border) bg-(--color-surface) px-5 py-5 md:px-8 md:py-6">
      <p className="text-lg md:text-xl text-white leading-relaxed tabular-nums">
        Since <span className="font-mono">{sentence.baseYear}</span>:{" "}
        houses <span className="text-(--color-accent) font-semibold">{sentence.house}</span>,{" "}
        wages <span className="text-white font-semibold">{sentence.wage}</span>
        {sentence.cpih && (
          <>
            , general inflation <span className="text-(--color-muted) font-semibold">{sentence.cpih}</span>
          </>
        )}.
      </p>
    </div>
  )
}
