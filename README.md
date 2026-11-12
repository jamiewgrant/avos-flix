# avos+flix

**The numbers behind the avocado-toast argument.**

→ **Live: [avosflix.app](https://www.avosflix.app/)**

> _"You'd own a house if you didn't waste your money on avocado toast and Netflix."_

A UK economic dashboard built around a single hypothesis: that older
generations point to discretionary spending (avocados, Netflix subscriptions,
takeaways) as the cause of younger workers' financial struggles — and that
the data, on one chart, shows this is nonsense. The argument is settled the
moment you put a wage line next to a house-price line on the same axis.

## What you can do with it

- Layer any of **13 UK economic series** on one chart, normalised to whatever base year you pick
- Switch to **Raw view** to see actual values per unit (small multiples — pounds with pounds, percent with percent)
- Toggle **Real terms** to deflate £ series by CPIH and answer "is it just inflation?"
- Drag the **year-range brush** to zoom into a specific window
- Hover anywhere for exact values at that year, every visible series at once
- Open the **Affordability** section for the house-price-to-salary ratio on a dual axis against the BoE Bank Rate
- Use the **calculator** to see how many years of skipping avocado toast it takes to save a UK deposit
- Share any view via URL — every control persists in the query string

## Headline number

Between 1995 and 2025:

| | Growth multiple |
|---|---|
| Average UK house price | **~5.0×** |
| Median full-time wage | **~2.6×** |
| CPIH inflation | **~2.1×** |
| Private rent | **~1.8×** |
| Household disposable income | **~2.8×** |

The gap between wages and the asset they're meant to chase is what cannot
be closed by skipping breakfast.

## Series

| ID | Coverage | Source |
|---|---|---|
| `boe-rate` | 1694–2026 | Bank of England Bank Rate (datahub.io mirror), annual mean |
| `house-price-nationwide` | 1953–2025 | Nationwide HPI quarterly → annual |
| `house-price-landreg` | 1968–2026 | HM Land Registry UK HPI (hidden by default) |
| `cpih` | 1949–2025 | ONS CPIH + historical estimates 1949–1987 |
| `median-wage` | 1968–2025 | ONS NES/ASHE earnings time series, full-time |
| `household-income` | 1955–2025 | ONS gross disposable income per head |
| `energy-cost` | 1953–2026 | Ofgem default tariff cap + DESNZ historical |
| `rent-index` | 1953–2025 | ONS IPHRP/PIPR + RPI rent component pre-2005 |
| `netflix-uk` | 2012–2026 | Netflix UK Standard plan, annualised |
| `avocado-uk` | 2008–2025 | Illustrative supermarket retail price |
| `birth-rate` | 1950–2023 | ONS, per 1,000 population |
| `net-migration` | 1953–2024 | ONS LTIM + HoC Library estimates pre-1991 |
| `persons-per-household` | 1953–2024 | UK Census + ONS Families and Households |

**Dashed line segments** indicate modelled estimates or proxies (e.g. pre-1988
CPI, pre-1984 combined-median wage, pre-1980 energy). Solid line segments are
ONS-published National Statistics or equivalent.

## Run locally

```bash
git clone https://github.com/jamiewgrant/avos-flix.git
cd avos-flix
npm install
npm run etl    # fetch latest data; falls back to committed seed CSVs
npm run dev    # http://localhost:5173
```

## Refresh data

```bash
npm run etl
```

Each source in [`scripts/sources/`](scripts/sources/) fetches its upstream
file (ONS, datahub.io mirrors, BoE, Land Registry, etc.) and the ETL writes
the merged result to [`public/data/series.json`](public/data/series.json).
Commit the JSON to refresh the deployed site — Vercel rebuilds automatically.

## Add a new series

1. Create `scripts/sources/<name>.ts` exporting an async `fetchSeries(): Promise<Series>`
2. Register it in the `SOURCES` array in [`scripts/etl.ts`](scripts/etl.ts)
3. (Optional) Drop a seed CSV in `scripts/seed/` so the ETL has an offline fallback
4. (Optional) Add the series id to `DEFAULT_VISIBLE_IDS` in [`src/App.tsx`](src/App.tsx) if it belongs in the default view
5. (Optional) Set `verifiedFrom` in the Series metadata if any portion is a modelled estimate or proxy — the chart will render that portion dashed

The chart auto-discovers the new series via the generic schema; no chart-
component code changes are needed.

## Methodology and honesty

Per-series methodology is surfaced in-app via the **Sources & methodology**
accordion at the bottom of the page. The visual rule is simple:

- **Solid lines** — ONS-published National Statistics or equivalent
- **Dashed lines** — modelled estimates, scaled proxies, or hand-curated historical values

We deliberately do **not** backdate `netflix-uk` or `avocado-uk` to pre-
existence years. Netflix UK launched in 2012; the UK supermarket avocado
market was negligible before about 2000. Synthesising prices for years
when the products didn't exist would be fabrication, not estimation, and
would undermine the project's core "undeniable data" stance.

## Stack

- [Vite](https://vite.dev) + [React 19](https://react.dev) + TypeScript
- [Tailwind v4](https://tailwindcss.com) (`@tailwindcss/vite`, theme via `@theme` in CSS)
- [Visx](https://airbnb.io/visx/) for charts
- [Framer Motion](https://www.framer.com/motion/) for transitions
- [papaparse](https://www.papaparse.com/) for CSV, [xlsx](https://www.npmjs.com/package/xlsx) for ONS spreadsheets
- [tsx](https://tsx.is/) to run TypeScript scripts directly
- [Vercel](https://vercel.com) for deploys (auto-builds on push to main)

Install with `--legacy-peer-deps` (set automatically via `.npmrc`) because
Visx 3.x peer-deps cap at React 18 even though the library works fine with
React 19.

## License

Source code: MIT. Underlying data is sourced from public ONS / HM Land
Registry / Bank of England / Nationwide / Ofgem / DESNZ datasets per their
respective licences.
