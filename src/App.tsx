import { useSeries } from "./data/useSeries"
import { HousePriceChart } from "./components/charts/HousePriceChart"

function App() {
  const { data, loading, error } = useSeries()

  const uk = data?.regions.uk
  const latestNominal = uk?.housePrice.at(-1)
  const earliestInRange = uk?.housePrice.find((d) => d.year === 1995)
  const nominalMultiple =
    latestNominal && earliestInRange
      ? (latestNominal.value / earliestInRange.value).toFixed(1)
      : null
  const cpihEarliest = uk?.cpih.find((d) => d.year === 1995)?.value
  const cpihLatest = uk?.cpih.at(-1)?.value
  const inflationMultiple =
    cpihEarliest && cpihLatest ? (cpihLatest / cpihEarliest).toFixed(1) : null

  return (
    <main className="min-h-screen px-6 py-16 max-w-5xl mx-auto">
      <header className="text-center mb-20">
        <h1 className="text-6xl md:text-7xl font-semibold tracking-tight text-white">
          avos<span className="text-(--color-accent)">+</span>flix
        </h1>
        <p className="mt-6 text-lg md:text-xl text-(--color-muted) max-w-2xl mx-auto">
          The numbers behind the avocado-toast argument.
        </p>
      </header>

      <section>
        <h2 className="text-3xl md:text-4xl font-semibold text-white mb-3">
          "It's just inflation."
        </h2>
        <p className="text-(--color-muted) mb-8 max-w-2xl text-lg leading-relaxed">
          A common rebuttal. So we plotted the average UK house price in
          nominal terms alongside the same prices adjusted into today's
          money. If the rebuttal held, the lines would converge.
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
          {uk && (
            <HousePriceChart
              housePrice={uk.housePrice}
              cpih={uk.cpih}
              fromYear={1995}
            />
          )}
          <div className="mt-5 flex flex-wrap gap-5 text-sm text-(--color-muted) px-1">
            <div className="flex items-center gap-2">
              <span className="h-0.5 w-7 bg-white" />
              <span>Nominal price</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="h-0 w-7 border-t-2 border-dashed"
                style={{ borderColor: "#c084fc" }}
              />
              <span>Real price (today's £, CPIH-adjusted)</span>
            </div>
          </div>
        </div>

        {nominalMultiple && inflationMultiple && (
          <p className="mt-6 text-(--color-text) text-lg">
            Since 1995, UK house prices grew{" "}
            <span className="font-semibold text-white">{nominalMultiple}×</span>
            . Over the same period, general prices rose{" "}
            <span className="font-semibold text-white">{inflationMultiple}×</span>
            . The gap is what doesn't fit on toast.
          </p>
        )}

        {data && (
          <p className="mt-8 text-xs text-(--color-muted) font-mono">
            Sources: HM Land Registry UK HPI · ONS CPIH (l522/mm23). Built{" "}
            {new Date(data.metadata.generatedAt).toLocaleDateString("en-GB")}.
          </p>
        )}
      </section>
    </main>
  )
}

export default App
