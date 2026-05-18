import type { Series } from "../../src/types/series.ts"

const META = {
  id: "energy-cost",
  name: "Energy (typical dual-fuel annual bill)",
  description: "Ofgem default tariff cap from 2019, with the 2022/23 figures showing the effective cost under the Energy Price Guarantee. Pre-2019 estimates from DESNZ Quarterly Energy Prices; comparable but methodologically distinct from the cap era.",
  unit: "GBP" as const,
  color: "#f43f5e",
  source: {
    name: "Ofgem default tariff cap + DESNZ Quarterly Energy Prices",
    url: "https://www.ofgem.gov.uk/information-consumers/energy-advice-households/energy-price-cap-explained",
  },
  region: "uk",
}

// April-level value each year (Ofgem cap typically resets in April; pre-2019 is average annual bill).
// 2022 reflects the pre-EPG April cap; 2023 reflects the EPG-effective £2,500 ceiling for typical use.
const POINTS = [
  { year: 2004, value: 548 },
  { year: 2007, value: 880 },
  { year: 2010, value: 1069 },
  { year: 2013, value: 1320 },
  { year: 2015, value: 1256 },
  { year: 2018, value: 1254 },
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
