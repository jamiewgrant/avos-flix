import type { Series } from "../../src/types/series.ts"

const META = {
  id: "rail-fares",
  name: "Rail fares (UK index, Jan 1995 = 100)",
  description: "ORR/DfT rail-fares index covering all GB rail tickets. Regulated fares track RPI (+1% for many years post-2004) — the line climbs faster than wages essentially by formula. Pre-1995 indexed back to BR-era estimates (dashed).",
  unit: "index" as const,
  color: "#22d3ee",
  source: {
    name: "Office of Rail and Road — Rail fares index",
    url: "https://dataportal.orr.gov.uk/statistics/usage/passenger-rail-usage/",
  },
  region: "uk",
  verifiedFrom: 1995,
}

const POINTS = [
  { year: 1980, value: 38 },
  { year: 1985, value: 50 },
  { year: 1990, value: 70 },
  { year: 1995, value: 100 },
  { year: 1996, value: 103 },
  { year: 1997, value: 106 },
  { year: 1998, value: 110 },
  { year: 1999, value: 113 },
  { year: 2000, value: 116 },
  { year: 2001, value: 119 },
  { year: 2002, value: 122 },
  { year: 2003, value: 126 },
  { year: 2004, value: 130 },
  { year: 2005, value: 134 },
  { year: 2006, value: 140 },
  { year: 2007, value: 146 },
  { year: 2008, value: 153 },
  { year: 2009, value: 158 },
  { year: 2010, value: 159 },
  { year: 2011, value: 167 },
  { year: 2012, value: 177 },
  { year: 2013, value: 184 },
  { year: 2014, value: 190 },
  { year: 2015, value: 195 },
  { year: 2016, value: 197 },
  { year: 2017, value: 200 },
  { year: 2018, value: 207 },
  { year: 2019, value: 214 },
  { year: 2020, value: 220 },
  { year: 2021, value: 220 },
  { year: 2022, value: 226 },
  { year: 2023, value: 238 },
  { year: 2024, value: 252 },
  { year: 2025, value: 263 },
  { year: 2026, value: 273 },
]

export async function fetchSeries(): Promise<Series> {
  return { ...META, points: POINTS }
}
