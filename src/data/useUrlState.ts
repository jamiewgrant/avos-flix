import { useEffect, useRef, useState } from "react"

// Encode app state into URL search params so a link reproduces the view.
// Format: ?mode=raw&base=1995&show=median-wage,boe-rate&real=1&range=1968-2025
// `show` lists the visible series ("all" = every series) and is omitted when it
// matches the default view. The older `hidden=` form is still read so existing
// shared links keep working. Params this hook doesn't own (embed, boomer,
// utm_*, …) are passed through untouched.
// Snapshot params: snap_salary, snap_housing, snap_mhousing, snap_children,
//   snap_earners, snap_plan, snap_pension, snap_year
export interface SnapState {
  grossSalary?: number
  housingType?: "mortgage" | "rent" | "owned"
  monthlyHousing?: number
  children?: number
  earners?: 1 | 2
  studentLoanPlan?: "none" | "plan1" | "plan2" | "plan5"
  pensionPct?: number
  compareYear?: number
}

export interface UrlState {
  mode: "indexed" | "raw"
  baseYear: number
  /** Ids of visible series. The single token "all" means every series. */
  visibleIds: Set<string>
  /** Legacy `?hidden=` list, resolved into visibleIds once the data has loaded. */
  legacyHidden: Set<string> | null
  realTerms: boolean
  range: [number, number] | null
  snap: SnapState
  birthYear: number | null
}

export const SHOW_ALL = "all"

// Must match PRESETS[0].visibleIds so a fresh load lands on "Wages vs Houses".
export const DEFAULT_VISIBLE_IDS: readonly string[] = [
  "median-wage",
  "house-price-nationwide",
  "cpih",
]

// Params owned by this hook; everything else in the query string is preserved.
const OWNED_PARAMS = [
  "mode", "base", "show", "hidden", "real", "range", "born",
  "snap_salary", "snap_housing", "snap_mhousing", "snap_children",
  "snap_earners", "snap_plan", "snap_pension", "snap_year",
]

function sameSet(a: Set<string>, b: readonly string[]): boolean {
  return a.size === b.length && b.every((id) => a.has(id))
}

const DEFAULTS: UrlState = {
  mode: "indexed",
  baseYear: 1995,
  visibleIds: new Set(DEFAULT_VISIBLE_IDS),
  legacyHidden: null,
  realTerms: false,
  range: null,
  snap: {},
  birthYear: null,
}

export function defaultUrlState(): UrlState {
  return { ...DEFAULTS, visibleIds: new Set(DEFAULT_VISIBLE_IDS), snap: {} }
}

function parseUrl(search: string): Partial<UrlState> {
  const params = new URLSearchParams(search)
  const out: Partial<UrlState> = {}
  const mode = params.get("mode")
  if (mode === "indexed" || mode === "raw") out.mode = mode
  const base = Number(params.get("base"))
  if (Number.isFinite(base) && base >= 1900 && base <= 2100) out.baseYear = base
  const show = params.get("show")
  const hidden = params.get("hidden")
  if (show) out.visibleIds = new Set(show.split(",").filter(Boolean))
  else if (hidden) out.legacyHidden = new Set(hidden.split(",").filter(Boolean))
  if (params.get("real") === "1") out.realTerms = true
  const range = params.get("range")
  if (range) {
    const m = range.match(/^(\d{4})-(\d{4})$/)
    if (m) {
      const a = Number(m[1])
      const b = Number(m[2])
      if (a < b) out.range = [a, b]
    }
  }

  // Snapshot params
  const snap: SnapState = {}
  const salary = Number(params.get("snap_salary"))
  if (salary > 0) snap.grossSalary = salary
  const housing = params.get("snap_housing")
  if (housing === "mortgage" || housing === "rent" || housing === "owned") snap.housingType = housing
  const mhousing = Number(params.get("snap_mhousing"))
  if (mhousing > 0) snap.monthlyHousing = mhousing
  const children = params.get("snap_children")
  if (children !== null) {
    const c = Number(children)
    if (Number.isFinite(c) && c >= 0) snap.children = c
  }
  const earnersRaw = Number(params.get("snap_earners"))
  if (earnersRaw === 1 || earnersRaw === 2) snap.earners = earnersRaw
  const plan = params.get("snap_plan")
  if (plan === "none" || plan === "plan1" || plan === "plan2" || plan === "plan5") snap.studentLoanPlan = plan
  const pension = params.get("snap_pension")
  if (pension !== null) {
    const p = Number(pension)
    if (Number.isFinite(p) && p >= 0) snap.pensionPct = p
  }
  const snapYear = Number(params.get("snap_year"))
  if (snapYear >= 1900 && snapYear <= 2100) snap.compareYear = snapYear
  if (Object.keys(snap).length > 0) out.snap = snap

  const born = Number(params.get("born"))
  if (Number.isFinite(born) && born >= 1940 && born <= 2005) out.birthYear = born

  return out
}

