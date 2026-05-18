export type YearValue = { year: number; value: number }

export type Region = "uk" | "london" | "northEast"

export type SeriesKey =
  | "medianWage"       // ONS ASHE — gross annual median pay, full-time employees
  | "housePrice"       // HM Land Registry UK HPI — mean property price
  | "boeRate"          // Bank of England official Bank Rate (%)
  | "cpih"             // ONS CPIH index (2015 = 100)

export type RegionSeries = Record<SeriesKey, YearValue[]>

export interface SeriesData {
  regions: Record<Region, RegionSeries>
  metadata: {
    generatedAt: string
    sources: Record<SeriesKey, { name: string; url: string; lastFetched: string }>
  }
}
