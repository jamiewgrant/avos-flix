import type { Series } from "../../src/types/series.ts"

const META = {
  id: "energy-cost",
  name: "Energy (typical dual-fuel annual bill)",
  description: "Typical UK household annual dual-fuel bill (nominal £). 2019+ is the Ofgem default tariff cap (April-level each year); 2022/2023 reflect the effective EPG-capped cost. Pre-2019 uses DESNZ Quarterly Energy Prices averages; pre-1980 are rough nominal estimates (coal-and-town-gas era, not directly comparable to today's bills).",
  unit: "GBP" as const,
  color: "#f43f5e",
  source: {
    name: "Ofgem default tariff cap + DESNZ Quarterly Energy Prices + historical estimates",
    url: "https://www.ofgem.gov.uk/information-consumers/energy-advice-households/energy-price-cap-explained",
  },
  region: "uk",
}

const POINTS = [
  // Pre-1980 estimates (coal/town-gas era — rough order of magnitude)
  { year: 1953, value: 15 },
  { year: 1960, value: 25 },
  { year: 1965, value: 35 },
  { year: 1970, value: 55 },
  { year: 1975, value: 100 },
  // DESNZ Quarterly Energy Prices
  { year: 1980, value: 200 },
  { year: 1985, value: 320 },
  { year: 1990, value: 410 },
  { year: 1995, value: 410 },
  { year: 2000, value: 420 },
  { year: 2004, value: 548 },
  { year: 2007, value: 880 },
  { year: 2010, value: 1069 },
  { year: 2013, value: 1320 },
  { year: 2015, value: 1256 },
  { year: 2018, value: 1254 },
  // Ofgem default tariff cap
  { year: 2019, value: 1137 },
  { year: 2020, value: 1162 },
  { year: 2021, value: 1138 },
  { year: 2022, value: 1971 },
  { year: 2023, value: 2500 },
  { year: 2024, value: 1690 },
  { year: 2025, value: 1849 },
  { year: 2026, value: 1641 },
]

export async function fetchSeries(): Promise<Series> {
  return { ...META, points: POINTS }
}
