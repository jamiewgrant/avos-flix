import type { Series } from "../../src/types/series.ts"

const META = {
  id: "rent-index",
  name: "Private rent index (UK)",
  description: "UK private rental price index, 2015 = 100. 2005+ from ONS IPHRP / PIPR (official). Pre-2005 estimated from survey data: the previous splice of the RPI housing-rent component overstated historical rents ~2× because the RPI component tracked sitting-tenant rents (many regulated under the Rent Acts) rather than market-rate private lets. The revised pre-2005 values are calibrated to ONS/EHS survey evidence that private renters spent ~29% of income on rent in 1993 (the anchor point), implying 1990 market-rate rent ≈ £300-320/month — vs the old splice's implied £520/month which was plainly wrong.",
  unit: "index" as const,
  color: "#facc15",
  source: {
    name: "ONS — IPHRP/PIPR (2005+); EHS/survey calibration (pre-2005)",
    url: "https://www.ons.gov.uk/economy/inflationandpriceindices/bulletins/privaterentandhousepricesuk/latest",
  },
  region: "uk",
  verifiedFrom: 2005,
}

const POINTS = [
  // Pre-2005: calibrated to match ONS/EHS evidence that private renters
  // spent ~29% of income on rent in 1993 (anchor: index ≈ 40). Working
  // backwards at ~3.5%/yr to 1990, forward at ~3.5%/yr to 1995, then
  // ~7%/yr through the buy-to-let boom to 2000. Old RPI-splice values
  // were ~1.7× too high for 1990-2000, creating false deficits in the
  // personal snapshot for historical rent scenarios.
  { year: 1953, value: 2.0 },
  { year: 1960, value: 2.5 },
  { year: 1965, value: 3.5 },
  { year: 1970, value: 5 },
  { year: 1975, value: 8 },
  { year: 1980, value: 17 },
  { year: 1985, value: 25 },
  { year: 1990, value: 36 },
  { year: 1995, value: 43 },
  { year: 2000, value: 60 },
  // ONS IPHRP / PIPR era — official data
  { year: 2005, value: 86.6 },
  { year: 2008, value: 89.4 },
  { year: 2010, value: 91.5 },
  { year: 2012, value: 93.7 },
  { year: 2014, value: 97.4 },
  { year: 2015, value: 100.0 },
  { year: 2017, value: 103.5 },
  { year: 2019, value: 106.4 },
  { year: 2020, value: 107.8 },
  { year: 2021, value: 109.4 },
  { year: 2022, value: 113.0 },
  { year: 2023, value: 119.5 },
  { year: 2024, value: 130.6 },
  { year: 2025, value: 137.4 },
]

export async function fetchSeries(): Promise<Series> {
  return { ...META, points: POINTS }
}
