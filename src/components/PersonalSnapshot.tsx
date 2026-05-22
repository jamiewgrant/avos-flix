import { useState, useMemo, useRef, useCallback } from "react"
import type { Series } from "../types/series"
import {
  computeSnapshot,
  type PersonalInputs,
  type SnapshotBreakdown,
} from "../lib/personalSnapshot"
import { fmt, pct } from "../lib/format"
import type { SnapState } from "../data/useUrlState"

interface Props {
  series: Record<string, Series>
  urlSnap?: SnapState
  onSnapChange?: (next: SnapState) => void
}

const COMPARE_YEARS = [1990, 1995, 2000, 2005, 2010, 2015, 2020]

// Segments in waterfall order with fixed colors
const SEGMENTS: Array<{
  key: keyof SnapshotBreakdown
  label: string
  color: string
}> = [
  { key: "incomeTax", label: "Income Tax", color: "#ef4444" },
  { key: "nationalInsurance", label: "Nat. Insurance", color: "#f97316" },
  { key: "studentLoan", label: "Student Loan", color: "#eab308" },
  { key: "pension", label: "Pension", color: "#3b82f6" },
  { key: "housing", label: "Housing", color: "#a78bfa" },
  { key: "energy", label: "Energy", color: "#f43f5e" },
  { key: "groceries", label: "Groceries", color: "#eab308" },
  { key: "councilTax", label: "Council Tax", color: "#84cc16" },
  { key: "childcare", label: "Childcare", color: "#fb923c" },
  { key: "disposable", label: "Disposable", color: "var(--color-accent)" },
]

// ── Waterfall bar for one snapshot ─────────────────────────────────────────
function WaterfallBar({ breakdown, label }: { breakdown: SnapshotBreakdown; label: string }) {
  const [tooltip, setTooltip] = useState<{ seg: (typeof SEGMENTS)[0]; x: number; y: number } | null>(null)
  const barRef = useRef<HTMLDivElement>(null)

  const displayDisposable = Math.max(0, breakdown.disposable)

  const rawDisplayValues = SEGMENTS.map((seg) =>
    seg.key === "disposable" ? displayDisposable : Math.max(0, breakdown[seg.key] as number),
  )

  const segsWithPct = SEGMENTS.map((seg, i) => ({
    ...seg,
    flexVal: rawDisplayValues[i],
    raw: breakdown[seg.key] as number,
  }))

  const handleMouseMove = useCallback(
    (seg: (typeof SEGMENTS)[0], e: React.MouseEvent) => {
      const rect = barRef.current?.getBoundingClientRect()
      if (!rect) return
      setTooltip({ seg, x: e.clientX - rect.left, y: e.clientY - rect.top })
    },
    [],
  )

  return (
    <div className="mb-1">
      <div className="text-xs text-(--color-muted) mb-1.5 font-mono">{label}</div>
      <div
        ref={barRef}
        className="relative h-8 flex rounded overflow-hidden"
        style={{ background: "var(--color-surface-2)", gap: "1px" }}
        onMouseLeave={() => setTooltip(null)}
      >
        {segsWithPct.map((seg) =>
          seg.flexVal <= 0 ? null : (
            <div
              key={seg.key as string}
              style={{
                flex: seg.flexVal,
                minWidth: 0,
                background: seg.color,
              }}
              onMouseMove={(e) => handleMouseMove(seg, e)}
              title={`${seg.label}: ${fmt(seg.raw)}`}
            />
          ),
        )}
        {tooltip && (
          <div
            className="absolute z-10 px-2 py-1 rounded text-xs pointer-events-none"
            style={{
              left: Math.min(tooltip.x + 8, (barRef.current?.offsetWidth ?? 200) - 140),
              top: tooltip.y - 36,
              background: "var(--color-bg)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text)",
              whiteSpace: "nowrap",
            }}
          >
            <span
              className="inline-block w-2 h-2 rounded-full mr-1"
              style={{ background: tooltip.seg.color }}
            />
            {tooltip.seg.label}: {fmt(breakdown[tooltip.seg.key] as number)}
          </div>
        )}
      </div>
      <div className="text-xs mt-1">
        {breakdown.disposable >= 0 ? (
          <>
            <span style={{ color: "var(--color-accent)" }}>
              {fmt(breakdown.disposable / 12)} / mo disposable
            </span>
            <span className="text-(--color-muted) ml-2">
              ({pct(breakdown.disposablePct)} of gross)
            </span>
          </>
        ) : (
          <span style={{ color: "var(--color-danger, #ef4444)" }}>
            Deficit of {fmt(Math.abs(breakdown.disposable / 12))} / mo — costs exceed take-home pay
          </span>
        )}
      </div>
    </div>
  )
}

