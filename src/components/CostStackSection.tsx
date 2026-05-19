import { lazy, Suspense, useMemo } from "react"
import type { Series } from "../types/series"
import { COST_LAYERS, REFERENCE_YEAR, buildStack, wageLine } from "../lib/costBasket"

const CostStackChart = lazy(() =>
  import("./charts/CostStackChart").then((m) => ({ default: m.CostStackChart })),
)

interface Props {
  series: Record<string, Series>
  wage: Series
}

export function CostStackSection({ series, wage }: Props) {
  const stack = useMemo(() => buildStack(series), [series])
  const net = useMemo(() => wageLine(wage), [wage])

  const headline = useMemo(() => {
    if (stack.length < 2) return null
    const first = stack[0]
    const last = stack[stack.length - 1]
    const wageAtFirst = net.find((p) => p.year === first.year)
    const wageAtLast = net.find((p) => p.year === last.year)
    if (!wageAtFirst || !wageAtLast) return null

    const basketMul = last.total / first.total
    const wageMul = wageAtLast.value / wageAtFirst.value
    const firstShare = first.total / wageAtFirst.value
    const lastShare = last.total / wageAtLast.value

    const breakdown = COST_LAYERS.map((layer) => {
      const v0 = first.layers[layer.id]
      const v1 = last.layers[layer.id]
      return {
        id: layer.id,
        label: layer.label.replace(/\(.+?\)/, "").trim(),
        color: layer.color,
        share: (v1 / last.total) * 100,
        mul: v1 / v0,
      }
    })

    return {
      first: first.year,
      last: last.year,
      basketMul,
      wageMul,
      firstShare,
      lastShare,
      basketTotal: last.total,
      wageNet: wageAtLast.value,
      breakdown,
    }
  }, [stack, net])

  if (!headline) return null

  return (
    <section className="mb-20">
      <h2 className="text-3xl md:text-4xl font-semibold text-white mb-3">
        The bill, stacked.
      </h2>
      <p className="text-(--color-muted) mb-6 max-w-2xl text-lg leading-relaxed">
        A typical UK household's annual bill, broken down by category and stacked
        year-by-year. The white line is median net pay. The point where the
        coloured area meets the white line is where the lights are kept on with
        nothing left over. Hover any year for the £ value and percentage breakdown.
      </p>

      <div className="rounded-2xl border border-(--color-border) bg-(--color-surface) p-4 md:p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Stat
            headline={`${headline.basketMul.toFixed(1)}×`}
            caption="Cost basket"
            hint={`${headline.first} → ${headline.last}`}
          />
          <Stat
            headline={`${headline.wageMul.toFixed(1)}×`}
            caption="Median net wage"
            hint={`${headline.first} → ${headline.last}`}
          />
          <Stat
            headline={`${Math.round(headline.firstShare * 100)}%`}
            caption={`of pay in ${headline.first}`}
            hint="went on the basket"
          />
          <Stat
            headline={`${Math.round(headline.lastShare * 100)}%`}
            caption={`of pay in ${headline.last}`}
            hint="goes on the basket"
            accent
          />
        </div>

        <Suspense fallback={<div className="h-[380px] grid place-items-center text-(--color-muted) text-xs font-mono">loading basket…</div>}>
          <CostStackChart series={series} wage={wage} />
        </Suspense>

        <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-2 px-1">
          {headline.breakdown.map((b) => (
            <div key={b.id} className="flex items-center gap-2.5 rounded-lg bg-(--color-bg) border border-(--color-border) px-3 py-2 text-xs">
              <span className="size-3 rounded-sm shrink-0" style={{ background: b.color }} />
              <span className="flex-1 text-white">{b.label}</span>
              <span className="tabular-nums text-(--color-muted)">{b.share.toFixed(0)}%</span>
              <span className="tabular-nums text-(--color-accent) font-semibold">{b.mul.toFixed(1)}×</span>
            </div>
          ))}
        </div>

        <p className="mt-5 text-[11px] text-(--color-muted) font-mono opacity-70 leading-relaxed">
          Calibration: £ values are anchored to a typical middle-quintile basket in {REFERENCE_YEAR} and rescaled each year by their underlying series (rent index, energy, council tax, rail fares, CPIH). Net wage = median full-time gross × 0.78. Childcare and tuition are excluded from the headline basket — they're not paid by every household — but each is plotted on the main chart above.
        </p>
      </div>
    </section>
  )
}

function Stat({
  headline,
  caption,
  hint,
  accent = false,
}: {
  headline: string
  caption: string
  hint?: string
  accent?: boolean
}) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? "border-(--color-accent) bg-(--color-bg)" : "border-(--color-border) bg-(--color-bg)"}`} style={accent ? { borderColor: "var(--color-accent)" } : undefined}>
      <div className={`text-2xl md:text-3xl font-semibold tabular-nums ${accent ? "text-(--color-accent)" : "text-white"}`}>
        {headline}
      </div>
      <div className="text-xs text-(--color-muted) mt-1 leading-snug">{caption}</div>
      {hint && <div className="text-[10px] text-(--color-muted) opacity-60 mt-1 font-mono">{hint}</div>}
    </div>
  )
}
