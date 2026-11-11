/**
 * audit-snapshot.ts — comprehensive sweep of computeSnapshot / computeTaxNI
 *
 * Systematically tests ~27,000 input combinations, checks structural
 * invariants, domain rules, plausibility bounds, and cross-input consistency.
 * Exits with code 1 if any issues found, so it can run in CI.
 *
 * Usage:  npm run audit   (or: tsx scripts/audit-snapshot.ts)
 */

import type { SeriesData } from "../src/types/series.ts"
import { readFileSync } from "fs"
import { fileURLToPath } from "url"
import path from "path"

// ─── Load series.json via readFileSync (no --experimental-json-modules needed) ─
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const seriesRaw = readFileSync(
  path.join(__dirname, "../public/data/series.json"),
  "utf-8",
)
const seriesData = JSON.parse(seriesRaw) as SeriesData
const SERIES = seriesData.series

// ─── Import functions under test ──────────────────────────────────────────────
// tsx handles TypeScript imports natively at runtime.
import {
  computeSnapshot,
  type PersonalInputs,
} from "../src/lib/personalSnapshot.js"

// ─────────────────────────────────────────────────────────────────────────────
// Input grid
// ─────────────────────────────────────────────────────────────────────────────

const GROSS_SALARIES = [18000, 25000, 35000, 40000, 55000, 80000]
const HOUSING_TYPES: Array<"mortgage" | "rent" | "owned"> = [
  "mortgage",
  "rent",
  "owned",
]
const MONTHLY_HOUSINGS = [600, 1000, 1600]
const CHILDREN_VALS = [0, 1, 2]
const EARNERS_VALS: Array<1 | 2> = [1, 2]
const STUDENT_LOAN_PLANS: Array<"none" | "plan1" | "plan2" | "plan5"> = [
  "none",
  "plan1",
  "plan2",
  "plan5",
]
const PENSION_PCTS = [0, 5, 8]
const COMPARE_YEARS = [1990, 1995, 2000, 2005, 2010, 2015, 2020]

// ─────────────────────────────────────────────────────────────────────────────
// Issue tracking
// ─────────────────────────────────────────────────────────────────────────────

interface Issue {
  tag: string
  message: string
}

let checked = 0
const issues: Issue[] = []

function inputTag(
  gross: number,
  housing: string,
  monthlyHousing: number,
  children: number,
  earners: number,
  plan: string,
  pension: number,
  year: number,
): string {
  return `[gross=${gross} housing=${housing}/${monthlyHousing} children=${children} earners=${earners} plan=${plan} pension=${pension} year=${year}]`
}

function fail(tag: string, message: string): void {
  issues.push({ tag, message })
  console.error(`FAIL ${tag} ${message}`)
}

function near(a: number, b: number, tol: number): boolean {
  return Math.abs(a - b) <= tol
}

// ─────────────────────────────────────────────────────────────────────────────
// Breakdown checker — applied to both today and historical
// ─────────────────────────────────────────────────────────────────────────────

type Breakdown = NonNullable<
  ReturnType<typeof computeSnapshot>
>["today"]

