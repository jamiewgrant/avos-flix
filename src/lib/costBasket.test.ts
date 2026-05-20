import { describe, it, expect } from "vitest"
import { buildStack, REFERENCE_YEAR, type CostLayer } from "./costBasket"
import type { Series, YearValue } from "../types/series"

function mkSeries(id: string, points: YearValue[]): Series {
  return {
    id,
    name: id,
    unit: "GBP",
    color: "#000",
    source: { name: "test", url: "" },
    region: "UK",
    points,
  }
}

// Three driver series, each defined for {2010, 2015, 2020}. With one twist:
// the second driver is missing 2015 to verify the year-intersection contract.
function makeFixtureSeries(opts: { dropYearFromSecond?: number } = {}): Record<string, Series> {
  const yearsA = [2010, 2015, 2020]
  const yearsB = [2010, 2015, 2020].filter((y) => y !== opts.dropYearFromSecond)
  const yearsC = [2010, 2015, 2020]
  return {
    "drv-a": mkSeries("drv-a", yearsA.map((y) => ({ year: y, value: 100 + (y - 2010) }))),
    "drv-b": mkSeries("drv-b", yearsB.map((y) => ({ year: y, value: 200 + (y - 2010) * 2 }))),
    "drv-c": mkSeries("drv-c", yearsC.map((y) => ({ year: y, value: 300 + (y - 2010) * 3 }))),
  }
}

const FIXTURE_LAYERS: CostLayer[] = [
  { id: "a", label: "A", color: "#aaa", refValue: 1000, driverId: "drv-a" },
  { id: "b", label: "B", color: "#bbb", refValue: 2000, driverId: "drv-b" },
  { id: "c", label: "C", color: "#ccc", refValue: 3000, driverId: "drv-c" },
]

describe("buildStack — year intersection across layer drivers", () => {
  it("reference year (2015) emits each layer exactly at its refValue", () => {
    const series = makeFixtureSeries()
    expect(REFERENCE_YEAR).toBe(2015)
    const out = buildStack(series, FIXTURE_LAYERS)
    const refPoint = out.find((p) => p.year === 2015)
    expect(refPoint).toBeDefined()
    expect(refPoint!.layers.a).toBeCloseTo(1000, 5)
    expect(refPoint!.layers.b).toBeCloseTo(2000, 5)
    expect(refPoint!.layers.c).toBeCloseTo(3000, 5)
    expect(refPoint!.total).toBeCloseTo(6000, 5)
  })

  it("scales by driver ratio: layerVal = refValue × (driver(y) / driver(refYear))", () => {
    const series = makeFixtureSeries()
    const out = buildStack(series, FIXTURE_LAYERS)
    const p2020 = out.find((p) => p.year === 2020)!
    // drv-a: 105 / 105 = 1.0  → 1000 (refValue is at 2015 where drv-a=105? actually drv-a(2015)=105? no)
    // drv-a values: 2010=100, 2015=105, 2020=110. ref = 105.
    // 2020 scaled: 1000 * 110 / 105 = 1047.619
    expect(p2020.layers.a).toBeCloseTo(1000 * 110 / 105, 4)
    // drv-b: 2010=200, 2015=210, 2020=220. ref=210. 2020 → 2000 * 220/210
    expect(p2020.layers.b).toBeCloseTo(2000 * 220 / 210, 4)
  })

  it("drops years where any layer driver is missing data (intersection contract)", () => {
    const series = makeFixtureSeries({ dropYearFromSecond: 2010 })
    const out = buildStack(series, FIXTURE_LAYERS)
    const years = out.map((p) => p.year)
    expect(years).not.toContain(2010) // drv-b missing 2010 → year dropped
    expect(years).toContain(2015)
    expect(years).toContain(2020)
  })

  it("returns an empty stack when the reference year is missing from any layer", () => {
    // drv-b missing 2015 (the reference year) → that layer cannot be scaled
    // and the stack year-intersection prevents emitting any year with all layers.
    const series = makeFixtureSeries({ dropYearFromSecond: 2015 })
    const out = buildStack(series, FIXTURE_LAYERS)
    // No year should have a complete layer set because drv-b has no refValue.
    expect(out.length).toBe(0)
  })

  it("total equals the sum of all layer values per year", () => {
    const series = makeFixtureSeries()
    const out = buildStack(series, FIXTURE_LAYERS)
    for (const p of out) {
      const sum = Object.values(p.layers).reduce((a, b) => a + b, 0)
      expect(p.total).toBeCloseTo(sum, 5)
    }
  })
})
