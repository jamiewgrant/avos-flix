import type { Series } from "../types/series"

// A "typical UK household basket" of cost categories. £ values for the
// REFERENCE_YEAR are calibrated to roughly match an ONS Family Spending
// Survey middle quintile; every other year is scaled by the corresponding
// indicator series. Childcare + tuition are excluded from the headline
// basket (not every household pays them) but exposed separately.

export const REFERENCE_YEAR = 2015

export interface CostLayer {
  id: string
  label: string
  color: string
  // £ value of this layer in REFERENCE_YEAR.
  refValue: number
  // The series-id whose growth this layer follows.
  driverId: string
  // Optional explainer for the layer.
  hint?: string
}

export const COST_LAYERS: CostLayer[] = [
  {
    id: "housing",
    label: "Housing (rent or mortgage interest)",
    color: "#a78bfa",
    refValue: 9000,
    driverId: "rent-index",
    hint: "Scaled by the rent index — a proxy for shelter cost whether you rent or service a mortgage.",
  },
  {
    id: "energy",
    label: "Energy",
    color: "#f43f5e",
    refValue: 1256,
    driverId: "energy-cost",
  },
  {
    id: "council-tax",
    label: "Council tax",
    color: "#84cc16",
    refValue: 1484,
    driverId: "council-tax",
  },
  {
    id: "transport",
    label: "Transport (rail / commuting)",
    color: "#22d3ee",
    refValue: 1500,
    driverId: "rail-fares",
    hint: "Rail fare index used as a proxy for the broader transport bill.",
  },
  {
    id: "groceries",
    label: "Groceries + everyday goods",
    color: "#eab308",
    refValue: 5200,
    driverId: "cpih",
    hint: "Everything else in the shopping basket. Scaled by general CPIH inflation.",
  },
]

export interface StackPoint {
  year: number
  layers: Record<string, number>
  total: number
}

export function buildStack(
  series: Record<string, Series>,
  layers: CostLayer[] = COST_LAYERS,
): StackPoint[] {
  const driverMaps = new Map<string, Map<number, number>>()
  for (const layer of layers) {
    const s = series[layer.driverId]
    if (!s) continue
    driverMaps.set(layer.id, new Map(s.points.map((p) => [p.year, p.value])))
  }

  const refValues = new Map<string, number>()
  for (const layer of layers) {
    const m = driverMaps.get(layer.id)
    const ref = m?.get(REFERENCE_YEAR)
    if (m && ref && ref !== 0) refValues.set(layer.id, ref)
  }

  // Yearly grid: every year for which we have ALL drivers.
  const years = new Set<number>()
  let first = true
  for (const layer of layers) {
    const m = driverMaps.get(layer.id)
    if (!m) continue
    if (first) {
      for (const y of m.keys()) years.add(y)
      first = false
    } else {
      for (const y of [...years]) if (!m.has(y)) years.delete(y)
    }
  }

  const sortedYears = [...years].sort((a, b) => a - b)
  const out: StackPoint[] = []
  for (const year of sortedYears) {
    const layerVals: Record<string, number> = {}
    let total = 0
    for (const layer of layers) {
      const m = driverMaps.get(layer.id)
      const ref = refValues.get(layer.id)
      const v = m?.get(year)
      if (!m || !ref || v === undefined) continue
      const scaled = layer.refValue * (v / ref)
      layerVals[layer.id] = scaled
      total += scaled
    }
    if (Object.keys(layerVals).length === layers.length) {
      out.push({ year, layers: layerVals, total })
    }
  }
  return out
}

export function wageLine(
  wage: Series,
  netFactor = 0.78,
): Array<{ year: number; value: number }> {
  return wage.points.map((p) => ({ year: p.year, value: p.value * netFactor }))
}
