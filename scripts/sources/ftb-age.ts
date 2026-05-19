import type { Series } from "../../src/types/series.ts"

const META = {
  id: "ftb-age",
  name: "First-time buyer average age (UK)",
  description: "Average age of UK first-time buyers based on mortgage completions. Combines HMRC / CML / UK Finance / Halifax FTB tracker historical figures. Pre-1995 reflects industry estimates (dashed).",
  unit: "rate" as const,
  color: "#a3a3a3",
  source: {
    name: "UK Finance / Halifax First-Time Buyer Review",
    url: "https://www.ukfinance.org.uk/data-and-research",
  },
  region: "uk",
  verifiedFrom: 1995,
}

const POINTS = [
  { year: 1960, value: 23 },
  { year: 1970, value: 24 },
  { year: 1980, value: 25 },
  { year: 1990, value: 28 },
  { year: 1995, value: 29 },
  { year: 2000, value: 30 },
  { year: 2005, value: 31 },
  { year: 2008, value: 32 },
  { year: 2010, value: 31 },
  { year: 2013, value: 30 },
  { year: 2015, value: 30 },
  { year: 2017, value: 31 },
  { year: 2019, value: 32 },
  { year: 2021, value: 32 },
  { year: 2023, value: 33 },
  { year: 2024, value: 34 },
  { year: 2025, value: 34 },
  { year: 2026, value: 34 },
]

export async function fetchSeries(): Promise<Series> {
  return { ...META, points: POINTS }
}
