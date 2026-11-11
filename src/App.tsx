import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSeries } from "./data/useSeries"
import { useUrlState, defaultUrlState, SHOW_ALL } from "./data/useUrlState"
import { useTheme } from "./lib/useTheme"
import { Chart } from "./components/charts/Chart"
import { AffordabilityChart } from "./components/charts/AffordabilityChart"
import { MortgageChart } from "./components/charts/MortgageChart"
import { KeyboardShortcuts } from "./components/KeyboardShortcuts"
import { ChartInsight } from "./components/ChartInsight"
import { ChartToolbar } from "./components/ChartToolbar"
import { ErrorBoundary } from "./components/ErrorBoundary"
import type { RegionKey } from "./components/ChartToolbar"
import { MethodologyModal } from "./components/MethodologyModal"
import { StatCallouts } from "./components/StatCallouts"
import { GenerationView } from "./components/GenerationView"
import { ScrollyIntro } from "./components/ScrollyIntro"
import { PullQuote } from "./components/PullQuote"
import { Faq } from "./components/Faq"
import { WhatIfCallout } from "./components/WhatIfCallout"
import { CostStackSection } from "./components/CostStackSection"
import { YearRangeBrush } from "./components/YearRangeBrush"
import { About } from "./components/About"
import { OnboardingBanner } from "./components/OnboardingBanner"
import { ChartSkeleton } from "./components/ChartSkeleton"
import { SourceStrip } from "./components/SourceStrip"
import { ScrollProgress } from "./components/ScrollProgress"
import { SectionDivider } from "./components/SectionDivider"
import { RevealOnScroll } from "./components/RevealOnScroll"
import { CohortWindow } from "./components/CohortWindow"
import { Changelog } from "./components/Changelog"
import SectionShare from "./components/SectionShare"
import { StoryPresets } from "./components/StoryPresets"
import { SeriesLegend } from "./components/SeriesLegend"
import { PRESETS } from "./lib/presets"
import type { Preset } from "./lib/presets"
import { deflateSeries } from "./lib/deflate"
import { basePoint } from "./lib/indexing"
import { latestCommonYear } from "./lib/latestYear"
import { HISTORICAL_EVENTS } from "./lib/annotations"
import { applyPalette } from "./lib/palette"
import type { PaletteMode } from "./lib/palette"
import { seriesToCsv, downloadCsv } from "./lib/csv"
import type { Series } from "./types/series"

const RentToIncomeChart = lazy(() =>
  import("./components/charts/RentToIncomeChart").then((m) => ({ default: m.RentToIncomeChart })),
)
const WhatIfChart = lazy(() =>
  import("./components/charts/WhatIfChart").then((m) => ({ default: m.WhatIfChart })),
)
const RealTakeHomeChart = lazy(() =>
  import("./components/charts/RealTakeHomeChart").then((m) => ({ default: m.RealTakeHomeChart })),
)
const ThenVsNowLazy = lazy(() =>
  import("./components/ThenVsNow").then((m) => ({ default: m.ThenVsNow })),
)
const TodaysMoneyLazy = lazy(() =>
  import("./components/TodaysMoney").then((m) => ({ default: m.TodaysMoney })),
)
const AvosToastCalculatorLazy = lazy(() =>
  import("./components/AvosToastCalculator").then((m) => ({ default: m.AvosToastCalculator })),
)
const BoomerVsMillennialLazy = lazy(() =>
  import("./components/BoomerVsMillennial").then((m) => ({ default: m.BoomerVsMillennial })),
)
const DepositTimelineSectionLazy = lazy(() =>
  import("./components/DepositTimelineSection").then((m) => ({ default: m.DepositTimelineSection })),
)
const PersonalSnapshotLazy = lazy(() =>
  import("./components/PersonalSnapshot").then((m) => ({ default: m.PersonalSnapshot })),
)
const PensionAdequacyLazy = lazy(() =>
  import("./components/PensionAdequacyView").then((m) => ({ default: m.PensionAdequacyView })),
)
const PolicyDifferencesNoteLazy = lazy(() =>
  import("./components/PolicyDifferencesNote").then((m) => ({ default: m.PolicyDifferencesNote })),
)
const HomeBuyingCalculatorLazy = lazy(() =>
  import("./components/HomeBuyingCalculator").then((m) => ({ default: m.HomeBuyingCalculator })),
)
const GradDebtCalloutLazy = lazy(() =>
  import("./components/GradDebtCallout").then((m) => ({ default: m.GradDebtCallout })),
)
const WealthGapSectionLazy = lazy(() =>
  import("./components/WealthGapSection").then((m) => ({ default: m.WealthGapSection })),
)
const BoomerModeViewLazy = lazy(() =>
  import("./components/BoomerModeView").then((m) => ({ default: m.BoomerModeView })),
)
const InternationalComparisonLazy = lazy(() =>
  import("./components/InternationalComparison").then((m) => ({ default: m.InternationalComparison })),
)

