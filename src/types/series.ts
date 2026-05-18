export type YearValue = { year: number; value: number }

export type Unit = "GBP" | "percent" | "index"

export interface Source {
  name: string
  url: string
}

export interface Series {
  id: string
  name: string
  description?: string
  unit: Unit
  color: string
  source: Source
  region: string
  points: YearValue[]
}

export interface SeriesData {
  series: Record<string, Series>
  metadata: {
    generatedAt: string
  }
}
