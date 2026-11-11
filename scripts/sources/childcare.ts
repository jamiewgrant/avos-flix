import type { Series } from "../../src/types/series.ts"

const META = {
  id: "childcare-cost",
  name: "Full-time nursery (England, under-2, annual)",
  description: "Annual cost of full-time (50h/week) nursery for a child under 2 in England. Coram Family & Childcare conducts the canonical annual survey; nominal £, sticker price (before any government support). Pre-2003 modelled from CPI-trended estimates of historical part-time rates (dashed).",
  unit: "GBP" as const,
  color: "#f08c2e",
  source: {
    name: "Coram Family & Childcare — Childcare Survey",
    url: "https://www.coram.org.uk/our-impact/childcare-survey/",
  },
  region: "england",
  verifiedFrom: 2003,
}

const WEEKLY = [
  { year: 1995, value: 60 },
  { year: 2000, value: 100 },
  { year: 2003, value: 142 },
  { year: 2005, value: 159 },
  { year: 2007, value: 175 },
  { year: 2009, value: 192 },
  { year: 2011, value: 199 },
  { year: 2013, value: 211 },
  { year: 2015, value: 222 },
  { year: 2017, value: 232 },
  { year: 2019, value: 247 },
  { year: 2021, value: 263 },
  { year: 2023, value: 285 },
  { year: 2024, value: 302 },
  { year: 2025, value: 314 },
  { year: 2026, value: 326 },
]

const POINTS = WEEKLY.map((p) => ({ year: p.year, value: Math.round(p.value * 50) }))

export async function fetchSeries(): Promise<Series> {
  return { ...META, points: POINTS }
}
