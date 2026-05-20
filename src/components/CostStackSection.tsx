import { lazy, Suspense, useRef, useMemo, useState } from "react"
import { toPng } from "html-to-image"
import type { Series } from "../types/series"
import {
  PERSONAS,
  REFERENCE_YEAR,
  WAGE_BENCHMARKS,
  buildStack,
  personaById,
  resolveWageLine,
  wageBenchmarkById,
  type MortgageRegion,
  type PersonaId,
  type WageBenchmarkId,
} from "../lib/costBasket"

const CostStackChart = lazy(() =>
  import("./charts/CostStackChart").then((m) => ({ default: m.CostStackChart })),
)

interface Props {
  series: Record<string, Series>
  wage: Series
  embedMode?: boolean
}

const START_YEAR_OPTIONS = [1995, 2008, 2015] as const
type StartYear = typeof START_YEAR_OPTIONS[number]

export function CostStackSection({ series, embedMode = false }: Props) {
  const [personaId, setPersonaId] = useState<PersonaId>("young-family")
  const persona = personaById(personaId)

  const [earners, setEarners] = useState<1 | 2>(persona.defaultEarners)
  const [benchmarkId, setBenchmarkId] = useState<WageBenchmarkId>(persona.defaultWageBenchmark)
  const benchmark = wageBenchmarkById(benchmarkId)

  const [housingMode, setHousingMode] = useState<"mortgage" | "rent">("mortgage")
  const [mortgageRegion, setMortgageRegion] = useState<MortgageRegion>("national")
  const [startYear, setStartYear] = useState<StartYear>(1995)
  const [realTerms, setRealTerms] = useState(false)

  const [snapshotting, setSnapshotting] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  const cpih = series["cpih"]
  const cpihMap = useMemo(() => new Map((cpih?.points ?? []).map((p) => [p.year, p.value])), [cpih])
  const cpihRef = useMemo(() => {
    if (!cpih || cpih.points.length === 0) return 1
    return cpih.points[cpih.points.length - 1].value
  }, [cpih])

  const stack = useMemo(
    () => buildStack(series, persona.layers, { housingMode, mortgageRegion }),
    [series, persona, housingMode, mortgageRegion],
  )

  const wageData = useMemo(
    () => resolveWageLine(
      series,
      benchmark,
      { hasStudentLoan: persona.hasStudentLoan, hasAutoEnrolPension: persona.hasAutoEnrolPension },
      earners,
    ),
    [series, benchmark, persona, earners],
  )

  // Filter stack to startYear
  const filteredStack = useMemo(
    () => stack.filter((p) => p.year >= startYear),
    [stack, startYear],
  )

  const headline = useMemo(() => {
    if (filteredStack.length < 2) return null
    const first = filteredStack[0]
    const last = filteredStack[filteredStack.length - 1]
    const wageAtFirst = wageData.find((p) => p.year === first.year)
    const wageAtLast = wageData.find((p) => p.year === last.year)
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

    return { first: first.year, last: last.year, basketMul, wageMul, firstShare, lastShare, breakdown }
  }, [filteredStack, wageData, persona])

  // Comparison stat for the alternate persona
  const altPersonaId: PersonaId = personaId === "settled" ? "young-family" : "settled"
  const altPersona = personaById(altPersonaId)
  const altBenchmark = wageBenchmarkById(altPersona.defaultWageBenchmark)

  const altCompare = useMemo(() => {
    const altStack = buildStack(series, altPersona.layers, { housingMode, mortgageRegion })
    const altWageData = resolveWageLine(
      series,
      altBenchmark,
      { hasStudentLoan: altPersona.hasStudentLoan, hasAutoEnrolPension: altPersona.hasAutoEnrolPension },
      altPersona.defaultEarners,
    )
    const altFiltered = altStack.filter((p) => p.year >= startYear)
    if (altFiltered.length < 1) return null
    const last = altFiltered[altFiltered.length - 1]
    const wageAtLast = altWageData.find((p) => p.year === last.year)
    if (!wageAtLast) return null
    const share = Math.round((last.total / wageAtLast.value) * 100)
    return { personaLabel: altPersona.shortLabel, year: last.year, share }
  }, [series, altPersona, altBenchmark, housingMode, startYear])

  function handlePersonaChange(id: PersonaId) {
    const p = personaById(id)
    setPersonaId(id)
    setEarners(p.defaultEarners)
    setBenchmarkId(p.defaultWageBenchmark)
  }

  async function downloadSnapshot() {
    if (!cardRef.current || snapshotting) return
    setSnapshotting(true)
    try {
      const dataUrl = await toPng(cardRef.current, {
        backgroundColor: "#16171d",
        pixelRatio: 2,
        style: { borderRadius: "0px" },
      })
      const link = document.createElement("a")
      link.download = `avos-flix-cost-stack-${personaId}.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error("Snapshot failed:", err)
    } finally {
      setSnapshotting(false)
    }
  }

  if (!headline) return null

  const wageLabel = earners === 2 ? "Combined household pay" : "Take-home pay"

  return (
    <section className="mb-20">
      {!embedMode && (
        <>
          <h2 className="text-3xl md:text-4xl font-semibold text-(--color-text) mb-3">
            The bill, stacked.
          </h2>
          <p className="text-(--color-muted) mb-6 max-w-2xl text-lg leading-relaxed">
            A typical UK household's annual bill, stacked by category. The white
            line is household take-home pay after every deduction that hits your
            payslip — income tax, NI, student loan, and auto-enrolment pension —
            computed year-by-year using each year's real thresholds and rates.
          </p>
        </>
      )}

      <div ref={cardRef} className="rounded-2xl border border-(--color-border) bg-(--color-surface) p-4 md:p-6 relative">
        {/* Download PNG button */}
        <button
          onClick={downloadSnapshot}
          disabled={snapshotting}
          aria-label="Download cost stack as PNG"
          className="absolute top-4 right-4 px-3 py-1.5 rounded-md font-mono text-xs bg-(--color-bg) text-(--color-muted) hover:text-(--color-text) transition disabled:opacity-50 z-10"
          title="Download this card as a PNG"
        >
          {snapshotting ? "saving…" : "↓ PNG"}
        </button>

        {/* Controls */}
        <div className="mb-5 space-y-2.5">
          <ControlRow label="household">
            {PERSONAS.map((p) => (
              <Chip key={p.id} active={p.id === personaId} onClick={() => handlePersonaChange(p.id)}>
                {p.shortLabel}
              </Chip>
            ))}
          </ControlRow>
          <ControlRow label="earners">
            {([1, 2] as const).map((n) => (
              <Chip key={n} active={earners === n} onClick={() => setEarners(n)}>
                {n === 1 ? "1 (single)" : "2 (dual)"}
              </Chip>
            ))}
          </ControlRow>
          <ControlRow label="wage benchmark">
            {WAGE_BENCHMARKS.map((b) => (
              <Chip key={b.id} active={b.id === benchmarkId} onClick={() => setBenchmarkId(b.id)}>
                {b.shortLabel}
              </Chip>
            ))}
          </ControlRow>
          <ControlRow label="housing type">
            <Chip active={housingMode === "mortgage"} onClick={() => setHousingMode("mortgage")}>
              FTB mortgage
            </Chip>
            <Chip active={housingMode === "rent"} onClick={() => setHousingMode("rent")}>
              Private rent
            </Chip>
          </ControlRow>
          {housingMode === "mortgage" && (
            <ControlRow label="region">
              <Chip active={mortgageRegion === "national"} onClick={() => setMortgageRegion("national")}>National</Chip>
              <Chip active={mortgageRegion === "london"} onClick={() => setMortgageRegion("london")}>London</Chip>
              <Chip active={mortgageRegion === "northeast"} onClick={() => setMortgageRegion("northeast")}>North East</Chip>
            </ControlRow>
          )}
          <ControlRow label="view">
            <Chip active={!realTerms} onClick={() => setRealTerms(false)}>Nominal £</Chip>
            <Chip active={realTerms} onClick={() => setRealTerms(true)}>Real terms</Chip>
          </ControlRow>
          <ControlRow label="since">
            {START_YEAR_OPTIONS.map((y) => (
              <Chip key={y} active={startYear === y} onClick={() => setStartYear(y)}>
                {y}
              </Chip>
            ))}
          </ControlRow>
          <p className="text-[11px] text-(--color-muted) opacity-70 leading-relaxed pt-0.5">
            <span className="text-white">{persona.shortLabel}:</span> {persona.description}&ensp;
            <span className="text-white">{benchmark.shortLabel}:</span> {benchmark.description}
            {earners === 2 && !benchmark.isAlreadyNet
              ? " Wage line = combined take-home of two earners."
              : earners === 2 && benchmark.isAlreadyNet
              ? " Wage line = GDHI × 2 adults."
              : ""}
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Stat headline={`${headline.basketMul.toFixed(1)}×`} caption="Cost basket" hint={`${headline.first} → ${headline.last}`} />
          <Stat headline={`${headline.wageMul.toFixed(1)}×`} caption={wageLabel} hint={`${headline.first} → ${headline.last}`} />
          <Stat headline={`${Math.round(headline.firstShare * 100)}%`} caption={`of pay in ${headline.first}`} hint="went on the basket" />
          <Stat headline={`${Math.round(headline.lastShare * 100)}%`} caption={`of pay in ${headline.last}`} hint="goes on the basket" accent />
        </div>

        {altCompare && (
          <p className="text-[11px] text-(--color-muted) opacity-80 mb-4 font-mono">
            For comparison,{" "}
            <span className="text-white">{altCompare.personaLabel}</span>
            : basket = <span className="text-(--color-accent) font-semibold">{altCompare.share}%</span>{" "}
            of take-home in {altCompare.year}.
          </p>
        )}

        <Suspense fallback={<div className="h-[380px] grid place-items-center text-(--color-muted) text-xs font-mono">loading basket…</div>}>
          <CostStackChart
            series={series}
            persona={persona}
            wageData={wageData}
            earners={earners}
            benchmark={benchmark}
            housingMode={housingMode}
            mortgageRegion={mortgageRegion}
            startYear={startYear}
            realTerms={realTerms}
            cpihMap={cpihMap}
            cpihRef={cpihRef}
          />
        </Suspense>

        {/* Layer breakdown */}
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

        {!embedMode && (
          <p className="mt-5 text-[11px] text-(--color-muted) font-mono opacity-70 leading-relaxed">
            Calibration: basket £ values anchored to middle-quintile in {REFERENCE_YEAR}, rescaled by underlying series each year (mortgage: Land Registry + Bank Rate; energy: Ofgem cap; council tax: ONS; rail: ORR index; food CPI sub-index for groceries; CPIH for water and broadband; Coram for childcare). Deduction model uses each year's real PA, basic rate, NI thresholds, Plan 2 SL threshold (9%), and phased pension auto-enrol (0%→5%). GDHI is already post-tax disposable; deductions not re-applied. Real terms deflates by CPIH to the most recent year's money. Car insurance (spiked far faster than CPIH) and private healthcare excluded — no clean public series.
          </p>
        )}
      </div>
    </section>
  )
}

function ControlRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-mono text-(--color-muted) w-32 shrink-0">{label}:</span>
      {children}
    </div>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
        active
          ? "border-(--color-accent) bg-(--color-accent)/10 text-(--color-accent)"
          : "border-(--color-border) bg-(--color-bg) text-(--color-muted) hover:text-(--color-text)"
      }`}
    >
      {children}
    </button>
  )
}

function Stat({ headline, caption, hint, accent = false }: { headline: string; caption: string; hint?: string; accent?: boolean }) {
  return (
    <div
      className={`rounded-xl border p-4 ${accent ? "bg-(--color-bg)" : "border-(--color-border) bg-(--color-bg)"}`}
      style={accent ? { borderColor: "var(--color-accent)" } : undefined}
    >
      <div className={`text-2xl md:text-3xl font-semibold tabular-nums ${accent ? "text-(--color-accent)" : "text-white"}`}>
        {headline}
      </div>
      <div className="text-xs text-(--color-muted) mt-1 leading-snug">{caption}</div>
      {hint && <div className="text-[10px] text-(--color-muted) opacity-60 mt-1 font-mono">{hint}</div>}
    </div>
  )
}
