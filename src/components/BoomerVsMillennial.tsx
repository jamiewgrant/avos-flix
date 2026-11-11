import { useMemo } from "react"
import type { SeriesData } from "../types/series"
import { netPayDetail } from "../lib/costBasket"
import { latestCommonYear } from "../lib/latestYear"

interface Props {
  data: SeriesData
}

const ACCENT = "#c084fc"
const MUTED = "#9ca3af"

const YEAR_A = 1995

function findValue(
  data: SeriesData,
  seriesId: string,
  year: number,
): number | null {
  const s = data.series[seriesId]
  if (!s) return null
  const exact = s.points.find((p) => p.year === year)
  if (exact) return exact.value
  const closest = s.points.reduce<typeof s.points[0] | null>((best, p) => {
    if (!best) return p
    return Math.abs(p.year - year) < Math.abs(best.year - year) ? p : best
  }, null)
  if (!closest || Math.abs(closest.year - year) > 3) return null
  return closest.value
}

type Unit = "GBP" | "percent" | "ratio" | "years"

function fmt(v: number, unit: Unit): string {
  if (unit === "GBP") return `£${Math.round(v).toLocaleString("en-GB")}`
  if (unit === "percent") return `${v.toFixed(1)}%`
  if (unit === "ratio") return `${v.toFixed(1)}×`
  return `${v.toFixed(1)}y`
}

function mortgagePayment(price: number, boeRate: number): number {
  const annualRate = (boeRate + 1.5) / 100
  const loan = price * 0.85
  const TERM_MONTHS = 300
  const m = annualRate / 12
  const monthly =
    m === 0
      ? loan / TERM_MONTHS
      : (loan * m * Math.pow(1 + m, TERM_MONTHS)) / (Math.pow(1 + m, TERM_MONTHS) - 1)
  return monthly * 12
}

