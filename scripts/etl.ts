import { mkdir, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import type { Series, SeriesData } from "../src/types/series.ts"

import { fetchSeries as fetchBoe } from "./sources/boe.ts"
import { fetchSeries as fetchLandReg } from "./sources/landRegistry.ts"
import { fetchSeries as fetchNationwide } from "./sources/nationwide.ts"
import { fetchSeries as fetchAshe } from "./sources/ashe.ts"
import { fetchSeries as fetchCpih } from "./sources/cpih.ts"
import { fetchSeries as fetchHouseholdIncome } from "./sources/household-income.ts"
import { fetchSeries as fetchEnergy } from "./sources/energy.ts"
import { fetchSeries as fetchRent } from "./sources/rent.ts"
import { fetchSeries as fetchNetflix } from "./sources/netflix.ts"
import { fetchSeries as fetchAvocado } from "./sources/avocado.ts"
import { fetchSeries as fetchBirths } from "./sources/births.ts"
import { fetchSeries as fetchMigration } from "./sources/migration.ts"
import { fetchSeries as fetchHouseholdSize } from "./sources/household-size.ts"

const SOURCES = [
  fetchBoe,
  fetchLandReg,
  fetchNationwide,
  fetchCpih,
  fetchAshe,
  fetchHouseholdIncome,
  fetchEnergy,
  fetchRent,
  fetchNetflix,
  fetchAvocado,
  fetchBirths,
  fetchMigration,
  fetchHouseholdSize,
]

const OUT_DIR = resolve("public", "data")
const OUT_FILE = resolve(OUT_DIR, "series.json")

async function main() {
  console.log("Running ETL…")
  const fetched = await Promise.all(SOURCES.map(safeFetch))
  const seriesList = fetched.filter((s): s is Series => s !== null)
  const series = Object.fromEntries(seriesList.map((s) => [s.id, s]))

  const data: SeriesData = {
    series,
    metadata: { generatedAt: new Date().toISOString() },
  }

  await mkdir(OUT_DIR, { recursive: true })
  await writeFile(OUT_FILE, JSON.stringify(data, null, 2))
  console.log(`Wrote ${OUT_FILE} (${seriesList.length} series)`)
}

async function safeFetch(fn: () => Promise<Series>): Promise<Series | null> {
  try {
    const s = await fn()
    console.log(`  ${s.id}: ${s.points.length} points`)
    return s
  } catch (err) {
    console.error(`  FAILED: ${(err as Error).message}`)
    return null
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
