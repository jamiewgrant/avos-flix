import type { Series } from "../../src/types/series.ts"

const META = {
  id: "avocado-uk",
  name: "Avocado (single supermarket avg)",
  description: "Approximate UK supermarket avocado retail price per unit. ⚠️ No clean canonical source — values are based on retail surveys and archived supermarket listings, included for the joke. Treat as illustrative.",
  unit: "GBP" as const,
  color: "#84cc16",
  source: {
    name: "Mixed retail surveys / archived supermarket listings",
    url: "https://www.ons.gov.uk/economy/inflationandpriceindices",
  },
  region: "uk",
}

// Approximate single-avocado retail price at major UK supermarkets, year-end.
// Pre-2010 avocados were a specialty item with limited supermarket presence.
const POINTS = [
  { year: 2008, value: 0.50 },
  { year: 2012, value: 0.65 },
  { year: 2015, value: 0.80 },
  { year: 2018, value: 0.85 },
  { year: 2020, value: 0.90 },
  { year: 2022, value: 1.10 },
  { year: 2024, value: 1.15 },
  { year: 2025, value: 1.20 },
]

export async function fetchSeries(): Promise<Series> {
  return { ...META, points: POINTS }
}
