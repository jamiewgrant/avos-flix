import Papa from "papaparse"
import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import type { Series, YearValue } from "../../src/types/series.ts"

const SEED = resolve("scripts/seed/ashe-annual.csv")

const META = {
  id: "median-wage-ashe",
  name: "Median wage (ASHE)",
  description: "UK median gross annual pay, full-time employees, from ONS ASHE Table 1. Manually curated — append to scripts/seed/ashe-annual.csv each October.",
  unit: "GBP" as const,
  color: "#60a5fa",
  source: {
    name: "ONS — Annual Survey of Hours and Earnings, Table 1",
    url: "https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/earningsandworkinghours/datasets/allemployeesashetable1",
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
