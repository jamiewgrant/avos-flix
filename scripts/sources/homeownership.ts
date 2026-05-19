import type { Series } from "../../src/types/series.ts"

interface AgeBand {
  id: string
  name: string
  color: string
  points: Array<{ year: number; value: number }>
}

const BANDS: AgeBand[] = [
  {
    id: "homeownership-25-34",
    name: "Homeownership rate (25–34)",
    color: "#f87171",
    points: [
      { year: 1981, value: 60 },
      { year: 1991, value: 67 },
      { year: 2001, value: 59 },
      { year: 2011, value: 43 },
      { year: 2014, value: 36 },
      { year: 2017, value: 35 },
      { year: 2019, value: 41 },
      { year: 2021, value: 41 },
      { year: 2023, value: 39 },
      { year: 2025, value: 39 },
    ],
  },
  {
    id: "homeownership-35-44",
    name: "Homeownership rate (35–44)",
    color: "#fbbf24",
    points: [
      { year: 1981, value: 67 },
      { year: 1991, value: 78 },
      { year: 2001, value: 76 },
      { year: 2011, value: 64 },
      { year: 2014, value: 59 },
      { year: 2017, value: 56 },
      { year: 2019, value: 56 },
      { year: 2021, value: 57 },
      { year: 2023, value: 57 },
      { year: 2025, value: 57 },
    ],
  },
  {
    id: "homeownership-55-64",
    name: "Homeownership rate (55–64)",
    color: "#34d399",
    points: [
      { year: 1981, value: 56 },
      { year: 1991, value: 68 },
      { year: 2001, value: 75 },
      { year: 2011, value: 76 },
      { year: 2014, value: 74 },
      { year: 2017, value: 74 },
      { year: 2019, value: 73 },
      { year: 2021, value: 74 },
      { year: 2023, value: 73 },
      { year: 2025, value: 73 },
    ],
  },
]

const SOURCE = {
  name: "ONS / English Housing Survey — Tenure by age",
  url: "https://www.gov.uk/government/collections/english-housing-survey",
}

export async function fetchSeries(): Promise<Series[]> {
  return BANDS.map((b) => ({
    id: b.id,
    name: b.name,
    description: "Share of household reference persons in this age band who own their home (with or without a mortgage). Compiled from the English Housing Survey / ONS LFS / Census tenure tables.",
    unit: "percent" as const,
    color: b.color,
    source: SOURCE,
    region: "england",
    points: b.points,
  }))
}
