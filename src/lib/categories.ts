export type Category = "housing" | "income" | "costs" | "demographics" | "macro"

export const CATEGORY_LABELS: Record<Category, string> = {
  income: "Income",
  housing: "Housing",
  costs: "Cost of living",
  demographics: "Demographics",
  macro: "Macro / reference",
}

export const CATEGORY_ORDER: Category[] = ["income", "housing", "costs", "demographics", "macro"]

const MAP: Record<string, Category> = {
  "median-wage": "income",
  "wage-p25": "income",
  "wage-p75": "income",
  "household-income": "income",
  "min-wage": "income",
  "grad-salary": "income",
  "tax-burden-median": "income",
  "public-sector-wage": "income",
  "private-sector-wage": "income",
  "house-price-nationwide": "housing",
  "house-price-landreg": "housing",
  "house-price-london": "housing",
  "house-price-northeast": "housing",
  "rent-index": "housing",
  "homeownership-25-34": "housing",
  "homeownership-35-44": "housing",
  "homeownership-55-64": "housing",
  "ftb-age": "housing",
  "wealth-25-34": "housing",
  "wealth-55-64": "housing",
  "intl-hpw-uk": "housing",
  "intl-hpw-germany": "housing",
  "intl-hpw-canada": "housing",
  "energy-cost": "costs",
  "council-tax": "costs",
  "rail-fares": "costs",
  "fuel-price": "costs",
  "tuition-uk": "costs",
  "student-debt": "costs",
  "netflix-uk": "costs",
  "avocado-uk": "costs",
  "childcare-cost": "costs",
  "healthcare-oop": "costs",
  "birth-rate": "demographics",
  "net-migration": "demographics",
  "persons-per-household": "demographics",
  "cpih": "macro",
  "boe-rate": "macro",
  "food-cpi": "macro",
  "savings-ratio": "macro",
}

export function categoryOf(id: string): Category {
  return MAP[id] ?? "macro"
}
