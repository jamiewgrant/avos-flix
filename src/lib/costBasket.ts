import type { Series } from "../types/series"
import { computeTaxNI, autoEnrolPensionPct, defaultGraduatePlan } from "./taxModel"

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
    driverId: "food-cpi",
    hint: "Food and household goods. Driven by the ONS CPIH food & non-alcoholic beverages sub-index — food rose ~39% from 2015 to 2023, vs 29% for headline CPIH. The 2022-23 spike is now properly captured.",
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

// ---------- Wage benchmarks ----------

export type WageBenchmarkId = "ashe-ft" | "gdhi" | "grad"

export interface WageBenchmark {
  id: WageBenchmarkId
  shortLabel: string
  label: string
  description: string
  seriesId: string
  // GDHI is already post-tax disposable income — skip deduction model.
  isAlreadyNet: boolean
}

export const WAGE_BENCHMARKS: WageBenchmark[] = [
  {
    id: "ashe-ft",
    shortLabel: "ASHE FT",
    label: "ASHE full-time median",
    description: "ONS median gross pay for full-time employees. The highest benchmark — excludes part-time workers (~25% of workforce) and self-employed (~15%).",
    seriesId: "median-wage",
    isAlreadyNet: false,
  },
  {
    id: "gdhi",
    shortLabel: "GDHI / head",
    label: "ONS GDHI per head",
    description: "ONS Household Disposable Income per adult, averaged across everyone — full-time, part-time, self-employed, and non-working. Already post-tax.",
    seriesId: "household-income",
    isAlreadyNet: true,
  },
  {
    id: "grad",
    shortLabel: "Grad entry",
    label: "Graduate starting salary",
    description: "HECSU/ISE median graduate starting salary — the floor for a graduate household before pay grows with experience. Most conservative for an early-career young family.",
    seriesId: "grad-salary",
    isAlreadyNet: false,
  },
]

export function wageBenchmarkById(id: WageBenchmarkId): WageBenchmark {
  return WAGE_BENCHMARKS.find((b) => b.id === id) ?? WAGE_BENCHMARKS[0]
}

export type PersonaId = "settled" | "young-family"

export interface Persona {
  id: PersonaId
  label: string
  shortLabel: string
  description: string
  layers: CostLayer[]
  hasStudentLoan: boolean
  hasAutoEnrolPension: boolean
  defaultEarners: 1 | 2
  defaultWageBenchmark: WageBenchmarkId
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
    defaultWageBenchmark: "ashe-ft",
  },
  {
    id: "young-family",
    label: "Young graduate family — one under-2 in nursery, Plan 2 loan, auto-enrolled",
    shortLabel: "Young family",
    description: "Post-2012 graduates, one under-2 in full-time nursery, Plan 2 student loans, auto-enrolled pension.",
    layers: [...BASE_LAYERS, CHILDCARE_LAYER],
    hasStudentLoan: true,
    hasAutoEnrolPension: true,
    defaultEarners: 2,
    defaultWageBenchmark: "gdhi",
  },
]

export function personaById(id: PersonaId): Persona {
  return PERSONAS.find((p) => p.id === id) ?? PERSONAS[0]
}

// ---------- UK tax / NI / SL / pension model ----------
// The canonical implementation lives in ./taxModel.ts. This module exposes
// a thin wrapper that maps the boolean has-loan / has-auto-enrol options
// used by the chart views to the parameters taxModel.computeTaxNI expects.

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
  const plan = opts.hasStudentLoan ? defaultGraduatePlan(year) : "none"
  const pensionPct = opts.hasAutoEnrolPension ? autoEnrolPensionPct(year) : 0
  const r = computeTaxNI(gross, year, plan, pensionPct)
  return { gross, ...r }
}

export interface StackPoint {
  year: number
  layers: Record<string, number>
  total: number
}

export type MortgageRegion = "national" | "london" | "northeast"

// Synthesize a first-time-buyer mortgage payment series from a chosen house
// price series + Bank Rate. Assumes 15% deposit, 25-year term, rate = Bank Rate + 1.5pp.
function syntheticMortgageFtb(
  series: Record<string, Series>,
  hpSeriesId = "house-price-landreg",
): Series | null {
  const hp = series[hpSeriesId] || series["house-price-nationwide"]
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

const REGION_HP_SERIES: Record<MortgageRegion, string> = {
  national: "house-price-landreg",
  london: "house-price-london",
  northeast: "house-price-northeast",
}

export function buildStack(
  rawSeries: Record<string, Series>,
  layers: CostLayer[] = BASE_LAYERS,
  opts: { housingMode?: "mortgage" | "rent"; mortgageRegion?: MortgageRegion } = {},
): StackPoint[] {
  const { housingMode = "mortgage", mortgageRegion = "national" } = opts
  const series: Record<string, Series> = { ...rawSeries }

  // Synthesize the appropriate mortgage series based on region.
  const hpSeriesId = REGION_HP_SERIES[mortgageRegion]
  const mortgage = syntheticMortgageFtb(rawSeries, hpSeriesId)
  if (mortgage) series["mortgage-payment-ftb"] = mortgage

  // Apply housing mode override — swap mortgage driver for rent index.
  if (housingMode === "rent") {
    layers = layers.map((layer) => {
      if (layer.id === "housing") {
        return {
          ...layer,
          label: "Housing — private rental",
          driverId: "rent-index",
          // refValue stays at 9000 — both mortgage payment and private rent
          // were ~£9k/yr in 2015.
        }
      }
      return layer
    })
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

// Net-of-deductions wage line. `earners` multiplies net pay to represent
// a household with multiple full-time earners on the same gross wage.
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

export interface WagePoint {
  year: number
  value: number
  // Per-earner gross and net for tooltip display.
  grossPerEarner: number
  netPerEarner: number
  // Only set when deductions were modelled (isAlreadyNet=false).
  breakdown: NetPayBreakdown | null
}

// Single entry-point that handles all three wage benchmarks.
// For GDHI (isAlreadyNet=true) the series value is already disposable;
// deductions are not applied. For ASHE-FT and grad, the tax model runs.
export function resolveWageLine(
  allSeries: Record<string, Series>,
  benchmark: WageBenchmark,
  deductionOpts: { hasStudentLoan?: boolean; hasAutoEnrolPension?: boolean },
  earners: number,
): WagePoint[] {
  const src = allSeries[benchmark.seriesId]
  if (!src) return []
  return src.points.map((p) => {
    if (benchmark.isAlreadyNet) {
      return {
        year: p.year,
        value: p.value * earners,
        grossPerEarner: p.value,
        netPerEarner: p.value,
        breakdown: null,
      }
    }
    const b = netPayDetail(p.value, p.year, deductionOpts)
    return {
      year: p.year,
      value: b.net * earners,
      grossPerEarner: b.gross,
      netPerEarner: b.net,
      breakdown: b,
    }
  })
}

// Back-compat alias — used by other parts of the app that only need
// the settled-persona net wage.
export function wageLine(
  wage: Series,
): Array<{ year: number; value: number }> {
  return netWageLine(wage, { hasStudentLoan: false, hasAutoEnrolPension: false }).map(
    (p) => ({ year: p.year, value: p.value }),
  )
}

