import type { Series } from "../types/series"

// A "typical UK household basket" of cost categories. £ values for the
// REFERENCE_YEAR are calibrated to roughly match an ONS Family Spending
// Survey middle quintile; every other year is scaled by the corresponding
// indicator series.
//
// Two personas are exposed: a "settled" household (no kids in nursery,
// no graduate debt, no auto-enrol pension because pre-dates 2012) and a
// "young family" household — graduate, one under-2 in full-time nursery,
// repaying a Plan 2 loan, auto-enrolled pension. Same gross wage; the
// persona changes deductions and which basket layers apply.

export const REFERENCE_YEAR = 2015

export interface CostLayer {
  id: string
  label: string
  color: string
  refValue: number
  driverId: string
  hint?: string
}

const BASE_LAYERS: CostLayer[] = [
  {
    id: "housing",
    label: "Housing — FTB mortgage payment",
    color: "#a78bfa",
    refValue: 9000,
    driverId: "mortgage-payment-ftb",
    hint: "Annual mortgage payment for a first-time buyer on the average UK house: 15% deposit, 25-year term, rate = Bank Rate + 1.5%. Captures the combined squeeze of house prices AND interest rates.",
  },
  {
    id: "energy",
    label: "Energy",
    color: "#f43f5e",
    refValue: 1256,
    driverId: "energy-cost",
  },
  {
    id: "water",
    label: "Water + sewerage",
    color: "#38bdf8",
    refValue: 415,
    driverId: "cpih",
    hint: "Average household water and sewerage bill. Scaled by CPIH as a conservative proxy — Ofwat-regulated bills have grown roughly in line with inflation.",
  },
  {
    id: "council-tax",
    label: "Council tax",
    color: "#84cc16",
    refValue: 1484,
    driverId: "council-tax",
  },
  {
    id: "transport",
    label: "Transport (rail, bus, car running)",
    color: "#22d3ee",
    refValue: 2500,
    driverId: "rail-fares",
    hint: "Rail fare index used as the driver but the £ value covers the broader transport bill (rail, bus, car running costs). A conservative proxy — car insurance has actually risen far faster than rail fares.",
  },
  {
    id: "comms",
    label: "Broadband + mobile",
    color: "#94a3b8",
    refValue: 480,
    driverId: "cpih",
    hint: "Home broadband + one mobile contract. Tracked by CPIH; in reality didn't really exist as a household bill before ~2000.",
  },
  {
    id: "groceries",
    label: "Groceries + everyday goods",
    color: "#eab308",
    refValue: 5200,
    driverId: "cpih",
    hint: "Food, household goods, clothing. Scaled by CPIH — food prices specifically rose 20%+ in 2022-23 alone, so this is conservative.",
  },
]

const CHILDCARE_LAYER: CostLayer = {
  id: "childcare",
  label: "Childcare (one under-2 in nursery)",
  color: "#fb923c",
  // Coram 2015 weekly = £222 × 50 = £11,100. Use as ref value direct.
  refValue: 11100,
  driverId: "childcare-cost",
  hint: "Full-time nursery for a child under 2. Pre-1998 the cost (and the dual-earner norm) barely existed.",
}

// COST_LAYERS exported for back-compat with the legacy headline summary.
export const COST_LAYERS: CostLayer[] = BASE_LAYERS

export type PersonaId = "settled" | "young-family"

export interface Persona {
  id: PersonaId
  label: string
  shortLabel: string
  description: string
  layers: CostLayer[]
  hasStudentLoan: boolean
  hasAutoEnrolPension: boolean
  // Default number of earners for this persona's household income.
  defaultEarners: 1 | 2
}

export const PERSONAS: Persona[] = [
  {
    id: "settled",
    label: "Settled household — no kids in nursery, no graduate debt",
    shortLabel: "Settled",
    description: "Pre-1998 graduate or no degree, no children under 5, opted out of auto-enrolment. Tax + NI only.",
    layers: BASE_LAYERS,
    hasStudentLoan: false,
    hasAutoEnrolPension: false,
    defaultEarners: 1,
  },
  {
    id: "young-family",
    label: "Young graduate family — one under-2 in nursery, Plan 2 loan, auto-enrolled",
    shortLabel: "Young family",
    description: "Both parents work full-time at median wage (they have to — nursery costs nearly a full salary). Post-2012 graduates, Plan 2 student loans, auto-enrolled pension.",
    layers: [...BASE_LAYERS, CHILDCARE_LAYER],
    hasStudentLoan: true,
    hasAutoEnrolPension: true,
    defaultEarners: 2,
  },
]

