import Papa from "papaparse"
import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import type { Series, YearValue } from "../../src/types/series.ts"

const SNAPSHOT = "2026-02"
const UPSTREAM = `https://publicdata.landregistry.gov.uk/market-trend-data/house-price-index-data/Average-prices-${SNAPSHOT}.csv`
const SEED = resolve("scripts/seed/hpi-annual.csv")

const META = {
  id: "house-price-landreg",
  name: "House prices (HM Land Registry HPI)",
  description: "UK average property price from the official UK HPI, monthly aggregated to annual mean. Methodology dates from 1968.",
  unit: "GBP" as const,
  color: "#f5f4f0",
  source: {
    name: "HM Land Registry UK House Price Index",
    url: "https://www.gov.uk/government/statistical-data-sets/uk-house-price-index-data-downloads",
  },
  region: "uk",
}

export async function fetchSeries(): Promise<Series> {
  return { ...META, points: await loadPoints() }
}

async function loadPoints(): Promise<YearValue[]> {
  try {
    const res = await fetch(UPSTREAM)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return aggregate(await res.text())
  } catch (err) {
    console.warn(`  house-price-landreg: upstream fetch failed (${(err as Error).message}), using seed`)
    return parseSeed(await readFile(SEED, "utf8"))
  }
}

function aggregate(csv: string): YearValue[] {
  const result = Papa.parse<Record<string, string>>(csv.trim(), {
    header: true,
    skipEmptyLines: true,
  })
  const byYear = new Map<number, number[]>()
  for (const row of result.data) {
    if (row["Region_Name"] !== "United Kingdom") continue
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

function parseSeed(csv: string): YearValue[] {
  const result = Papa.parse<{ year: string; uk_average_price: string }>(csv.trim(), {
    header: true,
    skipEmptyLines: true,
  })
  return result.data
    .map((r) => ({ year: Number(r.year), value: Number(r.uk_average_price) }))
    .filter((r) => Number.isFinite(r.year) && Number.isFinite(r.value))
    .sort((a, b) => a.year - b.year)
}
