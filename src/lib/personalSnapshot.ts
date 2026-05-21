import type { Series } from "../types/series"
import { computeTaxNI, type StudentLoanPlan } from "./taxModel"

// Re-export for tests / callers that import from this module.
export { computeTaxNI } from "./taxModel"

export interface PersonalInputs {
  grossSalary: number
  housingType: "mortgage" | "rent" | "owned"
  monthlyHousing: number
  children: number
  studentLoanPlan: "none" | "plan1" | "plan2" | "plan5"
  pensionPct: number
  earners: 1 | 2
}

export interface SnapshotBreakdown {
  year: number
  label: string
  grossSalary: number
  incomeTax: number
  nationalInsurance: number
  studentLoan: number
  pension: number
  netTakeHome: number
  housing: number
  energy: number
  groceries: number
  childcare: number
  councilTax: number
  disposable: number
  housingPct: number
  disposablePct: number
  taxTotalPct: number
}

function latestValue(series: Series | undefined): number | null {
  if (!series || series.points.length === 0) return null
  return series.points[series.points.length - 1].value
}

function valueAtYear(series: Series | undefined, year: number): number | null {
  if (!series || series.points.length === 0) return null
  // Exact match first
  const exact = series.points.find((p) => p.year === year)
  if (exact) return exact.value
  // Nearest neighbour (prefer earlier)
  const sorted = [...series.points].sort(
    (a, b) => Math.abs(a.year - year) - Math.abs(b.year - year),
  )
  return sorted[0]?.value ?? null
}

function syntheticMortgagePayment(
  series: Record<string, Series>,
  year: number,
): number | null {
  const hp = series["house-price-landreg"] || series["house-price-nationwide"]
  const rate = series["boe-rate"]
  if (!hp || !rate) return null
  const hpVal = valueAtYear(hp, year)
  const rateVal = valueAtYear(rate, year)
  if (hpVal == null || rateVal == null) return null
  const TERM_MONTHS = 25 * 12
  const DEPOSIT = 0.15
  const MARGIN = 1.5
  const annualRate = (rateVal + MARGIN) / 100
  const loan = hpVal * (1 - DEPOSIT)
  const m = annualRate / 12
  const monthly =
    m === 0
      ? loan / TERM_MONTHS
      : (loan * m * Math.pow(1 + m, TERM_MONTHS)) / (Math.pow(1 + m, TERM_MONTHS) - 1)
  return monthly * 12
}

