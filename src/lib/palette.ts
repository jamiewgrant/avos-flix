import type { Series } from "../types/series"

export type PaletteMode = "default" | "cb"

// Okabe-Ito + Wong colour-blind safe set; mapped by category-of-series id.
const CB_OVERRIDES: Record<string, string> = {
  "median-wage": "#E69F00",
  "household-income": "#56B4E9",
  "min-wage": "#F0E442",
  "grad-salary": "#0072B2",
  "house-price-nationwide": "#D55E00",
  "house-price-landreg": "#CC79A7",
  "house-price-london": "#E69F00",
  "house-price-northeast": "#009E73",
  "rent-index": "#56B4E9",
  "homeownership-25-34": "#D55E00",
  "homeownership-35-44": "#E69F00",
  "homeownership-55-64": "#009E73",
  "ftb-age": "#999999",
  "energy-cost": "#D55E00",
  "council-tax": "#0072B2",
  "rail-fares": "#56B4E9",
  "tuition-uk": "#E69F00",
  "student-debt": "#CC79A7",
  "netflix-uk": "#D55E00",
  "avocado-uk": "#009E73",
  "childcare-cost": "#F0E442",
  "tax-burden-median": "#CC79A7",
  "birth-rate": "#56B4E9",
  "net-migration": "#0072B2",
  "persons-per-household": "#009E73",
  "cpih": "#999999",
  "boe-rate": "#D55E00",
}

export function applyPalette(series: Series[], mode: PaletteMode): Series[] {
  if (mode === "default") return series
  return series.map((s) => ({ ...s, color: CB_OVERRIDES[s.id] ?? s.color }))
}
