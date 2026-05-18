import Papa from "papaparse"
import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import type { Series, YearValue } from "../../src/types/series.ts"

const SNAPSHOT = "2026-02"
const UPSTREAM = `https://publicdata.landregistry.gov.uk/market-trend-data/house-price-index-data/Average-prices-${SNAPSHOT}.csv`
const SEED = resolve("scripts/seed/hpi-annual.csv")

interface RegionSpec {
  id: string
  name: string
  description: string
  color: string
  region: string
  regionName: string // value to match in CSV Region_Name column
}

const REGIONS: RegionSpec[] = [
  {
    id: "house-price-landreg",
    name: "House prices (HM Land Registry, UK)",
    description: "UK average property price from the official UK HPI, monthly aggregated to annual mean. Methodology dates from 1968.",
    color: "#f5f4f0",
    region: "uk",
    regionName: "United Kingdom",
  },
  {
    id: "house-price-london",
    name: "House prices (London)",
    description: "Greater London average property price, UK HPI monthly → annual mean. The methodology cliff that the UK average hides.",
    color: "#f97316",
    region: "london",
    regionName: "London",
  },
  {
    id: "house-price-northeast",
    name: "House prices (North East)",
    description: "North East England average property price. The opposite end of the same chart — the cheapest English region.",
    color: "#14b8a6",
    region: "north-east",
    regionName: "North East",
  },
]

let cachedCsv: string | null = null
let cachedAt = 0
const CACHE_TTL_MS = 5 * 60_000

async function getCsv(): Promise<string | null> {
  if (cachedCsv && Date.now() - cachedAt < CACHE_TTL_MS) return cachedCsv
  try {
    const res = await fetch(UPSTREAM)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    cachedCsv = await res.text()
    cachedAt = Date.now()
    return cachedCsv
  } catch (err) {
    console.warn(`  landRegistry: upstream fetch failed (${(err as Error).message})`)
    return null
  }
}

export async function fetchSeries(): Promise<Series[]> {
  const csv = await getCsv()
  const out: Series[] = []
  for (const spec of REGIONS) {
    const meta = {
      id: spec.id,
      name: spec.name,
      description: spec.description,
      unit: "GBP" as const,
      color: spec.color,
      source: {
        name: "HM Land Registry UK House Price Index",
        url: "https://www.gov.uk/government/statistical-data-sets/uk-house-price-index-data-downloads",
      },
      region: spec.region,
      verifiedFrom: 1995,
    }
    let points: YearValue[] = []
    if (csv) points = aggregateForRegion(csv, spec.regionName)
    if (points.length === 0 && spec.regionName === "United Kingdom") {
      points = await loadSeed()
    }
    out.push({ ...meta, points })
  }
  return out
}

function aggregateForRegion(csv: string, regionName: string): YearValue[] {
  const result = Papa.parse<Record<string, string>>(csv.trim(), {
    header: true,
    skipEmptyLines: true,
  })
  const byYear = new Map<number, number[]>()
  for (const row of result.data) {
    if (row["Region_Name"] !== regionName) continue
    const date = row["Date"] ?? ""
    const price = Number(row["Average_Price"] ?? row["AveragePrice"] ?? "")
    const year = Number(date.slice(0, 4))
    if (!Number.isFinite(year) || !Number.isFinite(price)) continue
    if (!byYear.has(year)) byYear.set(year, [])
    byYear.get(year)!.push(price)
  }
  const out: YearValue[] = []
  for (const [year, prices] of [...byYear.entries()].sort((a, b) => a[0] - b[0])) {
    const mean = prices.reduce((s, p) => s + p, 0) / prices.length
    out.push({ year, value: Math.round(mean) })
  }
  return out
}

async function loadSeed(): Promise<YearValue[]> {
  try {
    const csv = await readFile(SEED, "utf8")
    const result = Papa.parse<{ year: string; uk_average_price: string }>(csv.trim(), {
      header: true,
      skipEmptyLines: true,
    })
    return result.data
      .map((r) => ({ year: Number(r.year), value: Number(r.uk_average_price) }))
      .filter((r) => Number.isFinite(r.year) && Number.isFinite(r.value))
      .sort((a, b) => a.year - b.year)
  } catch {
    return []
  }
}