function stringify(state: UrlState, currentSearch: string): string {
  const params = new URLSearchParams(currentSearch)
  for (const key of OWNED_PARAMS) params.delete(key)
  if (state.mode !== DEFAULTS.mode) params.set("mode", state.mode)
  if (state.baseYear !== DEFAULTS.baseYear) params.set("base", String(state.baseYear))
  if (state.legacyHidden) {
    // Not resolved yet (data still loading) — keep the link as it arrived.
    params.set("hidden", [...state.legacyHidden].sort().join(","))
  } else if (!sameSet(state.visibleIds, DEFAULT_VISIBLE_IDS)) {
    params.set(
      "show",
      state.visibleIds.has(SHOW_ALL) ? SHOW_ALL : [...state.visibleIds].sort().join(","),
    )
  }
  if (state.realTerms) params.set("real", "1")
  if (state.range) params.set("range", `${state.range[0]}-${state.range[1]}`)

  // Snapshot params — only write non-default values
  const snap = state.snap
  if (snap.grossSalary) params.set("snap_salary", String(snap.grossSalary))
  if (snap.housingType) params.set("snap_housing", snap.housingType)
  if (snap.monthlyHousing) params.set("snap_mhousing", String(snap.monthlyHousing))
  if (snap.children !== undefined && snap.children > 0) params.set("snap_children", String(snap.children))
  if (snap.earners !== undefined && snap.earners !== 1) params.set("snap_earners", String(snap.earners))
  if (snap.studentLoanPlan && snap.studentLoanPlan !== "none") params.set("snap_plan", snap.studentLoanPlan)
  if (snap.pensionPct !== undefined && snap.pensionPct !== 5) params.set("snap_pension", String(snap.pensionPct))
  if (snap.compareYear) params.set("snap_year", String(snap.compareYear))

  if (state.birthYear !== null) params.set("born", String(state.birthYear))

  // Keep commas readable — they're legal in a query string.
  const s = params.toString().replace(/%2C/g, ",")
  return s ? `?${s}` : ""
}

export function useUrlState() {
  const [state, setState] = useState<UrlState>(() => {
    const parsed = typeof window === "undefined" ? {} : parseUrl(window.location.search)
    return {
      mode: parsed.mode ?? DEFAULTS.mode,
      baseYear: parsed.baseYear ?? DEFAULTS.baseYear,
      visibleIds: parsed.visibleIds ?? new Set(DEFAULT_VISIBLE_IDS),
      legacyHidden: parsed.legacyHidden ?? null,
      realTerms: parsed.realTerms ?? DEFAULTS.realTerms,
      range: parsed.range ?? DEFAULTS.range,
      snap: parsed.snap ?? DEFAULTS.snap,
      birthYear: parsed.birthYear ?? DEFAULTS.birthYear,
    }
  })

  const mounted = useRef(false)
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    const search = stringify(state, window.location.search)
    if (search === window.location.search) return
    window.history.replaceState(null, "", window.location.pathname + search + window.location.hash)
  }, [state])

  return [state, setState] as const
}
