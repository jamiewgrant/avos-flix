import { describe, it, expect } from "vitest"
import { deflateSeries } from "./deflate"
import type { Series, YearValue } from "../types/series"

// Build a minimal Series stub with sensible defaults.
function mkSeries(id: string, unit: Series["unit"], points: YearValue[]): Series {
  return {
    id,
    name: id,
    unit,
    color: "#000",
    source: { name: "test", url: "" },
    region: "UK",
    points,
  }
}

// Synthetic CPIH where 2025 = 130, 2020 = 110, 2015 = 100, 2010 = 90.
// Inflation factor 2020→2025 = 130/110 ≈ 1.182.
const cpih: YearValue[] = [
  { year: 2010, value: 90 },
  { year: 2015, value: 100 },
  { year: 2020, value: 110 },
  { year: 2025, value: 130 },
]

describe("deflateSeries — CPIH-deflation of price series", () => {
  it("rebases GBP series to the latest CPIH year (the reference)", () => {
    const wage = mkSeries("wage", "GBP", [
      { year: 2015, value: 30000 },
      { year: 2020, value: 35000 },
      { year: 2025, value: 40000 },
    ])
    const { series, refYear } = deflateSeries([wage], cpih)
    expect(refYear).toBe(2025)

    const got = series[0].points
    // 2015: 30000 * 130/100 = 39000
    expect(got.find((p) => p.year === 2015)!.value).toBe(39000)
    // 2020: 35000 * 130/110 = 41363.63...
    expect(got.find((p) => p.year === 2020)!.value).toBe(41364)
    // 2025 (reference year): unchanged
    expect(got.find((p) => p.year === 2025)!.value).toBe(40000)
  })

  it("deflating a series that equals CPIH itself produces a flat reference line", () => {
    // CPIH deflated by itself should be constant = refValue.
    const cpihSeries = mkSeries("cpih", "index", cpih)
    const { series } = deflateSeries([cpihSeries], cpih)
    const got = series[0].points
    // All values should equal the reference (130), give or take rounding.
    for (const p of got) {
      expect(p.value).toBeCloseTo(130, 1)
    }
  })

  it("passes through percent, count, and rate series unchanged", () => {
    const rate = mkSeries("rate", "rate", [
      { year: 2015, value: 0.5 },
      { year: 2020, value: 1.0 },
    ])
    const pctS = mkSeries("pct", "percent", [
      { year: 2015, value: 25 },
      { year: 2020, value: 30 },
    ])
    const count = mkSeries("count", "count", [
      { year: 2015, value: 100 },
      { year: 2020, value: 200 },
    ])
    const { series } = deflateSeries([rate, pctS, count], cpih)
    expect(series[0]).toBe(rate) // referential equality — unchanged
    expect(series[1]).toBe(pctS)
    expect(series[2]).toBe(count)
  })

  it("drops years outside CPIH coverage", () => {
    const wage = mkSeries("wage", "GBP", [
      { year: 1990, value: 10000 }, // outside CPIH coverage
      { year: 2015, value: 30000 },
    ])
    const { series } = deflateSeries([wage], cpih)
    const years = series[0].points.map((p) => p.year)
    expect(years).not.toContain(1990)
    expect(years).toContain(2015)
  })

  it("returns refYear=current year when CPIH series is empty", () => {
    const wage = mkSeries("wage", "GBP", [{ year: 2020, value: 30000 }])
    const { refYear, series } = deflateSeries([wage], [])
    expect(refYear).toBe(new Date().getFullYear())
    expect(series).toEqual([wage]) // pass-through
  })

  it("relative ordering is preserved after deflation (real growth direction)", () => {
    const wage = mkSeries("wage", "GBP", [
      { year: 2010, value: 26000 }, // CPIH 90
      { year: 2015, value: 28000 }, // CPIH 100
      { year: 2020, value: 30000 }, // CPIH 110
      { year: 2025, value: 35000 }, // CPIH 130
    ])
    // Real growth: 2010 deflated = 26000 * 130/90 ≈ 37,555 — higher than 2025's 35,000
    // i.e. real wages have fallen, which the chart should show.
    const { series } = deflateSeries([wage], cpih)
    const got = series[0].points
    expect(got.find((p) => p.year === 2010)!.value).toBeGreaterThan(35000)
    expect(got.find((p) => p.year === 2025)!.value).toBe(35000)
  })
})
