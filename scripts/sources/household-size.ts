import type { Series } from "../../src/types/series.ts"

const META = {
  id: "persons-per-household",
  name: "Persons per household (avg)",
  description: "Average UK household size from census and ONS Families and Households estimates. Slow-moving but unmistakable downward trend — more solo earners covering all the costs themselves.",
  unit: "count" as const,
  color: "#d8b4fe",
  source: {
    name: "ONS — Families and households / UK Census",
    url: "https://www.ons.gov.uk/peoplepopulationandcommunity/populationandmigration/populationestimates/datasets/familiesandhouseholdsfamiliesandhouseholds",
  },
  region: "uk",
}

const POINTS = [
  { year: 1961, value: 3.09 },
  { year: 1971, value: 2.91 },
  { year: 1981, value: 2.71 },
  { year: 1991, value: 2.48 },
  { year: 2001, value: 2.36 },
  { year: 2011, value: 2.35 },
  { year: 2021, value: 2.36 },
  { year: 2024, value: 2.36 },
]

export async function fetchSeries(): Promise<Series> {
  return { ...META, points: POINTS }
}
