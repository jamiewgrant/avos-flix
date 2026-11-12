import { useMemo } from "react"
import type { Series } from "../types/series"

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

function fmtMul(x: number): string {
  return x >= 10 ? `${x.toFixed(0)}×` : `${x.toFixed(1)}×`
}

interface Stat {
  value: string
  label: string
}

export function BoomerModeView({ series }: Props) {
  const stats = useMemo((): Stat[] => {
    if (series.length === 0) return []

    const allYears = series.flatMap((s) => s.points.map((p) => p.year))
    if (allYears.length === 0) return []

    const latest = Math.max(...allYears)
    const BASE = 1995

    const houseBase =
      valueAt(series, "house-price-nationwide", BASE) ??
      valueAt(series, "house-price-landreg", BASE)
    const houseLatest =
      valueAt(series, "house-price-nationwide", latest) ??
      valueAt(series, "house-price-landreg", latest)
    const wageBase = valueAt(series, "median-wage", BASE)
    const wageLatest = valueAt(series, "median-wage", latest)
    const cpihBase = valueAt(series, "cpih", BASE)
    const cpihLatest = valueAt(series, "cpih", latest)

    const result: Stat[] = []

    if (houseBase && houseLatest) {
      result.push({
        value: fmtMul(houseLatest / houseBase),
        label: `House prices since ${BASE}`,
      })
    }

    if (wageBase && wageLatest) {
      result.push({
        value: fmtMul(wageLatest / wageBase),
        label: `Median wages since ${BASE}`,
      })
    }

    if (houseBase && houseLatest && wageBase && wageLatest) {
      const ratio1995 = houseBase / wageBase
      const ratioLatest = houseLatest / wageLatest
      result.push({
        value: `${ratio1995.toFixed(1)}→${ratioLatest.toFixed(1)}`,
        label: `Years of salary to buy a house (${BASE} → ${latest})`,
      })
    }

    if (cpihBase && cpihLatest) {
      result.push({
        value: fmtMul(cpihLatest / cpihBase),
        label: `General inflation (CPIH) since ${BASE}`,
      })
    }

    return result
  }, [series])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 gap-8">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-(--color-text) mb-2 tracking-tight">
          The UK economy, in numbers.
        </h1>
        <p className="text-base text-(--color-muted) max-w-sm mx-auto">
          Since 1995 — the year many boomers bought their first home.
        </p>
      </div>

      <div className="flex flex-col items-center gap-6 w-full max-w-md">
        {stats.map((stat, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <span className="text-6xl md:text-8xl font-semibold text-(--color-accent) tabular-nums leading-none">
              {stat.value}
            </span>
            <span className="text-lg text-(--color-muted) max-w-xs">{stat.label}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center gap-3 mt-4">
        <p className="text-xl md:text-2xl font-semibold text-(--color-text) max-w-xs leading-snug">
          Does this look like avocado toast to you?
        </p>
        <p className="text-base text-(--color-muted)">
          Share:{" "}
          <a
            href="https://www.avosflix.app"
            className="underline underline-offset-2 text-(--color-accent) hover:opacity-80 transition-opacity"
          >
            avosflix.app
          </a>
        </p>
      </div>

      <a
        href="?"
        className="text-sm text-(--color-muted) hover:text-(--color-text) transition-colors underline underline-offset-2 mt-2"
      >
        ← See the full data
      </a>
    </div>
  )
}
