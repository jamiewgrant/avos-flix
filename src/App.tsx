import { useMemo, useState } from "react"
import { useSeries } from "./data/useSeries"
import { Chart, type ChartMode } from "./components/charts/Chart"
import type { Series } from "./types/series"

const BASE_YEAR_OPTIONS = [1953, 1970, 1980, 1995, 2008]
const DEFAULT_BASE_YEAR = 1995

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
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => {
    return new Set()
  })
  const [baseYear, setBaseYear] = useState<number>(DEFAULT_BASE_YEAR)
  const [mode, setMode] = useState<ChartMode>("indexed")
  const [initialized, setInitialized] = useState(false)

  // On first load, hide everything not in DEFAULT_VISIBLE_IDS.
  if (data && !initialized) {
    setHiddenIds(
      new Set(allSeries.map((s) => s.id).filter((id) => !DEFAULT_VISIBLE_IDS.has(id))),
    )
    setInitialized(true)
  }

  const visible = allSeries.filter((s) => !hiddenIds.has(s.id) && s.points.length > 0)

  function toggle(id: string) {
    setHiddenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <main className="min-h-screen px-6 py-16 max-w-5xl mx-auto">
      <header className="text-center mb-16">
        <h1 className="text-6xl md:text-7xl font-semibold tracking-tight text-white">
          avos<span className="text-(--color-accent)">+</span>flix
        </h1>
        <p className="mt-6 text-lg md:text-xl text-(--color-muted) max-w-2xl mx-auto">
          The numbers behind the avocado-toast argument.
        </p>
      </header>

      <section>
        <h2 className="text-3xl md:text-4xl font-semibold text-white mb-3">
          {mode === "indexed" ? "Index everything to one year." : "The raw numbers."}
        </h2>
        <p className="text-(--color-muted) mb-8 max-w-2xl text-lg leading-relaxed">
          {mode === "indexed"
            ? `Every series rebased so ${baseYear} = 100. Lines that climb faster than the others ate more of your paycheque. The gap between them is what doesn't fit on toast.`
            : "Same series, native units. Pounds with pounds, percent with percent. Use this when you want to know how much, not how much faster."}
        </p>

        <div className="rounded-2xl border border-(--color-border) bg-(--color-surface) p-4 md:p-6">
          {loading && (
            <div className="h-[360px] grid place-items-center text-(--color-muted) text-sm">
              Loading data…
            </div>
          )}
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
                fromYear={mode === "indexed" ? baseYear : undefined}
              />

              <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 px-1 text-sm">
                <div className="flex items-center gap-2 text-(--color-muted)">
                  <span>View</span>
                  <div className="flex gap-1">
                    {(["indexed", "raw"] as ChartMode[]).map((m) => (
                      <button
                        key={m}
                        onClick={() => setMode(m)}
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
                          onClick={() => setBaseYear(y)}
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
              </div>

              <div className="mt-5 flex flex-wrap gap-2 px-1">
                {allSeries.map((s) => {
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
            </>
          )}
        </div>

        {data && (
          <details className="mt-6 text-xs text-(--color-muted) font-mono">
            <summary className="cursor-pointer hover:text-white">Sources & methodology</summary>
            <ul className="mt-3 space-y-1.5">
              {allSeries.map((s) => (
                <li key={s.id}>
                  <span style={{ color: s.color }}>●</span> <strong className="text-white/80">{s.name}</strong>{" "}
                  — {s.description}{" "}
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
      </section>
    </main>
  )
}

export default App
