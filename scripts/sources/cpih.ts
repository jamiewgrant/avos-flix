import Papa from "papaparse"
import * as XLSX from "xlsx"
import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import type { Series, YearValue } from "../../src/types/series.ts"

// Current ONS CPIH (1988+, 2015 = 100).
const CURRENT_URL =
  "https://www.ons.gov.uk/generator?format=csv&uri=/economy/inflationandpriceindices/timeseries/l522/mm23"
// ONS historical modelled CPIH (1949-1988, 1965 = 100) — non-National-Statistic.
const HISTORICAL_URL =
  "https://www.ons.gov.uk/file?uri=/economy/inflationandpriceindices/datasets/consumerpriceinflationhistoricaldatauk1950to1988/1950to1988/publicationtablesdataset.xlsx"
const SEED = resolve("scripts/seed/cpih-annual.csv")

const META = {
  id: "cpih",
  name: "Inflation (CPIH)",
  description: "ONS Consumer Prices Index including owner-occupier housing costs, 2015 = 100. National Statistic 1988+; pre-1988 are ONS modelled historical estimates rebased to the modern 2015 base via the 1988 overlap. Pre-1988 portion is officially flagged as 'not National Statistics' by ONS.",
  unit: "index" as const,
  color: "#34d399",
  source: {
    name: "ONS — CPIH (l522/mm23) + Consumer Price Inflation historical 1950 to 1988",
    url: "https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/l522/mm23",
  },
  region: "uk",
}

export async function fetchSeries(): Promise<Series> {
  const [current, historicalRaw] = await Promise.all([fetchCurrent(), fetchHistorical()])

  // Rebase historical (1965=100) to current (2015=100) via the 1988 overlap.
  let historical: YearValue[] = []
  if (current.length > 0 && historicalRaw.length > 0) {
    const overlapYear = historicalRaw[historicalRaw.length - 1].year
    const hist = historicalRaw.find((p) => p.year === overlapYear)
    const curr = current.find((p) => p.year === overlapYear)
    if (hist && curr && hist.value > 0) {
      const factor = curr.value / hist.value
      historical = historicalRaw
        .filter((p) => p.year < overlapYear) // current wins at overlap
        .map((p) => ({ year: p.year, value: Math.round(p.value * factor * 10) / 10 }))
    }
  }

  const merged = new Map<number, number>()
  for (const p of historical) merged.set(p.year, p.value)
  for (const p of current) merged.set(p.year, p.value)

  return {
    ...META,
    points: [...merged.entries()]
      .map(([year, value]) => ({ year, value }))
      .sort((a, b) => a.year - b.year),
  }
}

async function fetchCurrent(): Promise<YearValue[]> {
  try {
    const res = await fetch(CURRENT_URL)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return parseOnsTimeseries(await res.text())
  } catch (err) {
    console.warn(`  cpih (current): fetch failed (${(err as Error).message}), using seed`)
    return parseSeed(await readFile(SEED, "utf8"))
  }
}

async function fetchHistorical(): Promise<YearValue[]> {
  try {
    const res = await fetch(HISTORICAL_URL, {
      headers: { "User-Agent": "Mozilla/5.0 (avos-flix-etl)" },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const buf = await res.arrayBuffer()
    return parseHistoricalXlsx(buf)
  } catch (err) {
    console.warn(`  cpih (historical): fetch/parse failed (${(err as Error).message})`)
    return []
  }
}

// Table 1: monthly CPIH index 1949-1988, base 1965=100. Aggregate to annual mean.
function parseHistoricalXlsx(buf: ArrayBuffer): YearValue[] {
  const wb = XLSX.read(buf, { type: "array" })
  const sheet = wb.Sheets["Table 1"]
  if (!sheet) return []

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true })
  const byYear = new Map<number, number[]>()
  for (const row of rows) {
    if (!Array.isArray(row)) continue
    const period = String(row[0] ?? "")
    const raw = row[1]
    const value = typeof raw === "number" ? raw : Number(raw)
    if (!Number.isFinite(value)) continue

    const m = period.trim().match(/^([A-Za-z]{3})\s*(\d{4})$/)
    if (!m) continue
    const year = Number(m[2])
    if (!(year >= 1949 && year <= 1988)) continue

    const list = byYear.get(year) ?? []
    list.push(value)
    byYear.set(year, list)
  }

  const out: YearValue[] = []
  for (const [year, values] of [...byYear.entries()].sort((a, b) => a[0] - b[0])) {
    if (values.length === 0) continue
    const mean = values.reduce((s, v) => s + v, 0) / values.length
    out.push({ year, value: Math.round(mean * 100) / 100 })
  }
  return out
}

function parseOnsTimeseries(csv: string): YearValue[] {
  const out: YearValue[] = []
  for (const raw of csv.split(/\r?\n/)) {
    const m = raw.match(/^\s*"?(\d{4})"?\s*,\s*"?(-?\d+(?:\.\d+)?)"?\s*$/)
    if (m) out.push({ year: Number(m[1]), value: Number(m[2]) })
  }
  return out.sort((a, b) => a.year - b.year)
}

function parseSeed(csv: string): YearValue[] {
  const result = Papa.parse<{ year: string; index: string }>(csv.trim(), {
    header: true,
    skipEmptyLines: true,
  })
  return result.data
    .map((r) => ({ year: Number(r.year), value: Number(r.index) }))
    .filter((r) => Number.isFinite(r.year) && Number.isFinite(r.value))
    .sort((a, b) => a.year - b.year)
}
