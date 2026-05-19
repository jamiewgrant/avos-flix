import type { Series } from "../../src/types/series.ts"

const META = {
  id: "min-wage",
  name: "Minimum / National Living Wage (annual, 37.5h)",
  description: "Statutory wage floor for adults (21/22+), annualised at a 37.5-hour week × 52 weeks. National Minimum Wage introduced 1999 at £3.60; rebadged National Living Wage for 25+ from 2016 and lowered to 21+ from 2024. Pre-1999 there was no UK statutory floor.",
  unit: "GBP" as const,
  color: "#eab308",
  source: {
    name: "Low Pay Commission / gov.uk NMW & NLW rates",
    url: "https://www.gov.uk/national-minimum-wage-rates",
  },
  region: "uk",
}

const HOURLY = [
  { year: 1999, value: 3.60 },
  { year: 2000, value: 3.70 },
  { year: 2001, value: 4.10 },
  { year: 2002, value: 4.20 },
  { year: 2003, value: 4.50 },
  { year: 2004, value: 4.85 },
  { year: 2005, value: 5.05 },
  { year: 2006, value: 5.35 },
  { year: 2007, value: 5.52 },
  { year: 2008, value: 5.73 },
  { year: 2009, value: 5.80 },
  { year: 2010, value: 5.93 },
  { year: 2011, value: 6.08 },
  { year: 2012, value: 6.19 },
  { year: 2013, value: 6.31 },
  { year: 2014, value: 6.50 },
  { year: 2015, value: 6.70 },
  { year: 2016, value: 7.20 },
  { year: 2017, value: 7.50 },
  { year: 2018, value: 7.83 },
  { year: 2019, value: 8.21 },
  { year: 2020, value: 8.72 },
  { year: 2021, value: 8.91 },
  { year: 2022, value: 9.50 },
  { year: 2023, value: 10.42 },
  { year: 2024, value: 11.44 },
  { year: 2025, value: 12.21 },
  { year: 2026, value: 12.71 },
]

const POINTS = HOURLY.map((p) => ({ year: p.year, value: Math.round(p.value * 37.5 * 52) }))

export async function fetchSeries(): Promise<Series> {
  return { ...META, points: POINTS }
}
