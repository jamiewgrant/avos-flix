import { useEffect, useState } from "react"

type Theme = "dark" | "light"

function getInitial(): Theme {
  try {
    const stored = localStorage.getItem("avos-theme") as Theme | null
    if (stored === "dark" || stored === "light") return stored
    if (window.matchMedia("(prefers-color-scheme: light)").matches) return "light"
  } catch {
    // SSR / private browsing
  }
  return "dark"
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitial)

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme)
    try {
      localStorage.setItem("avos-theme", theme)
    } catch {
      // ignore
    }
  }, [theme])

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"))

  return { theme, toggle }
}
