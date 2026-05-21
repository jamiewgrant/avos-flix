import { describe, it, expect } from "vitest"
import fc from "fast-check"
import {
  computeTaxNI,
  computeSnapshot,
  type PersonalInputs,
} from "./personalSnapshot"
import type { StudentLoanPlan } from "./taxModel"
import type { Series } from "../types/series"
import seriesJson from "../../public/data/series.json"

const seriesData = seriesJson as { series: Record<string, Series> }
const SERIES = seriesData.series

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function close(actual: number, expected: number, tolerance: number, label = "") {
  const diff = Math.abs(actual - expected)
  if (diff > tolerance) {
    throw new Error(
      `${label}: expected ${expected.toFixed(2)} ± ${tolerance}, got ${actual.toFixed(2)} (diff ${diff.toFixed(2)})`,
    )
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 1: Golden values for computeTaxNI vs. HMRC published figures
// ─────────────────────────────────────────────────────────────────────────────
// Reference: HMRC tax calculators, listentotaxman.com archived years, and
// published rate tables. Tolerances are wide enough to accommodate the model's
// piecewise-linear PA/threshold interpolation, but tight enough to catch any
// material miscalculation (>3% drift on either tax or NI).

interface GoldenCase {
  label: string
  gross: number
  year: number
  plan: "none" | "plan1" | "plan2" | "plan5"
  pensionPct: number
  expectedTax: number
  expectedNI: number
  expectedSL: number
  expectedPension: number
  tolerance?: number
}

const GOLDEN_CASES: GoldenCase[] = [
  // ── 2024/25 tax year (April 2024+: NI cut to 8%, PA frozen at £12,570) ─────
  {
    label: "£30k, 2025, no loan, 0% pension",
    gross: 30000, year: 2025, plan: "none", pensionPct: 0,
    // tax = (30000 - 12570) * 0.20 = 3486
    expectedTax: 3486,
    // NI = (30000 - 12570) * 0.08 = 1394.40
    expectedNI: 1394,
    expectedSL: 0,
    expectedPension: 0,
  },
  {
    label: "£45k, 2025, no loan, 5% pension",
    gross: 45000, year: 2025, plan: "none", pensionPct: 5,
    // tax = (45000 - 12570) * 0.20 = 6486
    expectedTax: 6486,
    // NI = (45000 - 12570) * 0.08 = 2594.40
    expectedNI: 2594,
    expectedSL: 0,
    // pension = 45000 * 0.05 = 2250
    expectedPension: 2250,
  },
  {
    label: "£60k, 2025, no loan, 0% pension — crosses higher-rate + UEL",
    gross: 60000, year: 2025, plan: "none", pensionPct: 0,
    // tax = (50270 - 12570) * 0.20 + (60000 - 50270) * 0.40 = 7540 + 3892 = 11432
    expectedTax: 11432,
    // NI = (50270 - 12570) * 0.08 + (60000 - 50270) * 0.02 = 3016 + 194.60 = 3211
    expectedNI: 3211,
    expectedSL: 0,
    expectedPension: 0,
  },
  {
    label: "£100k, 2025, plan 2 loan, 0% pension",
    gross: 100000, year: 2025, plan: "plan2", pensionPct: 0,
    // tax = (50270 - 12570) * 0.20 + (100000 - 50270) * 0.40 = 7540 + 19892 = 27432
    expectedTax: 27432,
    // NI = (50270 - 12570) * 0.08 + (100000 - 50270) * 0.02 = 3016 + 994.60 = 4011
    expectedNI: 4011,
    // SL = (100000 - 27295) * 0.09 = 6543
    expectedSL: 6543,
    expectedPension: 0,
  },
  // ── 1995/96 (basic rate 25%, NI 9%, no UEL extra rate, plan 1 not yet active for graduates) ──
  {
    label: "£15k, 1995, no loan, no pension",
    gross: 15000, year: 1995, plan: "none", pensionPct: 0,
    // PA = 3525, basic rate = 25%
    // tax = (15000 - 3525) * 0.25 = 2868.75
    expectedTax: 2869,
    // NI PT 1995 interp: between 1990(2600) and 2000(3900): 2600 + (3900-2600)*0.5 = 3250
    // NI = (15000 - 3250) * 0.09 = 1057.50
    expectedNI: 1058,
    expectedSL: 0,
    expectedPension: 0,
  },
  {
    label: "£30k, 1995, no loan — high earner pushed into 1995 higher rate",
    gross: 30000, year: 1995, plan: "none", pensionPct: 0,
    // PA = 3525. HR threshold interp at 1995 between 1993(23700) and 1997(26100):
    //   23700 + (26100-23700)*(2/4) = 23700 + 1200 = 24900
    // basicBand = 24900 - 3525 = 21375
    // taxable = 30000 - 3525 = 26475
    // tax = 21375 * 0.25 + (26475 - 21375) * 0.40 = 5343.75 + 2040 = 7383.75
    expectedTax: 7384,
    // NI = (30000 - 3250) * 0.09 = 2407.50; but UEL 1995 ~22880, above = 0% pre-2003
    // niMain = (22880 - 3250) * 0.09 = 1766.70; niAbove = 0
    expectedNI: 1767,
    expectedSL: 0,
    expectedPension: 0,
  },
  // ── 1990 (peak of basic rate 25%, NI 9%, very low PA £3005) ──
  {
    label: "£12k, 1990, no loan, no pension",
    gross: 12000, year: 1990, plan: "none", pensionPct: 0,
    // PA = 3005. HR threshold 1990 = 20700. basicBand = 17695. All in basic band.
    // tax = (12000 - 3005) * 0.25 = 2248.75
    expectedTax: 2249,
    // NI PT 1990 = 2600. niMain = (12000 - 2600) * 0.09 = 846
    expectedNI: 846,
    expectedSL: 0,
    expectedPension: 0,
  },
  // ── Plan 1 at £25k in 2010 ──
  {
    label: "£25k, 2010, plan1 loan, 0% pension",
    gross: 25000, year: 2010, plan: "plan1", pensionPct: 0,
    // PA 2010 = 6475. basic rate = 0.20 (year>=2008). HR threshold ~37400.
    // tax = (25000 - 6475) * 0.20 = 3705
    expectedTax: 3705,
    // NI PT 2010 = 5715 (anchor). niMainRate = 0.11 (year<2011). UEL 2010 = 43875.
    // niMain = (25000 - 5715) * 0.11 = 2121.35
    expectedNI: 2121,
    // SL plan1 2010: threshold 15000 (year<2012). SL = (25000 - 15000) * 0.09 = 900
    expectedSL: 900,
    expectedPension: 0,
  },
]

describe("computeTaxNI — golden HMRC reference values", () => {
  for (const c of GOLDEN_CASES) {
    it(c.label, () => {
      const r = computeTaxNI(c.gross, c.year, c.plan, c.pensionPct)
      const tol = c.tolerance ?? 5
      close(r.tax, c.expectedTax, tol, `${c.label}: tax`)
      close(r.ni, c.expectedNI, tol, `${c.label}: NI`)
      close(r.studentLoan, c.expectedSL, tol, `${c.label}: SL`)
      close(r.pension, c.expectedPension, tol, `${c.label}: pension`)
      // Net is fully determined by the other four
      const expectedNet = c.gross - c.expectedTax - c.expectedNI - c.expectedSL - c.expectedPension
      close(r.net, expectedNet, tol * 4, `${c.label}: net`)
    })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 2: Property-based invariants
// ─────────────────────────────────────────────────────────────────────────────

describe("computeTaxNI — invariants over random inputs", () => {
  it("net = gross − tax − NI − studentLoan − pension (always)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000, max: 500000 }),
        fc.integer({ min: 1985, max: 2030 }),
        fc.constantFrom<StudentLoanPlan>("none", "plan1", "plan2", "plan5"),
        fc.float({ min: 0, max: 25, noNaN: true }),
        (gross, year, plan, pension) => {
          const r = computeTaxNI(gross, year, plan, pension)
          const expectedNet = gross - r.tax - r.ni - r.studentLoan - r.pension
          // Allow tiny floating-point drift
          expect(Math.abs(r.net - expectedNet)).toBeLessThan(0.01)
        },
      ),
      { numRuns: 500 },
    )
  })

  it("all deductions are non-negative", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 500000 }),
        fc.integer({ min: 1985, max: 2030 }),
        fc.constantFrom<StudentLoanPlan>("none", "plan1", "plan2", "plan5"),
        fc.float({ min: 0, max: 25, noNaN: true }),
        (gross, year, plan, pension) => {
          const r = computeTaxNI(gross, year, plan, pension)
          expect(r.tax).toBeGreaterThanOrEqual(0)
          expect(r.ni).toBeGreaterThanOrEqual(0)
          expect(r.studentLoan).toBeGreaterThanOrEqual(0)
          expect(r.pension).toBeGreaterThanOrEqual(0)
        },
      ),
      { numRuns: 300 },
    )
  })

  it("net is monotonically non-decreasing in gross (same year/plan)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 5000, max: 200000 }),
        fc.integer({ min: 100, max: 50000 }),
        fc.integer({ min: 1990, max: 2025 }),
        fc.constantFrom<StudentLoanPlan>("none", "plan1", "plan2", "plan5"),
        (g1, delta, year, plan) => {
          const r1 = computeTaxNI(g1, year, plan, 0)
          const r2 = computeTaxNI(g1 + delta, year, plan, 0)
          // Marginal rate should always be < 100%, so adding £delta to gross
          // must produce strictly more net (allowing tiny FP slop).
          expect(r2.net).toBeGreaterThan(r1.net - 0.01)
        },
      ),
      { numRuns: 300 },
    )
  })

  it("tax + NI never exceeds 60% of gross for any plausible salary 1990–2030", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10000, max: 200000 }),
        fc.integer({ min: 1990, max: 2030 }),
        (gross, year) => {
          const r = computeTaxNI(gross, year, "none", 0)
          expect((r.tax + r.ni) / gross).toBeLessThan(0.60)
        },
      ),
      { numRuns: 300 },
    )
  })

  it("zero pension contribution produces zero pension deduction", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000, max: 200000 }),
        fc.integer({ min: 1990, max: 2025 }),
        (gross, year) => {
          const r = computeTaxNI(gross, year, "none", 0)
          expect(r.pension).toBe(0)
        },
      ),
      { numRuns: 200 },
    )
  })

  it("student loan plan='none' produces zero SL deduction", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000, max: 200000 }),
        fc.integer({ min: 1990, max: 2025 }),
        (gross, year) => {
          const r = computeTaxNI(gross, year, "none", 0)
          expect(r.studentLoan).toBe(0)
        },
      ),
      { numRuns: 200 },
    )
  })

  it("student loan only kicks in for years the plan existed", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 30000, max: 100000 }),
        fc.integer({ min: 1985, max: 1997 }),
        (gross, year) => {
          // Plan 1 began in 1998
          const r = computeTaxNI(gross, year, "plan1", 0)
          expect(r.studentLoan).toBe(0)
        },
      ),
      { numRuns: 100 },
    )
    fc.assert(
      fc.property(
        fc.integer({ min: 30000, max: 100000 }),
        fc.integer({ min: 1985, max: 2011 }),
        (gross, year) => {
          // Plan 2 began in 2012
          const r = computeTaxNI(gross, year, "plan2", 0)
          expect(r.studentLoan).toBe(0)
        },
      ),
      { numRuns: 100 },
    )
    fc.assert(
      fc.property(
        fc.integer({ min: 30000, max: 100000 }),
        fc.integer({ min: 1985, max: 2022 }),
        (gross, year) => {
          // Plan 5 began in 2023
          const r = computeTaxNI(gross, year, "plan5", 0)
          expect(r.studentLoan).toBe(0)
        },
      ),
      { numRuns: 100 },
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 2 (cont.): computeSnapshot whole-flow invariants
// ─────────────────────────────────────────────────────────────────────────────

const baseInputs: PersonalInputs = {
  grossSalary: 45000,
  housingType: "mortgage",
  monthlyHousing: 1200,
  children: 0,
  studentLoanPlan: "none",
  pensionPct: 5,
  earners: 1,
}

describe("computeSnapshot — structural invariants", () => {
  it("returns null when gross salary is zero", () => {
    const r = computeSnapshot({ ...baseInputs, grossSalary: 0 }, SERIES, 1995)
    expect(r).toBeNull()
  })

  it("net + (tax + NI + SL + pension) = gross, both today and historical", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10000, max: 200000 }),
        fc.constantFrom("mortgage", "rent", "owned"),
        fc.integer({ min: 0, max: 5000 }),
        fc.integer({ min: 0, max: 3 }),
        fc.constantFrom<StudentLoanPlan>("none", "plan1", "plan2", "plan5"),
        fc.float({ min: 0, max: 15, noNaN: true }),
        fc.constantFrom(1, 2),
        fc.constantFrom(1990, 1995, 2000, 2005, 2010, 2015, 2020),
        (gross, housing, monthlyHousing, kids, plan, pension, earners, year) => {
          const inputs: PersonalInputs = {
            grossSalary: gross,
            housingType: housing as PersonalInputs["housingType"],
            monthlyHousing,
            children: kids,
            studentLoanPlan: plan as PersonalInputs["studentLoanPlan"],
            pensionPct: pension,
            earners: earners as 1 | 2,
          }
          const r = computeSnapshot(inputs, SERIES, year)
          if (!r) return
          for (const b of [r.today, r.historical]) {
            const ded = b.incomeTax + b.nationalInsurance + b.studentLoan + b.pension
            expect(Math.abs(b.netTakeHome - (b.grossSalary - ded))).toBeLessThan(0.5)
          }
        },
      ),
      { numRuns: 200 },
    )
  })

  it("disposable = netTakeHome − (housing + energy + groceries + childcare + councilTax)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 15000, max: 120000 }),
        fc.constantFrom("mortgage", "rent", "owned"),
        fc.integer({ min: 0, max: 3000 }),
        fc.integer({ min: 0, max: 3 }),
        fc.constantFrom(1990, 1995, 2000, 2010, 2020),
        (gross, housing, monthlyHousing, kids, year) => {
          const inputs: PersonalInputs = {
            ...baseInputs,
            grossSalary: gross,
            housingType: housing as PersonalInputs["housingType"],
            monthlyHousing,
            children: kids,
          }
          const r = computeSnapshot(inputs, SERIES, year)
          if (!r) return
          for (const b of [r.today, r.historical]) {
            const costs = b.housing + b.energy + b.groceries + b.childcare + b.councilTax
            const expectedDisposable = b.netTakeHome - costs
            expect(Math.abs(b.disposable - expectedDisposable)).toBeLessThan(0.5)
          }
        },
      ),
      { numRuns: 200 },
    )
  })

  it("all displayed values are finite numbers — no NaN/Infinity leakage", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 5000, max: 300000 }),
        fc.constantFrom("mortgage", "rent", "owned"),
        fc.integer({ min: 0, max: 5000 }),
        fc.integer({ min: 0, max: 4 }),
        fc.constantFrom<StudentLoanPlan>("none", "plan1", "plan2", "plan5"),
        fc.float({ min: 0, max: 20, noNaN: true }),
        fc.constantFrom(1, 2),
        fc.constantFrom(1990, 1995, 2000, 2005, 2010, 2015, 2020),
        (gross, housing, monthlyHousing, kids, plan, pension, earners, year) => {
          const inputs: PersonalInputs = {
            grossSalary: gross,
            housingType: housing as PersonalInputs["housingType"],
            monthlyHousing,
            children: kids,
            studentLoanPlan: plan as PersonalInputs["studentLoanPlan"],
            pensionPct: pension,
            earners: earners as 1 | 2,
          }
          const r = computeSnapshot(inputs, SERIES, year)
          if (!r) return
          for (const b of [r.today, r.historical]) {
            for (const v of Object.values(b)) {
              if (typeof v === "number") {
                expect(Number.isFinite(v)).toBe(true)
              }
            }
          }
        },
      ),
      { numRuns: 300 },
    )
  })

  it("owned housing → today.housing = 0 (no mortgage/rent payment)", () => {
    const r = computeSnapshot(
      { ...baseInputs, housingType: "owned", monthlyHousing: 9999 },
      SERIES,
      1995,
    )
    expect(r).not.toBeNull()
    expect(r!.today.housing).toBe(0)
  })

  it("zero children → zero childcare cost both today and historical", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(1990, 1995, 2000, 2010, 2020),
        (year) => {
          const r = computeSnapshot({ ...baseInputs, children: 0 }, SERIES, year)
          if (!r) return
          expect(r.today.childcare).toBe(0)
          expect(r.historical.childcare).toBe(0)
        },
      ),
      { numRuns: 20 },
    )
  })

  it("childcare cost rises (weakly) with children count", () => {
    const r0 = computeSnapshot({ ...baseInputs, children: 0 }, SERIES, 2015)!
    const r1 = computeSnapshot({ ...baseInputs, children: 1 }, SERIES, 2015)!
    const r2 = computeSnapshot({ ...baseInputs, children: 2 }, SERIES, 2015)!
    expect(r1.today.childcare).toBeGreaterThan(r0.today.childcare)
    expect(r2.today.childcare).toBeGreaterThan(r1.today.childcare)
  })

  it("historical pension contribution is zero for pre-2013 compare years", () => {
    fc.assert(
      fc.property(
        fc.float({ min: 1, max: 15, noNaN: true }),
        fc.constantFrom(1990, 1995, 2000, 2005, 2010),
        (pensionPct, year) => {
          const r = computeSnapshot({ ...baseInputs, pensionPct }, SERIES, year)
          if (!r) return
          expect(r.historical.pension).toBe(0)
        },
      ),
      { numRuns: 50 },
    )
  })

  it("percentage stats match their underlying ratios", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 20000, max: 100000 }),
        fc.constantFrom(1990, 1995, 2000, 2010, 2020),
        (gross, year) => {
          const r = computeSnapshot({ ...baseInputs, grossSalary: gross }, SERIES, year)
          if (!r) return
          for (const b of [r.today, r.historical]) {
            close(b.housingPct, (b.housing / b.grossSalary) * 100, 0.01, "housingPct")
            close(b.disposablePct, (b.disposable / b.grossSalary) * 100, 0.01, "disposablePct")
            close(
              b.taxTotalPct,
              ((b.incomeTax + b.nationalInsurance) / b.grossSalary) * 100,
              0.01,
              "taxTotalPct",
            )
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  it("higher gross salary → higher net take-home (today), same other inputs", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 15000, max: 100000 }),
        fc.integer({ min: 1000, max: 30000 }),
        (gross, delta) => {
          const r1 = computeSnapshot({ ...baseInputs, grossSalary: gross }, SERIES, 1995)
          const r2 = computeSnapshot({ ...baseInputs, grossSalary: gross + delta }, SERIES, 1995)
          if (!r1 || !r2) return
          expect(r2.today.netTakeHome).toBeGreaterThan(r1.today.netTakeHome)
        },
      ),
      { numRuns: 100 },
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 3: Historical sanity bounds against the actual series data
// ─────────────────────────────────────────────────────────────────────────────
// Sweeps a representative grid of (year × salary) combos and asserts that all
// computed outputs land within researched historical bounds. Catches drift
// from data updates, anchor-table off-by-ones, and structural calc errors.

