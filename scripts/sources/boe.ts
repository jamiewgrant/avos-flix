import Papa from "papaparse"
import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import type { YearValue } from "../../src/types/series.ts"

const UPSTREAM = "https://datahub.io/core/interest-rates-gb/_r/-/data/data.csv"
const SEED = resolve("scripts/seed/boe-rate-daily.csv")

interface RateChange { date: string; rate: number }

export async function fetchBoeRate(): Promise<YearValue[]> {
  const changes = await loadChanges()
  return aggregateAnnualMean(changes)
}

async function loadChanges(): Promise<RateChange[]> {
  try {
    const res = await fetch(UPSTREAM)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return parseCsv(await res.text())
  } catch (err) {
    console.warn(`  boe: upstream fetch failed (${(err as Error).message}), using seed`)
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

// Time-weighted annual mean rate from a step-function series of rate changes.
function aggregateAnnualMean(changes: RateChange[]): YearValue[] {
  if (changes.length === 0) return []
  const startYear = new Date(changes[0].date).getUTCFullYear()
  const endYear = new Date().getUTCFullYear()
  const out: YearValue[] = []

  for (let year = startYear; year <= endYear; year++) {
    const yearStart = Date.UTC(year, 0, 1)
    const nextYearStart = Date.UTC(year + 1, 0, 1)

    // Find the rate in effect at the start of the year.
    let rate = changes[0].rate
    for (const c of changes) {
      const t = Date.parse(c.date)
      if (t <= yearStart) rate = c.rate
      else break
    }

    // Walk through changes during the year, accumulating time-weighted sum.
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

    const meanRate = weightedSum / (nextYearStart - yearStart)
    out.push({ year, value: Math.round(meanRate * 100) / 100 })
  }
  return out
}
