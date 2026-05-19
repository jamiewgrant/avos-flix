import type { Series } from "../../src/types/series.ts"

const META = {
  id: "tax-burden-median",
  name: "Effective tax + NI rate (median earner)",
  description: "Income tax + employee National Insurance as a percentage of gross pay for a single worker on the median full-time wage. Reflects each year's personal allowance, basic-rate threshold and NI primary threshold. Pre-1990 modelled from IFS historical effective-rate tables (dashed).",
  unit: "percent" as const,
  color: "#fb7185",
  source: {
    name: "HMRC / IFS — Direct tax statistics",
    url: "https://ifs.org.uk/taxlab",
  },
  region: "uk",
  verifiedFrom: 1990,
}

const POINTS = [
  { year: 1970, value: 21.0 },
  { year: 1975, value: 26.5 },
  { year: 1980, value: 29.0 },
  { year: 1985, value: 27.5 },
  { year: 1990, value: 25.2 },
  { year: 1995, value: 24.0 },
  { year: 2000, value: 23.5 },
  { year: 2005, value: 23.8 },
  { year: 2008, value: 23.4 },
  { year: 2010, value: 22.0 },
  { year: 2012, value: 20.5 },
  { year: 2014, value: 19.8 },
  { year: 2016, value: 19.0 },
  { year: 2018, value: 18.4 },
  { year: 2020, value: 18.0 },
  { year: 2021, value: 18.2 },
  { year: 2022, value: 21.5 },
  { year: 2023, value: 22.4 },
  { year: 2024, value: 22.9 },
  { year: 2025, value: 23.6 },
  { year: 2026, value: 24.1 },
]

export async function fetchSeries(): Promise<Series> {
  return { ...META, points: POINTS }
}
