export type YearValue = { year: number; value: number }

export type Unit = "GBP" | "percent" | "index" | "count" | "rate"

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
  // Points before this year are modelled estimates / proxies, drawn dashed.
  // Omit when the entire series is observed data.
  verifiedFrom?: number
}

export interface SeriesData {
  series: Record<string, Series>
  metadata: {
    generatedAt: string
  }
}

export const UNIT_LABEL: Record<Unit, string> = {
  GBP: "Pounds (£)",
  percent: "Percent (%)",
  index: "Index",
  count: "Count (thousands)",
  rate: "Rate (per 1,000)",
}

export function formatValue(value: number, unit: Unit): string {
  switch (unit) {
    case "GBP":
      if (Math.abs(value) >= 1_000_000) return `£${(value / 1_000_000).toFixed(1)}M`
      if (Math.abs(value) >= 10_000) return `£${(value / 1000).toFixed(0)}k`
      if (Math.abs(value) >= 1000) return `£${Math.round(value).toLocaleString("en-GB")}`
      return `£${value.toFixed(value < 10 ? 2 : 0)}`
    case "percent":
      return `${value.toFixed(1)}%`
    case "index":
      return `${Math.round(value * 10) / 10}`
    case "count":
      return `${Math.round(value).toLocaleString("en-GB")}k`
    case "rate":
      return value.toFixed(1)
  }
}

export function formatAxisValue(value: number, unit: Unit): string {
  switch (unit) {
    case "GBP":
      if (Math.abs(value) >= 1_000_000) return `£${(value / 1_000_000).toFixed(1)}M`
      if (Math.abs(value) >= 1000) return `£${(value / 1000).toFixed(0)}k`
      return `£${Math.round(value)}`
    case "percent":
      return `${Math.round(value)}%`
    case "count":
      if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}k`
      return `${Math.round(value)}k`
    case "rate":
      return value.toFixed(1)
    case "index":
    default:
      return `${Math.round(value)}`
  }
}
