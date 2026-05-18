import type { Series } from "../../src/types/series.ts"

const META = {
  id: "rent-index",
  name: "Private rent index (UK)",
  description: "UK private rental price index, 2015 = 100. 2005+ approximated from ONS IPHRP / PIPR. Pre-2005 reconstructed from the RPI housing-rent component, rebased to align with IPHRP at 2005 — methodologies differ and the spliced back-series is for shape, not headline citation.",
  unit: "index" as const,
  color: "#facc15",
  source: {
    name: "ONS — IPHRP/PIPR + RPI housing rent component (pre-2005)",
    url: "https://www.ons.gov.uk/economy/inflationandpriceindices/bulletins/privaterentandhousepricesuk/latest",
  },
  region: "uk",
  verifiedFrom: 2005,
}

const POINTS = [
  // Pre-2005 — RPI rent component, rebased to align with IPHRP at 2005
  { year: 1953, value: 2.5 },
  { year: 1960, value: 4.0 },
  { year: 1965, value: 5.5 },
  { year: 1970, value: 8 },
  { year: 1975, value: 14 },
  { year: 1980, value: 28 },
  { year: 1985, value: 42 },
  { year: 1990, value: 60 },
  { year: 1995, value: 75 },
  { year: 2000, value: 82 },
  // IPHRP / PIPR era
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
