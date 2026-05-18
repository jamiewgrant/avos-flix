import Papa from "papaparse"
import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import type { YearValue } from "../../src/types/series.ts"

const SEED = resolve("scripts/seed/ashe-annual.csv")

// ASHE is published only as a zipped XLSX (Table 1). We keep a curated CSV
// in scripts/seed/ — append one row per year when ONS publishes the October release.
export async function fetchMedianWage(): Promise<YearValue[]> {
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
