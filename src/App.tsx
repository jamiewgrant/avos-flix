import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react"
import { toPng } from "html-to-image"
import { useSeries } from "./data/useSeries"
import { useUrlState } from "./data/useUrlState"
import { Chart } from "./components/charts/Chart"
import { AffordabilityChart } from "./components/charts/AffordabilityChart"
import { MortgageChart } from "./components/charts/MortgageChart"

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

const ChartFallback = () => (
  <div className="h-[300px] grid place-items-center text-(--color-muted) text-xs font-mono">
    loading section…
  </div>
)
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
import { deflateSeries } from "./lib/deflate"
import { HISTORICAL_EVENTS } from "./lib/annotations"
import { CATEGORY_LABELS, CATEGORY_ORDER, categoryOf } from "./lib/categories"
import { applyPalette } from "./lib/palette"
import type { PaletteMode } from "./lib/palette"
import { seriesToCsv, downloadCsv } from "./lib/csv"
import type { Category } from "./lib/categories"
import type { Series } from "./types/series"

const BASE_YEAR_OPTIONS = [1953, 1970, 1980, 1995, 2008]

const DEFAULT_VISIBLE_IDS = new Set([
  "median-wage",
  "house-price-nationwide",
  "household-income",
  "cpih",
  "rent-index",
  "energy-cost",
])

