import Papa from "papaparse"
import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import type { Series, YearValue } from "../../src/types/series.ts"

const UPSTREAM = "https://www.ons.gov.uk/generator?format=csv&uri=/economy/grossdomesticproductgdp/timeseries/crxs/ukea"
const SEED = resolve("scripts/seed/household-income-annual.csv")

const META = {
  id: "household-income",
  name: "Household disposable income (per head)",
  description: "UK gross disposable household income per head, current price £, seasonally adjusted. The 'how much does each person have to play with after tax' line — useful counterweight to wages.",
  unit: "GBP" as const,
  color: "#38bdf8",
  source: {
    name: "ONS — Household disposable income per head (CRXS)",
    url: "https://www.ons.gov.uk/economy/grossdomesticproductgdp/timeseries/crxs/ukea",
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
    console.warn(`  household-income: upstream fetch failed (${(err as Error).message}), using seed`)
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
  const result = Papa.parse<{ year: string; value: string }>(csv.trim(), {
    header: true,
    skipEmptyLines: true,
  })
  return result.data
    .map((r) => ({ year: Number(r.year), value: Number(r.value) }))
    .filter((r) => Number.isFinite(r.year) && Number.isFinite(r.value))
    .sort((a, b) => a.year - b.year)
}
