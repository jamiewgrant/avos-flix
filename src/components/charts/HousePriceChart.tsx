import { Group } from "@visx/group"
import { LinePath } from "@visx/shape"
import { scaleLinear } from "@visx/scale"
import { AxisBottom, AxisLeft } from "@visx/axis"
import { GridRows } from "@visx/grid"
import { ParentSize } from "@visx/responsive"
import { curveMonotoneX } from "@visx/curve"
import type { YearValue } from "../../types/series"

interface Props {
  housePrice: YearValue[]
  cpih: YearValue[]
  fromYear?: number
}

const ACCENT = "#c084fc"
const TEXT = "#f5f4f0"
const MUTED = "#9ca3af"
const GRID = "#2a2c36"

export function HousePriceChart({ housePrice, cpih, fromYear = 1995 }: Props) {
  return (
    <ParentSize>
      {({ width }) => {
        if (width === 0) return null
        const height = Math.max(280, Math.min(440, width * 0.5))

        const margin = { top: 16, right: 16, bottom: 36, left: 60 }
        const innerWidth = width - margin.left - margin.right
        const innerHeight = height - margin.top - margin.bottom

        const nominal = housePrice.filter((d) => d.year >= fromYear)
        if (nominal.length === 0) return null

        const cpihByYear = new Map(cpih.map((d) => [d.year, d.value]))
        const refCpih = cpih.length > 0 ? cpih[cpih.length - 1].value : 1
        const refYear = cpih.length > 0 ? cpih[cpih.length - 1].year : new Date().getFullYear()
        const real = nominal
          .filter((d) => cpihByYear.has(d.year))
          .map((d) => ({
            year: d.year,
            value: Math.round((d.value * refCpih) / cpihByYear.get(d.year)!),
          }))

        const maxValue = Math.max(
          ...nominal.map((d) => d.value),
          ...real.map((d) => d.value),
        )
        const xDomain: [number, number] = [
          Math.min(...nominal.map((d) => d.year)),
          Math.max(...nominal.map((d) => d.year)),
        ]

        const xScale = scaleLinear<number>({ domain: xDomain, range: [0, innerWidth] })
        const yScale = scaleLinear<number>({
          domain: [0, maxValue * 1.08],
          range: [innerHeight, 0],
          nice: true,
        })

        const fmt = (v: number) => `£${Math.round(v / 1000)}k`

        return (
          <svg width={width} height={height} role="img" aria-label="UK house prices, nominal vs real">
            <Group left={margin.left} top={margin.top}>
              <GridRows scale={yScale} width={innerWidth} stroke={GRID} strokeDasharray="2,4" numTicks={5} />
              <AxisBottom
                top={innerHeight}
                scale={xScale}
                numTicks={Math.min(7, xDomain[1] - xDomain[0])}
                tickFormat={(v) => `${v}`}
                tickStroke={GRID}
                stroke={GRID}
                tickLabelProps={{ fill: MUTED, fontSize: 12, textAnchor: "middle" }}
              />
              <AxisLeft
                scale={yScale}
                numTicks={5}
                tickFormat={(v) => fmt(v as number)}
                tickStroke={GRID}
                stroke={GRID}
                tickLabelProps={{ fill: MUTED, fontSize: 12, dx: -4, dy: 4, textAnchor: "end" }}
              />
              <LinePath
                data={real}
                x={(d) => xScale(d.year)}
                y={(d) => yScale(d.value)}
                stroke={ACCENT}
                strokeWidth={2}
                strokeDasharray="5,5"
                curve={curveMonotoneX}
              />
              <LinePath
                data={nominal}
                x={(d) => xScale(d.year)}
                y={(d) => yScale(d.value)}
                stroke={TEXT}
                strokeWidth={2.5}
                curve={curveMonotoneX}
              />
              <text
                x={innerWidth - 4}
                y={yScale(nominal[nominal.length - 1].value) - 8}
                fill={TEXT}
                fontSize={12}
                textAnchor="end"
                fontWeight={600}
              >
                {fmt(nominal[nominal.length - 1].value)}
              </text>
              {real.length > 0 && (
                <text
                  x={innerWidth - 4}
                  y={yScale(real[real.length - 1].value) + 16}
                  fill={ACCENT}
                  fontSize={12}
                  textAnchor="end"
                  fontWeight={500}
                >
                  {fmt(real[real.length - 1].value)} in {refYear} £
                </text>
              )}
            </Group>
          </svg>
        )
      }}
    </ParentSize>
  )
}
