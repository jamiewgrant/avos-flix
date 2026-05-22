import { useEffect, useState } from "react"

interface ChartColors {
  muted: string
  grid: string
  surface: string
  border: string
  text: string
  bg: string
}

function readColors(): ChartColors {
  if (typeof window === "undefined") {
    return { muted: "#71717a", grid: "rgba(255,255,255,0.04)", surface: "#18181b", border: "#27272a", text: "#e4e4e7", bg: "#09090b" }
  }
  const s = getComputedStyle(document.documentElement)
  const get = (v: string) => s.getPropertyValue(v).trim() || v
  const isDark = document.documentElement.getAttribute("data-theme") !== "light"
  return {
    muted: get("--color-muted"),
    grid: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)",
    surface: get("--color-surface"),
    border: get("--color-border"),
    text: get("--color-text"),
    bg: get("--color-bg"),
  }
}

export function useChartColors(): ChartColors {
  const [colors, setColors] = useState<ChartColors>(readColors)

  useEffect(() => {
    const obs = new MutationObserver(() => setColors(readColors()))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] })
    return () => obs.disconnect()
  }, [])

  return colors
}
