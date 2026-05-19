import type { Series } from "../../src/types/series.ts"

const META = {
  id: "council-tax",
  name: "Council Tax (England, Band D average)",
  description: "Average council tax bill for a Band D property in England. Council tax replaced the community charge in 1993. Pre-1993 figures show domestic rates / community charge equivalents for context (modelled, dashed).",
  unit: "GBP" as const,
  color: "#84cc16",
  source: {
    name: "Department for Levelling Up, Housing & Communities / MHCLG council-tax statistics",
    url: "https://www.gov.uk/government/collections/council-tax-statistics",
  },
  region: "england",
  verifiedFrom: 1993,
}

const POINTS = [
  { year: 1980, value: 120 },
  { year: 1985, value: 250 },
  { year: 1990, value: 360 },
  { year: 1991, value: 380 },
  { year: 1992, value: 410 },
  { year: 1993, value: 568 },
  { year: 1994, value: 600 },
  { year: 1995, value: 609 },
  { year: 1996, value: 646 },
  { year: 1997, value: 688 },
  { year: 1998, value: 727 },
  { year: 1999, value: 770 },
  { year: 2000, value: 798 },
  { year: 2001, value: 851 },
  { year: 2002, value: 901 },
  { year: 2003, value: 1014 },
  { year: 2004, value: 1102 },
  { year: 2005, value: 1167 },
  { year: 2006, value: 1214 },
  { year: 2007, value: 1268 },
  { year: 2008, value: 1320 },
  { year: 2009, value: 1373 },
  { year: 2010, value: 1414 },
  { year: 2011, value: 1439 },
  { year: 2012, value: 1444 },
  { year: 2013, value: 1456 },
  { year: 2014, value: 1468 },
  { year: 2015, value: 1484 },
  { year: 2016, value: 1530 },
  { year: 2017, value: 1591 },
  { year: 2018, value: 1671 },
  { year: 2019, value: 1750 },
  { year: 2020, value: 1818 },
  { year: 2021, value: 1898 },
  { year: 2022, value: 1966 },
  { year: 2023, value: 2065 },
  { year: 2024, value: 2171 },
  { year: 2025, value: 2280 },
  { year: 2026, value: 2393 },
]

export async function fetchSeries(): Promise<Series> {
  return { ...META, points: POINTS }
}