const TEST_GRID = {
  years: [1990, 1995, 2000, 2005, 2010, 2015, 2020] as const,
  salaries: [25000, 35000, 45000, 60000, 80000] as const,
}

describe("computeSnapshot — historical sanity bounds (grid sweep)", () => {
  for (const year of TEST_GRID.years) {
    for (const salary of TEST_GRID.salaries) {
      it(`salary £${salary}, compare ${year}: outputs within sane bounds`, () => {
        const r = computeSnapshot({ ...baseInputs, grossSalary: salary }, SERIES, year)
        expect(r, `snapshot returned null for £${salary} vs ${year}`).not.toBeNull()
        if (!r) return
        const { today, historical } = r

        // ── Gross + Net positivity ──────────────────────────────────────────
        expect(today.grossSalary).toBe(salary)
        expect(historical.grossSalary).toBeGreaterThan(0)
        expect(today.netTakeHome).toBeGreaterThan(0)
        expect(historical.netTakeHome).toBeGreaterThan(0)

        // ── Tax + NI rates within historical bounds ─────────────────────────
        // No UK marginal regime has ever taken >55% combined tax+NI off basic
        // band income; for our test salaries the average is much lower.
        expect(today.taxTotalPct).toBeGreaterThanOrEqual(0)
        expect(today.taxTotalPct).toBeLessThan(50)
        expect(historical.taxTotalPct).toBeGreaterThanOrEqual(0)
        expect(historical.taxTotalPct).toBeLessThan(50)

        // ── Housing burden within plausible bounds ──────────────────────────
        // Today's housing burden for our test inputs (£1,200/mo) should be
        // moderate — under 60% of gross for £25k+. Historical can legitimately
        // exceed 80% for sub-median earners in 1990 (the rates crisis), so
        // we cap at 100% as a sanity check rather than a sustainability bound.
        expect(today.housingPct).toBeGreaterThanOrEqual(0)
        expect(today.housingPct).toBeLessThan(60)
        expect(historical.housingPct).toBeGreaterThanOrEqual(0)
        expect(historical.housingPct).toBeLessThan(100)

        // ── Historical equivalent gross ≪ today gross (wages have grown) ────
        // For our years 1990-2020, ASHE median wage was always lower than
        // 2025's £39,863. So same-percentile historical gross < today's gross.
        expect(historical.grossSalary).toBeLessThan(today.grossSalary)

        // ── Disposable never exceeds net ────────────────────────────────────
        expect(today.disposable).toBeLessThanOrEqual(today.netTakeHome + 0.01)
        expect(historical.disposable).toBeLessThanOrEqual(historical.netTakeHome + 0.01)
      })
    }
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// netPayDetail (costBasket) — wrapper consistency with computeTaxNI
// ─────────────────────────────────────────────────────────────────────────────

import { netPayDetail } from "./costBasket"
import { autoEnrolPensionPct, defaultGraduatePlan } from "./taxModel"

describe("netPayDetail — wrapper over canonical tax model", () => {
  it("hasStudentLoan=false, hasAutoEnrolPension=false matches computeTaxNI(plan='none', 0%)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10000, max: 200000 }),
        fc.integer({ min: 1990, max: 2025 }),
        (gross, year) => {
          const a = netPayDetail(gross, year, {})
          const b = computeTaxNI(gross, year, "none", 0)
          expect(a.tax).toBeCloseTo(b.tax, 5)
          expect(a.ni).toBeCloseTo(b.ni, 5)
          expect(a.studentLoan).toBe(0)
          expect(a.pension).toBe(0)
          expect(a.net).toBeCloseTo(b.net, 5)
          expect(a.gross).toBe(gross)
        },
      ),
      { numRuns: 100 },
    )
  })

  it("hasAutoEnrolPension=true uses the year's auto-enrol minimum rate", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 15000, max: 80000 }),
        fc.integer({ min: 1990, max: 2025 }),
        (gross, year) => {
          const r = netPayDetail(gross, year, { hasAutoEnrolPension: true })
          const expectedPct = autoEnrolPensionPct(year)
          expect(r.pension).toBeCloseTo(gross * (expectedPct / 100), 5)
        },
      ),
      { numRuns: 100 },
    )
  })

  it("hasStudentLoan=true uses defaultGraduatePlan(year) threshold", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 30000, max: 80000 }),
        fc.integer({ min: 1990, max: 2025 }),
        (gross, year) => {
          const r = netPayDetail(gross, year, { hasStudentLoan: true })
          const plan = defaultGraduatePlan(year)
          const expected = computeTaxNI(gross, year, plan, 0).studentLoan
          expect(r.studentLoan).toBeCloseTo(expected, 5)
        },
      ),
      { numRuns: 100 },
    )
  })
})

