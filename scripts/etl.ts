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
import { fetchSeries as fetchHealthcare } from "./sources/healthcare.ts"
import { fetchSeries as fetchSectorWages } from "./sources/sectorWages.ts"
import { fetchSeries as fetchInternational } from "./sources/international.ts"
import { fetchSeries as fetchSavings } from "./sources/savings.ts"

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
  { fn: fetchHealthcare, label: "healthcare-oop" },
  { fn: fetchSectorWages, label: "sector-wages" },
  { fn: fetchInternational, label: "international-hpw" },
  { fn: fetchSavings, label: "savings-ratio" },
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

  // ── Regenerate OG image ───────────────────────────────────────────────────
  await regenerateOgSvg(series)

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

function computeGrowthRatio(
  s: Series,
  baseYear: number,
  targetYear: number,
): { ratio: number; latestYear: number } | null {
  const sorted = [...s.points].sort((a, b) => a.year - b.year)
  const base = sorted.find((p) => p.year === baseYear)
  if (!base || base.value === 0) return null
  // Use targetYear if available, otherwise the latest point
  const target =
    sorted.find((p) => p.year === targetYear) ?? sorted[sorted.length - 1]
  if (!target) return null
  return { ratio: target.value / base.value, latestYear: target.year }
}

type YearValue = { year: number; value: number }

