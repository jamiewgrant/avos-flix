import Papa from "papaparse"
import * as XLSX from "xlsx"
import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import type { Series, YearValue } from "../../src/types/series.ts"

// ONS earnings time series — gross weekly earnings for ADULT FULL-TIME employees.
// UK sheet (1997+) and GB sheet (1968+). Combined median is only present from
// 1984 onwards; pre-1984 we use Adult Male median scaled to the Combined level
// at the 1984 overlap (a proxy, marked in the description).
const UPSTREAM = "https://www.ons.gov.uk/file?uri=/employmentandlabourmarket/peopleinwork/earningsandworkinghours/datasets/earningstimeseriesofmediangrossweeklyearningsfrom1968to2022/current/19682025.xlsx"
const SEED = resolve("scripts/seed/ashe-annual.csv")

const META = {
  id: "median-wage",
  name: "Median wage (full-time, annual)",
  description: "UK median gross annual pay, adult full-time employees. Weekly ONS NES/ASHE figures × 52. Combined male+female median is published from 1984 onwards. For 1968-1983 we use the Adult Male median scaled by the male-to-combined ratio at 1984 (proxy, since combined wasn't published in the NES era).",
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
  const candidates = [UPSTREAM, UPSTREAM.replace("www.ons.gov.uk", "cdn.ons.gov.uk")]
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

interface SheetExtract {
  combined: Map<number, number>
  male: Map<number, number>
}

function parseXlsx(buf: ArrayBuffer): YearValue[] {
  const wb = XLSX.read(buf, { type: "array" })
  const ukSheet = wb.SheetNames.find((n) => /uk\s*median/i.test(n))
  const gbSheet = wb.SheetNames.find((n) => /gb\s*median/i.test(n))

  const uk = ukSheet ? parseSheet(wb.Sheets[ukSheet]) : { combined: new Map(), male: new Map() }
  const gb = gbSheet ? parseSheet(wb.Sheets[gbSheet]) : { combined: new Map(), male: new Map() }

  // Find scale factor: how does Combined compare to Male at the earliest year both exist?
  const overlapYears = [...gb.male.keys()].filter((y) => gb.combined.has(y))
  let scaleFactor = 0.85 // sensible fallback if no overlap data
  if (overlapYears.length > 0) {
    const ratios = overlapYears.map((y) => gb.combined.get(y)! / gb.male.get(y)!)
    scaleFactor = ratios.reduce((a, b) => a + b, 0) / ratios.length
  }

  // Build series: scale-shifted Male as best-available pre-1984, then GB combined,
  // then UK combined (canonical, 1997+).
  const merged = new Map<number, number>()
  for (const [y, v] of gb.male) {
    if (!gb.combined.has(y)) merged.set(y, v * scaleFactor)
  }
  for (const [y, v] of gb.combined) merged.set(y, v)
  for (const [y, v] of uk.combined) merged.set(y, v)

  return [...merged.entries()]
    .map(([year, weekly]) => ({ year, value: Math.round(weekly * 52) }))
    .sort((a, b) => a.year - b.year)
}

// Row 6 has group headers (Adult Male / Adult Female / Male & Female Adult);
// row 7 has percentile labels under each group. Median lives 4 columns past
// each header (0.1, _, 0.25, _, 0.5).
function parseSheet(sheet: XLSX.WorkSheet): SheetExtract {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true })
  const headerRow = rows[6]
  const combined = new Map<number, number>()
  const male = new Map<number, number>()
  if (!Array.isArray(headerRow)) return { combined, male }

  let maleHeaderCol = -1
  let combinedHeaderCol = -1
  for (let c = 0; c < headerRow.length; c++) {
    const cell = headerRow[c]
    if (typeof cell !== "string") continue
    if (/^adult\s+male\b/i.test(cell.trim()) && maleHeaderCol === -1) maleHeaderCol = c
    if (/male\s*&\s*female/i.test(cell)) combinedHeaderCol = c
  }
  const maleCol = maleHeaderCol === -1 ? -1 : maleHeaderCol + 4
  const combinedCol = combinedHeaderCol === -1 ? -1 : combinedHeaderCol + 4

  for (const row of rows) {
    if (!Array.isArray(row)) continue
    const year = toNumber(row[0])
    if (!(year >= 1968 && year <= 2030)) continue
    const m = maleCol === -1 ? NaN : toNumber(row[maleCol])
    const c = combinedCol === -1 ? NaN : toNumber(row[combinedCol])
    if (Number.isFinite(m) && m > 0) male.set(year, m)
    if (Number.isFinite(c) && c > 0) combined.set(year, c)
  }
  return { combined, male }
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
