import type { Series } from "../../src/types/series.ts"

const META = {
  id: "birth-rate",
  name: "Crude birth rate (per 1,000)",
  description: "UK live births per 1,000 population. The fertility floor — 2023 was the lowest on record (9.5).",
  unit: "rate" as const,
  color: "#fcd34d",
  source: {
    name: "ONS — Births in England and Wales (UK aggregate)",
    url: "https://www.ons.gov.uk/peoplepopulationandcommunity/birthsdeathsandmarriages/livebirths",
  },
  region: "uk",
}

// UK crude birth rate (live births per 1,000 population), selected years.
const POINTS = [
  { year: 1950, value: 16.3 },
  { year: 1955, value: 15.3 },
  { year: 1960, value: 17.5 },
  { year: 1964, value: 18.6 },
  { year: 1970, value: 16.3 },
  { year: 1975, value: 12.5 },
  { year: 1980, value: 13.4 },
  { year: 1985, value: 13.3 },
  { year: 1990, value: 13.9 },
  { year: 1995, value: 12.6 },
  { year: 2000, value: 11.5 },
  { year: 2005, value: 12.0 },
  { year: 2010, value: 13.0 },
  { year: 2015, value: 12.0 },
  { year: 2020, value: 10.4 },
  { year: 2022, value: 9.9 },
  { year: 2023, value: 9.5 },
]

export async function fetchSeries(): Promise<Series> {
  return { ...META, points: POINTS }
}
