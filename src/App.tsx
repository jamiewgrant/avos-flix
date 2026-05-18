import { useMemo, useState } from "react"
import { useSeries } from "./data/useSeries"
import { LayeredChart } from "./components/charts/LayeredChart"
import type { Series } from "./types/series"

const BASE_YEAR_OPTIONS = [1953, 1970, 1980, 1995, 2008]
const DEFAULT_BASE_YEAR = 1995

function App() {
  const { data, loading, error } = useSeries()
  const allSeries = useMemo<Series[]>(
    () => (data ? Object.values(data.series) : []),
    [data],
  )
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set(["boe-rate"]))
  const [baseYear, setBaseYear] = useState<number>(DEFAULT_BASE_YEAR)

  const visible = allSeries.filter(
    (s) => !hiddenIds.has(s.id) && s.points.length > 0,
  )

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
          Index everything to one year.
        </h2>
        <p className="text-(--color-muted) mb-8 max-w-2xl text-lg leading-relaxed">
          Every series rebased so {baseYear} = 100. Lines that climb faster
          than the others ate more of your paycheque. The gap between them is
          what doesn't fit on toast.
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
              <LayeredChart
                series={visible}
                baseYear={baseYear}
                fromYear={baseYear}
              />

              <div className="mt-5 flex items-center gap-3 px-1 text-sm text-(--color-muted)">
                <span>Base year</span>
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
                      <span
                        className="size-2.5 rounded-full"
                        style={{ background: s.color }}
                      />
                      {s.name}
                      {!hasData && <span className="opacity-60">(no data)</span>}
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {data && (
          <details className="mt-6 text-xs text-(--color-muted) font-mono">
            <summary className="cursor-pointer hover:text-white">Sources</summary>
            <ul className="mt-3 space-y-1.5">
              {allSeries.map((s) => (
                <li key={s.id}>
                  <span style={{ color: s.color }}>●</span> {s.name} —{" "}
                  <a
                    className="underline hover:text-white"
                    href={s.source.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {s.source.name}
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
