import type { Series } from "../../src/types/series.ts"

const META = {
  id: "student-debt",
  name: "Student loan balance at graduation (England, average)",
  description: "Average outstanding student-loan balance on the day of graduation, England, full-time undergrad. Combines tuition-fee loans and maintenance loans. Reflects 3 years of borrowing under each year's regime. Pre-1998 = £0 (no tuition fees, mortgage-style maintenance loans were small).",
  unit: "GBP" as const,
  color: "#ec4899",
  source: {
    name: "Student Loans Company / House of Commons Library — Student loan statistics",
    url: "https://commonslibrary.parliament.uk/research-briefings/sn01079/",
  },
  region: "england",
  verifiedFrom: 2000,
}

const POINTS = [
  { year: 1995, value: 0 },
  { year: 1998, value: 1700 },
  { year: 1999, value: 2300 },
  { year: 2000, value: 3100 },
  { year: 2001, value: 4500 },
  { year: 2002, value: 6500 },
  { year: 2003, value: 8400 },
  { year: 2004, value: 9800 },
  { year: 2005, value: 10800 },
  { year: 2006, value: 11200 },
  { year: 2007, value: 12200 },
  { year: 2008, value: 13400 },
  { year: 2009, value: 14600 },
  { year: 2010, value: 15800 },
  { year: 2011, value: 16800 },
  { year: 2012, value: 18000 },
  { year: 2013, value: 21200 },
  { year: 2014, value: 27300 },
  { year: 2015, value: 33800 },
  { year: 2016, value: 38200 },
  { year: 2017, value: 41800 },
  { year: 2018, value: 44700 },
  { year: 2019, value: 47200 },
  { year: 2020, value: 49500 },
  { year: 2021, value: 51000 },
  { year: 2022, value: 50400 },
  { year: 2023, value: 49500 },
  { year: 2024, value: 48400 },
  { year: 2025, value: 47800 },
  { year: 2026, value: 47600 },
]

export async function fetchSeries(): Promise<Series> {
  return { ...META, points: POINTS }
}
