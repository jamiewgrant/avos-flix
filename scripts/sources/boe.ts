import Papa from "papaparse"
import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import type { Series, YearValue } from "../../src/types/series.ts"

const UPSTREAM = "https://datahub.io/core/interest-rates-gb/_r/-/data/data.csv"
const SEED = resolve("scripts/seed/boe-rate-daily.csv")

const META = {
  id: "boe-rate",
  name: "Bank of England Bank Rate",
  description: "Official Bank Rate, time-weighted annual mean. Counters the 'rates were 15% in the 80s' rebuttal.",
  unit: "percent" as const,
  color: "#fb923c",
  source: {
    name: "Bank of England via datahub.io mirror",
    url: "https://datahub.io/core/interest-rates-gb",
  },
  region: "uk",
}

export async function fetchSeries(): Promise<Series> {
  const changes = await loadChanges()
  return { ...META, points: aggregateAnnualMean(changes) }
}

interface RateChange { date: string; rate: number }

async function loadChanges(): Promise<RateChange[]> {
  try {
    const res = await fetch(UPSTREAM)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return parseCsv(await res.text())
  } catch (err) {
    console.warn(`  boe-rate: upstream fetch failed (${(err as Error).message}), using seed`)
    return parseCsv(await readFile(SEED, "utf8"))
  }
}

function parseCsv(csv: string): RateChange[] {
  const result = Papa.parse<{ date: string; rate: string }>(csv.trim(), {
    header: true,
    skipEmptyLines: true,
  })
  return result.data
    .map((r) => ({ date: r.date, rate: Number(r.rate) }))
    .filter((r) => r.date && Number.isFinite(r.rate))
    .sort((a, b) => a.date.localeCompare(b.date))
}

function aggregateAnnualMean(changes: RateChange[]): YearValue[] {
  if (changes.length === 0) return []
  const startYear = new Date(changes[0].date).getUTCFullYear()
  const endYear = new Date().getUTCFullYear()
  const out: YearValue[] = []

  for (let year = startYear; year <= endYear; year++) {
    const yearStart = Date.UTC(year, 0, 1)
    const nextYearStart = Date.UTC(year + 1, 0, 1)

    let rate = changes[0].rate
    for (const c of changes) {
      const t = Date.parse(c.date)
      if (t <= yearStart) rate = c.rate
      else break
    }

    let cursor = yearStart
    let weightedSum = 0
    for (const c of changes) {
      const t = Date.parse(c.date)
      if (t <= yearStart) continue
      if (t >= nextYearStart) break
      weightedSum += rate * (t - cursor)
      cursor = t
      rate = c.rate
    }
    weightedSum += rate * (nextYearStart - cursor)

    out.push({ year, value: Math.round((weightedSum / (nextYearStart - yearStart)) * 100) / 100 })
  }
  return out
}
