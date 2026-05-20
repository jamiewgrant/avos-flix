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
})
