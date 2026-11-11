// Generates the social preview image (public/og.svg + public/og.png) from the
// current series data. Called at the end of the ETL; can also be run on its own
// with `npm run og` to refresh the image from the committed series.json.
import { readFile, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { pathToFileURL } from "node:url"
import sharp from "sharp"
import type { Series, SeriesData, YearValue } from "../src/types/series.ts"

function computeGrowthRatio(
  s: Series,
  baseYear: number,
  targetYear: number,
): { ratio: number; latestYear: number } | null {
  const sorted = [...s.points].sort((a, b) => a.year - b.year)
  const base = sorted.find((p) => p.year === baseYear)
  if (!base || base.value === 0) return null
  // Use targetYear if available, otherwise the latest point
  const target =
    sorted.find((p) => p.year === targetYear) ?? sorted[sorted.length - 1]
  if (!target) return null
  return { ratio: target.value / base.value, latestYear: target.year }
}

// Both lines must share one y-scale (maxVal) — scaling each to its own maximum
// would make wages and house prices appear to end at the same height.
function toPolyline(
  pts: YearValue[],
  baseYear: number,
  maxVal: number,
  chartW: number,
  chartH: number,
): string {
  const base = pts.find((p) => p.year === baseYear)?.value ?? pts[0].value
  const years = pts.map((p) => p.year)
  const minYear = Math.min(...years)
  const maxYear = Math.max(...years)
  return pts
    .map((p) => {
      const x = ((p.year - minYear) / (maxYear - minYear)) * chartW
      const v = (p.value / base) * 100
      const y = chartH - (v / maxVal) * chartH
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(" ")
}

export async function regenerateOg(series: Record<string, Series>): Promise<void> {
  const OG_FILE = resolve("public", "og.svg")
  const OG_PNG_FILE = resolve("public", "og.png")
  const BASE_YEAR = 1995

  const hpSeries = series["house-price-nationwide"]
  const wageSeries = series["median-wage"]
  const cpihSeries = series["cpih"]

  if (!hpSeries || !wageSeries || !cpihSeries) {
    console.warn("  og.svg: one or more required series missing, skipping regeneration")
    return
  }

  // Compare all three over the same window: the latest year they all cover.
  const PREFERRED_YEAR = Math.min(
    ...[hpSeries, wageSeries, cpihSeries].map((s) => Math.max(...s.points.map((p) => p.year))),
  )

  const hp = computeGrowthRatio(hpSeries, BASE_YEAR, PREFERRED_YEAR)
  const wage = computeGrowthRatio(wageSeries, BASE_YEAR, PREFERRED_YEAR)
  const cpih = computeGrowthRatio(cpihSeries, BASE_YEAR, PREFERRED_YEAR)

  if (!hp || !wage || !cpih) {
    console.warn("  og.svg: could not compute growth ratios, skipping regeneration")
    return
  }

  const fmt = (r: number) => `${r.toFixed(1)}×`
  const latestYear = Math.max(hp.latestYear, wage.latestYear, cpih.latestYear)

  // Chart panel dimensions
  const CHART_X = 72
  const CHART_Y = 155
  const CHART_W = 1056
  const CHART_H = 235

  // Filter series points to the base year onwards for the chart
  const hpPts = hpSeries.points.filter((p) => p.year >= BASE_YEAR && p.year <= PREFERRED_YEAR)
  const wagePts = wageSeries.points.filter((p) => p.year >= BASE_YEAR && p.year <= PREFERRED_YEAR)


  // Compute grid lines: 200 and 400 index values mapped to y coords
  const hpValues = hpPts.map((p) => (p.value / (hpPts.find((x) => x.year === BASE_YEAR)?.value ?? hpPts[0].value)) * 100)
  const wageValues = wagePts.map((p) => (p.value / (wagePts.find((x) => x.year === BASE_YEAR)?.value ?? wagePts[0].value)) * 100)
  const allValues = [...hpValues, ...wageValues]
  const maxVal = Math.max(...allValues) * 1.15
  const hpPolyline = toPolyline(hpPts, BASE_YEAR, maxVal, CHART_W, CHART_H)
  const wagePolyline = toPolyline(wagePts, BASE_YEAR, maxVal, CHART_W, CHART_H)
  // Label each line just above where it ends.
  const yAt = (v: number) => CHART_H - (v / maxVal) * CHART_H
  const hpLabelY = yAt(hpValues[hpValues.length - 1]) - 12
  const wageLabelY = yAt(wageValues[wageValues.length - 1]) - 12
  const gridY200 = CHART_H - (200 / maxVal) * CHART_H
  const gridY400 = CHART_H - (400 / maxVal) * CHART_H

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <rect width="1200" height="630" fill="#0a0a0a"/>

  <text x="72" y="120" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="96" font-weight="700" fill="#f5f4f0" letter-spacing="-3">avos<tspan fill="#c084fc">+</tspan>flix</text>
  <text x="1128" y="115" font-family="ui-monospace, 'JetBrains Mono', Consolas, monospace" font-size="22" fill="#9ca3af" text-anchor="end">avos-flix.vercel.app</text>

  <!-- Chart panel -->
  <g transform="translate(${CHART_X}, ${CHART_Y})">
    <rect width="${CHART_W}" height="${CHART_H}" rx="12" fill="#16171d"/>
    <!-- Grid lines at index 200 and 400 -->
    <line x1="0" y1="${gridY200.toFixed(1)}" x2="${CHART_W}" y2="${gridY200.toFixed(1)}" stroke="#2e303a" stroke-width="1"/>
    <line x1="0" y1="${gridY400.toFixed(1)}" x2="${CHART_W}" y2="${gridY400.toFixed(1)}" stroke="#2e303a" stroke-width="1"/>
    <!-- House price line -->
    <polyline points="${hpPolyline}" fill="none" stroke="#a78bfa" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
    <!-- Wage line -->
    <polyline points="${wagePolyline}" fill="none" stroke="#60a5fa" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
    <!-- Labels at right edge -->
    <text x="${CHART_W - 8}" y="${hpLabelY.toFixed(1)}" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="600" fill="#a78bfa" text-anchor="end">House prices ${fmt(hp.ratio)}</text>
    <text x="${CHART_W - 8}" y="${wageLabelY.toFixed(1)}" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="600" fill="#60a5fa" text-anchor="end">Wages ${fmt(wage.ratio)}</text>
    <!-- Year axis labels -->
    <text x="4" y="${(CHART_H - 6).toFixed(1)}" font-family="ui-monospace, monospace" font-size="16" fill="#4b5563">${BASE_YEAR}</text>
    <text x="${(CHART_W / 2).toFixed(1)}" y="${(CHART_H - 6).toFixed(1)}" font-family="ui-monospace, monospace" font-size="16" fill="#4b5563" text-anchor="middle">${Math.round((BASE_YEAR + latestYear) / 2)}</text>
    <text x="${CHART_W - 4}" y="${(CHART_H - 6).toFixed(1)}" font-family="ui-monospace, monospace" font-size="16" fill="#4b5563" text-anchor="end">${latestYear}</text>
  </g>

  <!-- Stat cards -->
  <g transform="translate(72, 405)">
    <rect width="340" height="140" rx="16" fill="#16171d" stroke="#2e303a" stroke-width="2"/>
    <text x="32" y="76" font-family="system-ui, -apple-system, sans-serif" font-size="60" font-weight="700" fill="#a78bfa" letter-spacing="-2">${fmt(hp.ratio)}</text>
    <text x="32" y="114" font-family="system-ui, -apple-system, sans-serif" font-size="20" fill="#9ca3af">House prices</text>
  </g>

  <g transform="translate(430, 405)">
    <rect width="340" height="140" rx="16" fill="#16171d" stroke="#2e303a" stroke-width="2"/>
    <text x="32" y="76" font-family="system-ui, -apple-system, sans-serif" font-size="60" font-weight="700" fill="#60a5fa" letter-spacing="-2">${fmt(wage.ratio)}</text>
    <text x="32" y="114" font-family="system-ui, -apple-system, sans-serif" font-size="20" fill="#9ca3af">Median wage</text>
  </g>

  <g transform="translate(788, 405)">
    <rect width="340" height="140" rx="16" fill="#16171d" stroke="#2e303a" stroke-width="2"/>
    <text x="32" y="76" font-family="system-ui, -apple-system, sans-serif" font-size="60" font-weight="700" fill="#34d399" letter-spacing="-2">${fmt(cpih.ratio)}</text>
    <text x="32" y="114" font-family="system-ui, -apple-system, sans-serif" font-size="20" fill="#9ca3af">Inflation (CPIH)</text>
  </g>

  <text x="72" y="586" font-family="ui-monospace, monospace" font-size="20" fill="#9ca3af">${BASE_YEAR} → ${latestYear} · UK</text>
  <text x="1128" y="586" font-family="ui-monospace, monospace" font-size="20" fill="#9ca3af" text-anchor="end">ONS · Bank of England · HM Land Registry</text>
</svg>
`

  await writeFile(OG_FILE, svg)
  // Social platforms (X, Facebook, LinkedIn, Slack…) don't render SVG preview
  // images, so og:image points at a PNG rasterised from the same markup.
  await sharp(Buffer.from(svg), { density: 96 }).resize(1200, 630).png().toFile(OG_PNG_FILE)
  console.log(
    `  og.svg + og.png: house prices ${fmt(hp.ratio)}, wage ${fmt(wage.ratio)}, CPIH ${fmt(cpih.ratio)} (${BASE_YEAR}–${latestYear})`,
  )
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const raw = await readFile(resolve("public", "data", "series.json"), "utf8")
  await regenerateOg((JSON.parse(raw) as SeriesData).series)
}
