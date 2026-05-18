import type { Series } from "../../src/types/series.ts"

const META = {
  id: "net-migration",
  name: "Net long-term international migration",
  description: "UK net long-term international migration, thousands of people, year ending June. Pre-2012 estimates use a different methodology and are not directly comparable to the post-2012 series.",
  unit: "count" as const,
  color: "#06b6d4",
  source: {
    name: "ONS — Long-term international migration",
    url: "https://www.ons.gov.uk/peoplepopulationandcommunity/populationandmigration/internationalmigration",
  },
  region: "uk",
}

// Net migration to UK (thousands). Values pre-2012 from legacy IPS-based estimates;
// 2012+ use the new admin-data based methodology.
const POINTS = [
  { year: 1991, value: 35 },
  { year: 1995, value: 76 },
  { year: 2000, value: 163 },
  { year: 2005, value: 268 },
  { year: 2010, value: 256 },
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
