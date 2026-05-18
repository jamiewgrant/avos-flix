import { Group } from "@visx/group"
import { LinePath } from "@visx/shape"
import { scaleLinear } from "@visx/scale"
import { AxisBottom, AxisLeft } from "@visx/axis"
import { ParentSize } from "@visx/responsive"
import { curveMonotoneX } from "@visx/curve"

interface Props {
  annualSaving: number
  currentHousePrice: number
  housePriceGrowth?: number // annual, default 4% (UK long-run average)
  years?: number // horizon, default 40
}

const ACCENT = "#c084fc"
const MUTED = "#9ca3af"
const GRID = "#2a2c36"
const DANGER = "#ef4444"

// Small inline chart inside the calculator. Shows the user's cumulative
// savings vs the deposit target rising with house-price growth.
// If the lines never cross — and they usually don't — it makes the point.
export function DepositChaseChart({
  annualSaving,
  currentHousePrice,
  housePriceGrowth = 0.04,
  years = 40,
}: Props) {
  const series = {
    savings: [] as { year: number; value: number }[],
    target: [] as { year: number; value: number }[],
  }
  for (let y = 0; y <= years; y++) {
    series.savings.push({ year: y, value: annualSaving * y })
    series.target.push({
      year: y,
      value: currentHousePrice * Math.pow(1 + housePriceGrowth, y) * 0.1,
    })
  }

  // Find the first crossover (savings >= target) — usually never.
  let crossoverYear: number | null = null
  for (let y = 0; y <= years; y++) {
    if (series.savings[y].value >= series.target[y].value) {
      crossoverYear = y
      break
    }
  }
  const finalGap = series.target[years].value - series.savings[years].value

  return (
    <div>
      <ParentSize>
        {({ width }) => {
          if (width === 0) return null
          const height = 220
          const margin = { top: 16, right: 20, bottom: 28, left: 56 }
          const innerW = width - margin.left - margin.right
          const innerH = height - margin.top - margin.bottom

          const xScale = scaleLinear<number>({ domain: [0, years], range: [0, innerW] })
          const maxVal = Math.max(
            series.target[years].value,
            series.savings[years].value,
          )
          const yScale = scaleLinear<number>({
            domain: [0, maxVal * 1.05],
            range: [innerH, 0],
            nice: true,
          })

          return (
            <svg width={width} height={height} role="img" aria-label="Cumulative savings vs rising deposit target">
              <Group left={margin.left} top={margin.top}>
                <AxisBottom
                  top={innerH}
                  scale={xScale}
                  numTicks={6}
                  tickFormat={(v) => `+${v}y`}
                  stroke={GRID}
                  tickStroke={GRID}
                  tickLabelProps={{ fill: MUTED, fontSize: 11, textAnchor: "middle" }}
                />
                <AxisLeft
                  scale={yScale}
                  numTicks={4}
                  tickFormat={(v) =>
                    (v as number) >= 1000
                      ? `£${Math.round((v as number) / 1000)}k`
                      : `£${Math.round(v as number)}`
                  }
                  stroke={GRID}
                  tickStroke={GRID}
                  tickLabelProps={{ fill: MUTED, fontSize: 11, dx: -4, dy: 4, textAnchor: "end" }}
                />

                {/* Target deposit line (climbing) */}
                <LinePath
                  data={series.target}
                  x={(d) => xScale(d.year)}
                  y={(d) => yScale(d.value)}
                  stroke={DANGER}
                  strokeWidth={2}
                  strokeDasharray="5,4"
                  curve={curveMonotoneX}
                />
                {/* Cumulative savings line */}
                <LinePath
                  data={series.savings}
                  x={(d) => xScale(d.year)}
                  y={(d) => yScale(d.value)}
                  stroke={ACCENT}
                  strokeWidth={2.5}
                  curve={curveMonotoneX}
                />

                {/* End labels */}
                <text
                  x={xScale(years) - 4}
                  y={yScale(series.target[years].value) - 6}
                  fill={DANGER}
                  fontSize={11}
                  fontWeight={700}
                  textAnchor="end"
                >
                  Deposit target
                </text>
                <text
                  x={xScale(years) - 4}
                  y={yScale(series.savings[years].value) + 14}
                  fill={ACCENT}
                  fontSize={11}
                  fontWeight={700}
                  textAnchor="end"
                >
                  Your savings
                </text>
              </Group>
            </svg>
          )
        }}
      </ParentSize>

      <div className="mt-4 text-sm text-(--color-muted) leading-relaxed">
        {crossoverYear === null ? (
          <>
            At {(housePriceGrowth * 100).toFixed(0)}% annual house-price growth,
            your savings <strong className="text-(--color-text)">never</strong> catch
            the deposit. After {years} years you're still{" "}
            <strong className="text-(--color-danger)">
              £{Math.round(finalGap).toLocaleString("en-GB")}
            </strong>{" "}
            short, and the target keeps moving.
          </>
        ) : (
          <>
            You catch the target after{" "}
            <strong className="text-(--color-accent)">{crossoverYear} years</strong>{" "}
            of saving — but the target is moving at{" "}
            {(housePriceGrowth * 100).toFixed(0)}% per year while you save in fixed
            pounds.
          </>
        )}
      </div>
    </div>
  )
}