export function computeSnapshot(
  inputs: PersonalInputs,
  series: Record<string, Series>,
  compareYear: number,
): { today: SnapshotBreakdown; historical: SnapshotBreakdown } | null {
  if (inputs.grossSalary <= 0) return null

  const medianWage = series["median-wage"]
  if (!medianWage || medianWage.points.length === 0) return null

  // Find current year from latest median-wage data point
  const latestWagePoint = medianWage.points[medianWage.points.length - 1]
  const currentYear = latestWagePoint.year
  const todayMedian = latestWagePoint.value

  // ── Today ────────────────────────────────────────────────────────────────
  const perEarnerGross = inputs.grossSalary / inputs.earners
  let totalTax = 0, totalNI = 0, totalSL = 0, totalPension = 0, totalNet = 0
  for (let i = 0; i < inputs.earners; i++) {
    const r = computeTaxNI(perEarnerGross, currentYear, inputs.studentLoanPlan, inputs.pensionPct)
    totalTax += r.tax
    totalNI += r.ni
    totalSL += r.studentLoan
    totalPension += r.pension
    totalNet += r.net
  }

  const todayHousing =
    inputs.housingType === "owned" ? 0 : inputs.monthlyHousing * 12
  const todayEnergy = latestValue(series["energy-cost"]) ?? 2500
  const foodCpiNow = latestValue(series["food-cpi"]) ?? 100
  const todayGroceries = 5200 * (foodCpiNow / 100) + 1000 * inputs.children
  const childcareAnnual = latestValue(series["childcare-cost"])
  const todayChildcare =
    inputs.children > 0 && inputs.earners === 2
      ? childcareAnnual != null
        ? childcareAnnual * Math.min(inputs.children, 2)
        : 15000 * Math.min(inputs.children, 2)
      : 0
  const todayCouncilTax = latestValue(series["council-tax"]) ?? 1800

  const totalCosts = todayHousing + todayEnergy + todayGroceries + todayChildcare + todayCouncilTax
  const todayDisposable = totalNet - totalCosts
  const todayGross = inputs.grossSalary

  const today: SnapshotBreakdown = {
    year: currentYear,
    label: `Today (${currentYear})`,
    grossSalary: todayGross,
    incomeTax: totalTax,
    nationalInsurance: totalNI,
    studentLoan: totalSL,
    pension: totalPension,
    netTakeHome: totalNet,
    housing: todayHousing,
    energy: todayEnergy,
    groceries: todayGroceries,
    childcare: todayChildcare,
    councilTax: todayCouncilTax,
    disposable: todayDisposable,
    housingPct: todayGross > 0 ? (todayHousing / todayGross) * 100 : 0,
    disposablePct: todayGross > 0 ? (todayDisposable / todayGross) * 100 : 0,
    taxTotalPct: todayGross > 0 ? ((totalTax + totalNI) / todayGross) * 100 : 0,
  }

  // ── Historical ───────────────────────────────────────────────────────────
  const historicalMedian = valueAtYear(medianWage, compareYear)
  if (historicalMedian == null) return null

  const historicalPerEarnerGross =
    (perEarnerGross / todayMedian) * historicalMedian
  const historicalTotalGross = historicalPerEarnerGross * inputs.earners

  // Pension: pre-2013 auto-enrolment didn't exist; only apply if year >= 2013
  const historicalPensionPct =
    inputs.pensionPct > 0 && compareYear >= 2013 ? inputs.pensionPct : 0

  // Student loan: active only if the plan existed in the compare year
  let historicalSlPlan: StudentLoanPlan = "none"
  if (inputs.studentLoanPlan === "plan1" && compareYear >= 1998) historicalSlPlan = "plan1"
  if (inputs.studentLoanPlan === "plan2" && compareYear >= 2012) historicalSlPlan = "plan2"
  if (inputs.studentLoanPlan === "plan5" && compareYear >= 2023) historicalSlPlan = "plan5"

  let hTotalTax = 0, hTotalNI = 0, hTotalSL = 0, hTotalPension = 0, hTotalNet = 0
  for (let i = 0; i < inputs.earners; i++) {
    const r = computeTaxNI(historicalPerEarnerGross, compareYear, historicalSlPlan, historicalPensionPct)
    hTotalTax += r.tax
    hTotalNI += r.ni
    hTotalSL += r.studentLoan
    hTotalPension += r.pension
    hTotalNet += r.net
  }

  // Historical housing
  let historicalHousing = 0
  if (inputs.housingType === "mortgage") {
    const synthToday = syntheticMortgagePayment(series, currentYear)
    const synthHistorical = syntheticMortgagePayment(series, compareYear)
    if (synthToday != null && synthHistorical != null && synthToday > 0) {
      historicalHousing = (synthHistorical / synthToday) * (inputs.monthlyHousing * 12)
    } else {
      historicalHousing = synthHistorical ?? 0
    }
  } else if (inputs.housingType === "rent") {
    const rentNow = latestValue(series["rent-index"])
    const rentThen = valueAtYear(series["rent-index"], compareYear)
    if (rentNow != null && rentThen != null && rentNow > 0) {
      historicalHousing = (rentThen / rentNow) * (inputs.monthlyHousing * 12)
    } else {
      historicalHousing = inputs.monthlyHousing * 12 * 0.5
    }
  }

  const histEnergy = valueAtYear(series["energy-cost"], compareYear) ?? todayEnergy * 0.5
  const foodCpiThen = valueAtYear(series["food-cpi"], compareYear) ?? foodCpiNow
  const histGroceries =
    5200 * (foodCpiThen / 100) + 1000 * inputs.children

  // Childcare historical — only applies when both parents work. A single-earner
  // household with children has a stay-at-home parent, so formal childcare cost is zero.
  let histChildcare = 0
  if (inputs.children > 0 && inputs.earners === 2) {
    const ccThen = valueAtYear(series["childcare-cost"], compareYear)
    if (ccThen != null) {
      histChildcare = ccThen * Math.min(inputs.children, 2)
    } else if (todayChildcare > 0 && foodCpiNow > 0) {
      histChildcare = todayChildcare * (foodCpiThen / foodCpiNow)
    }
  }

  const histCouncilTax = valueAtYear(series["council-tax"], compareYear) ?? todayCouncilTax * 0.5

  const histTotalCosts =
    historicalHousing + histEnergy + histGroceries + histChildcare + histCouncilTax
  const histDisposable = hTotalNet - histTotalCosts

  const historical: SnapshotBreakdown = {
    year: compareYear,
    label: `${compareYear} equivalent`,
    grossSalary: historicalTotalGross,
    incomeTax: hTotalTax,
    nationalInsurance: hTotalNI,
    studentLoan: hTotalSL,
    pension: hTotalPension,
    netTakeHome: hTotalNet,
    housing: historicalHousing,
    energy: histEnergy,
    groceries: histGroceries,
    childcare: histChildcare,
    councilTax: histCouncilTax,
    disposable: histDisposable,
    housingPct: historicalTotalGross > 0 ? (historicalHousing / historicalTotalGross) * 100 : 0,
    disposablePct: historicalTotalGross > 0 ? (histDisposable / historicalTotalGross) * 100 : 0,
    taxTotalPct:
      historicalTotalGross > 0 ? ((hTotalTax + hTotalNI) / historicalTotalGross) * 100 : 0,
  }

  return { today, historical }
}
