import { useMemo, useState } from "react"
import { Group } from "@visx/group"
import { LinePath } from "@visx/shape"
import { scaleLinear } from "@visx/scale"
import { AxisBottom, AxisLeft } from "@visx/axis"
import { GridRows } from "@visx/grid"
import { ParentSize } from "@visx/responsive"
import { curveMonotoneX } from "@visx/curve"
import type { Series, YearValue } from "../../types/series"

interface Props {
  wage: Series
  taxBurden: Series
  cpih: Series
}

const NOMINAL = "#9ca3af"
const REAL = "#c084fc"
const GRID = "#2a2c36"
const MUTED = "#9ca3af"
const TEXT = "#e8e6e3"
const SURFACE = "#16171d"
const BORDER = "#2e303a"

export function RealTakeHomeChart({ wage, taxBurden, cpih }: Props) {
  const [hovered, setHovered] = useState<number | null>(null)

  const data = useMemo(() => {
    const taxByYear = new Map(taxBurden.points.map((p) => [p.year, p.value]))
    const cpihByYear = new Map(cpih.points.map((p) => [p.year, p.value]))
    const latestCpih = cpih.points[cpih.points.length - 1]?.value ?? 100

    const nominal: YearValue[] = []
    const real: YearValue[] = []
    for (const p of wage.points) {
      const tax = taxByYear.get(p.year)
      const idx = cpihByYear.get(p.year)
      if (!tax || !idx) continue
      const takeHome = p.value * (1 - tax / 100)
      nominal.push({ year: p.year, value: takeHome })
      real.push({ year: p.year, value: (takeHome * latestCpih) / idx })
    }
    return { nominal, real }
  }, [wage, taxBurden, cpih])

  if (data.real.length === 0) return null

  return (
    <ParentSize>
      {({ width }) => {
        if (width === 0) return null
        const height = Math.max(280, Math.min(380, width * 0.42))
        const margin = { top: 20, right: 16, bottom: 32, left: 60 }
        const innerW = width - margin.left - margin.right
        const innerH = height - margin.top - margin.bottom

        const years = data.real.map((p) => p.year)
        const xScale = scaleLinear<number>({ domain: [Math.min(...years), Math.max(...years)], range: [0, innerW] })
        const allVals = [...data.nominal.map((p) => p.value), ...data.real.map((p) => p.value)]
        const yScale = scaleLinear<number>({
          domain: [Math.min(...allVals) * 0.8, Math.max(...allVals) * 1.05],
          range: [innerH, 0],
          nice: true,
        })

        function handleMove(e: React.PointerEvent<SVGRectElement>) {
          const rect = e.currentTarget.getBoundingClientRect()
          const x = e.clientX - rect.left
          const year = Math.round(xScale.invert(x))
          if (year < years[0] || year > years[years.length - 1]) setHovered(null)
          else setHovered(year)
        }

        const hReal = hovered === null ? null : data.real.find((p) => p.year === hovered)
        const hNominal = hovered === null ? null : data.nominal.find((p) => p.year === hovered)

        return (
          <svg width={width} height={height} role="img" aria-label="Real take-home pay">
            <Group left={margin.left} top={margin.top}>
              <GridRows scale={yScale} width={innerW} stroke={GRID} strokeDasharray="2,4" numTicks={5} />

              <AxisBottom top={innerH} scale={xScale} numTicks={6} tickFormat={(v) => `${v}`} stroke={GRID} tickStroke={GRID}
                tickLabelProps={{ fill: MUTED, fontSize: 11, textAnchor: "middle" }} />
              <AxisLeft scale={yScale} numTicks={5} tickFormat={(v) => `£${Math.round((v as number) / 1000)}k`} stroke={GRID} tickStroke={GRID}
                tickLabelProps={{ fill: MUTED, fontSize: 11, dx: -4, dy: 4, textAnchor: "end" }} />

              <LinePath data={data.nominal} x={(p) => xScale(p.year)} y={(p) => yScale(p.value)}
                stroke={NOMINAL} strokeWidth={2} curve={curveMonotoneX} strokeDasharray="4,4" opacity={0.7} />
              <LinePath data={data.real} x={(p) => xScale(p.year)} y={(p) => yScale(p.value)}
                stroke={REAL} strokeWidth={2.5} curve={curveMonotoneX} />

              {hReal && hNominal && (
                <g>
                  <line x1={xScale(hReal.year)} x2={xScale(hReal.year)} y1={0} y2={innerH} stroke={TEXT} strokeOpacity={0.4} />
                  <circle cx={xScale(hReal.year)} cy={yScale(hReal.value)} r={4} fill={REAL} stroke={SURFACE} strokeWidth={2} />
                  <circle cx={xScale(hNominal.year)} cy={yScale(hNominal.value)} r={4} fill={NOMINAL} stroke={SURFACE} strokeWidth={2} />
                  <g transform={`translate(${Math.min(xScale(hReal.year) + 10, innerW - 170)}, 8)`}>
                    <rect width={168} height={56} rx={6} fill={SURFACE} stroke={BORDER} />
                    <text x={8} y={15} fill={TEXT} fontSize={11} fontWeight={600}>{hReal.year}</text>
                    <text x={8} y={31} fill={REAL} fontSize={11}>Real take-home: £{Math.round(hReal.value).toLocaleString("en-GB")}</text>
                    <text x={8} y={46} fill={NOMINAL} fontSize={11}>Nominal: £{Math.round(hNominal.value).toLocaleString("en-GB")}</text>
                  </g>
                </g>
              )}

              <rect x={0} y={0} width={innerW} height={innerH} fill="transparent"
                onPointerMove={handleMove} onPointerLeave={() => setHovered(null)} />
            </Group>
          </svg>
        )
      }}
    </ParentSize>
  )
}
