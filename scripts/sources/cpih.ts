import Papa from "papaparse"
import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import type { Series, YearValue } from "../../src/types/series.ts"

const UPSTREAM = "https://www.ons.gov.uk/generator?format=csv&uri=/economy/inflationandpriceindices/timeseries/l522/mm23"
const SEED = resolve("scripts/seed/cpih-annual.csv")

const META = {
  id: "cpih",
  name: "Inflation (CPIH)",
  description: "ONS Consumer Prices Index including owner-occupier housing costs, 2015 = 100. Coverage from 1988.",
  unit: "index" as const,
  color: "#34d399",
  source: {
    name: "ONS — Consumer Prices Index (l522/mm23)",
    url: "https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/l522/mm23",
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
    return parseOnsTimeseries(await res.text())
  } catch (err) {
    console.warn(`  cpih: upstream fetch failed (${(err as Error).message}), using seed`)
    return parseSeed(await readFile(SEED, "utf8"))
  }
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
