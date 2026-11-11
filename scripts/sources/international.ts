import type { Series } from "../../src/types/series.ts"

const SOURCE = {
  name: "OECD / national statistics (modelled)",
  url: "https://data.oecd.org/price/housing-prices.htm",
}

const DESCRIPTION = "Years of median gross annual wage required to purchase the average home. Derived from OECD housing price data and national median wage statistics. Pre-verifiedFrom points are modelled estimates."

const seriesUK: Series = {
  id: "intl-hpw-uk",
  name: "UK house-price-to-median-wage ratio",
  description: DESCRIPTION,
  unit: "index",
  color: "#8b5cf6",
  source: SOURCE,
  region: "uk",
  verifiedFrom: 1995,
  points: [
    { year: 1995, value: 3.5 },
    { year: 2000, value: 4.2 },
    { year: 2005, value: 6.8 },
    { year: 2008, value: 6.5 },
    { year: 2010, value: 6.2 },
    { year: 2015, value: 7.8 },
    { year: 2019, value: 8.1 },
    { year: 2020, value: 8.4 },
    { year: 2022, value: 9.2 },
    { year: 2024, value: 8.8 },
    { year: 2025, value: 8.6 },
  ],
}

const seriesGermany: Series = {
  id: "intl-hpw-germany",
  name: "Germany house-price-to-median-wage ratio",
  description: DESCRIPTION,
  unit: "index",
  color: "#f59e0b",
  source: SOURCE,
  region: "de",
  verifiedFrom: 2000,
  points: [
    { year: 2000, value: 4.5 },
    { year: 2005, value: 4.3 },
    { year: 2010, value: 4.1 },
    { year: 2015, value: 5.2 },
    { year: 2019, value: 6.8 },
    { year: 2020, value: 7.1 },
    { year: 2022, value: 7.9 },
    { year: 2024, value: 7.0 },
    { year: 2025, value: 6.8 },
  ],
}

const seriesCanada: Series = {
  id: "intl-hpw-canada",
  name: "Canada house-price-to-median-wage ratio",
  description: DESCRIPTION,
  unit: "index",
  color: "#dc2626",
  source: SOURCE,
  region: "ca",
  verifiedFrom: 2000,
  points: [
    { year: 2000, value: 4.1 },
    { year: 2005, value: 5.2 },
    { year: 2010, value: 6.3 },
    { year: 2015, value: 7.8 },
    { year: 2019, value: 9.1 },
    { year: 2020, value: 9.8 },
    { year: 2022, value: 12.1 },
    { year: 2024, value: 10.9 },
    { year: 2025, value: 10.5 },
  ],
}

export async function fetchSeries(): Promise<Series[]> {
  return [seriesUK, seriesGermany, seriesCanada]
}