export function personaById(id: PersonaId): Persona {
  return PERSONAS.find((p) => p.id === id) ?? PERSONAS[0]
}

// ---------- UK tax / NI / SL / pension model (approximate, year-aware) ----------

interface TaxYear {
  personalAllowance: number
  basicRate: number
  basicBandTop: number
  higherRate: number
  niPrimaryThreshold: number
  niMainRate: number
  studentLoanThreshold: number | null
  studentLoanRate: number
  pensionEmployeeRate: number
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

function taxYear(year: number): TaxYear {
  const personalAllowance = interp(year, PA_ANCHORS)
  // Basic rate: 25% → 24% → 23% → 22% → 20%
  const basicRate =
    year < 1996 ? 0.25 : year < 1997 ? 0.24 : year < 2000 ? 0.23 : year < 2008 ? 0.22 : 0.20
  // NI main rate: 9% historically → 11% in 2003 → 12% in 2011 → 13.25% briefly → back to 12% → 10% → 8%
  const niMainRate =
    year < 2003 ? 0.09
    : year < 2011 ? 0.11
    : year < 2022 ? 0.12
    : year < 2024 ? 0.12
    : year < 2025 ? 0.10
    : 0.08
  // Student loan: Plan 1 threshold from 1998 (~£10k rising), Plan 2 from 2012 (£21k rising to £27,295).
  const studentLoanThreshold =
    year < 1998 ? null
    : year < 2005 ? 10000
    : year < 2012 ? 15000
    : year < 2016 ? 21000
    : year < 2022 ? 25000
    : 27295
  // Pension auto-enrolment: 0% before Oct 2012, 1% then, 3% from Apr 2018, 5% from Apr 2019.
  const pensionEmployeeRate =
    year < 2013 ? 0 : year < 2018 ? 0.01 : year < 2019 ? 0.03 : 0.05

  return {
    personalAllowance,
    basicRate,
    basicBandTop: 50270,
    higherRate: 0.40,
    niPrimaryThreshold: interp(year, NI_PT_ANCHORS),
    niMainRate,
    studentLoanThreshold,
    studentLoanRate: 0.09,
    pensionEmployeeRate,
  }
}

export interface NetPayBreakdown {
  gross: number
  tax: number
  ni: number
  studentLoan: number
  pension: number
  net: number
}

export function netPayDetail(
  gross: number,
  year: number,
  opts: { hasStudentLoan?: boolean; hasAutoEnrolPension?: boolean },
): NetPayBreakdown {
  const ty = taxYear(year)
  const taxable = Math.max(0, gross - ty.personalAllowance)
  const basicBand = Math.max(0, ty.basicBandTop - ty.personalAllowance)
  const tax =
    Math.min(taxable, basicBand) * ty.basicRate +
    Math.max(0, taxable - basicBand) * ty.higherRate
  const ni = Math.max(0, gross - ty.niPrimaryThreshold) * ty.niMainRate
  const studentLoan =
    opts.hasStudentLoan && ty.studentLoanThreshold != null
      ? Math.max(0, gross - ty.studentLoanThreshold) * ty.studentLoanRate
      : 0
  const pension = opts.hasAutoEnrolPension ? gross * ty.pensionEmployeeRate : 0
  const net = gross - tax - ni - studentLoan - pension
  return { gross, tax, ni, studentLoan, pension, net }
}

export interface StackPoint {
  year: number
  layers: Record<string, number>
  total: number
}

// Synthesize a first-time-buyer mortgage payment series from house
// prices + Bank Rate. Assumes 15% deposit, 25-year term, mortgage rate
// = Bank Rate + 1.5pp margin. This captures the combined effect of
// rising house prices AND rising interest rates — the actual mortgage
// squeeze, which the rent index alone misses.
function syntheticMortgageFtb(series: Record<string, Series>): Series | null {
  const hp = series["house-price-landreg"] || series["house-price-nationwide"]
  const rate = series["boe-rate"]
  if (!hp || !rate) return null
  const rateMap = new Map(rate.points.map((p) => [p.year, p.value]))
  const TERM_MONTHS = 25 * 12
  const DEPOSIT = 0.15
  const MARGIN = 1.5
  const points = hp.points
    .filter((p) => rateMap.has(p.year))
    .map((p) => {
      const annualRate = (rateMap.get(p.year)! + MARGIN) / 100
      const loan = p.value * (1 - DEPOSIT)
      const m = annualRate / 12
      const monthly =
        m === 0
          ? loan / TERM_MONTHS
          : (loan * m * Math.pow(1 + m, TERM_MONTHS)) / (Math.pow(1 + m, TERM_MONTHS) - 1)
      return { year: p.year, value: monthly * 12 }
    })
  return {
    id: "mortgage-payment-ftb",
    name: "First-time buyer mortgage payment (synthesized)",
    unit: "GBP",
    color: "#a78bfa",
    source: hp.source,
    region: hp.region,
    points,
  }
}

export function buildStack(
  rawSeries: Record<string, Series>,
  layers: CostLayer[] = BASE_LAYERS,
): StackPoint[] {
  // Inject synthesized drivers if any layer needs them.
  const series: Record<string, Series> = { ...rawSeries }
  if (!series["mortgage-payment-ftb"]) {
    const m = syntheticMortgageFtb(rawSeries)
    if (m) series["mortgage-payment-ftb"] = m
  }

  const driverMaps = new Map<string, Map<number, number>>()
  for (const layer of layers) {
    const s = series[layer.driverId]
    if (!s) continue
    driverMaps.set(layer.id, new Map(s.points.map((p) => [p.year, p.value])))
  }

  const refValues = new Map<string, number>()
  for (const layer of layers) {
    const m = driverMaps.get(layer.id)
    const ref = m?.get(REFERENCE_YEAR)
    if (m && ref && ref !== 0) refValues.set(layer.id, ref)
  }

  const years = new Set<number>()
  let first = true
  for (const layer of layers) {
    const m = driverMaps.get(layer.id)
    if (!m) continue
    if (first) {
      for (const y of m.keys()) years.add(y)
      first = false
    } else {
      for (const y of [...years]) if (!m.has(y)) years.delete(y)
    }
  }

  const sortedYears = [...years].sort((a, b) => a - b)
  const out: StackPoint[] = []
  for (const year of sortedYears) {
    const layerVals: Record<string, number> = {}
    let total = 0
    for (const layer of layers) {
      const m = driverMaps.get(layer.id)
      const ref = refValues.get(layer.id)
      const v = m?.get(year)
      if (!m || !ref || v === undefined) continue
      const scaled = layer.refValue * (v / ref)
      layerVals[layer.id] = scaled
      total += scaled
    }
    if (Object.keys(layerVals).length === layers.length) {
      out.push({ year, layers: layerVals, total })
    }
  }
  return out
}

// Net-of-deductions wage line for a given persona. Replaces the old
// flat `gross × 0.78` proxy with year-aware tax/NI/SL/pension.
// `earners` multiplies the resulting net pay to represent a household
// with multiple full-time earners (all on the same gross wage).
export function netWageLine(
  wage: Series,
  opts: { hasStudentLoan?: boolean; hasAutoEnrolPension?: boolean; earners?: number } = {},
): Array<{ year: number; value: number; breakdown: NetPayBreakdown }> {
  const earners = opts.earners ?? 1
  return wage.points.map((p) => {
    const b = netPayDetail(p.value, p.year, opts)
    return { year: p.year, value: b.net * earners, breakdown: b }
  })
}

// Back-compat alias used by old callers — keep so any other code path
// still resolves. Equivalent to settled-persona net.
export function wageLine(
  wage: Series,
): Array<{ year: number; value: number }> {
  return netWageLine(wage, { hasStudentLoan: false, hasAutoEnrolPension: false }).map(
    (p) => ({ year: p.year, value: p.value }),
  )
}
