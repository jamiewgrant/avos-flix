import { useState } from "react"
import type { Series } from "../types/series"

interface Props {
  housePrice: Series
}

interface Sacrifice {
  key: string
  label: string
  cost: number // £ per occurrence
  unit: "day" | "month"
}

const SACRIFICES: Sacrifice[] = [
  { key: "avocado-toast", label: "an avocado toast", cost: 3.5, unit: "day" },
  { key: "flat-white", label: "a flat white", cost: 3.2, unit: "day" },
  { key: "pint", label: "a pint", cost: 6.5, unit: "day" },
  { key: "deliveroo", label: "a Deliveroo dinner", cost: 18, unit: "day" },
  { key: "netflix", label: "Netflix", cost: 12.99, unit: "month" },
  { key: "spotify", label: "Spotify Premium", cost: 11.99, unit: "month" },
  { key: "gym", label: "a gym membership", cost: 45, unit: "month" },
  { key: "avocado", label: "an avocado", cost: 1.2, unit: "day" },
]

function annualCost(s: Sacrifice, perWeek: number): number {
  if (s.unit === "month") return s.cost * 12
  return s.cost * perWeek * 52
}

function formatGBP(v: number): string {
  if (v >= 1000) return `£${Math.round(v).toLocaleString("en-GB")}`
  return `£${v.toFixed(2)}`
}

export function AvosToastCalculator({ housePrice }: Props) {
  const latest = housePrice.points[housePrice.points.length - 1]
  if (!latest) return null

  const [sacrificeKey, setSacrificeKey] = useState(SACRIFICES[0].key)
  const [perWeek, setPerWeek] = useState(5)

  const sacrifice = SACRIFICES.find((s) => s.key === sacrificeKey) ?? SACRIFICES[0]
  const annual = annualCost(sacrifice, perWeek)
  const housePriceNow = latest.value
  const deposit10pct = housePriceNow * 0.1
  const years = annual > 0 ? deposit10pct / annual : Infinity

  const yearsDisplay = !Number.isFinite(years)
    ? "∞"
    : years > 999
      ? "∞"
      : years.toFixed(years >= 100 ? 0 : 1)

  return (
    <section className="rounded-2xl border border-(--color-border) bg-(--color-surface) p-6 md:p-10">
      <div className="text-xs text-(--color-muted) font-mono uppercase tracking-wide mb-2">
        Calculator
      </div>
      <h3 className="text-2xl md:text-3xl font-semibold text-white">
        Sacrifice the toast. Save the deposit?
      </h3>

      <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-3 text-lg text-(--color-muted) leading-relaxed">
        <span>If I skipped</span>
        <select
          value={sacrificeKey}
          onChange={(e) => setSacrificeKey(e.target.value)}
          className="bg-(--color-bg) border border-(--color-border) text-white px-3 py-1.5 rounded-md cursor-pointer hover:border-(--color-accent) transition-colors text-base"
        >
          {SACRIFICES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label} ({formatGBP(s.cost)}/{s.unit === "month" ? "mo" : "day"})
            </option>
          ))}
        </select>
        {sacrifice.unit === "day" && (
          <>
            <input
              type="number"
              min={1}
              max={7}
              value={perWeek}
              onChange={(e) =>
                setPerWeek(Math.max(1, Math.min(7, Number(e.target.value) || 1)))
              }
              className="bg-(--color-bg) border border-(--color-border) text-white w-16 px-2 py-1.5 rounded-md text-center text-base"
            />
            <span>days per week,</span>
          </>
        )}
        <span>I'd save {formatGBP(annual)} a year.</span>
      </div>

      <div className="mt-10 grid md:grid-cols-2 gap-6 items-end">
        <div>
          <div className="text-xs text-(--color-muted) font-mono uppercase tracking-wide mb-2">
            Years to a 10% UK deposit
          </div>
          <div className="text-7xl md:text-8xl font-bold text-(--color-accent) tabular-nums tracking-tighter leading-none">
            {yearsDisplay}
          </div>
          <div className="mt-3 text-sm text-(--color-muted) leading-snug">
            Average UK house: {formatGBP(housePriceNow)}.
            <br />
            A 10% deposit is {formatGBP(deposit10pct)}.
          </div>
        </div>
        <div className="text-(--color-muted) text-sm leading-relaxed border-l border-(--color-border) pl-6">
          <p>That assumes:</p>
          <ul className="mt-2 space-y-1 list-disc list-inside marker:text-(--color-accent)">
            <li>You bank every saved penny</li>
            <li>House prices stop rising while you save</li>
            <li>You ignore stamp duty, mortgage fees, and surveys</li>
            <li>Interest on the savings cancels out inflation</li>
          </ul>
          <p className="mt-4 text-(--color-text) opacity-80">
            None of those are true. The number above is the optimistic case.
          </p>
        </div>
      </div>
    </section>
  )
}
