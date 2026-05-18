import type { Series } from "../../src/types/series.ts"

const META = {
  id: "rent-index",
  name: "Private rent index (UK)",
  description: "UK private rental price index, 2015 = 100. Approximate annual values from ONS IPHRP (2005-2024) spliced into the newer PIPR (2024+). Rents have grown faster than wages — a different blade of the same scissors as house prices.",
  unit: "index" as const,
  color: "#facc15",
  source: {
    name: "ONS — Index of Private Housing Rental Prices / Price Index of Private Rents",
    url: "https://www.ons.gov.uk/economy/inflationandpriceindices/bulletins/privaterentandhousepricesuk/latest",
  },
  region: "uk",
}

// UK annual mean of monthly IPHRP/PIPR, approximate.
const POINTS = [
  { year: 2005, value: 86.6 },
  { year: 2008, value: 89.4 },
  { year: 2010, value: 91.5 },
  { year: 2012, value: 93.7 },
  { year: 2014, value: 97.4 },
  { year: 2015, value: 100.0 },
  { year: 2017, value: 103.5 },
  { year: 2019, value: 106.4 },
  { year: 2020, value: 107.8 },
  { year: 2021, value: 109.4 },
  { year: 2022, value: 113.0 },
  { year: 2023, value: 119.5 },
  { year: 2024, value: 130.6 },
  { year: 2025, value: 137.4 },
]

export async function fetchSeries(): Promise<Series> {
  return { ...META, points: POINTS }
}
