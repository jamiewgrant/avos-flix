import { mkdir, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import type { RegionSeries, SeriesData, YearValue } from "../src/types/series.ts"

import { fetchBoeRate } from "./sources/boe.ts"
import { fetchHousePrice } from "./sources/landRegistry.ts"
import { fetchMedianWage } from "./sources/ashe.ts"
import { fetchCpih } from "./sources/cpih.ts"

const OUT_DIR = resolve("public", "data")
const OUT_FILE = resolve(OUT_DIR, "series.json")

async function buildUkSeries(): Promise<RegionSeries> {
  const [medianWage, housePrice, boeRate, cpih] = await Promise.all([
    safe("medianWage", fetchMedianWage),
    safe("housePrice", fetchHousePrice),
    safe("boeRate", fetchBoeRate),
    safe("cpih", fetchCpih),
  ])
  return { medianWage, housePrice, boeRate, cpih }
}

async function safe(
  name: string,
  fn: () => Promise<YearValue[]>,
): Promise<YearValue[]> {
  try {
    const data = await fn()
    console.log(`  ${name}: ${data.length} points`)
    return data
  } catch (err) {
    console.error(`  ${name}: FAILED — ${(err as Error).message}`)
    return []
  }
}

async function main() {
  console.log("Running ETL…")
  const uk = await buildUkSeries()

  const series: SeriesData = {
    regions: {
      uk,
      london: { medianWage: [], housePrice: [], boeRate: [], cpih: [] },
      northEast: { medianWage: [], housePrice: [], boeRate: [], cpih: [] },
    },
    metadata: {
      generatedAt: new Date().toISOString(),
      sources: {
        medianWage: {
          name: "ONS — Annual Survey of Hours and Earnings (ASHE)",
          url: "https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/earningsandworkinghours/datasets/allemployeesashetable1",
          lastFetched: new Date().toISOString(),
        },
        housePrice: {
          name: "HM Land Registry — UK House Price Index",
          url: "https://www.gov.uk/government/statistical-data-sets/uk-house-price-index-data-downloads",
          lastFetched: new Date().toISOString(),
        },
        boeRate: {
          name: "Bank of England — Official Bank Rate history",
          url: "https://www.bankofengland.co.uk/boeapps/database/Bank-Rate.asp",
          lastFetched: new Date().toISOString(),
        },
        cpih: {
          name: "ONS — Consumer price inflation (CPIH)",
          url: "https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/l522/mm23",
          lastFetched: new Date().toISOString(),
        },
      },
    },
  }

  await mkdir(OUT_DIR, { recursive: true })
  await writeFile(OUT_FILE, JSON.stringify(series, null, 2))
  console.log(`Wrote ${OUT_FILE}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