export function BoomerVsMillennial({ data }: Props) {
  // "Now" is the latest year both headline series cover, not a hardcoded date.
  const YEAR_B =
    latestCommonYear(data.series["house-price-nationwide"], data.series["median-wage"]) ??
    new Date().getFullYear()
  const rows = useMemo(() => {
    const houseA = findValue(data, "house-price-nationwide", YEAR_A)
    const houseB = findValue(data, "house-price-nationwide", YEAR_B)
    const wageGrossA = findValue(data, "median-wage", YEAR_A)
    const wageGrossB = findValue(data, "median-wage", YEAR_B)
    const boeA = findValue(data, "boe-rate", YEAR_A)
    const boeB = findValue(data, "boe-rate", YEAR_B)
    const rentIdxA = findValue(data, "rent-index", YEAR_A)
    const rentIdxB = findValue(data, "rent-index", YEAR_B)
    const tuitionA = findValue(data, "tuition-uk", YEAR_A)
    const tuitionB = findValue(data, "tuition-uk", YEAR_B)

    const wageNetA = wageGrossA ? netPayDetail(wageGrossA, YEAR_A, {}).net : null
    const wageNetB = wageGrossB ? netPayDetail(wageGrossB, YEAR_B, {}).net : null

    const REF_RENT_2015 = 9000
    const rentA = rentIdxA ? REF_RENT_2015 * (rentIdxA / 100) : null
    const rentB = rentIdxB ? REF_RENT_2015 * (rentIdxB / 100) : null

    const mortgageA = houseA && boeA != null ? mortgagePayment(houseA, boeA) : null
    const mortgageB = houseB && boeB != null ? mortgagePayment(houseB, boeB) : null

    const depositYearsA = houseA && wageNetA && wageNetA > 0
      ? (houseA * 0.15) / (wageNetA * 0.1) : null
    const depositYearsB = houseB && wageNetB && wageNetB > 0
      ? (houseB * 0.15) / (wageNetB * 0.1) : null

    return [
      { label: "Average house price", hint: "Land Registry / Nationwide mean UK", a: houseA, b: houseB, unit: "GBP" as Unit, worseIsHigher: true },
      { label: "Median take-home (full-time)", hint: "ASHE gross after income tax + NI", a: wageNetA, b: wageNetB, unit: "GBP" as Unit, worseIsHigher: false },
      { label: "House price / annual wage", hint: "Years of gross salary to buy the average house", a: houseA && wageGrossA ? houseA / wageGrossA : null, b: houseB && wageGrossB ? houseB / wageGrossB : null, unit: "ratio" as Unit, worseIsHigher: true },
      { label: "FTB annual mortgage payment", hint: "85% LTV, 25yr term, Bank Rate + 1.5%", a: mortgageA, b: mortgageB, unit: "GBP" as Unit, worseIsHigher: true },
      { label: "Mortgage as % of take-home", hint: "Annual mortgage ÷ net wage", a: mortgageA && wageNetA ? (mortgageA / wageNetA) * 100 : null, b: mortgageB && wageNetB ? (mortgageB / wageNetB) * 100 : null, unit: "percent" as Unit, worseIsHigher: true },
      { label: "Typical 2-bed annual rent", hint: "Rent-index derived; 2015 ref = £9k/yr", a: rentA, b: rentB, unit: "GBP" as Unit, worseIsHigher: true },
      { label: "Rent as % of take-home", hint: "Annual rent ÷ net wage", a: rentA && wageNetA ? (rentA / wageNetA) * 100 : null, b: rentB && wageNetB ? (rentB / wageNetB) * 100 : null, unit: "percent" as Unit, worseIsHigher: true },
      { label: "Years to save 15% deposit", hint: "Saving 10% of net take-home per year", a: depositYearsA, b: depositYearsB, unit: "years" as Unit, worseIsHigher: true },
      { label: "University tuition (annual)", hint: "Max England tuition fee", a: tuitionA, b: tuitionB, unit: "GBP" as Unit, worseIsHigher: true },
      { label: "Bank Rate", hint: "Official rate — context for mortgage cost", a: boeA, b: boeB, unit: "percent" as Unit, worseIsHigher: false },
    ]
  }, [data, YEAR_B])

  return (
    <section className="mb-20">
      <h2 className="text-3xl md:text-4xl font-semibold text-(--color-text) mb-3">
        Same age, different economy.
      </h2>
      <p className="text-(--color-muted) mb-8 max-w-2xl text-lg leading-relaxed">
        A 30-year-old in {YEAR_A} vs a 30-year-old in {YEAR_B}. Same milestone — trying
        to get a foothold — radically different numbers.
      </p>

      <div className="rounded-2xl border border-(--color-border) bg-(--color-surface) overflow-hidden">
        <div className="hidden md:grid grid-cols-[1fr_auto_auto] text-xs font-mono text-(--color-muted) uppercase tracking-wider px-5 py-3 border-b border-(--color-border) bg-(--color-bg)">
          <span />
          <span className="w-40 text-right">Born {YEAR_A - 30}, age 30</span>
          <span className="w-40 text-right" style={{ color: ACCENT }}>Born {YEAR_B - 30}, age 30</span>
        </div>

        {rows.map((row, i) => {
          if (row.a === null && row.b === null) return null
          const isWorse =
            row.b !== null && row.a !== null
              ? row.worseIsHigher ? row.b > row.a : row.b < row.a
              : false
          const mult =
            row.b !== null && row.a !== null && row.a !== 0
              ? row.b / row.a
              : null

          return (
            <div
              key={i}
              className="grid md:grid-cols-[1fr_auto_auto] items-center px-5 py-3.5 border-b border-(--color-border) last:border-0"
            >
              <div className="mb-2 md:mb-0">
                <div className="text-sm text-(--color-text) font-medium">{row.label}</div>
                <div className="text-[11px] mt-0.5" style={{ color: MUTED }}>{row.hint}</div>
              </div>
              <div className="md:w-40 text-left md:text-right mb-1 md:mb-0">
                <span className="text-xs md:hidden font-mono" style={{ color: MUTED }}>{YEAR_A}: </span>
                <span className="text-sm tabular-nums" style={{ color: MUTED }}>
                  {row.a !== null ? fmt(row.a, row.unit) : "—"}
                </span>
              </div>
              <div className="md:w-40 text-left md:text-right">
                <span className="text-xs md:hidden font-mono" style={{ color: ACCENT }}>{YEAR_B}: </span>
                <span
                  className="text-sm font-semibold tabular-nums"
                  style={{ color: isWorse ? "#ef4444" : ACCENT }}
                >
                  {row.b !== null ? fmt(row.b, row.unit) : "—"}
                </span>
                {mult !== null && (
                  <div className="text-[10px] font-mono opacity-60 mt-0.5" style={{ color: isWorse ? "#ef4444" : MUTED }}>
                    {mult >= 1 ? `${mult.toFixed(1)}×` : `${(1 / mult).toFixed(1)}× less`}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <p className="mt-3 text-[11px] font-mono opacity-70" style={{ color: MUTED }}>
        Sources: Land Registry / Nationwide (house price), ONS ASHE (wage), Bank of England (rate), ONS PIPR / rent-index, UCEA (tuition). Tax model applies each year's real PA, basic rate, NI. {YEAR_B} values use most recent available data.
      </p>
    </section>
  )
}