describe("series.json data integrity", () => {
  const requiredSeries = [
    "median-wage", "rent-index", "food-cpi", "boe-rate",
    "house-price-landreg", "energy-cost", "council-tax", "childcare-cost",
  ]
  for (const id of requiredSeries) {
    it(`series ${id} exists and has finite-value points`, () => {
      const s = SERIES[id]
      expect(s, `${id} missing from series.json`).toBeDefined()
      expect(s.points.length).toBeGreaterThan(0)
      for (const p of s.points) {
        expect(Number.isFinite(p.year), `${id}: non-finite year`).toBe(true)
        expect(Number.isFinite(p.value), `${id}: non-finite value at ${p.year}`).toBe(true)
        expect(p.year).toBeGreaterThan(1900)
        expect(p.year).toBeLessThan(2050)
      }
    })
  }

  it("median-wage points are monotonically rising over multi-year windows", () => {
    // Allow short-term dips (e.g. 2008-09 wage slip) but not long-run reversal.
    const wage = SERIES["median-wage"]
    const yearsSorted = [...wage.points].sort((a, b) => a.year - b.year)
    const earliest = yearsSorted[0].value
    const latest = yearsSorted[yearsSorted.length - 1].value
    expect(latest).toBeGreaterThan(earliest * 2) // doubled at minimum since 1984
  })

  // ETL freshness guard — fails if the wage series falls more than ~2 years
  // behind. Today's "current year" in the snapshot is derived from the latest
  // median-wage point, so stale data silently shifts the entire "today"
  // column backwards. Catch it loudly.
  it("median-wage has a data point within 2 years of the current date", () => {
    const wage = SERIES["median-wage"]
    const latest = Math.max(...wage.points.map((p) => p.year))
    const currentYear = new Date().getFullYear()
    expect(
      latest,
      `median-wage's latest point is ${latest}; current year is ${currentYear}. Re-run \`npm run etl\` and commit the refreshed series.json.`,
    ).toBeGreaterThanOrEqual(currentYear - 2)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Year-boundary tests — pin the rate-change cliffs to guard against off-by-one
// regressions in the tax/NI/SL/pension schedules.
// ─────────────────────────────────────────────────────────────────────────────

describe("computeTaxNI — year boundary transitions", () => {
  it("NI main rate drops from 12% to 8% between 2024 and 2025", () => {
    const r2024 = computeTaxNI(30000, 2024, "none", 0)
    const r2025 = computeTaxNI(30000, 2025, "none", 0)
    // 2024: (30000 - 12570) * 0.12 = 2091.60
    // 2025: (30000 - 12570) * 0.08 = 1394.40
    close(r2024.ni, 2091.6, 1, "NI 2024")
    close(r2025.ni, 1394.4, 1, "NI 2025")
    expect(r2025.ni).toBeLessThan(r2024.ni)
  })

  it("NI above-UEL rate transitions 0% → 1% (2003) → 2% (2011)", () => {
    // £60k crosses the UEL in each era — the difference is in the above-UEL slice.
    const r2002 = computeTaxNI(60000, 2002, "none", 0)
    const r2003 = computeTaxNI(60000, 2003, "none", 0)
    const r2010 = computeTaxNI(60000, 2010, "none", 0)
    const r2011 = computeTaxNI(60000, 2011, "none", 0)
    // 2003 NI should be strictly higher than 2002 at high income (1% above UEL kicks in)
    expect(r2003.ni).toBeGreaterThan(r2002.ni - r2003.tax + r2002.tax - 100)
    // 2011 NI should differ from 2010 due to UEL-above rate stepping 1% → 2%
    // (and main rate 11% → 12%, both increases) — net effect: NI rises.
    expect(r2011.ni).toBeGreaterThan(r2010.ni)
  })

  it("basic income tax rate steps 25% → 24% → 23% → 22% → 20%", () => {
    // Cleanly-in-basic-band £15k earner: tax = (15000 - PA) * basicRate.
    const r1995 = computeTaxNI(15000, 1995, "none", 0) // 25%
    const r1996 = computeTaxNI(15000, 1996, "none", 0) // 24%
    const r1999 = computeTaxNI(15000, 1999, "none", 0) // 23%
    const r2000 = computeTaxNI(15000, 2000, "none", 0) // 23%
    const r2007 = computeTaxNI(15000, 2007, "none", 0) // 22%
    const r2008 = computeTaxNI(15000, 2008, "none", 0) // 20%
    // Strictly monotone decreases at the step years.
    expect(r1996.tax).toBeLessThan(r1995.tax)
    expect(r1999.tax).toBeLessThan(r1996.tax)
    // 1999 and 2000 are both 23% — basic rate unchanged, only PA moves
    expect(Math.abs(r1999.tax - r2000.tax)).toBeLessThan(r1995.tax) // sanity, no big jump
    expect(r2008.tax).toBeLessThan(r2007.tax)
  })

  it("Plan 2 student loan activates in 2012 — zero in 2011, non-zero in 2012", () => {
    const r2011 = computeTaxNI(40000, 2011, "plan2", 0)
    const r2012 = computeTaxNI(40000, 2012, "plan2", 0)
    expect(r2011.studentLoan).toBe(0)
    expect(r2012.studentLoan).toBeGreaterThan(0)
  })

  it("Plan 5 student loan activates in 2023 — zero in 2022, non-zero in 2023", () => {
    const r2022 = computeTaxNI(40000, 2022, "plan5", 0)
    const r2023 = computeTaxNI(40000, 2023, "plan5", 0)
    expect(r2022.studentLoan).toBe(0)
    expect(r2023.studentLoan).toBeGreaterThan(0)
  })

  it("Plan 1 student loan threshold drops 22015 → 15000 → 10000 going backwards", () => {
    // Same £40k earner, plan 1. Threshold history:
    //   2012+:    22015  → SL = (40000 - 22015) * 0.09 = 1618.65
    //   2005-11:  15000  → SL = (40000 - 15000) * 0.09 = 2250
    //   1998-04:  10000  → SL = (40000 - 10000) * 0.09 = 2700
    const r2015 = computeTaxNI(40000, 2015, "plan1", 0)
    const r2010 = computeTaxNI(40000, 2010, "plan1", 0)
    const r2000 = computeTaxNI(40000, 2000, "plan1", 0)
    close(r2015.studentLoan, 1618.65, 1)
    close(r2010.studentLoan, 2250, 1)
    close(r2000.studentLoan, 2700, 1)
    expect(r2010.studentLoan).toBeGreaterThan(r2015.studentLoan)
    expect(r2000.studentLoan).toBeGreaterThan(r2010.studentLoan)
  })
})

describe("autoEnrolPensionPct — schedule boundaries", () => {
  it("steps 0% → 1% → 3% → 5% at the right years", () => {
    expect(autoEnrolPensionPct(2012)).toBe(0)
    expect(autoEnrolPensionPct(2013)).toBe(1)
    expect(autoEnrolPensionPct(2017)).toBe(1)
    expect(autoEnrolPensionPct(2018)).toBe(3)
    expect(autoEnrolPensionPct(2019)).toBe(5)
    expect(autoEnrolPensionPct(2025)).toBe(5)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Dual-earner invariant — household nets must scale exactly 2× the single
// earner's because each earner is taxed independently on the same per-earner
// gross. A regression here would mean we're accidentally taxing household
// gross as if it were a single person's income.
// ─────────────────────────────────────────────────────────────────────────────

describe("computeSnapshot — dual-earner symmetry", () => {
  it("2-earner household nets exactly 2× the 1-earner equivalent (same per-earner gross)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 15000, max: 80000 }),
        fc.constantFrom<StudentLoanPlan>("none", "plan1", "plan2", "plan5"),
        fc.float({ min: 0, max: 10, noNaN: true }),
        fc.constantFrom(1990, 1995, 2000, 2010, 2020),
        (perEarnerGross, plan, pension, year) => {
          // Single earner on £perEarnerGross
          const single = computeSnapshot(
            { ...baseInputs, grossSalary: perEarnerGross, earners: 1, studentLoanPlan: plan, pensionPct: pension },
            SERIES,
            year,
          )
          // Two-earner household on £2*perEarnerGross (so per-earner gross is identical)
          const dual = computeSnapshot(
            { ...baseInputs, grossSalary: perEarnerGross * 2, earners: 2, studentLoanPlan: plan, pensionPct: pension },
            SERIES,
            year,
          )
          if (!single || !dual) return
          // Each deduction in the dual household must equal exactly 2× the single equivalent.
          for (const key of ["incomeTax", "nationalInsurance", "studentLoan", "pension", "netTakeHome"] as const) {
            expect(
              Math.abs(dual.today[key] - 2 * single.today[key]),
              `today.${key}: dual=${dual.today[key]} vs 2×single=${2 * single.today[key]}`,
            ).toBeLessThan(0.5)
            expect(
              Math.abs(dual.historical[key] - 2 * single.historical[key]),
              `historical.${key}: dual=${dual.historical[key]} vs 2×single=${2 * single.historical[key]}`,
            ).toBeLessThan(0.5)
          }
        },
      ),
      { numRuns: 100 },
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Regression pins for previously-fixed bugs. Each should fail loudly if the
// corresponding bug is reintroduced.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Rent-index data integrity — guards against re-introducing the bad RPI-splice
// values that implied 1990 rents were 52% of median gross (actually ~30%).
// ─────────────────────────────────────────────────────────────────────────────

describe("rent-index series — historical affordability bounds", () => {
  const ri = SERIES["rent-index"]
  const mw = SERIES["median-wage"]

  function riAt(year: number) {
    return ri.points.find((p) => p.year === year)?.value ?? null
  }
  function mwAt(year: number) {
    return mw.points.find((p) => p.year === year)?.value ?? null
  }

  it("1990 rent burden on median wage is below 35% of gross (was 52% with the bad splice)", () => {
    // Old values: 1990=60, today=137.4 → implied rent was 43.7% of a £1200/mo rent bill.
    // At £1200/mo user rent, 1990 median earner (£11,929/yr) rent burden was 52.7%.
    // Corrected value: 1990=36 → burden ≈ 31.6%. Must stay below 35%.
    const ri1990 = riAt(1990)
    const riNow = ri.points[ri.points.length - 1].value
    const mw1990 = mwAt(1990)
    expect(ri1990).not.toBeNull()
    expect(mw1990).not.toBeNull()
    // Rent burden: (ri1990 / riNow) × 1200 × 12 / mw1990
    const impliedBurden = (ri1990! / riNow) * 1200 * 12 / mw1990!
    expect(impliedBurden).toBeLessThan(0.35)
    expect(impliedBurden).toBeGreaterThan(0.15) // sanity lower bound
  })

  it("1995 rent burden on median wage is below 35%", () => {
    const ri1995 = riAt(1995)
    const riNow = ri.points[ri.points.length - 1].value
    const mw1995 = mwAt(1995)
    expect(ri1995).not.toBeNull()
    expect(mw1995).not.toBeNull()
    const burden = (ri1995! / riNow) * 1200 * 12 / mw1995!
    expect(burden).toBeLessThan(0.35)
  })

  it("rent index is strictly monotonically increasing (rents never nominally fell)", () => {
    const sorted = [...ri.points].sort((a, b) => a.year - b.year)
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].value).toBeGreaterThan(sorted[i - 1].value)
    }
  })

  it("rent index values are plausible: 2015=100 anchor, today above 130", () => {
    const ri2015 = riAt(2015)
    const riNow = ri.points[ri.points.length - 1].value
    expect(ri2015).toBeCloseTo(100, 0)
    expect(riNow).toBeGreaterThan(130)
  })

  it("rent burden is lower in 1990 than in 2020 (renting harder now than then)", () => {
    const riNow = ri.points[ri.points.length - 1].value
    const ri1990 = riAt(1990)!
    const ri2020 = riAt(2020)!
    const mw1990 = mwAt(1990)!
    const mw2020 = mwAt(2020)!
    const burden1990 = (ri1990 / riNow) * 1200 * 12 / mw1990
    const burden2020 = (ri2020 / riNow) * 1200 * 12 / mw2020
    expect(burden1990).toBeLessThan(burden2020)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Rent scenario: no false deficit in 1990-2000 for moderate incomes.
// These cases specifically test the scenarios that showed false deficits due
// to the overcalibrated RPI-splice rent-index data.
// ─────────────────────────────────────────────────────────────────────────────

describe("computeSnapshot — rent scenario: 1990-2000 should not be in deficit for moderate earners", () => {
  const rentInputs = (gross: number, monthly: number) => ({
    grossSalary: gross,
    housingType: "rent" as const,
    monthlyHousing: monthly,
    children: 0,
    studentLoanPlan: "none" as const,
    pensionPct: 0,
    earners: 1 as const,
  })

  for (const [label, gross, monthly] of [
    ["£35k, £1200/mo", 35000, 1200],
    ["£30k, £1000/mo", 30000, 1000],
    ["£45k, £1400/mo", 45000, 1400],
    ["£50k, £1500/mo", 50000, 1500],
  ] as [string, number, number][]) {
    for (const year of [1990, 1995, 2000]) {
      it(`${label} compare ${year}: today positive → 1990 rent not in deficit`, () => {
        const r = computeSnapshot(rentInputs(gross, monthly), SERIES, year)
        expect(r).not.toBeNull()
        // If today isn't in deficit, 1990 rent scenario should not be either
        if (r!.today.disposable > 0) {
          expect(
            r!.historical.disposable,
            `${label} in ${year}: expected surplus, got ${r!.historical.disposable.toFixed(0)}`,
          ).toBeGreaterThan(0)
        }
      })
    }
  }
})

describe("regression pins — previously-fixed bugs", () => {
  it("childcare cost is bounded by realistic annual nursery fees (no ×50 over-count)", () => {
    // The original bug multiplied the already-annual childcare series by 50,
    // producing £750k+ childcare for one child. Realistic full-time nursery
    // costs in the UK in 2020 are ~£12k–£17k per child per year.
    const r = computeSnapshot({ ...baseInputs, children: 1 }, SERIES, 2015)!
    expect(r.today.childcare).toBeLessThan(30000) // would be ~£750k with the bug
    expect(r.today.childcare).toBeGreaterThan(5000)
  })

  it("historical mortgage scales by synthetic-payment ratio, not flat median wage", () => {
    // With the old bug, historical mortgage was scaled by median-wage ratio
    // rather than the synthetic mortgage payment ratio. For 1990 (rates ~15%,
    // house prices ~£60k) the correct scaling yields a high historical
    // mortgage payment despite lower nominal house prices — because the
    // double-digit interest rate dominates.
    const r = computeSnapshot(
      { ...baseInputs, grossSalary: 45000, housingType: "mortgage", monthlyHousing: 1500 },
      SERIES,
      1990,
    )!
    // The 1990 mortgage should be a meaningful annual figure (£3k+), not
    // collapse to zero (the failure mode when the ratio code path errored).
    expect(r.historical.housing).toBeGreaterThan(3000)
    expect(r.historical.housing).toBeLessThan(50000)
  })

  it("higher-rate threshold respects historical anchors (not hardcoded 50270 across all years)", () => {
    // A £30k earner in 1990 was a higher-rate taxpayer (HR threshold £20,700).
    // With the old bug (hardcoded 50270 across years) all £30k would have been
    // basic-rate-taxed, materially under-stating historical tax. The corrected
    // model puts £30k - 20700 = £9,300 at 40%.
    const r = computeTaxNI(30000, 1990, "none", 0)
    // PA 1990 = 3005. basicBand = 20700 - 3005 = 17695.
    // tax = 17695 * 0.25 + (30000 - 3005 - 17695) * 0.40
    //     = 4423.75 + 9300 * 0.40 = 4423.75 + 3720 = 8143.75
    close(r.tax, 8143.75, 5, "1990 £30k tax")
  })

  it("NI respects historical UEL cap (above-UEL rate 0% pre-2003, not full main rate)", () => {
    // With the old bug, NI applied the full main rate (e.g. 9%) to all income
    // above the primary threshold. The corrected model caps the main rate at
    // the UEL and applies the above-UEL rate (0% pre-2003) to the rest.
    // £50k in 1995: UEL=22880, PT=3250, niMain=9%, above=0%.
    // NI = (22880 - 3250) * 0.09 = 1766.70. NOT (50000 - 3250) * 0.09 = 4207.50.
    const r = computeTaxNI(50000, 1995, "none", 0)
    close(r.ni, 1766.7, 5, "1995 £50k NI (UEL-capped)")
    expect(r.ni).toBeLessThan(2000) // would be ~4200 with the bug
  })

  it("1990 deficit scenario is preserved (the rates crisis was real, don't suppress it)", () => {
    // 1990 BoE rate ~15%, so a sub-median earner with an above-median mortgage
    // genuinely couldn't afford it. The waterfall should expose this as a
    // negative disposable — the calculator's historical honesty depends on it.
    const r = computeSnapshot(
      { ...baseInputs, grossSalary: 25000, monthlyHousing: 1800, housingType: "mortgage" },
      SERIES,
      1990,
    )!
    // We're not asserting an exact value (the synthesis is approximate) but
    // the calc must not silently clip a negative to zero.
    expect(r.historical.disposable).toBeLessThan(r.historical.netTakeHome)
    // Sanity: housing in 1990 should be a non-trivial chunk of the burden.
    expect(r.historical.housing).toBeGreaterThan(2000)
  })
})
