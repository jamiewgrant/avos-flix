import type { Series } from "../../src/types/series.ts"

const META = {
  id: "persons-per-household",
  name: "Persons per household (avg)",
  description: "Average UK household size from census + ONS Families and Households. Slow-moving but unmistakable downward trend: more solo earners absorbing the costs that used to be split.",
  unit: "count" as const,
  color: "#d8b4fe",
  source: {
    name: "ONS — Families and households / UK Census + General Register Office (pre-1961)",
    url: "https://www.ons.gov.uk/peoplepopulationandcommunity/populationandmigration/populationestimates/datasets/familiesandhouseholdsfamiliesandhouseholds",
  },
  region: "uk",
}

const POINTS = [
  // Pre-1961 — General Register Office census-era estimates
  { year: 1953, value: 3.20 },
  { year: 1955, value: 3.16 },
  // Census + ONS Families and Households
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
