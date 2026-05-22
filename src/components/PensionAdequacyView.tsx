import { useState, useMemo } from "react"
import { fmt } from "../lib/format"
import { useCountUp } from "../lib/useCountUp"

interface Props {
  defaultSalary?: number
}

export function PensionAdequacyView({ defaultSalary = 35000 }: Props) {
  const [salary, setSalary] = useState(defaultSalary)
  const [employeePct, setEmployeePct] = useState(5)
  const [employerPct, setEmployerPct] = useState(3)
  const [yearsToRetire, setYearsToRetire] = useState(30)

  const calc = useMemo(() => {
    const totalPct = (employeePct + employerPct) / 100
    const annualContrib = salary * totalPct
    const realReturn = 0.05 // 5% real annual return assumption
    // Future value of annuity: FV = C × ((1+r)^n - 1) / r
    const pot = annualContrib * ((Math.pow(1 + realReturn, yearsToRetire) - 1) / realReturn)
    // 4% drawdown rule
    const annualIncome = pot * 0.04
    // What a final-salary scheme would pay (2/3 of salary over 40-year career, pro-rated)
    const finalSalaryIncome = salary * (2 / 3) * Math.min(yearsToRetire, 40) / 40
    const replacementRate = annualIncome / salary
    const fsReplacementRate = finalSalaryIncome / salary

    return { pot, annualIncome, finalSalaryIncome, replacementRate, fsReplacementRate }
  }, [salary, employeePct, employerPct, yearsToRetire])

  const animPot = useCountUp(calc.pot)
  const animAnnualIncome = useCountUp(calc.annualIncome)
  const animFinalSalaryIncome = useCountUp(calc.finalSalaryIncome)
  const animGap = useCountUp(calc.finalSalaryIncome - calc.annualIncome)
  const animGap20 = useCountUp((calc.finalSalaryIncome - calc.annualIncome) * 20)

  return (
    <section className="mb-20" id="pension" style={{ scrollMarginTop: "4rem" }}>
      <h2 className="text-3xl md:text-4xl font-semibold text-(--color-text) mb-3">
        What will your pension actually pay?
      </h2>
      <p className="text-(--color-muted) mb-8 max-w-2xl text-lg leading-relaxed">
        Auto-enrolment replaced final-salary schemes for most workers. Enter your numbers to see what you're
        actually building — and what your parents' generation would have got.
      </p>

      <div className="rounded-2xl border border-(--color-border) bg-(--color-surface) p-6 md:p-8">
        {/* Controls */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-(--color-muted) font-mono uppercase tracking-wide">Salary</span>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-(--color-muted) text-sm">£</span>
              <input
                type="number"
                inputMode="numeric"
                value={salary}
                onChange={(e) => setSalary(Math.max(1, Number(e.target.value)))}
                min={1}
                step={1000}
                className="w-full pl-7 pr-3 py-2 rounded-lg border border-(--color-border) bg-(--color-bg) text-(--color-text) text-sm focus:outline-none focus:border-(--color-accent)"
              />
            </div>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-(--color-muted) font-mono uppercase tracking-wide">Your contribution</span>
            <div className="relative">
              <input
                type="number"
                inputMode="numeric"
                value={employeePct}
                onChange={(e) => setEmployeePct(Math.max(0, Math.min(50, Number(e.target.value))))}
                min={0}
                max={50}
                step={0.5}
                className="w-full pl-3 pr-7 py-2 rounded-lg border border-(--color-border) bg-(--color-bg) text-(--color-text) text-sm focus:outline-none focus:border-(--color-accent)"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-(--color-muted) text-sm">%</span>
            </div>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-(--color-muted) font-mono uppercase tracking-wide">Employer contribution</span>
            <div className="relative">
              <input
                type="number"
                inputMode="numeric"
                value={employerPct}
                onChange={(e) => setEmployerPct(Math.max(0, Math.min(50, Number(e.target.value))))}
                min={0}
                max={50}
                step={0.5}
                className="w-full pl-3 pr-7 py-2 rounded-lg border border-(--color-border) bg-(--color-bg) text-(--color-text) text-sm focus:outline-none focus:border-(--color-accent)"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-(--color-muted) text-sm">%</span>
            </div>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-(--color-muted) font-mono uppercase tracking-wide">Years to retire</span>
            <input
              type="number"
              value={yearsToRetire}
              onChange={(e) => setYearsToRetire(Math.max(1, Math.min(50, Number(e.target.value))))}
              min={1}
              max={50}
              step={1}
              className="w-full px-3 py-2 rounded-lg border border-(--color-border) bg-(--color-bg) text-(--color-text) text-sm focus:outline-none focus:border-(--color-accent)"
            />
          </label>
        </div>

        {/* Results */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="rounded-xl bg-(--color-surface-2) p-5 border border-(--color-border)">
            <div className="text-xs text-(--color-muted) font-mono uppercase tracking-wide mb-2">Projected pot</div>
            <div className="text-3xl font-semibold text-(--color-accent) tabular-nums">
              {fmt(animPot)}
            </div>
            <div className="text-xs text-(--color-muted) mt-2 leading-relaxed">
              In today's money, at 5% real annual return over {yearsToRetire} years.
            </div>
          </div>

          <div className="rounded-xl bg-(--color-surface-2) p-5 border border-(--color-border)">
            <div className="text-xs text-(--color-muted) font-mono uppercase tracking-wide mb-2">Annual income from this</div>
            <div className="text-3xl font-semibold text-(--color-text) tabular-nums">
              {fmt(animAnnualIncome)}
            </div>
            <div className="text-xs text-(--color-muted) mt-2 leading-relaxed">
              At 4% drawdown —{" "}
              <span className={calc.replacementRate < 0.5 ? "text-red-400" : "text-green-400"}>
                {Math.round(calc.replacementRate * 100)}% of your salary
              </span>
              . Experts suggest 60–70% for a comfortable retirement.
            </div>
          </div>

          <div className="rounded-xl bg-(--color-surface-2) p-5 border border-(--color-border)">
            <div className="text-xs text-(--color-muted) font-mono uppercase tracking-wide mb-2">Final-salary equivalent</div>
            <div className="text-3xl font-semibold tabular-nums" style={{ color: "#f59e0b" }}>
              {fmt(animFinalSalaryIncome)}
            </div>
            <div className="text-xs text-(--color-muted) mt-2 leading-relaxed">
              What a 40-year final-salary scheme (2/3 accrual) would pay —{" "}
              <span style={{ color: "#f59e0b" }}>
                {Math.round(calc.fsReplacementRate * 100)}% of salary
              </span>
              . Most public-sector workers pre-2000s had this.
            </div>
          </div>
        </div>

        {calc.annualIncome < calc.finalSalaryIncome && (
          <p className="mt-6 text-sm text-(--color-muted) text-center border-t border-(--color-border) pt-5">
            Your defined-contribution pot pays{" "}
            <span className="text-(--color-text) font-semibold">{fmt(animGap)} less per year</span>{" "}
            than an equivalent final-salary pension would have. That gap, compounded over 20 years of retirement, is{" "}
            <span className="text-(--color-text) font-semibold">{fmt(animGap20)}</span>.
          </p>
        )}

        <p className="mt-4 text-[10px] text-(--color-muted) opacity-50 text-center font-mono">
          Assumes 5% real investment return · 4% drawdown rule · final salary = 2/3 accrual over 40 years
        </p>
      </div>
    </section>
  )
}