function App() {
  const { data, loading, error } = useSeries()
  const allSeries = useMemo<Series[]>(
    () => (data ? Object.values(data.series) : []),
    [data],
  )

  const initialHidden = useMemo(() => {
    if (!data) return new Set<string>()
    return new Set(
      Object.keys(data.series).filter((id) => !DEFAULT_VISIBLE_IDS.has(id)),
    )
  }, [data])

  const [{ mode, baseYear, hiddenIds, realTerms, range }, setState] = useUrlState(initialHidden)

  // Derive the data span across visible series for the brush bounds.
  const dataSpan = useMemo<[number, number]>(() => {
    const yrs = allSeries.flatMap((s) => s.points.map((p) => p.year))
    if (yrs.length === 0) return [1950, new Date().getFullYear()]
    return [Math.min(...yrs), Math.max(...yrs)]
  }, [allSeries])
  const activeRange: [number, number] = range ?? dataSpan
  const [activeFrom, activeTo] = activeRange

  const cpihSeries = data?.series["cpih"]
  const cpihPoints = useMemo(() => cpihSeries?.points ?? [], [cpihSeries])

  const visible = useMemo(() => {
    const filtered = allSeries.filter(
      (s) => !hiddenIds.has(s.id) && s.points.length > 0,
    )
    if (!realTerms || cpihPoints.length === 0) return filtered
    return deflateSeries(filtered, cpihPoints).series
  }, [allSeries, hiddenIds, realTerms, cpihPoints])

  const refYear = useMemo(
    () => (cpihPoints.length > 0 ? cpihPoints[cpihPoints.length - 1].year : new Date().getFullYear()),
    [cpihPoints],
  )

  function toggle(id: string) {
    setState((prev) => {
      const next = new Set(prev.hiddenIds)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return { ...prev, hiddenIds: next }
    })
  }

  const snapshotRef = useRef<HTMLDivElement>(null)
  const [snapshotting, setSnapshotting] = useState(false)
  async function downloadSnapshot() {
    if (!snapshotRef.current || snapshotting) return
    setSnapshotting(true)
    try {
      const dataUrl = await toPng(snapshotRef.current, {
        backgroundColor: "#16171d",
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

  const [search, setSearch] = useState("")
  const grouped = useMemo(() => {
    const out = new Map<Category, Series[]>()
    const q = search.trim().toLowerCase()
    for (const s of allSeries) {
      if (q && !s.name.toLowerCase().includes(q) && !s.id.toLowerCase().includes(q)) continue
      const cat = categoryOf(s.id)
      const arr = out.get(cat) ?? []
      arr.push(s)
      out.set(cat, arr)
    }
    return out
  }, [allSeries, search])

  const [spotlightId, setSpotlightId] = useState<string | null>(null)
  const [showAnnotations, setShowAnnotations] = useState(true)
  const [palette, setPalette] = useState<PaletteMode>("default")
  const palettedAllSeries = useMemo(() => applyPalette(allSeries, palette), [allSeries, palette])
  const palettedVisible = useMemo(() => applyPalette(visible, palette), [visible, palette])

  function exportCsv() {
    const csv = seriesToCsv(palettedVisible)
    downloadCsv(csv, `avos-flix-${new Date().toISOString().slice(0, 10)}.csv`)
  }

  const chartContainerRef = useRef<HTMLDivElement>(null)
  async function toggleFullscreen() {
    if (!chartContainerRef.current) return
    if (document.fullscreenElement) {
      await document.exitFullscreen()
    } else {
      try {
        await chartContainerRef.current.requestFullscreen()
      } catch {
        // Some browsers / sandboxed iframes block fullscreen — ignore
      }
    }
  }

  const [shareToast, setShareToast] = useState<string | null>(null)
  async function shareView() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setShareToast("Link copied — anyone with it gets your exact view.")
    } catch {
      setShareToast(`Copy failed. URL: ${window.location.href}`)
    }
    setTimeout(() => setShareToast(null), 2800)
  }

  function resetToDefaults() {
    setState(() => ({
      mode: "indexed",
      baseYear: 1995,
      hiddenIds: new Set(initialHidden),
      realTerms: false,
      range: null,
    }))
    setSearch("")
    setSpotlightId(null)
    setShowAnnotations(true)
    setPalette("default")
  }

  const embedMode = useMemo(() => {
    if (typeof window === "undefined") return false
    return new URLSearchParams(window.location.search).get("embed") === "1"
  }, [])

  useEffect(() => {
    if (embedMode) document.body.classList.add("embed")
    return () => document.body.classList.remove("embed")
  }, [embedMode])

  return (
    <main className={`min-h-screen px-4 md:px-6 ${embedMode ? "py-4" : "py-10 md:py-16"} max-w-5xl mx-auto`}>
      {!embedMode && (
        <header className="text-center mb-24">
          <img
            src="/avos_flix_logo.svg"
            alt="avos+flix"
            className="mx-auto h-32 md:h-40 w-auto"
            width={160}
            height={160}
          />
          <p className="mt-6 text-lg md:text-xl text-(--color-muted) max-w-2xl mx-auto">
            The numbers behind the avocado-toast argument.
          </p>
          <div className="mt-12 text-xs text-(--color-muted) opacity-70 font-mono">
            ↓ scroll
          </div>
        </header>
      )}

      {!embedMode && data && <ScrollyIntro data={data} />}

      <section className={embedMode ? "" : "mb-20"} id="explore">
        {!embedMode && <OnboardingBanner />}

        {!embedMode && (
          <h2 className="text-3xl md:text-4xl font-semibold text-white mb-3">
            Explore the whole set.
          </h2>
        )}
        <p className={`text-(--color-muted) max-w-2xl text-lg leading-relaxed ${embedMode ? "mb-4 text-sm" : "mb-8"}`}>
          {mode === "indexed"
            ? `Every series rebased so ${baseYear} = 100. Lines that climb faster than the others ate more of your paycheque. Hover for exact values; toggle anything on or off below.`
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
          ref={(node) => {
            snapshotRef.current = node
            chartContainerRef.current = node
          }}
          className="rounded-2xl border border-(--color-border) bg-(--color-surface) p-4 md:p-6"
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
                fromYear={mode === "indexed" ? Math.max(baseYear, activeFrom) : activeFrom}
                toYear={activeTo}
                annotations={showAnnotations ? HISTORICAL_EVENTS : []}
                spotlightId={spotlightId}
              />

              <div className="mt-4 px-1">
                <YearRangeBrush
                  min={dataSpan[0]}
                  max={dataSpan[1]}
                  value={activeRange}
                  onChange={(next) =>
                    setState((p) => ({
                      ...p,
                      range:
                        next[0] === dataSpan[0] && next[1] === dataSpan[1] ? null : next,
                    }))
                  }
                  presets={[
                    { label: "All", range: dataSpan },
                    { label: "Last 30y", range: [Math.max(dataSpan[0], dataSpan[1] - 30), dataSpan[1]] },
                    { label: "Post-2008", range: [Math.max(dataSpan[0], 2008), dataSpan[1]] },
                  ]}
                />
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 px-1 text-sm">
                <div className="flex items-center gap-2 text-(--color-muted)">
                  <span>View</span>
                  <div className="flex gap-1">
                    {(["indexed", "raw"] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setState((p) => ({ ...p, mode: m }))}
                        className={`px-2.5 py-1 rounded-md font-mono text-xs transition ${
                          mode === m
                            ? "bg-(--color-accent) text-black"
                            : "bg-(--color-bg) hover:text-white"
                        }`}
                      >
                        {m === "indexed" ? "Indexed" : "Raw"}
                      </button>
                    ))}
                  </div>
                </div>

                {mode === "indexed" && (
                  <div className="flex items-center gap-2 text-(--color-muted)">
                    <span>Base</span>
                    <div className="flex gap-1">
                      {BASE_YEAR_OPTIONS.map((y) => (
                        <button
                          key={y}
                          onClick={() => setState((p) => ({ ...p, baseYear: y }))}
                          className={`px-2.5 py-1 rounded-md font-mono text-xs transition ${
                            baseYear === y
                              ? "bg-(--color-accent) text-black"
                              : "bg-(--color-bg) hover:text-white"
                          }`}
                        >
                          {y}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 text-(--color-muted)">
                  <span>Strip inflation</span>
                  <div className="flex gap-1">
                    {(["nominal", "real"] as const).map((v) => (
                      <button
                        key={v}
                        onClick={() => setState((p) => ({ ...p, realTerms: v === "real" }))}
                        className={`px-2.5 py-1 rounded-md font-mono text-xs transition ${
                          (v === "real") === realTerms
                            ? "bg-(--color-accent) text-black"
                            : "bg-(--color-bg) hover:text-white"
                        }`}
                        title={
                          v === "nominal"
                            ? "Show values as published"
                            : `Divide every price-like series by CPIH so growth is in real terms (${refYear}=ref)`
                        }
                      >
                        {v === "nominal" ? "Off" : "On"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-(--color-muted)">
                  <span>Events</span>
                  <button
                    onClick={() => setShowAnnotations((v) => !v)}
                    className={`px-2.5 py-1 rounded-md font-mono text-xs transition ${
                      showAnnotations ? "bg-(--color-accent) text-black" : "bg-(--color-bg) hover:text-white"
                    }`}
                    title="Show/hide historical event markers"
                  >
                    {showAnnotations ? "On" : "Off"}
                  </button>
                </div>

                <div className="flex items-center gap-2 text-(--color-muted)">
                  <span>Palette</span>
                  <button
                    onClick={() => setPalette((p) => (p === "default" ? "cb" : "default"))}
                    className={`px-2.5 py-1 rounded-md font-mono text-xs transition ${
                      palette === "cb" ? "bg-(--color-accent) text-black" : "bg-(--color-bg) hover:text-white"
                    }`}
                    title="Swap to a colour-blind-safe (Okabe-Ito) palette"
                  >
                    {palette === "cb" ? "CB-safe" : "Default"}
                  </button>
                </div>

                <div className="ml-auto flex items-center gap-1.5 chart-actions">
                  <button
                    onClick={toggleFullscreen}
                    aria-label="Toggle fullscreen for the main chart"
                    className="px-3 py-1.5 rounded-md font-mono text-xs bg-(--color-bg) text-(--color-muted) hover:text-white transition"
                    title="Toggle fullscreen"
                  >
                    ⤢ Full
                  </button>
                  <button
                    onClick={exportCsv}
                    aria-label="Download visible series as CSV"
                    className="px-3 py-1.5 rounded-md font-mono text-xs bg-(--color-bg) text-(--color-muted) hover:text-white transition"
                    title="Download visible series as CSV"
                  >
                    ↓ CSV
                  </button>
                  <button
                    onClick={shareView}
                    aria-label="Copy a link to this exact view"
                    className="px-3 py-1.5 rounded-md font-mono text-xs bg-(--color-bg) text-(--color-muted) hover:text-white transition"
                    title="Copy a link to this exact view"
                  >
                    ↗ Share
                  </button>
                  <button
                    onClick={resetToDefaults}
                    aria-label="Reset all controls to defaults"
                    className="px-3 py-1.5 rounded-md font-mono text-xs bg-(--color-bg) text-(--color-muted) hover:text-white transition"
                    title="Reset all controls to defaults"
                  >
                    ↺ Reset
                  </button>
                  <button
                    onClick={downloadSnapshot}
                    disabled={snapshotting}
                    aria-label="Download this chart as a PNG"
                    className="px-3 py-1.5 rounded-md font-mono text-xs bg-(--color-bg) text-(--color-muted) hover:text-white transition disabled:opacity-50"
                    title="Download this chart as a PNG"
                  >
                    {snapshotting ? "saving…" : "↓ PNG"}
                  </button>
                </div>
              </div>

              {shareToast && (
                <div className="mt-3 px-3 py-2 rounded-md bg-(--color-bg) border border-(--color-accent-border) text-xs text-(--color-accent)" style={{ borderColor: "rgba(192, 132, 252, 0.4)" }}>
                  {shareToast}
                </div>
              )}

              <div className="mt-5 px-1 chart-legend">
                <div className="mb-3 flex items-center gap-2 flex-wrap">
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Filter series…"
                    className="flex-1 max-w-xs bg-(--color-bg) border border-(--color-border) rounded-md px-3 py-1.5 text-xs text-white placeholder:text-(--color-muted) focus:outline-none focus:border-(--color-accent)"
                  />
                  <span className="text-[10px] text-(--color-muted) font-mono">
                    {visible.length}/{allSeries.length} on · shift-click to spotlight
                  </span>
                  {spotlightId && (
                    <button
                      onClick={() => setSpotlightId(null)}
                      className="text-[10px] font-mono text-(--color-accent) hover:text-white underline underline-offset-2"
                    >
                      clear spotlight
                    </button>
                  )}
                </div>

                {CATEGORY_ORDER.map((cat) => {
                  const items = grouped.get(cat)
                  if (!items || items.length === 0) return null
                  return (
                    <div key={cat} className="mb-3">
                      <div className="text-[10px] uppercase tracking-wider text-(--color-muted) font-mono mb-1.5 opacity-70">
                        {CATEGORY_LABELS[cat]}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {items.map((sOrig) => {
                          const s = palettedAllSeries.find((x) => x.id === sOrig.id) ?? sOrig
                          const isOn = !hiddenIds.has(s.id)
                          const hasData = s.points.length > 0
                          const isSpot = spotlightId === s.id
                          return (
                            <button
                              key={s.id}
                              onClick={(e) => {
                                if (e.shiftKey) {
                                  setSpotlightId((cur) => (cur === s.id ? null : s.id))
                                } else {
                                  toggle(s.id)
                                }
                              }}
                              disabled={!hasData}
                              title={`${s.description}\n\nClick to toggle. Shift-click to spotlight.`}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs transition ${
                                isSpot ? "border-(--color-accent) ring-1 ring-(--color-accent)" : "border-(--color-border)"
                              } ${
                                isOn && hasData
                                  ? "bg-(--color-bg) text-white"
                                  : "bg-transparent text-(--color-muted) opacity-50 hover:opacity-100"
                              } ${!hasData ? "cursor-not-allowed" : "cursor-pointer"}`}
                              style={isSpot ? { borderColor: "var(--color-accent)" } : undefined}
                            >
                              <span className="size-2.5 rounded-full" style={{ background: s.color }} />
                              {s.name}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
                {grouped.size === 0 && (
                  <div className="text-xs text-(--color-muted) py-2">
                    No series match “{search}”.
                  </div>
                )}

                <SourceStrip series={visible} />
              </div>
            </>
          )}
        </div>

        {!embedMode && data && <StatCallouts series={visible} baseYear={baseYear} />}
      </section>

      {embedMode && (
        <div className="mt-3 text-[10px] text-(--color-muted) font-mono text-center opacity-70">
          via <a href={window.location.origin} target="_blank" rel="noreferrer" className="underline hover:text-white">avos-flix.vercel.app</a>
        </div>
      )}

      {!embedMode && data && wage && (
        <CostStackSection series={data.series} wage={wage} />
      )}

      {!embedMode && canShowAffordability && (
        <section className="mb-20">
          <h2 className="text-3xl md:text-4xl font-semibold text-white mb-3">
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
          <h2 className="text-3xl md:text-4xl font-semibold text-white mb-3">
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
          <h2 className="text-3xl md:text-4xl font-semibold text-white mb-3">
            "Just buy instead of renting."
          </h2>
          <p className="text-(--color-muted) mb-8 max-w-2xl text-lg leading-relaxed">
            Rent on a typical UK 2-bed flat as a share of median take-home pay. The 30% line is the ceiling banks and benefit calculators traditionally call "affordable" — the line has lived above it for most of the last decade.
          </p>
          <div className="rounded-2xl border border-(--color-border) bg-(--color-surface) p-4 md:p-6">
            <Suspense fallback={<ChartFallback />}>
              <RentToIncomeChart rentIndex={data.series["rent-index"]} wage={wage} />
            </Suspense>
          </div>
        </section>
      )}

      {!embedMode && housePriceNationwide && wage && (
        <section className="mb-20">
          <WhatIfCallout housePrice={housePriceNationwide} wage={wage} />
          <h2 className="text-3xl md:text-4xl font-semibold text-white mt-12 mb-3">
            What if houses had grown at wage rate?
          </h2>
          <p className="text-(--color-muted) mb-8 max-w-2xl text-lg leading-relaxed">
            Take the 1995 house price. Grow it each year by the same percentage wages grew. The dashed line is the parallel universe where buying a house tracked the paycheque. The gap is what you actually owe the bank.
          </p>
          <div className="rounded-2xl border border-(--color-border) bg-(--color-surface) p-4 md:p-6">
            <Suspense fallback={<ChartFallback />}>
              <WhatIfChart housePrice={housePriceNationwide} wage={wage} />
            </Suspense>
          </div>
        </section>
      )}

      {!embedMode && wage && data?.series["tax-burden-median"] && cpihSeries && (
        <section className="mb-20">
          <h2 className="text-3xl md:text-4xl font-semibold text-white mb-3">
            What actually lands in your bank.
          </h2>
          <p className="text-(--color-muted) mb-8 max-w-2xl text-lg leading-relaxed">
            Median full-time gross pay, minus income tax and employee NI, then deflated by CPIH to today's money. The line of "what you can actually spend" has barely moved since the financial crisis.
          </p>
          <div className="rounded-2xl border border-(--color-border) bg-(--color-surface) p-4 md:p-6">
            <Suspense fallback={<ChartFallback />}>
              <RealTakeHomeChart wage={wage} taxBurden={data.series["tax-burden-median"]} cpih={cpihSeries} />
            </Suspense>
          </div>
        </section>
      )}

      {!embedMode && data && (
        <section className="mb-20">
          <GenerationView data={data} />
        </section>
      )}

      {!embedMode && housePriceNationwide && (
        <section className="mb-20">
          <Suspense fallback={<ChartFallback />}>
            <AvosToastCalculatorLazy housePrice={housePriceNationwide} />
          </Suspense>
        </section>
      )}

      {!embedMode && data && cpihSeries && (
        <section className="mb-20 grid gap-6 md:grid-cols-2">
          <Suspense fallback={<ChartFallback />}>
            <TodaysMoneyLazy cpih={cpihSeries} />
          </Suspense>
          <Suspense fallback={<ChartFallback />}>
            <ThenVsNowLazy series={visible} />
          </Suspense>
        </section>
      )}

      {!embedMode && <Faq />}

      {!embedMode && <About />}

      {!embedMode && data && (
        <details className="mt-8 text-xs text-(--color-muted) font-mono">
          <summary className="cursor-pointer hover:text-white">Sources & methodology</summary>
          <ul className="mt-3 space-y-1.5">
            {allSeries.map((s) => (
              <li key={s.id}>
                <span style={{ color: s.color }}>●</span>{" "}
                <strong className="text-white/80">{s.name}</strong> — {s.description}{" "}
                <a
                  className="underline hover:text-white"
                  href={s.source.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  [{s.source.name}]
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-3 opacity-60">
            Built {new Date(data.metadata.generatedAt).toLocaleDateString("en-GB")}.
          </p>
        </details>
      )}
    </main>
  )
}

export default App
