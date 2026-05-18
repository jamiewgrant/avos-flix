import Papa from "papaparse"
import type { Series, YearValue } from "../../src/types/series.ts"

const UPSTREAM = "https://datahub.io/core/house-prices-uk/_r/-/data/data.csv"

const META = {
  id: "house-price-nationwide",
  name: "House prices (Nationwide HPI)",
  description: "UK Nationwide House Price Index, quarterly from Feb 1953. Aggregated to annual mean of the 'Price (All)' column. Methodology differs from Land Registry HPI — included for the longer back-series.",
  unit: "GBP" as const,
  color: "#a78bfa",
  source: {
    name: "Nationwide via datahub.io mirror",
    url: "https://datahub.io/core/house-prices-uk",
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
    console.warn(`  house-price-nationwide: upstream fetch failed (${(err as Error).message}), no seed`)
    return []
  }
}

function aggregate(csv: string): YearValue[] {
  const result = Papa.parse<Record<string, string>>(csv.trim(), {
    header: true,
    skipEmptyLines: true,
  })
  const byYear = new Map<number, number[]>()
  for (const row of result.data) {
    const year = Number(row["Date"]?.slice(0, 4) ?? "")
    const price = Number(row["Price (All)"] ?? "")
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
