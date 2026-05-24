import type { Series, YearValue } from "../../src/types/series.ts"

// ONS household saving ratio — % of gross disposable income saved.
// Annual averages derived from ONS Quarterly Sector Accounts (QSA) historical releases.
const META = {
  id: "savings-ratio",
  name: "Household saving ratio (%)",
  description:
    "ONS household saving ratio as % of disposable income. Near-zero or negative for recent years shows millennials can't save — not won't. Pre-2000 from historical ONS releases.",
  unit: "pct" as const,
  color: "#fb923c",
  source: {
    name: "ONS — Sector accounts: household saving ratio",
    url: "https://www.ons.gov.uk/economy/nationalaccounts/uksectoraccounts/bulletins/quarterlysectoraccounts/latest",
  },
  region: "uk",
  verifiedFrom: 1997,
}

// Annual averages (approximate, from ONS QSA historical releases)
const POINTS: YearValue[] = [
  { year: 1980, value: 13.2 },
  { year: 1985, value: 9.8 },
  { year: 1990, value: 7.5 },
  { year: 1995, value: 10.1 },
  { year: 1996, value: 9.5 },
  { year: 1997, value: 9.7 },
  { year: 1998, value: 7.3 },
  { year: 1999, value: 5.4 },
  { year: 2000, value: 4.9 },
  { year: 2001, value: 5.8 },
  { year: 2002, value: 6.0 },
  { year: 2003, value: 5.5 },
  { year: 2004, value: 4.8 },
  { year: 2005, value: 4.9 },
  { year: 2006, value: 4.5 },
  { year: 2007, value: 3.0 },
  { year: 2008, value: 2.8 },
  { year: 2009, value: 8.1 },
  { year: 2010, value: 7.2 },
  { year: 2011, value: 6.3 },
  { year: 2012, value: 7.1 },
  { year: 2013, value: 5.9 },
  { year: 2014, value: 5.7 },
  { year: 2015, value: 4.7 },
  { year: 2016, value: 4.1 },
  { year: 2017, value: 2.6 },
  { year: 2018, value: 3.7 },
  { year: 2019, value: 6.8 },
  { year: 2020, value: 18.6 },
  { year: 2021, value: 9.2 },
  { year: 2022, value: 3.4 },
  { year: 2023, value: 5.2 },
  { year: 2024, value: 6.1 },
]

export async function fetchSeries(): Promise<Series> {
  return { ...META, points: POINTS }
}
