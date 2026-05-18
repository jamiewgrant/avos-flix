import type { Series } from "../../src/types/series.ts"

const META = {
  id: "netflix-uk",
  name: "Netflix UK Standard plan (annual)",
  description: "Annual cost of Netflix UK Standard plan (monthly price × 12). Tiers were reshuffled in 2024 — values use the modal Standard tier of each year. Included tongue-in-cheek because the original 'avocado toast and Netflix' rhetoric named it.",
  unit: "GBP" as const,
  color: "#ef4444",
  source: {
    name: "Netflix UK pricing history (press releases + archived plan pages)",
    url: "https://help.netflix.com/en-gb/node/24926",
  },
  region: "uk",
}

const POINTS = [
  { year: 2012, value: 6.99 * 12 },
  { year: 2013, value: 6.99 * 12 },
  { year: 2014, value: 6.99 * 12 },
  { year: 2015, value: 7.49 * 12 },
  { year: 2016, value: 7.49 * 12 },
  { year: 2017, value: 7.99 * 12 },
  { year: 2018, value: 7.99 * 12 },
  { year: 2019, value: 8.99 * 12 },
  { year: 2020, value: 8.99 * 12 },
  { year: 2021, value: 9.99 * 12 },
  { year: 2022, value: 10.99 * 12 },
  { year: 2023, value: 10.99 * 12 },
  { year: 2024, value: 11.99 * 12 },
  { year: 2025, value: 12.99 * 12 },
  { year: 2026, value: 13.99 * 12 },
]

export async function fetchSeries(): Promise<Series> {
  return { ...META, points: POINTS }
}
