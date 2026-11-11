import type { Series, YearValue } from "../../src/types/series.ts"

// ONS Wealth & Assets Survey — median total household net wealth
// for the 25-34 age group and the 55-64 age group.
// Data covers biennial WAS waves from 2006/08 through 2022/24.
// Values are stored as nominal £; years represent the mid-point of
// each survey wave.

const SOURCE = {
  name: "ONS — Wealth & Assets Survey",
  url: "https://www.ons.gov.uk/peoplepopulationandcommunity/personalandhouseholdfinances/incomeandwealth/bulletins/totalwealthingreatbritain/latest",
}

const YOUNG_POINTS: YearValue[] = [
  { year: 2006, value: 27000 },
  { year: 2008, value: 31000 },
  { year: 2010, value: 26000 },
  { year: 2012, value: 28000 },
  { year: 2014, value: 29000 },
  { year: 2016, value: 31000 },
  { year: 2018, value: 36000 },
  { year: 2020, value: 42000 },
  { year: 2022, value: 46000 },
  { year: 2024, value: 48000 },
]

const OLDER_POINTS: YearValue[] = [
  { year: 2006, value: 218000 },
  { year: 2008, value: 264000 },
  { year: 2010, value: 261000 },
  { year: 2012, value: 302000 },
  { year: 2014, value: 329000 },
  { year: 2016, value: 384000 },
  { year: 2018, value: 427000 },
  { year: 2020, value: 511000 },
  { year: 2022, value: 564000 },
  { year: 2024, value: 598000 },
]

const seriesYoung: Series = {
  id: "wealth-25-34",
  name: "Median household wealth, age 25–34",
  description: "Median total net household wealth (nominal £) for households headed by someone aged 25–34. ONS Wealth & Assets Survey biennial waves.",
  unit: "GBP",
  color: "#3b82f6",
  source: SOURCE,
  region: "uk",
  verifiedFrom: 2006,
  points: YOUNG_POINTS,
}

const seriesOlder: Series = {
  id: "wealth-55-64",
  name: "Median household wealth, age 55–64",
  description: "Median total net household wealth (nominal £) for households headed by someone aged 55–64. ONS Wealth & Assets Survey biennial waves.",
  unit: "GBP",
  color: "#ea580c",
  source: SOURCE,
  region: "uk",
  verifiedFrom: 2006,
  points: OLDER_POINTS,
}

export async function fetchSeries(): Promise<Series[]> {
  return [seriesYoung, seriesOlder]
}
