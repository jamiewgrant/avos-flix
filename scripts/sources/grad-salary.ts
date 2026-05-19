import type { Series } from "../../src/types/series.ts"

const META = {
  id: "grad-salary",
  name: "Graduate starting salary (median, UK)",
  description: "Median annual starting salary for new UK graduates entering full-time employment. Combines HECSU 'What Do Graduates Do?' and ISE Student Recruitment Survey medians. Nominal £.",
  unit: "GBP" as const,
  color: "#60a5fa",
  source: {
    name: "HECSU / Prospects + Institute of Student Employers",
    url: "https://luminate.prospects.ac.uk/what-do-graduates-do",
  },
  region: "uk",
  verifiedFrom: 1999,
}

const POINTS = [
  { year: 1990, value: 11500 },
  { year: 1995, value: 14000 },
  { year: 1999, value: 17500 },
  { year: 2001, value: 18500 },
  { year: 2003, value: 19500 },
  { year: 2005, value: 20500 },
  { year: 2007, value: 21500 },
  { year: 2009, value: 21500 },
  { year: 2011, value: 22000 },
  { year: 2013, value: 22500 },
  { year: 2015, value: 23000 },
  { year: 2017, value: 23500 },
  { year: 2019, value: 24000 },
  { year: 2021, value: 25500 },
  { year: 2023, value: 27000 },
  { year: 2024, value: 28000 },
  { year: 2025, value: 28500 },
  { year: 2026, value: 29000 },
]

export async function fetchSeries(): Promise<Series> {
  return { ...META, points: POINTS }
}
