import type { Series } from "../types/series"

export function seriesToCsv(series: Series[]): string {
  if (series.length === 0) return ""
  const years = new Set<number>()
  for (const s of series) for (const p of s.points) years.add(p.year)
  const sortedYears = [...years].sort((a, b) => a - b)
  const byId = new Map(series.map((s) => [s.id, new Map(s.points.map((p) => [p.year, p.value]))]))
  const header = ["year", ...series.map((s) => `"${s.name.replace(/"/g, '""')}"`)].join(",")
  const rows = sortedYears.map((y) => {
    const cells = [y.toString()]
    for (const s of series) {
      const v = byId.get(s.id)?.get(y)
      cells.push(v === undefined ? "" : String(v))
    }
    return cells.join(",")
  })
  return [header, ...rows].join("\n")
}

export function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
