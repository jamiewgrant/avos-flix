import { useState, useMemo } from "react"
import type { Series } from "../types/series"
import { fmt } from "../lib/format"

interface Props {
  series: Series[]
}

// Approximate average UK SVR / mortgage rate by year (%)
const SVR_TABLE: Record<number, number> = {
  1995: 7.5,
  2000: 6.5,
  2005: 5.5,
  2008: 6.0,
  2009: 3.5,
  2010: 3.8,
  2012: 3.5,
  2015: 3.2,
  2017: 2.5,
  2019: 2.3,
  2020: 2.1,
}

function getSVR(year: number): number {
  const years = Object.keys(SVR_TABLE)
    .map(Number)
    .sort((a, b) => a - b)

  if (year <= years[0]) return SVR_TABLE[years[0]]
  if (year >= years[years.length - 1]) return SVR_TABLE[years[years.length - 1]]

  for (let i = 0; i < years.length - 1; i++) {
    const y0 = years[i]
    const y1 = years[i + 1]
    if (year >= y0 && year <= y1) {
      const t = (year - y0) / (y1 - y0)
      return SVR_TABLE[y0] + t * (SVR_TABLE[y1] - SVR_TABLE[y0])
    }
  }

  return 3.5
}

/** Standard annuity monthly repayment formula */
function monthlyRepayment(principal: number, annualRatePct: number, months: number): number {
  const r = annualRatePct / 12 / 100
  if (r === 0) return principal / months
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1)
}

function getPoint(s: Series | undefined, year: number): number | null {
  if (!s) return null
  const pt = s.points.find((p) => p.year === year)
  return pt ? pt.value : null
}

function ResultCard({
  label,
  value,
  sub,
}: {
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="rounded-xl bg-(--color-surface-2) p-5 flex flex-col gap-1">
      <div className="text-xs text-(--color-muted) font-mono uppercase tracking-wide">{label}</div>
      <div className="text-3xl font-bold text-(--color-text) tabular-nums leading-tight">
        {value}
      </div>
      {sub && <div className="text-xs text-(--color-muted) mt-1 leading-snug">{sub}</div>}
    </div>
  )
}