const SectionError = () => (
  <div className="h-[120px] grid place-items-center text-(--color-muted) text-xs font-mono">
    This section failed to load.
  </div>
)

const ChartFallback = () => (
  <div className="h-[300px] grid place-items-center text-(--color-muted) text-xs font-mono">
    loading section…
  </div>
)

// The house-price selector is a real switch: picking a region shows that
// region's series and hides the other regions'. "UK" covers both national
// series (Nationwide is the default; Land Registry can be added from the legend).
const REGION_OPTIONS: { label: string; key: RegionKey; seriesIds: string[] }[] = [
  { label: "UK", key: "uk", seriesIds: ["house-price-nationwide", "house-price-landreg"] },
  { label: "London", key: "london", seriesIds: ["house-price-london"] },
  { label: "North East", key: "northeast", seriesIds: ["house-price-northeast"] },
]

function flagParam(name: string): boolean {
  if (typeof window === "undefined") return false
  const v = new URLSearchParams(window.location.search).get(name)
  return v === "1" || v === "true"
}

function App() {
  const { theme, toggle: toggleTheme } = useTheme()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [methodologyOpen, setMethodologyOpen] = useState(false)
  const { data, loading, error } = useSeries()
  const allSeries = useMemo<Series[]>(
    () => (data ? Object.values(data.series) : []),
    [data],
  )
  const allIds = useMemo(() => allSeries.map((s) => s.id), [allSeries])

  const [{ mode, baseYear, visibleIds, legacyHidden, realTerms, range, snap, birthYear }, setState] =
    useUrlState()

  // Older shared links used ?hidden=a,b. That can only be turned into a
  // visible set once we know every series id, i.e. after the data has loaded.
  useEffect(() => {
    if (!data || !legacyHidden) return
    setState((prev) => {
      if (!prev.legacyHidden) return prev
      const hidden = prev.legacyHidden
      const next = new Set(Object.keys(data.series).filter((id) => !hidden.has(id)))
      return { ...prev, legacyHidden: null, visibleIds: next.size === Object.keys(data.series).length ? new Set([SHOW_ALL]) : next }
    })
  }, [data, legacyHidden, setState])

  // Everything downstream works with "hidden" ids; derive them from the
  // URL's visible set ("all" expands to every series).
  const hiddenIds = useMemo(() => {
    if (legacyHidden) return legacyHidden
    if (visibleIds.has(SHOW_ALL)) return new Set<string>()
    return new Set(allIds.filter((id) => !visibleIds.has(id)))
  }, [allIds, visibleIds, legacyHidden])

  /** Update the visible set. Collapses "everything on" to the short `all` token. */
  const updateVisible = useCallback(
    (fn: (current: Set<string>) => Set<string>) => {
      setState((prev) => {
        const current = prev.visibleIds.has(SHOW_ALL)
          ? new Set(allIds)
          : new Set(allIds.filter((id) => prev.visibleIds.has(id)))
        const next = fn(current)
        const everything = allIds.length > 0 && allIds.every((id) => next.has(id))
        return { ...prev, legacyHidden: null, visibleIds: everything ? new Set([SHOW_ALL]) : next }
      })
    },
    [allIds, setState],
  )

  // Derive the data span across all series for the brush bounds.
  const dataSpan = useMemo<[number, number]>(() => {
    let lo = Infinity
    let hi = -Infinity
    for (const s of allSeries) {
      for (const p of s.points) {
        if (p.year < lo) lo = p.year
        if (p.year > hi) hi = p.year
      }
    }
    if (lo > hi) return [1950, new Date().getFullYear()]
    return [lo, hi]
  }, [allSeries])

  const cpihSeries = data?.series["cpih"]
  const cpihPoints = useMemo(() => cpihSeries?.points ?? [], [cpihSeries])

  const visible = useMemo(() => {
    const filtered = allSeries.filter(
      (s) => !hiddenIds.has(s.id) && s.points.length > 0,
    )
    if (!realTerms || cpihPoints.length === 0) return filtered
    return deflateSeries(filtered, cpihPoints).series
  }, [allSeries, hiddenIds, realTerms, cpihPoints])

  // Series that are switched on but can't be drawn in Indexed mode because
  // they have no data at the chosen base year. Surfaced below the chart so
  // lines never just silently vanish.
  const missingAtBase = useMemo(
    () => (mode === "indexed" ? visible.filter((s) => !basePoint(s, baseYear)) : []),
    [mode, visible, baseYear],
  )

  // The slider covers exactly what the chart can show: the years the visible
  // series span and, in Indexed mode, nothing before the base year (lines start
  // there). Previously it ran 1950–2026 regardless, so its ends meant nothing.
  const brushSpan = useMemo<[number, number]>(() => {
    const drawn = visible.filter((s) => mode !== "indexed" || basePoint(s, baseYear))
    let lo = Infinity
    let hi = -Infinity
    for (const s of drawn) {
      for (const p of s.points) {
        if (p.year < lo) lo = p.year
        if (p.year > hi) hi = p.year
      }
    }
    if (lo > hi) return dataSpan
    if (mode === "indexed") lo = Math.max(lo, Math.min(baseYear, hi - 1))
    return [lo, hi]
  }, [visible, mode, baseYear, dataSpan])
  const activeRange = useMemo<[number, number]>(() => {
    if (!range) return brushSpan
    const from = Math.min(Math.max(range[0], brushSpan[0]), brushSpan[1] - 1)
    const to = Math.max(Math.min(range[1], brushSpan[1]), from + 1)
    return [from, to]
  }, [range, brushSpan])
  const [activeFrom, activeTo] = activeRange

  const refYear = useMemo(
    () => (cpihPoints.length > 0 ? cpihPoints[cpihPoints.length - 1].year : new Date().getFullYear()),
    [cpihPoints],
  )

  function toggle(id: string) {
    updateVisible((cur) => {
      if (cur.has(id)) cur.delete(id)
      else cur.add(id)
      return cur
    })
  }

  // Derive active preset from the visible set — reverse lookup so no extra state needed.
  const activePresetId = useMemo(() => {
    const visibleNow = allIds.filter((id) => !hiddenIds.has(id))
    for (const preset of PRESETS) {
      if (!preset.visibleIds) continue
      const wanted = preset.visibleIds.filter((id) => allIds.includes(id))
      if (wanted.length === visibleNow.length && wanted.every((id) => !hiddenIds.has(id))) {
        return preset.id
      }
    }
    return "custom"
  }, [hiddenIds, allIds])

  function selectPreset(preset: Preset) {
    if (!preset.visibleIds) return // "custom" — do nothing, just let user use legend
    const keep = preset.visibleIds
    updateVisible(() => new Set(keep))
  }

  function selectRegion(key: RegionKey) {
    updateVisible((cur) => {
      for (const opt of REGION_OPTIONS) {
        if (opt.key === key) {
          // Keep whichever of this region's series is already on; otherwise show its primary one.
          if (!opt.seriesIds.some((id) => cur.has(id))) cur.add(opt.seriesIds[0])
        } else {
          for (const id of opt.seriesIds) cur.delete(id)
        }
      }
      return cur
    })
  }

  // Highlight a region only when its series is actually on the chart.
  const activeRegion: RegionKey | null =
    REGION_OPTIONS.find((opt) => opt.seriesIds.some((id) => allIds.includes(id) && !hiddenIds.has(id)))
      ?.key ?? null

  const snapshotRef = useRef<HTMLDivElement>(null)
  const [snapshotting, setSnapshotting] = useState(false)
  async function downloadSnapshot() {
    const node = snapshotRef.current
    if (!node || snapshotting) return
    setSnapshotting(true)
    try {
      // Loaded on demand — it's only needed for this button.
      const { toPng } = await import("html-to-image")
      // Match the card's real background so light-theme exports aren't dark.
      const backgroundColor = getComputedStyle(node).backgroundColor
      const dataUrl = await toPng(node, {
        backgroundColor,
        pixelRatio: 2,
        style: { borderRadius: "0px" },
      })
      const link = document.createElement("a")
      link.download = `avos-flix-${mode}-${baseYear}.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error("Snapshot failed:", err)
    } finally {
      setSnapshotting(false)
    }
  }

  const housePriceNationwide = data?.series["house-price-nationwide"]
  const wage = data?.series["median-wage"]
  const boeRate = data?.series["boe-rate"]
  const canShowAffordability = housePriceNationwide && wage && boeRate
  const housingYears =
    housePriceNationwide && wage
      ? `${Math.max(housePriceNationwide.points[0]?.year ?? 0, wage.points[0]?.year ?? 0)}–${latestCommonYear(housePriceNationwide, wage)}`
      : ""

  const [search, setSearch] = useState("")

  const [spotlightId, setSpotlightId] = useState<string | null>(null)
  const [showAnnotations, setShowAnnotations] = useState(true)
  const [palette, setPalette] = useState<PaletteMode>("default")
  const palettedAllSeries = useMemo(() => applyPalette(allSeries, palette), [allSeries, palette])
  const palettedVisible = useMemo(() => applyPalette(visible, palette), [visible, palette])

  function exportCsv() {
    const csv = seriesToCsv(palettedVisible)
    downloadCsv(csv, `avos-flix-${new Date().toISOString().slice(0, 10)}.csv`)
  }

  async function toggleFullscreen() {
    if (!snapshotRef.current) return
    if (document.fullscreenElement) {
      await document.exitFullscreen()
    } else {
      try {
        await snapshotRef.current.requestFullscreen()
      } catch {
        // Some browsers / sandboxed iframes block fullscreen — ignore
      }
    }
  }

  const [shareToast, setShareToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
  }, [])
  async function shareView() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setShareToast("Link copied — anyone with it gets your exact view.")
    } catch {
      setShareToast(`Copy failed. URL: ${window.location.href}`)
    }
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setShareToast(null), 2800)
  }

  function resetToDefaults() {
    setState(() => defaultUrlState())
    setSearch("")
    setSpotlightId(null)
    setShowAnnotations(true)
    setPalette("default")
  }

  const embedMode = useMemo(() => flagParam("embed"), [])
  const boomerMode = useMemo(() => flagParam("boomer"), [])

  // Handle keyboard shortcuts dispatched by KeyboardShortcuts component
  useEffect(() => {
    function onShortcut(e: Event) {
      const detail = (e as CustomEvent).detail as { action: string; value: unknown }
      if (detail.action === "setMode") {
        setState((p) => ({ ...p, mode: detail.value as "indexed" | "raw" }))
      } else if (detail.action === "setBaseYear") {
        // Base year only means something in Indexed mode.
        setState((p) => (p.mode === "indexed" ? { ...p, baseYear: detail.value as number } : p))
      }
    }
    window.addEventListener("avos:shortcut", onShortcut)
    return () => window.removeEventListener("avos:shortcut", onShortcut)
  }, [setState])

  useEffect(() => {
    if (embedMode) document.body.classList.add("embed")
    return () => document.body.classList.remove("embed")
  }, [embedMode])

  // Boomer mode — stripped view, no header/footer
  if (boomerMode && data) {
    return (
      <Suspense fallback={<div className="min-h-screen grid place-items-center text-(--color-muted) text-sm font-mono">loading…</div>}>
        <BoomerModeViewLazy series={allSeries} />
      </Suspense>
    )
  }

  return (
    <>
      <ScrollProgress />
      <KeyboardShortcuts />
      {!embedMode && (
        <header
          className="sticky top-0 z-50 border-b border-(--color-border) bg-(--color-bg)/90"
          style={{ backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}
        >
          <div className="max-w-5xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
            <a
              href="#"
              className="text-base font-semibold tracking-tight text-(--color-text) hover:text-(--color-accent) transition-colors"
            >
              avos<span className="text-(--color-accent)">+</span>flix
            </a>
            <nav className="hidden md:flex items-center gap-1 text-xs text-(--color-muted)">
              <a href="#explore" className="px-2.5 py-1.5 rounded-md hover:text-(--color-text) hover:bg-(--color-surface) transition">Explore</a>
              <a href="#costs" className="px-2.5 py-1.5 rounded-md hover:text-(--color-text) hover:bg-(--color-surface) transition">Costs</a>
              <a href="#housing" className="px-2.5 py-1.5 rounded-md hover:text-(--color-text) hover:bg-(--color-surface) transition">Housing</a>
              <a href="#your-snapshot" className="px-2.5 py-1.5 rounded-md hover:text-(--color-text) hover:bg-(--color-surface) transition">Snapshot</a>
              <a href="#pension" className="px-2.5 py-1.5 rounded-md hover:text-(--color-text) hover:bg-(--color-surface) transition">Pension</a>
              <a href="#faq" className="px-2.5 py-1.5 rounded-md hover:text-(--color-text) hover:bg-(--color-surface) transition">FAQ</a>
            </nav>
            <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              className="w-10 h-10 flex items-center justify-center rounded-lg border border-(--color-border) text-(--color-muted) hover:text-(--color-text) hover:border-(--color-muted) transition"
            >
              {theme === "dark" ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"/>
                  <line x1="12" y1="1" x2="12" y2="3"/>
                  <line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/>
                  <line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
            </button>
            {/* Hamburger — mobile only */}
            <button
              onClick={() => setMobileNavOpen((o) => !o)}
              aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileNavOpen}
              className="md:hidden w-10 h-10 flex items-center justify-center rounded-lg border border-(--color-border) text-(--color-muted) hover:text-(--color-text) hover:border-(--color-muted) transition"
            >
              {mobileNavOpen ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
              )}
            </button>
            </div>
          </div>
          {/* Mobile nav dropdown */}
          {mobileNavOpen && (
            <nav className="md:hidden border-t border-(--color-border) bg-(--color-bg)/95 px-4 py-3 flex flex-col gap-1 text-sm text-(--color-muted)">
              {[
                { href: "#explore", label: "Explore" },
                { href: "#costs", label: "Costs" },
                { href: "#housing", label: "Housing" },
                { href: "#your-snapshot", label: "Snapshot" },
                { href: "#pension", label: "Pension" },
                { href: "#faq", label: "FAQ" },
              ].map(({ href, label }) => (
                <a
                  key={href}
                  href={href}
                  onClick={() => setMobileNavOpen(false)}
                  className="px-3 py-3 rounded-lg hover:text-(--color-text) hover:bg-(--color-surface) transition"
                >
                  {label}
                </a>
              ))}
            </nav>
          )}
        </header>
      )}

    <main className={`min-h-screen px-4 md:px-6 ${embedMode ? "py-4" : "py-10 md:py-16"} max-w-5xl mx-auto`}>
      {!embedMode && (
        <section className="relative text-center pt-12 pb-24 overflow-hidden">
          <div className="hero-glow" />
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-(--color-border) bg-(--color-surface) text-xs text-(--color-muted) mb-8 relative">
            <span className="w-1.5 h-1.5 rounded-full bg-(--color-success) inline-block" />
            Data updated {data ? new Date(data.metadata.generatedAt).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : "…"}
          </div>
          <h1 className="relative text-5xl md:text-7xl font-semibold tracking-tight text-(--color-text)" style={{ letterSpacing: "-0.03em" }}>
            avos<span className="text-(--color-accent)">+</span>flix
          </h1>
          <p className="mt-6 text-lg md:text-xl text-(--color-muted) max-w-2xl mx-auto leading-relaxed">
            The numbers behind the avocado-toast argument. UK wages, house prices, and the real cost of living — indexed, honest, undeniable.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <a
              href="#explore"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-(--color-accent) text-white text-sm font-medium hover:opacity-90 transition"
              style={{ color: "#fff" }}
            >
              Explore the data
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
            </a>
            <a
              href="#faq"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-(--color-border) text-(--color-muted) text-sm hover:text-(--color-text) hover:border-(--color-muted) transition"
            >
              Why this site?
            </a>
          </div>
          <div className="mt-16 text-xs text-(--color-muted) opacity-50 font-mono tracking-widest animate-bounce">
            ↓
          </div>
        </section>
      )}

      {!embedMode && data && <ScrollyIntro data={data} />}

      <section className={embedMode ? "" : "mb-20"} id="explore" style={{ scrollMarginTop: "4rem" }}>
        {!embedMode && <OnboardingBanner />}

        {!embedMode && (
          <>
            <span className="section-num">01 / Explore</span>
            <h2 className="section-h2 text-3xl md:text-4xl text-(--color-text) mb-3">
              Explore the whole set.
            </h2>
          </>
        )}
        <p className={`text-(--color-muted) max-w-2xl text-lg leading-relaxed ${embedMode ? "mb-4 text-sm" : "mb-8"}`}>
          {mode === "indexed"
            ? `Every line starts at 1× in ${baseYear} and shows how many times over it has grown since — a line ending at 5× costs five times what it did. The further a line ends above wages, the more of your paycheque it ate. Hover for exact values; toggle anything on or off below.`
            : "Same series, native units. Pounds with pounds, percent with percent."}
          {realTerms && (
            <span className="block mt-2 text-(--color-accent)">
              Inflation stripped — every price-like series divided by CPIH (≈{refYear} money).
              CPIH itself becomes a flat reference line. Years outside CPIH coverage drop.
            </span>
          )}
        </p>

        {!embedMode && data && <PullQuote series={palettedVisible} baseYear={baseYear} />}

        <div
          ref={snapshotRef}
          className="rounded-2xl border border-(--color-border) bg-(--color-surface) p-4 md:p-6 card-primary"
        >
          {loading && <ChartSkeleton />}
          {error && (
            <div className="h-[360px] grid place-items-center text-(--color-danger) text-sm">
              Failed to load data: {error.message}
            </div>
          )}
          {data && (
            <>
              <Chart
                series={palettedVisible}
                mode={mode}
                baseYear={baseYear}
                fromYear={activeFrom}
                toYear={activeTo}
                annotations={showAnnotations ? HISTORICAL_EVENTS : []}
                spotlightId={spotlightId}
                onRangeChange={(f, t) =>
                  setState((prev) => ({ ...prev, range: [f, t] as [number, number] }))
                }
              />

              <div className="mt-4 px-1">
                <YearRangeBrush
                  min={brushSpan[0]}
                  max={brushSpan[1]}
                  value={activeRange}
                  onChange={(next) =>
                    setState((p) => ({
                      ...p,
                      range:
                        next[0] === brushSpan[0] && next[1] === brushSpan[1] ? null : next,
                    }))
                  }
                  presets={[
                    { label: "All", range: brushSpan },
                    { label: "30y", range: [Math.max(brushSpan[0], brushSpan[1] - 30), brushSpan[1]] },
                    { label: "2008+", range: [Math.min(Math.max(brushSpan[0], 2008), brushSpan[1] - 1), brushSpan[1]] },
                  ]}
                />
              </div>

              {missingAtBase.length > 0 && (
                <p role="status" className="mt-3 px-1 text-xs text-(--color-warn) leading-relaxed">
                  Not drawn — no data at base year {baseYear}:{" "}
                  {missingAtBase.map((m) => `${m.name} (starts ${m.points[0].year})`).join(", ")}.
                  Pick a later base year, or switch to Raw view.
                </p>
              )}

              <ChartToolbar
                mode={mode}
                onMode={(m) => setState((p) => ({ ...p, mode: m }))}
                baseYear={baseYear}
                onBaseYear={(y) => setState((p) => ({ ...p, baseYear: y }))}
                showAnnotations={showAnnotations}
                onToggleAnnotations={() => setShowAnnotations((v) => !v)}
                regions={REGION_OPTIONS}
                activeRegion={activeRegion}
                onRegion={selectRegion}
                realTerms={realTerms}
                onRealTerms={(v) => setState((p) => ({ ...p, realTerms: v }))}
                refYear={refYear}
                palette={palette}
                onTogglePalette={() => setPalette((p) => (p === "default" ? "cb" : "default"))}
                shareTitle="avos+flix — the numbers behind the avocado-toast argument"
                shareStats={palettedVisible.slice(0, 4).map((x) => x.name)}
                snapshotting={snapshotting}
                onFullscreen={toggleFullscreen}
                onExportCsv={exportCsv}
                onCopyLink={shareView}
                onReset={resetToDefaults}
                onSnapshot={downloadSnapshot}
              />

              {shareToast && (
                <div role="status" className="mt-3 px-3 py-2 rounded-md bg-(--color-bg) border border-(--color-accent)/40 text-xs text-(--color-accent)">
                  {shareToast}
                </div>
              )}

              <StoryPresets
                activePresetId={activePresetId}
                onSelect={selectPreset}
              />

              {/* On mobile, hide the full legend unless user is in Custom mode */}
              <div className={activePresetId === "custom" ? "" : "hidden md:block"}>
                <SeriesLegend
                  allSeries={allSeries}
                  palettedAllSeries={palettedAllSeries}
                  hiddenIds={hiddenIds}
                  spotlightId={spotlightId}
                  search={search}
                  onSearch={setSearch}
                  onToggle={toggle}
                  onSpotlight={setSpotlightId}
                  visibleCount={visible.length}
                />
              </div>
              <div className="px-1">
                <SourceStrip series={visible} />
              </div>
            </>
          )}
        </div>

        {!embedMode && data && <StatCallouts series={visible} baseYear={baseYear} />}
        {!embedMode && data && (
          <div className="mt-4 px-1">
            <ChartInsight
              series={palettedVisible}
              baseYear={baseYear}
              fromYear={activeFrom}
              toYear={activeTo}
              mode={mode}
            />
          </div>
        )}
      </section>

      {embedMode && (
        <div className="mt-3 text-[10px] text-(--color-muted) font-mono text-center opacity-70">
          via <a href={window.location.origin} target="_blank" rel="noreferrer" className="underline hover:text-(--color-text)">avos-flix.vercel.app</a>
        </div>
      )}

      {!embedMode && <SectionDivider />}

      {!embedMode && data && wage && (
        <div id="costs" style={{ scrollMarginTop: "4rem" }}>
          <CostStackSection series={data.series} wage={wage} />
        </div>
      )}

      {!embedMode && data && wage && housePriceNationwide && (
        <section className="mb-20">
          <CohortWindow
            series={[wage, housePriceNationwide]}
            initialBirthYear={birthYear}
            onApply={(from, to) => setState((prev) => ({ ...prev, range: [from, to] as [number, number], birthYear: from - 22 }))}
            onClear={() => setState((prev) => ({ ...prev, range: null, birthYear: null }))}
          />
        </section>
      )}

      {!embedMode && <SectionDivider />}

      {!embedMode && canShowAffordability && (
        <section className="mb-20" id="housing" style={{ scrollMarginTop: "4rem" }}>
          <div className="flex items-center justify-between mb-1">
            <span className="section-num">02 / Housing</span>
            <SectionShare title={`House price-to-wage ratio, UK ${housingYears}`} />
          </div>
          <h2 className="section-h2 text-3xl md:text-4xl text-(--color-text) mb-3">
            "But interest rates were 15%!"
          </h2>
          <p className="text-(--color-muted) mb-8 max-w-2xl text-lg leading-relaxed">
            How many years of median full-time salary it costs to buy the average UK house. Bank Rate on the right axis — so when somebody points to the 1980s, you can point back.
          </p>
          <div className="rounded-2xl border border-(--color-border) bg-(--color-surface) p-4 md:p-6">
            <AffordabilityChart
              housePrice={housePriceNationwide!}
              wage={wage!}
              boeRate={boeRate!}
            />
          </div>
        </section>
      )}

      {!embedMode && canShowAffordability && (
        <section className="mb-20">
          <h2 className="section-h2 text-3xl md:text-4xl text-(--color-text) mb-3">
            What the mortgage actually costs.
          </h2>
          <p className="text-(--color-muted) mb-8 max-w-2xl text-lg leading-relaxed">
            Monthly mortgage payment on a 90%-LTV, 25-year loan at the prevailing Bank Rate + 1% — as a share of estimated monthly take-home pay. The rate-vs-principal trade-off in one line: the 1980s peak (high rates, low prices) sits next to the 2020s peak (low rates, huge prices). The 30% line is the conventional "affordable" ceiling.
          </p>
          <div className="rounded-2xl border border-(--color-border) bg-(--color-surface) p-4 md:p-6">
            <MortgageChart housePrice={housePriceNationwide!} wage={wage!} boeRate={boeRate!} />
          </div>
        </section>
      )}

      {!embedMode && data?.series["rent-index"] && wage && (
        <section className="mb-20">
          <span className="section-num">03 / Renting</span>
          <h2 className="section-h2 text-3xl md:text-4xl text-(--color-text) mb-3">
            "Just buy instead of renting."
          </h2>
          <p className="text-(--color-muted) mb-8 max-w-2xl text-lg leading-relaxed">
            Rent on a typical UK 2-bed flat as a share of median take-home pay. The 30% line is the ceiling banks and benefit calculators traditionally call "affordable" — the line has lived above it for most of the last decade.
          </p>
          <div className="rounded-2xl border border-(--color-border) bg-(--color-surface) p-4 md:p-6">
            <ErrorBoundary fallback={<SectionError />}><Suspense fallback={<ChartFallback />}>
              <RentToIncomeChart rentIndex={data.series["rent-index"]} wage={wage} />
            </Suspense></ErrorBoundary>
          </div>
        </section>
      )}

      {!embedMode && data && (
        <section className="mb-20">
          <ErrorBoundary fallback={<SectionError />}><Suspense fallback={<ChartFallback />}>
            <InternationalComparisonLazy series={allSeries} />
          </Suspense></ErrorBoundary>
        </section>
      )}

      {!embedMode && housePriceNationwide && wage && (
        <section className="mb-20">
          <WhatIfCallout housePrice={housePriceNationwide} wage={wage} />
          <span className="section-num">04 / Counterfactual</span>
          <h2 className="section-h2 text-3xl md:text-4xl text-(--color-text) mt-12 mb-3">
            What if houses had grown at wage rate?
          </h2>
          <p className="text-(--color-muted) mb-8 max-w-2xl text-lg leading-relaxed">
            Take the 1995 house price. Grow it each year by the same percentage wages grew. The dashed line is the parallel universe where buying a house tracked the paycheque. The gap is what you actually owe the bank.
          </p>
          <RevealOnScroll>
            <div className="rounded-2xl border border-(--color-border) bg-(--color-surface) p-4 md:p-6">
              <ErrorBoundary fallback={<SectionError />}><Suspense fallback={<ChartFallback />}>
                <WhatIfChart housePrice={housePriceNationwide} wage={wage} />
              </Suspense></ErrorBoundary>
            </div>
          </RevealOnScroll>
        </section>
      )}

      {!embedMode && data && (
        <section className="mb-20">
          <span className="section-num">05 / Calculator</span>
          <h2 className="section-h2 text-3xl md:text-4xl text-(--color-text) mb-3">
            What if you'd bought in year X?
          </h2>
          <p className="text-(--color-muted) mb-8 max-w-2xl text-lg leading-relaxed">
            Pick the year you could theoretically have bought and a deposit size. See what your mortgage would be today — vs. renting.
          </p>
          <ErrorBoundary fallback={<SectionError />}><Suspense fallback={<ChartFallback />}>
            <HomeBuyingCalculatorLazy series={allSeries} />
          </Suspense></ErrorBoundary>
        </section>
      )}

      {!embedMode && housePriceNationwide && wage && (
        <ErrorBoundary fallback={<SectionError />}><Suspense fallback={<ChartFallback />}>
          <DepositTimelineSectionLazy housePrice={housePriceNationwide} wage={wage} />
        </Suspense></ErrorBoundary>
      )}

      {!embedMode && data && (
        <section className="mb-20">
          <ErrorBoundary fallback={<SectionError />}><Suspense fallback={<ChartFallback />}>
            <WealthGapSectionLazy series={allSeries} />
          </Suspense></ErrorBoundary>
        </section>
      )}

      {!embedMode && wage && data?.series["tax-burden-median"] && cpihSeries && (
        <section className="mb-20">
          <span className="section-num">06 / Take-home</span>
          <h2 className="section-h2 text-3xl md:text-4xl text-(--color-text) mb-3">
            What actually lands in your bank.
          </h2>
          <p className="text-(--color-muted) mb-8 max-w-2xl text-lg leading-relaxed">
            Median full-time gross pay, minus income tax and employee NI, then deflated by CPIH to today's money. The line of "what you can actually spend" has barely moved since the financial crisis.
          </p>
          <RevealOnScroll>
            <div className="rounded-2xl border border-(--color-border) bg-(--color-surface) p-4 md:p-6">
              <ErrorBoundary fallback={<SectionError />}><Suspense fallback={<ChartFallback />}>
                <RealTakeHomeChart wage={wage} taxBurden={data.series["tax-burden-median"]} cpih={cpihSeries} />
              </Suspense></ErrorBoundary>
            </div>
          </RevealOnScroll>
        </section>
      )}

      {!embedMode && data && (
        <section className="mb-20">
          <GenerationView data={data} />
        </section>
      )}

      {!embedMode && data && (
        <ErrorBoundary fallback={<SectionError />}><Suspense fallback={<ChartFallback />}>
          <BoomerVsMillennialLazy data={data} />
        </Suspense></ErrorBoundary>
      )}

      {!embedMode && data && (
        <section className="mb-20">
          <ErrorBoundary fallback={<SectionError />}><Suspense fallback={<ChartFallback />}>
            <GradDebtCalloutLazy series={allSeries} />
          </Suspense></ErrorBoundary>
        </section>
      )}

      {!embedMode && housePriceNationwide && (
        <section className="mb-20">
          <ErrorBoundary fallback={<SectionError />}><Suspense fallback={<ChartFallback />}>
            <AvosToastCalculatorLazy housePrice={housePriceNationwide} />
          </Suspense></ErrorBoundary>
        </section>
      )}

      {!embedMode && <SectionDivider />}

      {!embedMode && data && (
        <ErrorBoundary fallback={<SectionError />}><Suspense fallback={<ChartFallback />}>
          <PersonalSnapshotLazy
            series={data.series}
            urlSnap={snap}
            onSnapChange={(next) => setState((p) => ({ ...p, snap: next }))}
          />
        </Suspense></ErrorBoundary>
      )}

      {!embedMode && data && (
        <ErrorBoundary fallback={<SectionError />}><Suspense fallback={<ChartFallback />}>
          <PensionAdequacyLazy defaultSalary={snap.grossSalary ?? 35000} />
        </Suspense></ErrorBoundary>
      )}

      {!embedMode && data && cpihSeries && (
        <section className="mb-20 grid gap-6 md:grid-cols-2">
          <ErrorBoundary fallback={<SectionError />}><Suspense fallback={<ChartFallback />}>
            <TodaysMoneyLazy cpih={cpihSeries} />
          </Suspense></ErrorBoundary>
          <ErrorBoundary fallback={<SectionError />}><Suspense fallback={<ChartFallback />}>
            <ThenVsNowLazy series={visible} />
          </Suspense></ErrorBoundary>
        </section>
      )}

      {!embedMode && data && (
        <section className="mb-6">
          <ErrorBoundary fallback={<SectionError />}><Suspense fallback={<ChartFallback />}>
            <PolicyDifferencesNoteLazy />
          </Suspense></ErrorBoundary>
        </section>
      )}

      {!embedMode && <div id="faq" style={{ scrollMarginTop: "4rem" }}><Faq /></div>}

      {!embedMode && <About />}

      {!embedMode && (
        <section className="mb-12 mt-4">
          <Changelog />
        </section>
      )}

      {!embedMode && (
        <footer className="mt-4 mb-8 pt-8 border-t border-(--color-border) flex items-center justify-between text-xs text-(--color-muted) font-mono">
          <span>avos<span className="text-(--color-accent)">+</span>flix · UK economic data dashboard</span>
          <button onClick={toggleTheme} className="hover:text-(--color-text) transition flex items-center gap-1.5">
            {theme === "dark" ? "☀ light" : "◑ dark"}
          </button>
        </footer>
      )}

      {!embedMode && data && (
        <>
          <button
            onClick={() => setMethodologyOpen(true)}
            className="mt-6 text-xs text-(--color-muted) font-mono hover:text-(--color-text) transition underline underline-offset-2"
          >
            Sources &amp; methodology ({allSeries.length} series)
          </button>
          <MethodologyModal
            open={methodologyOpen}
            onClose={() => setMethodologyOpen(false)}
            series={allSeries}
          />
        </>
      )}
    </main>
    </>
  )
}

export default App
