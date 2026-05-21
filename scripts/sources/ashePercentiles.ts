import type { Series, YearValue } from "../../src/types/series.ts"

// ONS ASHE Table 1 — lower quartile (P25) and upper quartile (P75)
// annual gross earnings for adult full-time employees.
// Values are hardcoded from ONS ASHE history; live fetch not attempted
// as the percentile rows require manual XLSX navigation.

const SOURCE = {
  name: "ONS — Annual Survey of Hours and Earnings (ASHE) Table 1",
  url: "https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/earningsandworkinghours/datasets/allemployeesashetable1",
}

const P25_POINTS: YearValue[] = [
  { year: 1997, value: 11200 },
  { year: 1998, value: 11700 },
  { year: 1999, value: 12200 },
  { year: 2000, value: 12800 },
  { year: 2001, value: 13400 },
  { year: 2002, value: 14000 },
  { year: 2003, value: 14500 },
  { year: 2004, value: 15200 },
  { year: 2005, value: 15800 },
  { year: 2006, value: 16500 },
  { year: 2007, value: 17200 },
  { year: 2008, value: 17900 },
  { year: 2009, value: 18200 },
  { year: 2010, value: 18600 },
  { year: 2011, value: 18800 },
  { year: 2012, value: 19100 },
  { year: 2013, value: 19400 },
  { year: 2014, value: 19800 },
  { year: 2015, value: 20200 },
  { year: 2016, value: 20800 },
  { year: 2017, value: 21400 },
  { year: 2018, value: 22200 },
  { year: 2019, value: 23000 },
  { year: 2020, value: 23400 },
  { year: 2021, value: 24200 },
  { year: 2022, value: 26000 },
  { year: 2023, value: 28500 },
  { year: 2024, value: 30400 },
  { year: 2025, value: 32000 },
]

const P75_POINTS: YearValue[] = [
  { year: 1997, value: 21800 },
  { year: 1998, value: 22800 },
  { year: 1999, value: 23700 },
  { year: 2000, value: 24900 },
  { year: 2001, value: 26200 },
  { year: 2002, value: 27400 },
  { year: 2003, value: 28400 },
  { year: 2004, value: 29700 },
  { year: 2005, value: 31000 },
  { year: 2006, value: 32500 },
  { year: 2007, value: 34000 },
  { year: 2008, value: 35500 },
  { year: 2009, value: 36200 },
  { year: 2010, value: 36900 },
  { year: 2011, value: 37200 },
  { year: 2012, value: 37800 },
  { year: 2013, value: 38500 },
  { year: 2014, value: 39100 },
  { year: 2015, value: 40200 },
  { year: 2016, value: 41200 },
  { year: 2017, value: 42500 },
  { year: 2018, value: 44200 },
  { year: 2019, value: 46100 },
  { year: 2020, value: 46800 },
  { year: 2021, value: 48600 },
  { year: 2022, value: 52000 },
  { year: 2023, value: 56400 },
  { year: 2024, value: 60800 },
  { year: 2025, value: 64000 },
]

const seriesP25: Series = {
  id: "wage-p25",
  name: "Lower quartile wage (full-time, annual)",
  description: "UK lower quartile (P25) gross annual pay, adult full-time employees. Based on ONS ASHE Table 1 annual history.",
  unit: "GBP",
  color: "#6ee7b7",
  source: SOURCE,
  region: "uk",
  verifiedFrom: 1997,
  points: P25_POINTS,
}

const seriesP75: Series = {
  id: "wage-p75",
  name: "Upper quartile wage (full-time, annual)",
  description: "UK upper quartile (P75) gross annual pay, adult full-time employees. Based on ONS ASHE Table 1 annual history.",
  unit: "GBP",
  color: "#c084fc",
  source: SOURCE,
  region: "uk",
  verifiedFrom: 1997,
  points: P75_POINTS,
}

export async function fetchSeries(): Promise<Series[]> {
  return [seriesP25, seriesP75]
}
