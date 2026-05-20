// UK tax / NI / student loan model — year-aware, 1985–2030.
//
// Single source of truth used by:
//   • personalSnapshot.computeSnapshot (the calculator UI)
//   • costBasket.netPayDetail          (the chart wage lines)
//
// Approximation: rate schedules step by tax year (1996, 2003, 2008, 2011, 2025
// for the main rates); thresholds piecewise-linear over anchor tables built
// from HMRC/DWP/HMT data. The model is intentionally simple — no Scottish
// bands, no salary-sacrifice quirks, no marriage allowance, no PA taper at
// £100k. Accurate within ~5% of HMRC values across all (income, year) pairs
// we test against; see personalSnapshot.test.ts for the golden references.

export interface TaxNIResult {
  tax: number
  ni: number
  studentLoan: number
  pension: number
  net: number
}

// Piecewise-linear interpolation over an anchor table.
function interp(year: number, anchors: Array<[number, number]>): number {
  if (year <= anchors[0][0]) return anchors[0][1]
  if (year >= anchors[anchors.length - 1][0]) return anchors[anchors.length - 1][1]
  for (let i = 1; i < anchors.length; i++) {
    const [y1, v1] = anchors[i]
    if (y1 >= year) {
      const [y0, v0] = anchors[i - 1]
      const t = (year - y0) / (y1 - y0)
      return v0 + (v1 - v0) * t
    }
  }
  return anchors[anchors.length - 1][1]
}

const PA_ANCHORS: Array<[number, number]> = [
  [1990, 3005], [1995, 3525], [2000, 4385], [2005, 4895],
  [2010, 6475], [2014, 10000], [2016, 11000], [2019, 12500],
  [2021, 12570], [2030, 12570],
]

const NI_PT_ANCHORS: Array<[number, number]> = [
  [1990, 2600], [2000, 3900], [2010, 5715], [2015, 8060],
  [2019, 8632], [2022, 12570], [2030, 12570],
]

// NI Upper Earnings Limit. Pre-2003: 0% above UEL. 2003-2010: 1%. 2011+: 2%.
const NI_UEL_ANCHORS: Array<[number, number]> = [
  [1990, 20280], [1995, 22880], [2000, 27820], [2003, 30420],
  [2010, 43875], [2021, 50270], [2030, 50270],
]

// Higher-rate income tax threshold (total income, not taxable income).
const HR_THRESHOLD_ANCHORS: Array<[number, number]> = [
  [1990, 20700], [1993, 23700], [1997, 26100], [2000, 28000],
  [2003, 30500], [2006, 33300], [2010, 37400], [2013, 41450],
  [2016, 43000], [2018, 46350], [2019, 50000], [2021, 50270], [2030, 50270],
]

export type StudentLoanPlan = "none" | "plan1" | "plan2" | "plan5"

// Returns the SL threshold in effect for a given plan-year combo, or null
// if that plan didn't exist or hadn't started.
function studentLoanThreshold(plan: StudentLoanPlan, year: number): number | null {
  if (plan === "plan1" && year >= 1998) {
    return year < 2005 ? 10000 : year < 2012 ? 15000 : 22015
  }
  if (plan === "plan2" && year >= 2012) {
    return year < 2016 ? 21000 : year < 2022 ? 25000 : 27295
  }
  if (plan === "plan5" && year >= 2023) {
    return 25000
  }
  return null
}

// Auto-enrolment minimum employee pension contribution by year.
// 0% pre-Oct 2012, 1% from then, 3% from Apr 2018, 5% from Apr 2019+.
export function autoEnrolPensionPct(year: number): number {
  if (year < 2013) return 0
  if (year < 2018) return 1
  if (year < 2019) return 3
  return 5
}

// Default plan for a graduate household given the tax year — used when
// callers want a single "the active plan" view rather than picking one.
// Plan 1 graduates dominated 1998–2011; Plan 2 from 2012; Plan 5 from 2023.
export function defaultGraduatePlan(year: number): StudentLoanPlan {
  if (year < 1998) return "none"
  if (year < 2012) return "plan1"
  if (year < 2023) return "plan2"
  return "plan5"
}

// Canonical UK tax/NI/SL/pension calculation for one earner.
// pensionPct is an explicit employee percentage (5 = 5%); set to
// autoEnrolPensionPct(year) for the auto-enrol minimum.
export function computeTaxNI(
  gross: number,
  year: number,
  studentLoanPlan: StudentLoanPlan,
  pensionPct: number,
): TaxNIResult {
  const personalAllowance = interp(year, PA_ANCHORS)
  const basicRate =
    year < 1996 ? 0.25 : year < 1997 ? 0.24 : year < 2000 ? 0.23 : year < 2008 ? 0.22 : 0.20
  const niMainRate =
    year < 2003 ? 0.09
    : year < 2011 ? 0.11
    : year < 2025 ? 0.12
    : 0.08
  const niPT = interp(year, NI_PT_ANCHORS)
  const niUEL = interp(year, NI_UEL_ANCHORS)
  const niAboveUELRate = year < 2003 ? 0 : year < 2011 ? 0.01 : 0.02

  const taxable = Math.max(0, gross - personalAllowance)
  const hrThreshold = interp(year, HR_THRESHOLD_ANCHORS)
  const basicBand = Math.max(0, hrThreshold - personalAllowance)
  const tax =
    Math.min(taxable, basicBand) * basicRate +
    Math.max(0, taxable - basicBand) * 0.40
  const ni =
    Math.max(0, Math.min(gross, niUEL) - niPT) * niMainRate +
    Math.max(0, gross - niUEL) * niAboveUELRate

  const slThreshold = studentLoanThreshold(studentLoanPlan, year)
  const studentLoan =
    slThreshold !== null ? Math.max(0, gross - slThreshold) * 0.09 : 0

  const pension = gross * (pensionPct / 100)
  const net = gross - tax - ni - studentLoan - pension

  return { tax, ni, studentLoan, pension, net }
}
