import { useEffect, useRef, useState } from "react"

// Encode app state into URL search params so a link reproduces the view.
// Format: ?mode=raw&base=1995&hidden=boe-rate,avocado-uk&real=1&range=1968-2025
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
  hiddenIds: Set<string>
  realTerms: boolean
  range: [number, number] | null
  snap: SnapState
  embed: boolean
  birthYear: number | null
}

const DEFAULTS: UrlState = {
  mode: "indexed",
  baseYear: 1995,
  hiddenIds: new Set(),
  realTerms: false,
  range: null,
  snap: {},
  embed: false,
  birthYear: null,
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

  if (params.get("embed") === "true" || params.get("embed") === "1") out.embed = true

  const born = Number(params.get("born"))
  if (Number.isFinite(born) && born >= 1940 && born <= 2005) out.birthYear = born

  return out
}

function stringify(state: UrlState): string {
  const params = new URLSearchParams()
  if (state.mode !== DEFAULTS.mode) params.set("mode", state.mode)
  if (state.baseYear !== DEFAULTS.baseYear) params.set("base", String(state.baseYear))
  if (state.hiddenIds.size > 0) params.set("hidden", [...state.hiddenIds].sort().join(","))
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

  // embed — preserve in URL so iframes keep it when navigating
  if (state.embed) params.set("embed", "true")

  if (state.birthYear !== null) params.set("born", String(state.birthYear))

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
      range: parsed.range ?? DEFAULTS.range,
      snap: parsed.snap ?? DEFAULTS.snap,
      embed: parsed.embed ?? DEFAULTS.embed,
      birthYear: parsed.birthYear ?? DEFAULTS.birthYear,
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