// ── Chip button ─────────────────────────────────────────────────────────────
function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      className="chip"
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

// ── Stat card ───────────────────────────────────────────────────────────────
function StatCard({
  title,
  todayVal,
  histVal,
  todayLabel,
  histLabel,
}: {
  title: string
  todayVal: string
  histVal: string
  todayLabel: string
  histLabel: string
}) {
  return (
    <div className="card p-4">
      <div className="text-xs text-(--color-muted) mb-2 font-mono uppercase tracking-wide">
        {title}
      </div>
      <div className="text-lg font-semibold text-(--color-text)">{todayVal}</div>
      <div className="text-xs text-(--color-muted) mt-0.5">{todayLabel}</div>
      <div
        className="text-sm mt-2 font-medium"
        style={{ color: "var(--color-muted)" }}
      >
        {histVal}
      </div>
      <div className="text-xs text-(--color-muted) mt-0.5">{histLabel}</div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────
export function PersonalSnapshot({ series, urlSnap = {}, onSnapChange }: Props) {
  const [grossSalary, setGrossSalaryRaw] = useState(urlSnap.grossSalary ?? 0)
  const [housingType, setHousingTypeRaw] = useState<PersonalInputs["housingType"]>(urlSnap.housingType ?? "mortgage")
  const [monthlyHousing, setMonthlyHousingRaw] = useState(urlSnap.monthlyHousing ?? 0)
  const [children, setChildrenRaw] = useState(urlSnap.children ?? 0)
  const [studentLoanPlan, setStudentLoanPlanRaw] =
    useState<PersonalInputs["studentLoanPlan"]>(urlSnap.studentLoanPlan ?? "none")
  const [pensionPct, setPensionPctRaw] = useState(urlSnap.pensionPct ?? 5)
  const [earners, setEarnersRaw] = useState<1 | 2>(urlSnap.earners ?? 1)
  const [compareYear, setCompareYearRaw] = useState(urlSnap.compareYear ?? 1995)
  const [shareTooltip, setShareTooltip] = useState(false)

  // Build a merged snap state for URL sync
  function pushSnap(patch: Partial<SnapState>) {
    if (!onSnapChange) return
    const next: SnapState = {
      grossSalary,
      housingType,
      monthlyHousing,
      children,
      earners,
      studentLoanPlan,
      pensionPct,
      compareYear,
      ...patch,
    }
    onSnapChange(next)
  }

  function setGrossSalary(v: number) { setGrossSalaryRaw(v); pushSnap({ grossSalary: v }) }
  function setHousingType(v: PersonalInputs["housingType"]) { setHousingTypeRaw(v); pushSnap({ housingType: v }) }
  function setMonthlyHousing(v: number) { setMonthlyHousingRaw(v); pushSnap({ monthlyHousing: v }) }
  function setChildren(v: number) { setChildrenRaw(v); pushSnap({ children: v }) }
  function setStudentLoanPlan(v: PersonalInputs["studentLoanPlan"]) { setStudentLoanPlanRaw(v); pushSnap({ studentLoanPlan: v }) }
  function setPensionPct(v: number) { setPensionPctRaw(v); pushSnap({ pensionPct: v }) }
  function setEarners(v: 1 | 2) { setEarnersRaw(v); pushSnap({ earners: v }) }
  function setCompareYear(v: number) { setCompareYearRaw(v); pushSnap({ compareYear: v }) }

  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
    } catch {
      // fallback: select the URL bar — nothing more we can do silently
    }
    setShareTooltip(true)
    setTimeout(() => setShareTooltip(false), 2000)
  }

  const inputs: PersonalInputs = {
    grossSalary,
    housingType,
    monthlyHousing,
    children,
    studentLoanPlan,
    pensionPct,
    earners,
  }

  const snapshot = useMemo(
    () => computeSnapshot(inputs, series, compareYear),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [grossSalary, housingType, monthlyHousing, children, studentLoanPlan, pensionPct, earners, compareYear, series],
  )

  const hasInputs = grossSalary > 0

  // Available compare years — those with data in median-wage
  const medianWage = series["median-wage"]
  const availableYears = useMemo(() => {
    if (!medianWage) return COMPARE_YEARS
    const wageYears = new Set(medianWage.points.map((p) => p.year))
    return COMPARE_YEARS.filter((y) => wageYears.has(y))
  }, [medianWage])

  return (
    <section id="your-snapshot" className="mb-20" style={{ scrollMarginTop: "4rem" }}>
      <div className="flex items-start gap-3 mb-3">
        <h2 className="text-3xl md:text-4xl font-semibold text-(--color-text) flex-1">
          Your financial picture.
        </h2>
        <div className="relative flex-shrink-0 mt-1">
          <button
            type="button"
            onClick={copyShareLink}
            aria-label="Copy link to this snapshot"
            title="Copy a shareable link to this snapshot"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-(--color-border) text-xs text-(--color-muted) bg-(--color-surface-2) hover:text-(--color-text) hover:border-(--color-muted) transition font-mono"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
            Share
          </button>
          {shareTooltip && (
            <div
              className="absolute right-0 top-full mt-1.5 px-2.5 py-1.5 rounded-md text-xs whitespace-nowrap z-20 pointer-events-none"
              style={{
                background: "var(--color-bg)",
                border: "1px solid var(--color-border)",
                color: "var(--color-accent)",
              }}
            >
              Copied!
            </div>
          )}
        </div>
      </div>
      <p className="text-(--color-muted) mb-8 max-w-2xl text-lg leading-relaxed">
        Enter your details to see where your money actually goes — and how a household in the same
        relative position would have fared in a different era.
      </p>

      {/* ── Input form ───────────────────────────────────────────────────── */}
      <div className="card p-5 mb-6">
        {/* Row 1: salary + earners */}
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs text-(--color-muted) mb-1.5 font-mono">
              Annual gross salary (£)
            </label>
            <div className="flex items-center border border-(--color-border) rounded-lg overflow-hidden bg-(--color-surface-2) focus-within:border-(--color-accent) transition">
              <span className="px-3 text-sm text-(--color-muted)">£</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={999999}
                placeholder="45,000"
                value={grossSalary || ""}
                onChange={(e) => setGrossSalary(Number(e.target.value))}
                className="flex-1 bg-transparent py-2 pr-3 text-sm text-(--color-text) outline-none"
              />
            </div>
          </div>
          <div>
            <div className="text-xs text-(--color-muted) mb-1.5 font-mono">Earners</div>
            <div className="flex gap-2">
              {([1, 2] as const).map((n) => (
                <Chip key={n} active={earners === n} onClick={() => setEarners(n)}>
                  {n}
                </Chip>
              ))}
            </div>
          </div>
        </div>

        {/* Row 2: housing type + monthly cost */}
        <div className="flex flex-wrap gap-4 mb-4">
          <div>
            <div className="text-xs text-(--color-muted) mb-1.5 font-mono">Housing</div>
            <div className="flex gap-2 flex-wrap">
              {(
                [
                  { v: "mortgage", l: "Mortgage" },
                  { v: "rent", l: "Rent" },
                  { v: "owned", l: "Owned outright" },
                ] as const
              ).map(({ v, l }) => (
                <Chip key={v} active={housingType === v} onClick={() => setHousingType(v)}>
                  {l}
                </Chip>
              ))}
            </div>
          </div>
          {housingType !== "owned" && (
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs text-(--color-muted) mb-1.5 font-mono">
                Monthly cost (£)
              </label>
              <div className="flex items-center border border-(--color-border) rounded-lg overflow-hidden bg-(--color-surface-2) focus-within:border-(--color-accent) transition">
                <span className="px-3 text-sm text-(--color-muted)">£</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  placeholder="1,200"
                  value={monthlyHousing || ""}
                  onChange={(e) => setMonthlyHousing(Number(e.target.value))}
                  className="flex-1 bg-transparent py-2 pr-3 text-sm text-(--color-text) outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Row 3: children + student loan */}
        <div className="flex flex-wrap gap-4 mb-4">
          <div>
            <div className="text-xs text-(--color-muted) mb-1.5 font-mono">Children under 5</div>
            <div className="flex gap-2">
              {[0, 1, 2, "3+"].map((n) => {
                const val = n === "3+" ? 3 : (n as number)
                return (
                  <Chip key={n} active={children === val} onClick={() => setChildren(val)}>
                    {n}
                  </Chip>
                )
              })}
            </div>
          </div>
          <div>
            <div className="text-xs text-(--color-muted) mb-1.5 font-mono">Student loan</div>
            <div className="flex gap-2 flex-wrap">
              {(
                [
                  { v: "none", l: "None" },
                  { v: "plan1", l: "Plan 1" },
                  { v: "plan2", l: "Plan 2" },
                  { v: "plan5", l: "Plan 5" },
                ] as const
              ).map(({ v, l }) => (
                <Chip
                  key={v}
                  active={studentLoanPlan === v}
                  onClick={() => setStudentLoanPlan(v)}
                >
                  {l}
                </Chip>
              ))}
            </div>
          </div>
        </div>

        {/* Row 4: pension % */}
        <div>
          <label className="block text-xs text-(--color-muted) mb-1.5 font-mono">
            Pension contribution (employee %)
          </label>
          <div className="flex items-center border border-(--color-border) rounded-lg overflow-hidden bg-(--color-surface-2) focus-within:border-(--color-accent) transition w-36">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={50}
              step={0.5}
              value={pensionPct}
              onChange={(e) => setPensionPct(Number(e.target.value))}
              className="flex-1 bg-transparent py-2 pl-3 text-sm text-(--color-text) outline-none"
            />
            <span className="px-3 text-sm text-(--color-muted)">%</span>
          </div>
        </div>
      </div>

      {/* ── Results ──────────────────────────────────────────────────────── */}
      {hasInputs && snapshot && (
        <>
          {/* Compare year selector */}
          <div className="flex gap-2 mb-5 flex-wrap">
            <span className="text-xs text-(--color-muted) self-center font-mono mr-1">
              Compare to:
            </span>
            {availableYears.map((y) => (
              <Chip key={y} active={compareYear === y} onClick={() => setCompareYear(y)}>
                {y}
              </Chip>
            ))}
          </div>

          {/* Waterfall bars */}
          <div className="card p-5 mb-6">
            <WaterfallBar breakdown={snapshot.today} label={snapshot.today.label} />
            <div className="my-4 border-t border-(--color-border)" />
            <WaterfallBar breakdown={snapshot.historical} label={snapshot.historical.label} />

            {/* Legend */}
            <div className="mt-5 flex flex-wrap gap-3">
              {SEGMENTS.map((seg) => (
                <div key={seg.key as string} className="flex items-center gap-1.5 text-xs text-(--color-muted)">
                  <span
                    className="inline-block w-3 h-3 rounded-sm"
                    style={{ background: seg.color }}
                  />
                  {seg.label}
                </div>
              ))}
            </div>
          </div>

          {/* Stat callout cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <StatCard
              title="Housing burden"
              todayVal={pct(snapshot.today.housingPct)}
              todayLabel="of gross today"
              histVal={pct(snapshot.historical.housingPct)}
              histLabel={`of gross in ${compareYear}`}
            />
            <StatCard
              title="Disposable / mo"
              todayVal={fmt(snapshot.today.disposable / 12)}
              todayLabel="today"
              histVal={fmt(snapshot.historical.disposable / 12)}
              histLabel={`in ${compareYear} (nominal)`}
            />
            <StatCard
              title="Tax + NI burden"
              todayVal={pct(snapshot.today.taxTotalPct)}
              todayLabel="of gross today"
              histVal={pct(snapshot.historical.taxTotalPct)}
              histLabel={`of gross in ${compareYear}`}
            />
            <StatCard
              title="Net take-home"
              todayVal={fmt(snapshot.today.netTakeHome / 12)}
              todayLabel="/mo today"
              histVal={fmt(snapshot.historical.netTakeHome / 12)}
              histLabel={`/mo in ${compareYear} (nominal)`}
            />
          </div>

          <p className="text-xs text-(--color-muted) opacity-70 max-w-2xl">
            Historical figures show what an equivalent household at the same income percentile would
            have faced, using ONS series data. Costs are nominal — not adjusted for inflation.
            Tax/NI calculations are approximate.
          </p>
        </>
      )}

      {hasInputs && !snapshot && (
        <div className="text-sm text-(--color-muted) p-4 card">
          Insufficient data to compute snapshot for {compareYear}. Try a later year.
        </div>
      )}
    </section>
  )
}
