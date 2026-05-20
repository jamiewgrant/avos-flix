import { useMemo, useState } from "react"
import { useChartColors } from "../lib/useChartColors"
import { Group } from "@visx/group"
import { scaleLinear } from "@visx/scale"
import { AxisBottom, AxisLeft } from "@visx/axis"
import { GridRows } from "@visx/grid"
import { ParentSize } from "@visx/responsive"
import { LinePath } from "@visx/shape"
import { curveMonotoneX } from "@visx/curve"
import type { Series } from "../types/series"
import { netPayDetail } from "../lib/costBasket"

interface Props {
  housePrice: Series
  wage: Series
}

const ACCENT = "#c084fc"
const DANGER = "#ef4444"

const SAVING_RATES = [5, 10, 20] as const
const DEPOSIT_PCTS = [10, 15] as const

type SavingRate = typeof SAVING_RATES[number]
type DepositPct = typeof DEPOSIT_PCTS[number]

export function DepositTimelineSection({ housePrice, wage }: Props) {
  const { muted: MUTED, grid: GRID, surface: SURFACE } = useChartColors()
  const [savingRate, setSavingRate] = useState<SavingRate>(10)
  const [depositPct, setDepositPct] = useState<DepositPct>(10)

  const points = useMemo(() => {
    const priceMap = new Map(housePrice.points.map((p) => [p.year, p.value]))
    const out: { year: number; yearsToSave: number }[] = []
    for (const w of wage.points) {
      const price = priceMap.get(w.year)
      if (!price) continue
      const net = netPayDetail(w.value, w.year, {}).net
      const annualSaving = net * (savingRate / 100)
      if (annualSaving <= 0) continue
      const deposit = price * (depositPct / 100)
      out.push({ year: w.year, yearsToSave: deposit / annualSaving })
    }
    return out.filter((p) => p.year >= 1995)
  }, [housePrice, wage, savingRate, depositPct])

  const firstPoint = points[0]
  const lastPoint = points[points.length - 1]

  return (
    <section className="mb-20">
      <h2 className="text-3xl md:text-4xl font-semibold text-(--color-text) mb-3">
        How long does the deposit take?
      </h2>
      <p className="text-(--color-muted) mb-8 max-w-2xl text-lg leading-relaxed">
        Saving a fixed share of median full-time take-home pay — how many years
        does it take to accumulate a deposit, in each year since 1995? The 1990s
        baseline was around 3 years. It has never recovered.
      </p>

      <div className="rounded-2xl border border-(--color-border) bg-(--color-surface) p-4 md:p-6">
        <div className="mb-4 flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-(--color-muted) w-28 shrink-0">saving rate:</span>
            {SAVING_RATES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setSavingRate(r)}
                aria-pressed={savingRate === r}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  savingRate === r
                    ? "border-(--color-accent) bg-(--color-accent)/10 text-(--color-accent)"
                    : "border-(--color-border) bg-(--color-bg) text-(--color-muted) hover:text-(--color-text)"
                }`}
              >
                {r}% of take-home
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-(--color-muted) w-28 shrink-0">deposit size:</span>
            {DEPOSIT_PCTS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDepositPct(d)}
                aria-pressed={depositPct === d}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  depositPct === d
                    ? "border-(--color-accent) bg-(--color-accent)/10 text-(--color-accent)"
                    : "border-(--color-border) bg-(--color-bg) text-(--color-muted) hover:text-(--color-text)"
                }`}
              >
                {d}%
              </button>
            ))}
          </div>
        </div>

        {firstPoint && lastPoint && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
            <div className="rounded-xl border border-(--color-border) bg-(--color-bg) p-4">
              <div className="text-2xl font-semibold text-(--color-text) tabular-nums">
                {firstPoint.yearsToSave.toFixed(1)}y
              </div>
              <div className="text-xs text-(--color-muted) mt-1">Years to save in {firstPoint.year}</div>
            </div>
            <div className="rounded-xl border border-(--color-border) bg-(--color-bg) p-4" style={{ borderColor: "var(--color-accent)" }}>
              <div className="text-2xl font-semibold tabular-nums" style={{ color: "var(--color-accent)" }}>
                {lastPoint.yearsToSave.toFixed(1)}y
              </div>
              <div className="text-xs text-(--color-muted) mt-1">Years to save in {lastPoint.year}</div>
            </div>
            <div className="rounded-xl border border-(--color-border) bg-(--color-bg) p-4">
              <div className="text-2xl font-semibold text-(--color-text) tabular-nums">
                {(lastPoint.yearsToSave / firstPoint.yearsToSave).toFixed(1)}×
              </div>
              <div className="text-xs text-(--color-muted) mt-1">Longer than it used to be</div>
            </div>
          </div>
        )}

        <ParentSize>
          {({ width }) => {
            if (width === 0 || points.length === 0) return null
            const height = 280
            const margin = { top: 16, right: 20, bottom: 32, left: 52 }
            const innerW = width - margin.left - margin.right
            const innerH = height - margin.top - margin.bottom

            const xMin = points[0].year
            const xMax = points[points.length - 1].year
            const yMax = Math.max(...points.map((p) => p.yearsToSave)) * 1.1

            const xScale = scaleLinear<number>({ domain: [xMin, xMax], range: [0, innerW] })
            const yScale = scaleLinear<number>({ domain: [0, yMax], range: [innerH, 0], nice: true })

            const refY = 3

            return (
              <svg width={width} height={height} role="img" aria-label="Years to save a deposit over time">
                <Group left={margin.left} top={margin.top}>
                  <GridRows scale={yScale} width={innerW} stroke={GRID} strokeDasharray="2,4" numTicks={5} />

                  {/* 2022-23 crisis band */}
                  {xMin <= 2022 && (
                    <>
                      <rect
                        x={xScale(2022)}
                        width={Math.max(0, xScale(Math.min(2024, xMax)) - xScale(2022))}
                        y={0}
                        height={innerH}
                        fill={DANGER}
                        opacity={0.06}
                      />
                    </>
                  )}

                  {/* 3-year reference line */}
                  {refY <= yMax && (
                    <>
                      <line
                        x1={0} x2={innerW}
                        y1={yScale(refY)} y2={yScale(refY)}
                        stroke={MUTED}
                        strokeWidth={1}
                        strokeDasharray="4,4"
                        opacity={0.5}
                      />
                      <text x={innerW - 4} y={yScale(refY) - 4} fill={MUTED} fontSize={9} textAnchor="end" opacity={0.7}>
                        1990s baseline (~3y)
                      </text>
                    </>
                  )}

                  <AxisBottom
                    top={innerH}
                    scale={xScale}
                    numTicks={7}
                    tickFormat={(v) => `${v}`}
                    stroke={GRID}
                    tickStroke={GRID}
                    tickLabelProps={{ fill: MUTED, fontSize: 11, textAnchor: "middle" }}
                  />
                  <AxisLeft
                    scale={yScale}
                    numTicks={5}
                    tickFormat={(v) => `${v}y`}
                    stroke={GRID}
                    tickStroke={GRID}
                    tickLabelProps={{ fill: MUTED, fontSize: 11, dx: -4, dy: 4, textAnchor: "end" }}
                  />

                  <LinePath
                    data={points}
                    x={(p) => xScale(p.year)}
                    y={(p) => yScale(p.yearsToSave)}
                    stroke={ACCENT}
                    strokeWidth={2.5}
                    curve={curveMonotoneX}
                  />

                  {/* Last point dot */}
                  {lastPoint && (
                    <circle
                      cx={xScale(lastPoint.year)}
                      cy={yScale(lastPoint.yearsToSave)}
                      r={4}
                      fill={ACCENT}
                      stroke={SURFACE}
                      strokeWidth={2}
                    />
                  )}
                </Group>
              </svg>
            )
          }}
        </ParentSize>

        <p className="mt-4 text-[11px] text-(--color-muted) font-mono opacity-70 leading-relaxed">
          Methodology: for each year, take the ONS ASHE full-time median gross wage, apply the year's actual income tax + NI rates (using the per-year tax model), compute {savingRate}% of net take-home, divide a {depositPct}% deposit on the Land Registry mean UK house price by that figure. No savings interest assumed — a conservative floor. Actual saving rates vary widely.
        </p>
      </div>
    </section>
  )
}