export function HomeBuyingCalculator({ series }: Props) {
  const [purchaseYear, setPurchaseYear] = useState(2010)
  const [depositPct, setDepositPct] = useState(10)
  const [salaryNow, setSalaryNow] = useState(35000)

  const hpSeries = series.find((s) => s.id === "house-price-nationwide")
  const wageSeries = series.find((s) => s.id === "median-wage")

  const result = useMemo(() => {
    const purchasePriceThen = getPoint(hpSeries, purchaseYear)
    const currentHouseValue = getPoint(hpSeries, 2025) ?? getPoint(hpSeries, 2024)
    const medianWageThen = getPoint(wageSeries, purchaseYear)

    if (purchasePriceThen === null || currentHouseValue === null) return null

    const depositThen = purchasePriceThen * (depositPct / 100)
    const mortgageThen = purchasePriceThen - depositThen
    const annualRate = getSVR(purchaseYear)
    const monthlyPaymentThen = monthlyRepayment(mortgageThen, annualRate, 300)

    const yearsElapsed = Math.min(2025 - purchaseYear, 25)
    const remainingFraction = Math.max(0, (25 - yearsElapsed) / 25)
    const equityNow = currentHouseValue - mortgageThen * remainingFraction

    const rentNow = 1_800

    return {
      purchasePriceThen,
      depositThen,
      mortgageThen,
      monthlyPaymentThen,
      currentHouseValue,
      equityNow,
      rentNow,
      medianWageThen,
      annualRate,
    }
  }, [hpSeries, wageSeries, purchaseYear, depositPct])

  const diff = result ? result.rentNow - result.monthlyPaymentThen : 0
  const isRecent = purchaseYear >= 2020

  return (
    <section className="rounded-2xl border border-(--color-border) bg-(--color-surface) p-6 md:p-8">
      <div className="text-xs text-(--color-muted) font-mono uppercase tracking-wide mb-2">
        Calculator
      </div>
      <h3 className="text-2xl md:text-3xl font-semibold text-(--color-text)">
        What if you'd bought in {purchaseYear}?
      </h3>
      <p className="mt-2 text-sm text-(--color-muted) leading-relaxed max-w-prose">
        Estimates based on Nationwide average house prices, a {depositPct}% deposit, and the
        approximate average UK mortgage rate for that year. Monthly payment assumes a 25-year
        repayment mortgage held unchanged to today (simplified — actual repayments would vary).
      </p>

      {/* Inputs */}
      <div className="mt-6 grid sm:grid-cols-3 gap-5">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-(--color-muted) font-mono uppercase tracking-wide">
            Purchase year
          </span>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1995}
              max={2020}
              value={purchaseYear}
              onChange={(e) => setPurchaseYear(Number(e.target.value))}
              className="flex-1 accent-(--color-accent)"
            />
            <span className="text-sm font-semibold text-(--color-text) tabular-nums w-12 text-right">
              {purchaseYear}
            </span>
          </div>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-(--color-muted) font-mono uppercase tracking-wide">
            Deposit (%)
          </span>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={5}
              max={50}
              step={5}
              value={depositPct}
              onChange={(e) => setDepositPct(Number(e.target.value))}
              className="flex-1 accent-(--color-accent)"
            />
            <span className="text-sm font-semibold text-(--color-text) tabular-nums w-12 text-right">
              {depositPct}%
            </span>
          </div>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-(--color-muted) font-mono uppercase tracking-wide">
            Your salary today (£)
          </span>
          <input
            type="number"
            min={10000}
            max={500000}
            step={1000}
            value={salaryNow}
            onChange={(e) =>
              setSalaryNow(Math.max(10000, Math.min(500000, Number(e.target.value) || 35000)))
            }
            className="bg-(--color-bg) border border-(--color-border) text-(--color-text) px-3 py-1.5 rounded-md text-sm"
          />
        </label>
      </div>

      {/* Results */}
      {result ? (
        <>
          {isRecent && (
            <div className="mt-5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
              This is recent enough that data may be incomplete — house price series may not yet
              reflect 2025 final figures.
            </div>
          )}

          <div className="mt-6 grid sm:grid-cols-3 gap-4">
            <ResultCard
              label={`Monthly mortgage (bought ${purchaseYear})`}
              value={fmt(result.monthlyPaymentThen)}
              sub={`Rate ~${result.annualRate.toFixed(1)}% SVR · ${depositPct}% deposit`}
            />
            <ResultCard
              label="Your home's value today"
              value={fmt(result.currentHouseValue)}
              sub={`Bought for ${fmt(result.purchasePriceThen)} · deposit was ${fmt(result.depositThen)}`}
            />
            <ResultCard
              label="Equity built"
              value={fmt(result.equityNow)}
              sub={`Remaining mortgage ~${fmt(result.mortgageThen * Math.max(0, (25 - Math.min(2025 - purchaseYear, 25)) / 25))}`}
            />
          </div>

          {result.medianWageThen !== null && (
            <div className="mt-4 rounded-xl bg-(--color-surface-2) p-5 grid sm:grid-cols-2 gap-4 text-sm text-(--color-muted)">
              <div>
                <span className="text-xs font-mono uppercase tracking-wide block mb-1">
                  Median wage in {purchaseYear}
                </span>
                <span className="text-xl font-semibold text-(--color-text)">
                  {fmt(result.medianWageThen)}
                </span>
                <span className="ml-2">/ year</span>
              </div>
              <div>
                <span className="text-xs font-mono uppercase tracking-wide block mb-1">
                  Mortgage as share of median wage
                </span>
                <span className="text-xl font-semibold text-(--color-text)">
                  {((result.monthlyPaymentThen * 12) / result.medianWageThen * 100).toFixed(1)}%
                </span>
                <span className="ml-2">of gross income</span>
              </div>
            </div>
          )}

          <p className="mt-5 text-sm text-(--color-muted) leading-relaxed">
            Your monthly mortgage would be{" "}
            <span className="font-semibold text-(--color-text)">{fmt(result.monthlyPaymentThen)}</span>{" "}
            vs. renting at ~<span className="font-semibold text-(--color-text)">£1,800</span>/month
            today — a difference of{" "}
            <span className="font-semibold text-(--color-text)">{fmt(Math.abs(diff))}</span>/month
            {diff > 0 ? " cheaper to own" : " cheaper to rent"},{" "}
            <span className="font-semibold text-(--color-text)">{fmt(Math.abs(diff) * 12)}</span>/year.
          </p>

          <p className="mt-3 text-xs text-(--color-muted) leading-relaxed">
            Salary input ({fmt(salaryNow)}/yr) is for context only and does not affect the
            calculations above — used for your own affordability sense-check.
          </p>
        </>
      ) : (
        <div className="mt-6 text-sm text-(--color-muted)">
          House price data not available for {purchaseYear}.
        </div>
      )}
    </section>
  )
}
