import Papa from "papaparse"
import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import type { Series, YearValue } from "../../src/types/series.ts"

const SEED = resolve("scripts/seed/ashe-annual.csv")

const META = {
  id: "median-wage",
  name: "Median wage (full-time, annual)",
  description: "UK median gross annual pay, full-time employees. NES (1970-1996) spliced to ASHE (1997+). ONS warns the two surveys aren't directly comparable — treat the pre-1997 portion as the best-available back-series.",
  unit: "GBP" as const,
  color: "#60a5fa",
  source: {
    name: "ONS — NES (1970-1996) + ASHE Table 1 (1997+)",
    url: "https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/earningsandworkinghours/datasets/earningstimeseriesofmediangrossweeklyearningsfrom1968to2022",
  },
  region: "uk",
}

export async function fetchSeries(): Promise<Series> {
  return { ...META, points: await loadPoints() }
}

async function loadPoints(): Promise<YearValue[]> {
  const csv = await readFile(SEED, "utf8")
  const result = Papa.parse<{ year: string; median_annual_pay: string }>(csv.trim(), {
    header: true,
    skipEmptyLines: true,
  })
  return result.data
    .map((r) => ({ year: Number(r.year), value: Number(r.median_annual_pay) }))
    .filter((r) => Number.isFinite(r.year) && Number.isFinite(r.value))
    .sort((a, b) => a.year - b.year)
}
