import type { Series } from "../../src/types/series.ts"

const META = {
  id: "net-migration",
  name: "Net long-term international migration",
  description: "UK net long-term international migration, thousands of people. 2012+ uses the ONS admin-data methodology; pre-2012 uses the legacy IPS-based estimates (not strictly comparable). Pre-1990 values are decadal estimates from House of Commons Library research.",
  unit: "count" as const,
  color: "#06b6d4",
  source: {
    name: "ONS — Long-term international migration (+ HoC Library pre-1990 estimates)",
    url: "https://www.ons.gov.uk/peoplepopulationandcommunity/populationandmigration/internationalmigration",
  },
  region: "uk",
  verifiedFrom: 1991,
}

const POINTS = [
  // Pre-1990 — HoC Library estimates, lower-precision
  { year: 1953, value: 0 },
  { year: 1955, value: 20 },
  { year: 1960, value: 50 },
  { year: 1965, value: 20 },
  { year: 1970, value: -50 },
  { year: 1975, value: -30 },
  { year: 1980, value: -55 },
  { year: 1985, value: 30 },
  { year: 1990, value: 50 },
  // ONS legacy IPS series
  { year: 1991, value: 35 },
  { year: 1995, value: 76 },
  { year: 2000, value: 163 },
  { year: 2005, value: 268 },
  { year: 2010, value: 256 },
  // ONS admin-data methodology (2012+)
  { year: 2015, value: 329 },
  { year: 2019, value: 271 },
  { year: 2020, value: 94 },
  { year: 2021, value: 488 },
  { year: 2022, value: 745 },
  { year: 2023, value: 685 },
  { year: 2024, value: 431 },
]

export async function fetchSeries(): Promise<Series> {
  return { ...META, points: POINTS }
}
