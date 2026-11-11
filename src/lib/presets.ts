/** Base years offered in Indexed mode (also bound to keyboard shortcuts 1–5). */
export const BASE_YEAR_OPTIONS = [1953, 1970, 1980, 1995, 2008]

export interface Preset {
  id: string
  label: string
  description: string
  visibleIds: string[] | null // null = custom, user-controlled
}

export const PRESETS: Preset[] = [
  {
    id: "wages-vs-houses",
    label: "Wages vs Houses",
    description: "The core thesis: house prices outran wages 5× since 1995",
    visibleIds: ["median-wage", "house-price-nationwide", "cpih"],
  },
  {
    id: "cost-squeeze",
    label: "Cost Squeeze",
    description: "Energy, childcare, rail, council tax — the costs that actually ate your pay",
    visibleIds: ["median-wage", "energy-cost", "childcare-cost", "rail-fares", "council-tax", "cpih"],
  },
  {
    id: "student-trap",
    label: "Student Trap",
    description: "Tuition tripled, debt compounded, graduate salaries didn't follow",
    visibleIds: ["median-wage", "tuition-uk", "student-debt", "grad-salary"],
  },
  {
    id: "housing-market",
    label: "Housing Market",
    description: "Prices, rents, ownership rates and the age you finally get on the ladder",
    visibleIds: ["house-price-nationwide", "rent-index", "homeownership-25-34", "ftb-age", "median-wage"],
  },
  {
    id: "custom",
    label: "Custom",
    description: "Pick your own combination of series",
    visibleIds: null,
  },
]
