import { describe, it, expect } from "vitest"
import { fmt, pct } from "./format"

describe("fmt — regression pin for negative-sign suppression bug", () => {
  // Previous version did `"£" + Math.abs(rounded).toLocaleString()` which
  // stripped the minus sign and made deficits render as surpluses, e.g.
  // a £228 deficit displayed as "£228" — making 1990 look better than today.
  it("formats positives with £ prefix", () => {
    expect(fmt(228)).toBe("£228")
    expect(fmt(1234)).toBe("£1,234")
    expect(fmt(0)).toBe("£0")
  })

  it("formats negatives with explicit minus sign and £ prefix", () => {
    expect(fmt(-228)).toBe("−£228")
    expect(fmt(-1234)).toBe("−£1,234")
    expect(fmt(-50000)).toBe("−£50,000")
  })

  it("does not strip the sign via Math.abs (regression for the suppression bug)", () => {
    // If this fails, the suppression bug is back.
    expect(fmt(-228)).not.toBe("£228")
    expect(fmt(-228)).not.toBe(fmt(228))
  })

  it("rounds to whole pounds", () => {
    expect(fmt(228.4)).toBe("£228")
    expect(fmt(228.6)).toBe("£229")
    expect(fmt(-228.6)).toBe("−£229")
  })

  it("uses British thousands separator", () => {
    expect(fmt(1234567)).toBe("£1,234,567")
  })
})

describe("pct", () => {
  it("formats with one decimal and % suffix", () => {
    expect(pct(12.34)).toBe("12.3%")
    expect(pct(0)).toBe("0.0%")
  })

  it("preserves sign for negative percentages", () => {
    // Regression: a previous version called .toFixed(1) on Math.abs().
    expect(pct(-12.3)).toBe("-12.3%")
  })
})