function checkBreakdown(
  b: Breakdown,
  label: string,
  tag: string,
): void {
  // No NaN / Infinity in any numeric field
  for (const [key, val] of Object.entries(b)) {
    if (typeof val === "number" && !Number.isFinite(val)) {
      fail(tag, `${label}.${key} = ${val} (not finite)`)
    }
  }

  // net + (tax + NI + SL + pension) === gross within £0.50
  const deductions =
    b.incomeTax + b.nationalInsurance + b.studentLoan + b.pension
  const expectedNet = b.grossSalary - deductions
  if (!near(b.netTakeHome, expectedNet, 0.5)) {
    fail(
      tag,
      `${label}: net+deductions≠gross: net=${b.netTakeHome.toFixed(2)}, gross-ded=${expectedNet.toFixed(2)}, diff=${Math.abs(b.netTakeHome - expectedNet).toFixed(2)}`,
    )
  }

  // disposable === netTakeHome − (housing + energy + groceries + childcare + councilTax) within £0.50
  const costs =
    b.housing + b.energy + b.groceries + b.childcare + b.councilTax
  const expectedDisposable = b.netTakeHome - costs
  if (!near(b.disposable, expectedDisposable, 0.5)) {
    fail(
      tag,
      `${label}: disposable mismatch: got=${b.disposable.toFixed(2)}, expected=${expectedDisposable.toFixed(2)}, diff=${Math.abs(b.disposable - expectedDisposable).toFixed(2)}`,
    )
  }

  // Percentage fields match underlying ratios within 0.01pp
  if (b.grossSalary > 0) {
    const housingPctExpected = (b.housing / b.grossSalary) * 100
    if (!near(b.housingPct, housingPctExpected, 0.01)) {
      fail(
        tag,
        `${label}: housingPct=${b.housingPct.toFixed(4)} expected=${housingPctExpected.toFixed(4)}`,
      )
    }
    const disposablePctExpected = (b.disposable / b.grossSalary) * 100
    if (!near(b.disposablePct, disposablePctExpected, 0.01)) {
      fail(
        tag,
        `${label}: disposablePct=${b.disposablePct.toFixed(4)} expected=${disposablePctExpected.toFixed(4)}`,
      )
    }
    const taxTotalPctExpected =
      ((b.incomeTax + b.nationalInsurance) / b.grossSalary) * 100
    if (!near(b.taxTotalPct, taxTotalPctExpected, 0.01)) {
      fail(
        tag,
        `${label}: taxTotalPct=${b.taxTotalPct.toFixed(4)} expected=${taxTotalPctExpected.toFixed(4)}`,
      )
    }
  }

  // All percentage fields within [-200, 200] — guards against NaN/Infinity
  // escaping as very large numbers. Note: extreme cost scenarios (e.g. two
  // children on a single part-time wage) can legitimately produce disposablePct
  // below -200%; we only flag values that are clearly a calculation blow-up
  // (outside ±500) rather than genuine economic stress.
  for (const key of ["housingPct", "disposablePct", "taxTotalPct"] as const) {
    const v = b[key]
    if (v < -500 || v > 500) {
      fail(tag, `${label}.${key}=${v.toFixed(2)} outside [-500, 500] (likely blow-up)`)
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main sweep — ~27,216 combinations
// ─────────────────────────────────────────────────────────────────────────────

for (const grossSalary of GROSS_SALARIES) {
  for (const housingType of HOUSING_TYPES) {
    for (const monthlyHousing of MONTHLY_HOUSINGS) {
      for (const children of CHILDREN_VALS) {
        for (const earners of EARNERS_VALS) {
          for (const studentLoanPlan of STUDENT_LOAN_PLANS) {
            for (const pensionPct of PENSION_PCTS) {
              for (const compareYear of COMPARE_YEARS) {
                checked++

                const inputs: PersonalInputs = {
                  grossSalary,
                  housingType,
                  monthlyHousing,
                  children,
                  earners,
                  studentLoanPlan,
                  pensionPct,
                }

                const tag = inputTag(
                  grossSalary,
                  housingType,
                  monthlyHousing,
                  children,
                  earners,
                  studentLoanPlan,
                  pensionPct,
                  compareYear,
                )

                // ── Structural: non-null for gross > 0 ─────────────────────
                const result = computeSnapshot(inputs, SERIES, compareYear)
                if (result === null) {
                  fail(
                    tag,
                    `computeSnapshot returned null for gross=${grossSalary} > 0`,
                  )
                  continue
                }

                const { today, historical } = result

                // ── Shared breakdown invariants ─────────────────────────────
                checkBreakdown(today, "today", tag)
                checkBreakdown(historical, "historical", tag)

                // ── Domain rules ────────────────────────────────────────────

                // earners===1 → childcare === 0 (both today and historical)
                if (earners === 1) {
                  if (today.childcare !== 0) {
                    fail(
                      tag,
                      `earners=1 but today.childcare=£${today.childcare.toFixed(0)} (expected 0)`,
                    )
                  }
                  if (historical.childcare !== 0) {
                    fail(
                      tag,
                      `earners=1 but historical.childcare=£${historical.childcare.toFixed(0)} (expected 0)`,
                    )
                  }
                }

                // housingType==="owned" → housing === 0 both today and historical
                if (housingType === "owned") {
                  if (today.housing !== 0) {
                    fail(
                      tag,
                      `housingType=owned but today.housing=£${today.housing.toFixed(0)} (expected 0)`,
                    )
                  }
                  if (historical.housing !== 0) {
                    fail(
                      tag,
                      `housingType=owned but historical.housing=£${historical.housing.toFixed(0)} (expected 0)`,
                    )
                  }
                }

                // compareYear < 2013 → historical.pension === 0 (pre-auto-enrolment)
                if (compareYear < 2013 && pensionPct > 0) {
                  if (historical.pension !== 0) {
                    fail(
                      tag,
                      `compareYear=${compareYear}<2013 (pre-auto-enrolment) but historical.pension=£${historical.pension.toFixed(0)} (expected 0)`,
                    )
                  }
                }

                // plan1 + compareYear < 1998 → historical.studentLoan === 0
                if (studentLoanPlan === "plan1" && compareYear < 1998) {
                  if (historical.studentLoan !== 0) {
                    fail(
                      tag,
                      `plan1 + compareYear=${compareYear}<1998: historical.studentLoan=£${historical.studentLoan.toFixed(0)} (expected 0)`,
                    )
                  }
                }

                // plan2 + compareYear < 2012 → historical.studentLoan === 0
                if (studentLoanPlan === "plan2" && compareYear < 2012) {
                  if (historical.studentLoan !== 0) {
                    fail(
                      tag,
                      `plan2 + compareYear=${compareYear}<2012: historical.studentLoan=£${historical.studentLoan.toFixed(0)} (expected 0)`,
                    )
                  }
                }

                // plan5 + compareYear < 2023 → historical.studentLoan === 0
                if (studentLoanPlan === "plan5" && compareYear < 2023) {
                  if (historical.studentLoan !== 0) {
                    fail(
                      tag,
                      `plan5 + compareYear=${compareYear}<2023: historical.studentLoan=£${historical.studentLoan.toFixed(0)} (expected 0)`,
                    )
                  }
                }

                // historical.grossSalary < today.grossSalary for all compareYears ≤ 2020
                if (compareYear <= 2020) {
                  if (historical.grossSalary >= today.grossSalary) {
                    fail(
                      tag,
                      `historical.grossSalary=£${historical.grossSalary.toFixed(0)} >= today.grossSalary=£${today.grossSalary.toFixed(0)} for compareYear=${compareYear} (wages should have grown)`,
                    )
                  }
                }

                // ── Plausibility bounds ─────────────────────────────────────

                // Effective tax+NI rate (today) between 5% and 60% for earners where
                // per-earner gross ≥ 18000. We use per-earner gross here because two
                // earners on £18k total (£9k each) legitimately pay 0% — each is below
                // the personal allowance. The "≥18000" threshold in the spec is intended
                // to be per earner, ensuring we don't check below the PA floor.
                const perEarnerGross = today.grossSalary / earners
                if (perEarnerGross >= 18000) {
                  // tax and NI in today are already household totals; rate = household/household
                  const effectiveRate =
                    ((today.incomeTax + today.nationalInsurance) /
                      today.grossSalary) *
                    100
                  if (effectiveRate < 5 || effectiveRate > 60) {
                    fail(
                      tag,
                      `today effective tax+NI rate=${effectiveRate.toFixed(2)}% outside [5%, 60%] for per-earner gross=£${perEarnerGross.toFixed(0)}`,
                    )
                  }
                }

                // today.energy between £500 and £5000
                if (today.energy < 500 || today.energy > 5000) {
                  fail(
                    tag,
                    `today.energy=£${today.energy.toFixed(0)} outside [£500, £5000]`,
                  )
                }

                // today.groceries between £2000 and £15000
                if (today.groceries < 2000 || today.groceries > 15000) {
                  fail(
                    tag,
                    `today.groceries=£${today.groceries.toFixed(0)} outside [£2000, £15000]`,
                  )
                }

                // today.councilTax between £500 and £5000
                if (today.councilTax < 500 || today.councilTax > 5000) {
                  fail(
                    tag,
                    `today.councilTax=£${today.councilTax.toFixed(0)} outside [£500, £5000]`,
                  )
                }

                // childcare per child (earners=2, children>0): between £5000 and £30000 per child
                if (earners === 2 && children > 0) {
                  // Implementation caps childcare at min(children, 2) children
                  const childrenCapped = Math.min(children, 2)
                  const perChild = today.childcare / childrenCapped
                  if (perChild < 5000 || perChild > 30000) {
                    fail(
                      tag,
                      `today childcare per child=£${perChild.toFixed(0)} outside [£5000, £30000] (total=£${today.childcare.toFixed(0)}, capped_children=${childrenCapped})`,
                    )
                  }
                }

                // ── Rent-specific regression guard ──────────────────────────
                // For rent + compareYear ∈ {1990, 1995, 2000} with children=0:
                // if today.disposable > 0 then historical.disposable must also be > 0.
                // This guards specifically against the false-deficit bug from the
                // overcalibrated RPI-splice rent-index (fixed previously). We scope to
                // children=0 because the children grocery supplement (£1000/child) is
                // intentionally NOT CPI-scaled in the model, which can legitimately
                // produce historical deficits for low-income households with children
                // even when today is positive — that's a genuine economic signal, not
                // a rent-index data artifact.
                if (
                  housingType === "rent" &&
                  children === 0 &&
                  (compareYear === 1990 ||
                    compareYear === 1995 ||
                    compareYear === 2000)
                ) {
                  if (today.disposable > 0 && historical.disposable <= 0) {
                    fail(
                      tag,
                      `rent + compareYear=${compareYear}: today.disposable=£${today.disposable.toFixed(0)}>0 but historical.disposable=£${historical.disposable.toFixed(0)}≤0 (false-deficit bug — rent-index may be recalibrated too high)`,
                    )
                  }
                }

                // ── Economic trend direction checks ─────────────────────────
                // These verify that the data series encode known economic facts.
                // A failure here means a data series has been miscalibrated or a
                // historical scaling formula has been broken — not a bad user input.

                // Energy was much cheaper before the 2020s crisis.
                // (series anchor: 1990=£410, 2019=£1137, 2026=£1641)
                // Every pre-2020 compare year should be cheaper than today.
                if (compareYear <= 2019) {
                  if (historical.energy >= today.energy) {
                    fail(
                      tag,
                      `energy direction: hist(${compareYear})=£${historical.energy.toFixed(0)} >= today=£${today.energy.toFixed(0)} (energy was cheaper pre-2020s — data series may be miscalibrated)`,
                    )
                  }
                }

                // Council tax has risen every year since its 1993 introduction.
                // (series: 1990=£360 community charge proxy, 2026=£2393)
                if (compareYear <= 2020) {
                  if (historical.councilTax >= today.councilTax) {
                    fail(
                      tag,
                      `council tax direction: hist(${compareYear})=£${historical.councilTax.toFixed(0)} >= today=£${today.councilTax.toFixed(0)} (council tax has risen consistently — data series may be miscalibrated)`,
                    )
                  }
                }

                // Nominal grocery costs were lower in all our compare years because
                // food CPI was lower (series: 1990=49.5, 2020=107.6, 2025=144).
                // The grocery formula is 5200*(cpi/100)+1000*children, so today > hist
                // whenever foodCpiToday > foodCpiThen, which holds for all years ≤ 2020.
                if (compareYear <= 2020) {
                  if (historical.groceries >= today.groceries) {
                    fail(
                      tag,
                      `groceries direction: hist(${compareYear})=£${historical.groceries.toFixed(0)} >= today=£${today.groceries.toFixed(0)} (food CPI was lower in all compare years ≤ 2020 — formula or data may be broken)`,
                    )
                  }
                }

                // Childcare costs have risen dramatically.
                // (childcare-cost series: 1995=£3000/child, 2026=£16300/child)
                // For dual-earner households with children, today's cost should always
                // exceed any historical compare year up to 2020.
                if (earners === 2 && children > 0 && compareYear <= 2020) {
                  if (today.childcare <= historical.childcare) {
                    fail(
                      tag,
                      `childcare direction: today=£${today.childcare.toFixed(0)} <= hist(${compareYear})=£${historical.childcare.toFixed(0)} (childcare costs have risen dramatically — data series may be miscalibrated)`,
                    )
                  }
                }

                // Mortgage burden was higher in 1990 due to the BoE rate crisis (peak 14.57%).
                // With a 1.5pp margin, the effective mortgage rate was ~16.07%.
                // The synthetic mortgage calculation means that for 1990, historical.housingPct
                // is theoretically ~1.44× today's housingPct (for any mortgage amount/salary).
                // This tests that the syntheticMortgagePayment formula and the
                // house-price + boe-rate data are correctly calibrated for 1990.
                if (housingType === "mortgage" && compareYear === 1990) {
                  if (historical.housingPct <= today.housingPct) {
                    fail(
                      tag,
                      `1990 mortgage burden: hist.housingPct=${historical.housingPct.toFixed(1)}% <= today=${today.housingPct.toFixed(1)}% (BoE rate was ~14.57% in 1990 — mortgages should have been proportionally more expensive relative to income)`,
                    )
                  }
                }

                // ── Historical absolute range checks ────────────────────────
                // Catch impossible/degenerate values in historical outputs.

                // Housing costs can't be negative (a negative mortgage payment makes no sense)
                if (historical.housing < 0) {
                  fail(
                    tag,
                    `historical.housing negative: £${historical.housing.toFixed(2)} (housing cost can't be negative — check syntheticMortgagePayment or rent scaling)`,
                  )
                }

                // Energy must be positive (series has no zeroes and shouldn't interpolate to 0)
                if (historical.energy <= 0) {
                  fail(
                    tag,
                    `historical.energy non-positive: £${historical.energy.toFixed(0)} (energy series should always return a positive value)`,
                  )
                }

                // Groceries must be positive (food CPI is always > 0 in the series)
                if (historical.groceries <= 0) {
                  fail(
                    tag,
                    `historical.groceries non-positive: £${historical.groceries.toFixed(0)} (grocery cost should always be positive)`,
                  )
                }
              } // compareYear
            } // pensionPct
          } // studentLoanPlan
        } // earners
      } // children
    } // monthlyHousing
  } // housingType
} // grossSalary

// ─────────────────────────────────────────────────────────────────────────────
// Cross-input consistency checks
// ─────────────────────────────────────────────────────────────────────────────

// Check 1: earners=2 with grossSalary=X*2 should give exactly 2× the income
// metrics of earners=1 with grossSalary=X (within £0.50), for the same
// per-earner gross. Tests that the tax model runs per-earner, not on total.
const INCOME_KEYS = [
  "incomeTax",
  "nationalInsurance",
  "studentLoan",
  "pension",
  "netTakeHome",
] as const

for (const perEarnerGross of GROSS_SALARIES) {
  for (const plan of STUDENT_LOAN_PLANS) {
    for (const pensionPct of [0, 5]) {
      for (const compareYear of COMPARE_YEARS) {
        checked++
        const singleInputs: PersonalInputs = {
          grossSalary: perEarnerGross,
          housingType: "mortgage",
          monthlyHousing: 1000,
          children: 0,
          earners: 1,
          studentLoanPlan: plan,
          pensionPct,
        }
        const dualInputs: PersonalInputs = {
          ...singleInputs,
          grossSalary: perEarnerGross * 2,
          earners: 2,
        }

        const single = computeSnapshot(singleInputs, SERIES, compareYear)
        const dual = computeSnapshot(dualInputs, SERIES, compareYear)
        if (!single || !dual) continue

        const tag = `[2x-symmetry gross=${perEarnerGross}×2 plan=${plan} pension=${pensionPct} year=${compareYear}]`

        for (const key of INCOME_KEYS) {
          const sv = single.today[key]
          const dv = dual.today[key]
          if (!near(dv, sv * 2, 0.5)) {
            fail(
              tag,
              `today.${key}: dual=${dv.toFixed(2)} ≠ 2×single=${(sv * 2).toFixed(2)}, diff=${Math.abs(dv - sv * 2).toFixed(2)}`,
            )
          }
          const shv = single.historical[key]
          const dhv = dual.historical[key]
          if (!near(dhv, shv * 2, 0.5)) {
            fail(
              tag,
              `historical.${key}: dual=${dhv.toFixed(2)} ≠ 2×single=${(shv * 2).toFixed(2)}, diff=${Math.abs(dhv - shv * 2).toFixed(2)}`,
            )
          }
        }
      }
    }
  }
}

// Check 2: Increasing grossSalary while holding everything else constant must
// strictly increase today.netTakeHome (monotonicity)
const SORTED_GROSS = [...GROSS_SALARIES].sort((a, b) => a - b)
for (let i = 0; i + 1 < SORTED_GROSS.length; i++) {
  const g1 = SORTED_GROSS[i]
  const g2 = SORTED_GROSS[i + 1]
  for (const plan of STUDENT_LOAN_PLANS) {
    for (const pensionPct of PENSION_PCTS) {
      checked++
      const base: Omit<PersonalInputs, "grossSalary"> = {
        housingType: "mortgage",
        monthlyHousing: 1000,
        children: 0,
        earners: 1,
        studentLoanPlan: plan,
        pensionPct,
      }
      const r1 = computeSnapshot({ ...base, grossSalary: g1 }, SERIES, 2010)
      const r2 = computeSnapshot({ ...base, grossSalary: g2 }, SERIES, 2010)
      if (!r1 || !r2) continue

      const tag = `[monotonicity gross=${g1}→${g2} plan=${plan} pension=${pensionPct}]`
      if (r2.today.netTakeHome <= r1.today.netTakeHome) {
        fail(
          tag,
          `netTakeHome not strictly increasing: net(${g1})=${r1.today.netTakeHome.toFixed(0)}, net(${g2})=${r2.today.netTakeHome.toFixed(0)}`,
        )
      }
    }
  }
}

// Check 3: Increasing children (earners=2) must strictly increase today.childcare
for (let ci = 0; ci + 1 < CHILDREN_VALS.length; ci++) {
  const c1 = CHILDREN_VALS[ci]
  const c2 = CHILDREN_VALS[ci + 1]
  for (const gross of GROSS_SALARIES) {
    for (const compareYear of COMPARE_YEARS) {
      checked++
      const base: Omit<PersonalInputs, "children"> = {
        grossSalary: gross,
        housingType: "mortgage",
        monthlyHousing: 1000,
        earners: 2,
        studentLoanPlan: "none",
        pensionPct: 5,
      }
      const r1 = computeSnapshot({ ...base, children: c1 }, SERIES, compareYear)
      const r2 = computeSnapshot({ ...base, children: c2 }, SERIES, compareYear)
      if (!r1 || !r2) continue

      // Only check 0→1 and 1→2 (implementation caps at 2, so going above 2 stays flat)
      if (c1 < 2) {
        const tag = `[childcare-mono children=${c1}→${c2} gross=${gross} year=${compareYear}]`
        if (r2.today.childcare <= r1.today.childcare) {
          fail(
            tag,
            `childcare not strictly increasing: children=${c1}→£${r1.today.childcare.toFixed(0)}, children=${c2}→£${r2.today.childcare.toFixed(0)}`,
          )
        }
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────────

console.log("")
console.log("━━━━━━━━━━━━━━━━━━━━━━━━")
console.log(`Checked ${checked.toLocaleString()} scenarios`)
if (issues.length === 0) {
  console.log("0 issues found ✓")
} else {
  console.log(`${issues.length} issues found ✗`)
  process.exit(1)
}
