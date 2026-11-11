import Papa from "papaparse"
import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import type { Series } from "../../src/types/series.ts"

const SEED = resolve("scripts/seed/food-cpi.csv")

// ONS CPIH food and non-alcoholic beverages sub-index (2015 = 100).
// Series ID on ONS time series explorer: search for "CZHS" or CPIH food sub-index.
// This seed uses annual average values derived from published ONS food CPI annual
// change rates. verifiedFrom: 2005 when ONS CPIH food sub-index began; pre-2005
// values are estimated from the RPI food component, rebased to align at 2005.
const META = {
  id: "food-cpi",
  name: "Food & drink price index (CPIH)",
  description:
    "ONS CPIH food and non-alcoholic beverages sub-index, 2015 = 100. Food rose ~39% from 2015 to 2023, vs 29% for CPIH overall — the 2022-23 cost-of-living spike was disproportionately a food crisis. Pre-2005 estimated from RPI food component.",
  unit: "index" as const,
  color: "#ca8a04",
  source: {
    name: "ONS — CPIH food & non-alcoholic beverages sub-index",
    url: "https://www.ons.gov.uk/economy/inflationandpriceindices",
  },
  region: "uk",
  verifiedFrom: 2005,
}

export async function fetchSeries(): Promise<Series> {
  const raw = await readFile(SEED, "utf8")
  const result = Papa.parse<{ year: string; index: string }>(raw.trim(), {
    header: true,
    skipEmptyLines: true,
  })
  const points = result.data
    .map((r) => ({ year: Number(r.year), value: Number(r.index) }))
    .filter((p) => Number.isFinite(p.year) && Number.isFinite(p.value))
    .sort((a, b) => a.year - b.year)
  return { ...META, points }
}
