import type { Series, YearValue } from "../../src/types/series.ts"

// ONS ASHE — sector breakdown: median full-time weekly earnings, public vs private sector.
// Values are approximate annual figures derived from ONS ASHE historical releases.
// All values are annual earnings (£).

const SOURCE = {
  name: "ONS ASHE — sector breakdown",
  url: "https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/earningsandworkinghours/datasets/publicsectorandprivatesectorearningsasa",
}

const PUBLIC_POINTS: YearValue[] = [
  { year: 2002, value: 26500 },
  { year: 2003, value: 27300 },
  { year: 2004, value: 28100 },
  { year: 2005, value: 29200 },
  { year: 2006, value: 30100 },
  { year: 2007, value: 31000 },
  { year: 2008, value: 32200 },
  { year: 2009, value: 33100 },
  { year: 2010, value: 33800 },
  { year: 2011, value: 34100 },
  { year: 2012, value: 34400 },
  { year: 2013, value: 34700 },
  { year: 2014, value: 35200 },
  { year: 2015, value: 35500 },
  { year: 2016, value: 35900 },
  { year: 2017, value: 36400 },
  { year: 2018, value: 37100 },
  { year: 2019, value: 38000 },
  { year: 2020, value: 39500 },
  { year: 2021, value: 40200 },
  { year: 2022, value: 41800 },
  { year: 2023, value: 44500 },
  { year: 2024, value: 47200 },
  { year: 2025, value: 49500 },
]

const PRIVATE_POINTS: YearValue[] = [
  { year: 2002, value: 24800 },
  { year: 2003, value: 25400 },
  { year: 2004, value: 26200 },
  { year: 2005, value: 26900 },
  { year: 2006, value: 27800 },
  { year: 2007, value: 28900 },
  { year: 2008, value: 29800 },
  { year: 2009, value: 29200 },
  { year: 2010, value: 29800 },
  { year: 2011, value: 30400 },
  { year: 2012, value: 30900 },
  { year: 2013, value: 31500 },
  { year: 2014, value: 32400 },
  { year: 2015, value: 33200 },
  { year: 2016, value: 34100 },
  { year: 2017, value: 35200 },
  { year: 2018, value: 36300 },
  { year: 2019, value: 37500 },
  { year: 2020, value: 36800 },
  { year: 2021, value: 38400 },
  { year: 2022, value: 40600 },
  { year: 2023, value: 43200 },
  { year: 2024, value: 46100 },
  { year: 2025, value: 48500 },
]

const publicSector: Series = {
  id: "public-sector-wage",
  name: "Median wage — public sector",
  description:
    "ONS ASHE median full-time weekly earnings, public sector employees. Includes NHS, teaching, civil service etc.",
  unit: "GBP",
  color: "#34d399",
  source: SOURCE,
  region: "uk",
  verifiedFrom: 2002,
  points: PUBLIC_POINTS,
}

const privateSector: Series = {
  id: "private-sector-wage",
  name: "Median wage — private sector",
  description:
    "ONS ASHE median full-time weekly earnings, private sector employees.",
  unit: "GBP",
  color: "#f97316",
  source: SOURCE,
  region: "uk",
  verifiedFrom: 2002,
  points: PRIVATE_POINTS,
}

export async function fetchSeries(): Promise<Series[]> {
  return [publicSector, privateSector]
}
