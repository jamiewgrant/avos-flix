import { mkdir, readFile, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { AsyncLocalStorage } from "node:async_hooks"
import type { Series, SeriesData } from "../src/types/series.ts"

import { fetchSeries as fetchBoe } from "./sources/boe.ts"
import { fetchSeries as fetchLandReg } from "./sources/landRegistry.ts"
import { fetchSeries as fetchNationwide } from "./sources/nationwide.ts"
import { fetchSeries as fetchAshe } from "./sources/ashe.ts"
import { fetchSeries as fetchCpih } from "./sources/cpih.ts"
import { fetchSeries as fetchHouseholdIncome } from "./sources/household-income.ts"
import { fetchSeries as fetchEnergy } from "./sources/energy.ts"
import { fetchSeries as fetchRent } from "./sources/rent.ts"
import { fetchSeries as fetchNetflix } from "./sources/netflix.ts"
import { fetchSeries as fetchAvocado } from "./sources/avocado.ts"
import { fetchSeries as fetchBirths } from "./sources/births.ts"
import { fetchSeries as fetchMigration } from "./sources/migration.ts"
import { fetchSeries as fetchHouseholdSize } from "./sources/household-size.ts"
import { fetchSeries as fetchTuition } from "./sources/tuition.ts"
import { fetchSeries as fetchCouncilTax } from "./sources/council-tax.ts"
import { fetchSeries as fetchRailFares } from "./sources/rail-fares.ts"
import { fetchSeries as fetchMinWage } from "./sources/min-wage.ts"
import { fetchSeries as fetchStudentDebt } from "./sources/student-debt.ts"
import { fetchSeries as fetchChildcare } from "./sources/childcare.ts"
import { fetchSeries as fetchHomeownership } from "./sources/homeownership.ts"
import { fetchSeries as fetchFtbAge } from "./sources/ftb-age.ts"
import { fetchSeries as fetchTaxBurden } from "./sources/tax-burden.ts"
import { fetchSeries as fetchGradSalary } from "./sources/grad-salary.ts"
import { fetchSeries as fetchFoodCpi } from "./sources/food-cpi.ts"
import { fetchSeries as fetchAshePercentiles } from "./sources/ashePercentiles.ts"
import { fetchSeries as fetchFuel } from "./sources/fuel.ts"
import { fetchSeries as fetchWealth } from "./sources/wealth.ts"

// Sources may return a single Series or an array (e.g. landRegistry yields UK + regional rows).
type SourceFn = () => Promise<Series | Series[]>

interface SourceEntry {
  fn: SourceFn
  /** Human-readable name shown in the summary. */
  label: string
}

const SOURCES: SourceEntry[] = [
  { fn: fetchBoe, label: "boe" },
  { fn: fetchLandReg, label: "landRegistry" },
  { fn: fetchNationwide, label: "nationwide" },
  { fn: fetchCpih, label: "cpih" },
  { fn: fetchAshe, label: "ashe" },
  { fn: fetchHouseholdIncome, label: "household-income" },
  { fn: fetchEnergy, label: "energy" },
  { fn: fetchRent, label: "rent" },
  { fn: fetchNetflix, label: "netflix" },
  { fn: fetchAvocado, label: "avocado" },
  { fn: fetchBirths, label: "births" },
  { fn: fetchMigration, label: "migration" },
  { fn: fetchHouseholdSize, label: "household-size" },
  { fn: fetchTuition, label: "tuition" },
  { fn: fetchCouncilTax, label: "council-tax" },
  { fn: fetchRailFares, label: "rail-fares" },
  { fn: fetchMinWage, label: "min-wage" },
  { fn: fetchStudentDebt, label: "student-debt" },
  { fn: fetchChildcare, label: "childcare" },
  { fn: fetchHomeownership, label: "homeownership" },
  { fn: fetchFtbAge, label: "ftb-age" },
  { fn: fetchTaxBurden, label: "tax-burden" },
  { fn: fetchGradSalary, label: "grad-salary" },
  { fn: fetchFoodCpi, label: "food-cpi" },
  { fn: fetchAshePercentiles, label: "ashe-percentiles" },
  { fn: fetchFuel, label: "fuel-price" },
  { fn: fetchWealth, label: "wealth" },
]

const OUT_DIR = resolve("public", "data")
const OUT_FILE = resolve(OUT_DIR, "series.json")

// ETL_ALLOW_SEEDS=true lets Vercel preview builds (which may lack network access)
// pass CI even when sources fell back to seed data.
const ALLOW_SEEDS = process.env.ETL_ALLOW_SEEDS === "true"

interface FetchResult {
  series: Series[]
  label: string
  usedSeed: boolean
  failed: boolean
}

// AsyncLocalStorage lets each concurrent fetch carry its own seed-usage flag.
// console.warn is patched once (below) to write into whichever context is active.
const seedContext = new AsyncLocalStorage<{ usedSeed: boolean }>()

const _originalWarn = console.warn
console.warn = (...args: unknown[]) => {
  const ctx = seedContext.getStore()
  if (ctx) {
    const message = args.map(String).join(" ")
    if (/\bseed\b/i.test(message)) ctx.usedSeed = true
  }
  _originalWarn(...args)
}

async function main() {
  console.log("Running ETL…")
  const previous = await loadPrevious()
  const results = await Promise.all(SOURCES.map(({ fn, label }) => safeFetch(fn, label)))
  const seriesList = results.flatMap((r) => r.series)
  const series: Record<string, Series> = { ...previous }
  for (const s of seriesList) {
    if (s.points.length === 0 && series[s.id]?.points.length) {
      console.log(`  ${s.id}: fetch empty, keeping previous ${series[s.id].points.length} points`)
      continue
    }
    series[s.id] = s
  }

  const data: SeriesData = {
    series,
    metadata: { generatedAt: new Date().toISOString() },
  }

  await mkdir(OUT_DIR, { recursive: true })
  await writeFile(OUT_FILE, JSON.stringify(data, null, 2))
  console.log(`Wrote ${OUT_FILE} (${Object.keys(series).length} series)`)

  // ── Summary ───────────────────────────────────────────────────────────────
  const seedSources = results.filter((r) => r.usedSeed).map((r) => r.label)
  const failedSources = results.filter((r) => r.failed).map((r) => r.label)
  const liveCount = results.length - seedSources.length - failedSources.length

  console.log("")
  console.log("━".repeat(40))
  console.log(`ETL complete: ${results.length} sources`)
  console.log(`  ✓ ${liveCount} fetched live`)
  if (seedSources.length > 0) {
    console.log(`  ⚠ ${seedSources.length} used seed fallback: ${seedSources.join(", ")}`)
  }
  if (failedSources.length > 0) {
    console.log(`  ✗ ${failedSources.length} failed entirely: ${failedSources.join(", ")}`)
  }
  console.log("━".repeat(40))

  if ((seedSources.length > 0 || failedSources.length > 0) && !ALLOW_SEEDS) {
    console.error("")
    console.error(
      "Some sources used seed data. Set ETL_ALLOW_SEEDS=true to suppress this exit code.",
    )
    process.exit(1)
  }
}

async function loadPrevious(): Promise<Record<string, Series>> {
  try {
    const raw = await readFile(OUT_FILE, "utf8")
    const parsed = JSON.parse(raw) as SeriesData
    return parsed.series ?? {}
  } catch {
    return {}
  }
}

function safeFetch(fn: SourceFn, label: string): Promise<FetchResult> {
  // Run each fetch inside its own AsyncLocalStorage context so the patched
  // console.warn can attribute "using seed" warnings to the correct source,
  // even when fetches run concurrently via Promise.all.
  const store = { usedSeed: false }
  return seedContext.run(store, async () => {
    try {
      const result = await fn()
      const list = Array.isArray(result) ? result : [result]
      for (const s of list) {
        console.log(`  ${s.id}: ${s.points.length} points`)
      }
      return { series: list, label, usedSeed: store.usedSeed, failed: false }
    } catch (err) {
      console.error(`  FAILED (${label}): ${(err as Error).message}`)
      return { series: [], label, usedSeed: false, failed: true }
    }
  })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
