import { useEffect, useMemo, useRef, useState } from "react"
import { toPng } from "html-to-image"
import { useSeries } from "./data/useSeries"
import { useUrlState } from "./data/useUrlState"
import { Chart } from "./components/charts/Chart"
import { AffordabilityChart } from "./components/charts/AffordabilityChart"
import { MortgageChart } from "./components/charts/MortgageChart"
import { StatCallouts } from "./components/StatCallouts"
import { AvosToastCalculator } from "./components/AvosToastCalculator"
import { GenerationView } from "./components/GenerationView"
import { ScrollyIntro } from "./components/ScrollyIntro"
import { YearRangeBrush } from "./components/YearRangeBrush"
import { About } from "./components/About"
import { OnboardingBanner } from "./components/OnboardingBanner"
import { TodaysMoney } from "./components/TodaysMoney"
import { ThenVsNow } from "./components/ThenVsNow"
import { ChartSkeleton } from "./components/ChartSkeleton"
import { SourceStrip } from "./components/SourceStrip"
import { deflateSeries } from "./lib/deflate"
import { HISTORICAL_EVENTS } from "./lib/annotations"
import { CATEGORY_LABELS, CATEGORY_ORDER, categoryOf } from "./lib/categories"
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
          <h1 className="text-6xl md:text-7xl font-semibold tracking-tight text-white">
            avos<span className="text-(--color-accent)">+</span>flix
          </h1>
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

        <div
          ref={snapshotRef}
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
                series={visible}
                mode={mode}
                baseYear={baseYear}
                fromYear={mode === "indexed" ? Math.max(baseYear, activeFrom) : activeFrom}
                toYear={activeTo}
                annotations={HISTORICAL_EVENTS}
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

                <div className="ml-auto flex items-center gap-1.5 chart-actions">
                  <button
                    onClick={shareView}
                    className="px-3 py-1.5 rounded-md font-mono text-xs bg-(--color-bg) text-(--color-muted) hover:text-white transition"
                    title="Copy a link to this exact view"
                  >
                    ↗ Share
                  </button>
                  <button
                    onClick={resetToDefaults}
                    className="px-3 py-1.5 rounded-md font-mono text-xs bg-(--color-bg) text-(--color-muted) hover:text-white transition"
                    title="Reset all controls to defaults"
                  >
                    ↺ Reset
                  </button>
                  <button
                    onClick={downloadSnapshot}
                    disabled={snapshotting}
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
                <div className="mb-3 flex items-center gap-2">
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Filter series…"
                    className="flex-1 max-w-xs bg-(--color-bg) border border-(--color-border) rounded-md px-3 py-1.5 text-xs text-white placeholder:text-(--color-muted) focus:outline-none focus:border-(--color-accent)"
                  />
                  <span className="text-[10px] text-(--color-muted) font-mono">
                    {visible.length}/{allSeries.length} on
                  </span>
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
                        {items.map((s) => {
                          const isOn = !hiddenIds.has(s.id)
                          const hasData = s.points.length > 0
                          return (
                            <button
                              key={s.id}
                              onClick={() => toggle(s.id)}
                              disabled={!hasData}
                              title={s.description}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs transition border-(--color-border) ${
                                isOn && hasData
                                  ? "bg-(--color-bg) text-white"
                                  : "bg-transparent text-(--color-muted) opacity-50 hover:opacity-100"
                              } ${!hasData ? "cursor-not-allowed" : "cursor-pointer"}`}
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

      {!embedMode && data && (
        <section className="mb-20">
          <GenerationView data={data} />
        </section>
      )}

      {!embedMode && housePriceNationwide && (
        <section className="mb-20">
          <AvosToastCalculator housePrice={housePriceNationwide} />
        </section>
      )}

      {!embedMode && data && cpihSeries && (
        <section className="mb-20 grid gap-6 md:grid-cols-2">
          <TodaysMoney cpih={cpihSeries} />
          <ThenVsNow series={visible} />
        </section>
      )}

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