function toPolyline(
  pts: YearValue[],
  baseYear: number,
  xMin: number,
  _xMax: number,
  _yMin: number,
  yMax: number,
  chartW: number,
  chartH: number,
): string {
  const base = pts.find((p) => p.year === baseYear)?.value ?? pts[0].value
  const years = pts.map((p) => p.year)
  const minYear = Math.min(...years)
  const maxYear = Math.max(...years)
  const values = pts.map((p) => (p.value / base) * 100)
  const maxVal = Math.max(...values) * 1.05
  return pts
    .map((p) => {
      const x = xMin + ((p.year - minYear) / (maxYear - minYear)) * chartW
      const v = (p.value / base) * 100
      const y = yMax - (v / maxVal) * chartH
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(" ")
}

async function regenerateOgSvg(series: Record<string, Series>): Promise<void> {
  const OG_FILE = resolve("public", "og.svg")
  const BASE_YEAR = 1995
  const PREFERRED_YEAR = 2024

  const hpSeries = series["house-price-nationwide"]
  const wageSeries = series["median-wage"]
  const cpihSeries = series["cpih"]

  if (!hpSeries || !wageSeries || !cpihSeries) {
    console.warn("  og.svg: one or more required series missing, skipping regeneration")
    return
  }

  const hp = computeGrowthRatio(hpSeries, BASE_YEAR, PREFERRED_YEAR)
  const wage = computeGrowthRatio(wageSeries, BASE_YEAR, PREFERRED_YEAR)
  const cpih = computeGrowthRatio(cpihSeries, BASE_YEAR, PREFERRED_YEAR)

  if (!hp || !wage || !cpih) {
    console.warn("  og.svg: could not compute growth ratios, skipping regeneration")
    return
  }

  const fmt = (r: number) => `${r.toFixed(1)}×`
  const latestYear = Math.max(hp.latestYear, wage.latestYear, cpih.latestYear)

  // Chart panel dimensions
  const CHART_X = 72
  const CHART_Y = 155
  const CHART_W = 1056
  const CHART_H = 235

  // Filter series points to the base year onwards for the chart
  const hpPts = hpSeries.points.filter((p) => p.year >= BASE_YEAR)
  const wagePts = wageSeries.points.filter((p) => p.year >= BASE_YEAR)

  const hpPolyline = toPolyline(hpPts, BASE_YEAR, 0, CHART_W, 0, CHART_H, CHART_W, CHART_H)
  const wagePolyline = toPolyline(wagePts, BASE_YEAR, 0, CHART_W, 0, CHART_H, CHART_W, CHART_H)

  // Compute grid lines: 200 and 400 index values mapped to y coords
  const hpValues = hpPts.map((p) => (p.value / (hpPts.find((x) => x.year === BASE_YEAR)?.value ?? hpPts[0].value)) * 100)
  const wageValues = wagePts.map((p) => (p.value / (wagePts.find((x) => x.year === BASE_YEAR)?.value ?? wagePts[0].value)) * 100)
  const allValues = [...hpValues, ...wageValues]
  const maxVal = Math.max(...allValues) * 1.05
  const gridY200 = CHART_H - (200 / maxVal) * CHART_H
  const gridY400 = CHART_H - (400 / maxVal) * CHART_H

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <rect width="1200" height="630" fill="#0a0a0a"/>

  <text x="72" y="120" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="96" font-weight="700" fill="#f5f4f0" letter-spacing="-3">avos<tspan fill="#c084fc">+</tspan>flix</text>
  <text x="1128" y="115" font-family="ui-monospace, 'JetBrains Mono', Consolas, monospace" font-size="22" fill="#9ca3af" text-anchor="end">avos-flix.vercel.app</text>

  <!-- Chart panel -->
  <g transform="translate(${CHART_X}, ${CHART_Y})">
    <rect width="${CHART_W}" height="${CHART_H}" rx="12" fill="#16171d"/>
    <!-- Grid lines at index 200 and 400 -->
    <line x1="0" y1="${gridY200.toFixed(1)}" x2="${CHART_W}" y2="${gridY200.toFixed(1)}" stroke="#2e303a" stroke-width="1"/>
    <line x1="0" y1="${gridY400.toFixed(1)}" x2="${CHART_W}" y2="${gridY400.toFixed(1)}" stroke="#2e303a" stroke-width="1"/>
    <!-- House price line -->
    <polyline points="${hpPolyline}" fill="none" stroke="#a78bfa" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
    <!-- Wage line -->
    <polyline points="${wagePolyline}" fill="none" stroke="#60a5fa" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
    <!-- Labels at right edge -->
    <text x="${CHART_W - 8}" y="${(gridY400 - 12).toFixed(1)}" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="600" fill="#a78bfa" text-anchor="end">House prices ${fmt(hp.ratio)}</text>
    <text x="${CHART_W - 8}" y="${(CHART_H - 12).toFixed(1)}" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="600" fill="#60a5fa" text-anchor="end">Wages ${fmt(wage.ratio)}</text>
    <!-- Year axis labels -->
    <text x="4" y="${(CHART_H - 6).toFixed(1)}" font-family="ui-monospace, monospace" font-size="16" fill="#4b5563">${BASE_YEAR}</text>
    <text x="${(CHART_W / 2).toFixed(1)}" y="${(CHART_H - 6).toFixed(1)}" font-family="ui-monospace, monospace" font-size="16" fill="#4b5563" text-anchor="middle">${Math.round((BASE_YEAR + latestYear) / 2)}</text>
    <text x="${CHART_W - 4}" y="${(CHART_H - 6).toFixed(1)}" font-family="ui-monospace, monospace" font-size="16" fill="#4b5563" text-anchor="end">${latestYear}</text>
  </g>

  <!-- Stat cards -->
  <g transform="translate(72, 405)">
    <rect width="340" height="140" rx="16" fill="#16171d" stroke="#2e303a" stroke-width="2"/>
    <text x="32" y="76" font-family="system-ui, -apple-system, sans-serif" font-size="60" font-weight="700" fill="#a78bfa" letter-spacing="-2">${fmt(hp.ratio)}</text>
    <text x="32" y="114" font-family="system-ui, -apple-system, sans-serif" font-size="20" fill="#9ca3af">House prices</text>
  </g>

  <g transform="translate(430, 405)">
    <rect width="340" height="140" rx="16" fill="#16171d" stroke="#2e303a" stroke-width="2"/>
    <text x="32" y="76" font-family="system-ui, -apple-system, sans-serif" font-size="60" font-weight="700" fill="#60a5fa" letter-spacing="-2">${fmt(wage.ratio)}</text>
    <text x="32" y="114" font-family="system-ui, -apple-system, sans-serif" font-size="20" fill="#9ca3af">Median wage</text>
  </g>

  <g transform="translate(788, 405)">
    <rect width="340" height="140" rx="16" fill="#16171d" stroke="#2e303a" stroke-width="2"/>
    <text x="32" y="76" font-family="system-ui, -apple-system, sans-serif" font-size="60" font-weight="700" fill="#34d399" letter-spacing="-2">${fmt(cpih.ratio)}</text>
    <text x="32" y="114" font-family="system-ui, -apple-system, sans-serif" font-size="20" fill="#9ca3af">Inflation (CPIH)</text>
  </g>

  <text x="72" y="586" font-family="ui-monospace, monospace" font-size="20" fill="#9ca3af">${BASE_YEAR} → ${latestYear} · UK</text>
  <text x="1128" y="586" font-family="ui-monospace, monospace" font-size="20" fill="#9ca3af" text-anchor="end">ONS · Bank of England · HM Land Registry</text>
</svg>
`

  await writeFile(OG_FILE, svg)
  console.log(
    `  og.svg: house prices ${fmt(hp.ratio)}, wage ${fmt(wage.ratio)}, CPIH ${fmt(cpih.ratio)} (${BASE_YEAR}–${latestYear})`,
  )
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
