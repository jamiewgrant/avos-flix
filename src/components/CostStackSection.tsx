import { lazy, Suspense, useMemo, useState } from "react"
import type { Series } from "../types/series"
import {
  PERSONAS,
  REFERENCE_YEAR,
  buildStack,
  netWageLine,
  personaById,
  type PersonaId,
} from "../lib/costBasket"

const CostStackChart = lazy(() =>
  import("./charts/CostStackChart").then((m) => ({ default: m.CostStackChart })),
)

interface Props {
  series: Record<string, Series>
  wage: Series
}

export function CostStackSection({ series, wage }: Props) {
  const [personaId, setPersonaId] = useState<PersonaId>("young-family")
  const persona = personaById(personaId)

  // Reset earners to persona default when persona changes.
  const [earners, setEarners] = useState<1 | 2>(persona.defaultEarners)
  const effectiveEarners = earners

  const stack = useMemo(() => buildStack(series, persona.layers), [series, persona])
  const net = useMemo(
    () => netWageLine(wage, {
      hasStudentLoan: persona.hasStudentLoan,
      hasAutoEnrolPension: persona.hasAutoEnrolPension,
      earners: effectiveEarners,
    }),
    [wage, persona, effectiveEarners],
  )

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

    const breakdown = persona.layers.map((layer) => {
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
      breakdown,
    }
  }, [stack, net, persona])

  function handlePersonaChange(id: PersonaId) {
    const p = personaById(id)
    setPersonaId(id)
    setEarners(p.defaultEarners)
  }

  if (!headline) return null

  return (
    <section className="mb-20">
      <h2 className="text-3xl md:text-4xl font-semibold text-white mb-3">
        The bill, stacked.
      </h2>
      <p className="text-(--color-muted) mb-6 max-w-2xl text-lg leading-relaxed">
        A typical UK household's annual bill, stacked by category. The white
        line is household take-home pay after the deductions that actually hit
        your payslip — income tax, NI, student loan, and auto-enrolment pension
        — computed year-by-year using each year's real thresholds and rates.
      </p>

      <div className="rounded-2xl border border-(--color-border) bg-(--color-surface) p-4 md:p-6">
        <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-(--color-muted)">household:</span>
            {PERSONAS.map((p) => {
              const active = p.id === personaId
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePersonaChange(p.id)}
                  aria-pressed={active}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    active
                      ? "border-(--color-accent) bg-(--color-accent)/10 text-(--color-accent)"
                      : "border-(--color-border) bg-(--color-bg) text-(--color-muted) hover:text-white"
                  }`}
                >
                  {p.shortLabel}
                </button>
              )
            })}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-(--color-muted)">earners:</span>
            {([1, 2] as const).map((n) => {
              const active = effectiveEarners === n
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setEarners(n)}
                  aria-pressed={active}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    active
                      ? "border-(--color-accent) bg-(--color-accent)/10 text-(--color-accent)"
                      : "border-(--color-border) bg-(--color-bg) text-(--color-muted) hover:text-white"
                  }`}
                >
                  {n === 1 ? "1 (single)" : "2 (dual)"}
                </button>
              )
            })}
          </div>
          <span className="text-[11px] text-(--color-muted) opacity-70 basis-full">
            {persona.description}
            {effectiveEarners === 2
              ? " Wage line = combined take-home of two median earners."
              : " Wage line = one median earner's take-home."}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Stat
            headline={`${headline.basketMul.toFixed(1)}×`}
            caption="Cost basket"
            hint={`${headline.first} → ${headline.last}`}
          />
          <Stat
            headline={`${headline.wageMul.toFixed(1)}×`}
            caption={effectiveEarners === 2 ? "Household take-home" : "Take-home pay"}
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
          <CostStackChart series={series} wage={wage} persona={persona} earners={effectiveEarners} />
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
          Calibration: £ values are anchored to a typical middle-quintile basket in {REFERENCE_YEAR}. <strong className="text-white">Housing</strong> is the annual first-time-buyer mortgage payment on the average UK house (Land Registry price, 15% deposit, 25-year term, Bank Rate + 1.5pp) — this captures the actual squeeze of house prices and interest rates compounding, which a rent-index proxy misses. Other layers rescale year-by-year by their drivers (Ofgem energy, council tax, ORR rail fares, CPIH for water + broadband + groceries, Coram for childcare). Take-home pay is computed from median full-time gross using each year's actual income-tax personal allowance and basic rate, NI primary threshold and main rate, student-loan threshold (Plan 1 from 1998, Plan 2 from 2012) at 9%, plus phased pension auto-enrolment (0% pre-2012 → 5% from 2019). Dual-earner wage line = both earners on median gross. Things deliberately excluded (no clean public series): car insurance (which has spiked far faster than CPIH), private healthcare, dental/optical out-of-pocket.
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
