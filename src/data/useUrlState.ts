import { useEffect, useRef, useState } from "react"

// Encode app state into URL search params so a link reproduces the view.
// Format: ?mode=raw&base=1995&hidden=boe-rate,avocado-uk&real=1
export interface UrlState {
  mode: "indexed" | "raw"
  baseYear: number
  hiddenIds: Set<string>
  realTerms: boolean
}

const DEFAULTS: UrlState = {
  mode: "indexed",
  baseYear: 1995,
  hiddenIds: new Set(),
  realTerms: false,
}

function parseUrl(search: string): Partial<UrlState> {
  const params = new URLSearchParams(search)
  const out: Partial<UrlState> = {}
  const mode = params.get("mode")
  if (mode === "indexed" || mode === "raw") out.mode = mode
  const base = Number(params.get("base"))
  if (Number.isFinite(base) && base >= 1900 && base <= 2100) out.baseYear = base
  const hidden = params.get("hidden")
  if (hidden) out.hiddenIds = new Set(hidden.split(",").filter(Boolean))
  if (params.get("real") === "1") out.realTerms = true
  return out
}

function stringify(state: UrlState): string {
  const params = new URLSearchParams()
  if (state.mode !== DEFAULTS.mode) params.set("mode", state.mode)
  if (state.baseYear !== DEFAULTS.baseYear) params.set("base", String(state.baseYear))
  if (state.hiddenIds.size > 0) params.set("hidden", [...state.hiddenIds].sort().join(","))
  if (state.realTerms) params.set("real", "1")
  const s = params.toString()
  return s ? `?${s}` : ""
}

export function useUrlState(initialHidden: Set<string>) {
  const [state, setState] = useState<UrlState>(() => {
    const parsed = typeof window === "undefined" ? {} : parseUrl(window.location.search)
    return {
      mode: parsed.mode ?? DEFAULTS.mode,
      baseYear: parsed.baseYear ?? DEFAULTS.baseYear,
      hiddenIds: parsed.hiddenIds ?? initialHidden,
      realTerms: parsed.realTerms ?? DEFAULTS.realTerms,
    }
  })

  const mounted = useRef(false)
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    const search = stringify(state)
    const url = search || window.location.pathname
    window.history.replaceState(null, "", url)
  }, [state])

  return [state, setState] as const
}
