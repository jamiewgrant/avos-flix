import Papa from "papaparse"
import * as XLSX from "xlsx"
import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import type { Series, YearValue } from "../../src/types/series.ts"

// ONS earnings time series — gross weekly earnings for ADULT FULL-TIME employees,
// percentiles + median by sex. Has a UK sheet (1997+) and a GB sheet (1968+).
const UPSTREAM = "https://www.ons.gov.uk/file?uri=/employmentandlabourmarket/peopleinwork/earningsandworkinghours/datasets/earningstimeseriesofmediangrossweeklyearningsfrom1968to2022/current/19682025.xlsx"
const SEED = resolve("scripts/seed/ashe-annual.csv")

const META = {
  id: "median-wage",
  name: "Median wage (full-time, annual)",
  description: "UK median gross annual pay, adult full-time employees. Weekly figures from the ONS NES/ASHE earnings time series × 52. Pre-1997 uses the GB sheet (NES era — UK series doesn't exist before ASHE); 1997+ uses the UK sheet. Combined male & female median.",
  unit: "GBP" as const,
  color: "#60a5fa",
  source: {
    name: "ONS — earnings time series of median gross weekly earnings 1968 to latest",
    url: "https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/earningsandworkinghours/datasets/earningstimeseriesofmediangrossweeklyearningsfrom1968to2022",
  },
  region: "uk",
}

export async function fetchSeries(): Promise<Series> {
  return { ...META, points: await loadPoints() }
}

async function loadPoints(): Promise<YearValue[]> {
  const candidates = [
    UPSTREAM,
    UPSTREAM.replace("www.ons.gov.uk", "cdn.ons.gov.uk"),
  ]
  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (avos-flix-etl)",
          Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,*/*",
        },
      })
      if (!res.ok) continue
      const buf = await res.arrayBuffer()
      const points = parseXlsx(buf)
      if (points.length > 0) return points
    } catch {
      // try next candidate
    }
  }
  console.warn(`  median-wage: upstream unavailable, using seed`)
  return parseSeed(await readFile(SEED, "utf8"))
}

function parseXlsx(buf: ArrayBuffer): YearValue[] {
  const wb = XLSX.read(buf, { type: "array" })
  const ukSheetName = wb.SheetNames.find((n) => /uk\s*median/i.test(n))
  const gbSheetName = wb.SheetNames.find((n) => /gb\s*median/i.test(n))

  const ukData = ukSheetName ? parseSheet(wb.Sheets[ukSheetName]) : new Map<number, number>()
  const gbData = gbSheetName ? parseSheet(wb.Sheets[gbSheetName]) : new Map<number, number>()

  // Prefer UK (1997+), fall back to GB for pre-1997 to extend back to 1968.
  const merged = new Map<number, number>(gbData)
  for (const [y, v] of ukData) merged.set(y, v)

  return [...merged.entries()]
    .map(([year, weekly]) => ({ year, value: Math.round(weekly * 52) }))
    .sort((a, b) => a.year - b.year)
}

// In these sheets, row 6 has group headers (Adult Male / Adult Female / Male & Female Adult),
// and row 7 has the percentile labels (0.1, 0.25, 0.5, 0.75, 0.9) under each group.
// The combined median sits 4 columns past the "Male & Female Adult" header (the 0.5 cell).
function parseSheet(sheet: XLSX.WorkSheet): Map<number, number> {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true })
  const headerRow = rows[6]
  if (!Array.isArray(headerRow)) return new Map()

  let combinedHeaderCol = -1
  for (let c = 0; c < headerRow.length; c++) {
    const cell = headerRow[c]
    if (typeof cell === "string" && /male\s*&\s*female/i.test(cell)) {
      combinedHeaderCol = c
      break
    }
  }
  if (combinedHeaderCol === -1) return new Map()
  const medianCol = combinedHeaderCol + 4

  const out = new Map<number, number>()
  for (const row of rows) {
    if (!Array.isArray(row)) continue
    const year = toNumber(row[0])
    const weekly = toNumber(row[medianCol])
    if (year >= 1968 && year <= 2030 && weekly > 0) {
      out.set(year, weekly)
    }
  }
  return out
}

function toNumber(v: unknown): number {
  if (typeof v === "number") return v
  if (typeof v === "string") return Number(v.replace(/[£,\s]/g, ""))
  return NaN
}

function parseSeed(csv: string): YearValue[] {
  const result = Papa.parse<{ year: string; median_annual_pay: string }>(csv.trim(), {
    header: true,
    skipEmptyLines: true,
  })
  return result.data
    .map((r) => ({ year: Number(r.year), value: Number(r.median_annual_pay) }))
    .filter((r) => Number.isFinite(r.year) && Number.isFinite(r.value))
    .sort((a, b) => a.year - b.year)
}
