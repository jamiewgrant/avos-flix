import type { Series } from "../../src/types/series.ts"

const META = {
  id: "healthcare-oop",
  name: "NHS out-of-pocket costs (dental + prescriptions)",
  description:
    "Annual out-of-pocket NHS costs for a typical working-age adult: 12 prescription items + 2 dental check-ups + 1 Band 2 treatment. Pre-2000 NHS was effectively free at point of use for most; charges have risen above inflation since. Figures exclude private healthcare.",
  unit: "GBP" as const,
  color: "#be185d",
  source: {
    name: "NHS England — prescription charge history; NHS dental charge bands",
    url: "https://www.nhsbsa.nhs.uk/pharmacies-gp-practices-and-appliance-contractors/drug-tariff/drug-tariff-part-ix",
  },
  region: "uk",
  verifiedFrom: 2005,
}

const POINTS = [
  { year: 2000, value: 120 },
  { year: 2003, value: 135 },
  { year: 2005, value: 145 },
  { year: 2007, value: 160 },
  { year: 2009, value: 175 },
  { year: 2011, value: 190 },
  { year: 2013, value: 205 },
  { year: 2015, value: 215 },
  { year: 2017, value: 230 },
  { year: 2019, value: 245 },
  { year: 2021, value: 255 },
  { year: 2022, value: 260 },
  { year: 2023, value: 270 },
  { year: 2024, value: 282 },
  { year: 2025, value: 296 },
  { year: 2026, value: 302 },
]

export async function fetchSeries(): Promise<Series> {
  return { ...META, points: POINTS }
}
