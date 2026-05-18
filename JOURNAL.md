# JOURNAL

Development log for avos+flix. Entries newest-first.

---

## 2026-05-18 — v0.2: reach + sharper arguments + polish

Built on top of v0.1 in three batches (D / E / F). All 10 features from the
ranked roadmap shipped.

### Batch D — reach + sharing
- **OG / Twitter previews** — `api/og.tsx` Vercel Edge function renders a
  1200×630 social card via `@vercel/og`. Three stat cards (5.0× / 2.6× / 2.1×),
  project palette, monospace footer with sources. `index.html` gets the full
  `og:`/`twitter:` meta-tag set pointing at `/api/og`.
- **Snapshot export** — `↓ PNG` button in the chart controls. `html-to-image`
  converts the chart container to a PNG at 2× pixel ratio. Filename includes
  current mode + base year.
- **Mobile polish** — ScrollyIntro chart now sticky only at `md+` (in-flow on
  mobile); scenes are 55vh on mobile vs 80vh desktop; YearRangeBrush handles
  bumped 9→11px radius for touch; main container padding tightened on mobile.

### Batch E — sharper arguments
- **Mortgage payment-to-income chart** — new `MortgageChart` component.
  Computes monthly payment on 90%-LTV, 25-year mortgage at (Bank Rate + 1%),
  divided by estimated monthly take-home pay (72% of gross). Shows the
  rate-vs-principal trade-off on one axis with a 30% "affordable" reference
  line. The sharpest counter to "rates were 15% in the 80s, you had it easy".
- **Generation comparison view** — `GenerationView` component with a birth-
  year dropdown. For each milestone (school-leaving, renting peak, average
  first-time buyer, peak earnings), shows the relevant series values at
  birthYear+age. Turns abstract years into lived experience.
- **Regional breakdown** — `landRegistry.ts` refactored to return UK, London,
  and North East as separate Series in one fetch. ETL updated to handle
  multi-series source functions (`fetched.flat()`). Total series count: 13 → 15.

### Batch F — polish + trust
- **Deposit-target chase chart** — embedded inside the avos-toast calculator.
  Plots cumulative savings vs the deposit target rising at 4% annual house-
  price growth. At realistic skip-the-toast rates, the lines never cross.
- **Smoother chart transitions** — AnimatePresence durations bumped, custom
  cubic-bezier easing (`0.22, 1, 0.36, 1`) for a premium feel. Real path-morph
  via d3-shape + motion.path deferred — fade transitions are good enough.
- **About section** — dedicated section at the bottom: project mission, the
  solid/dashed line rule, the data-honesty stance ("we don't backdate
  Netflix"), GitHub link.
- **Onboarding banner** — small dismissible banner above the main chart on
  first visit. Points at hover/toggle/range-slider/URL-sharing. Persists via
  localStorage so it doesn't return.

---

## 2026-05-18 — v0.1 build day

The entire current state of the project, built in one focused session.
Grouped chronologically by phase rather than by commit since multiple
phases shipped on the same day.

### Phase 1 — Scaffold and first chart
- Vite + React 19 + TypeScript + Tailwind v4 + Visx + Framer Motion + papaparse + tsx
- ETL pipeline (`scripts/etl.ts`) with one source per file in `scripts/sources/`
- Seed CSVs committed for offline-fallback
- First chart: nominal UK house prices vs CPIH-adjusted real terms, 1995-2026
- Headline: 5.1× nominal vs 2.1× general inflation since 1995
- Deployed to Vercel via GitHub integration. `.npmrc` with `legacy-peer-deps=true` to fix the Visx peer conflict on a clean Vercel install.

### Phase 2 — Generic schema + Nationwide extension
- Replaced the hardcoded `medianWage`/`housePrice` typed keys with a generic
  `Record<string, Series>` where each Series carries `id`, `name`, `unit`,
  `color`, `source`, `points`. Adding a new source became a one-file change.
- Added Nationwide HPI via the datahub.io mirror — house-price coverage
  extended back to 1953 (vs Land Registry's 1968).
- Replaced `HousePriceChart` with `LayeredChart`: normalise every visible
  series to `baseYear = 100`, render on one axis. Toggle which series are
  visible, switch base year between presets.

### Phase 3 — Multi-series expansion + Indexed/Raw view modes
- Added 8 new series:
  - `household-income` (ONS CRXS, full series 1955–2025, clean upstream fetch)
  - `energy-cost` (Ofgem cap + DESNZ averages, hand-curated)
  - `rent-index` (IPHRP/PIPR approximations)
  - `netflix-uk` (Standard plan annualised — included as a cheeky callback to the thesis)
  - `avocado-uk` (illustrative only, with explicit disclaimer)
  - `birth-rate`, `net-migration`, `persons-per-household`
- `Unit` type extended with `count` and `rate`.
- Chart refactored with a `mode` prop:
  - **Indexed**: normalise everything to base year, one shared axis
  - **Raw**: small multiples grouped by unit, native scales

### Phase 4 — Batch A: trust + feel
- **Verified wage values** — installed `xlsx`, fetched the ONS earnings
  time-series spreadsheet, parsed the "Male & Female Adult" median column
  from both the UK Median (1997+) and GB Median (1984+) sheets, spliced.
  2024 came out at £37,872 vs ONS published £37,439 — matches within
  rounding. Replaces the hand-curated training-data approximations.
- **Hover crosshair + tooltip** in both Indexed and Raw modes. SVG-native
  tooltip auto-flips at the right edge. Raw mode shares the hovered year
  across all panels.
- **StatCallouts** — headline numbers (house-to-salary ratio, growth multiples)
  that recompute when series or base year change.
- **Framer Motion line animations** — AnimatePresence fades lines in/out on
  series toggle.
- **Deep-linkable URL state** (`?mode=raw&base=1995&hidden=...&real=1&range=...`).

### Phase 5 — Batch B: killer charts
- **AffordabilityChart** — dual axis: years of median wage to buy the
  average UK house on the left, BoE Bank Rate on the right. Same panel,
  same year, one tooltip. Counters the "rates were 15%!" rebuttal directly.
- **Real-vs-nominal toggle** — `deflateSeries` helper in `src/lib/deflate.ts`
  rebases all £ series to the latest CPIH year. Other units pass through.
  Stats automatically recompute.
- **AvosToastCalculator** — pick an item (avocado toast, flat white, Netflix,
  gym, Deliveroo, ...) × frequency → "years to a 10% UK deposit". Caveat
  box lists the optimistic assumptions in plain English.

### Phase 6 — Batch C: polish + narrative
- **ScrollyIntro** — 4-scene scrollytelling at the top of the page. Sticky
  chart morphs through "the claim → wages → houses → the rest" as the user
  scrolls. Lines fade in via the same Framer Motion machinery as the rest.
- **YearRangeBrush** — custom dual-thumb SVG slider beneath the main chart.
  Drag handles to zoom, drag the middle to pan. Presets: All / Last 30y /
  Post-2008. Range persists in URL.

### Phase 7 — Extend all extendable series to 1953-current
Once the chart was good, the most prominent visual flaw was that several
series started mid-chart and looked like they were missing context.

- **CPI**: parsed the ONS historical CPIH XLSX (1949–1988 modelled estimates,
  1965=100), rebased to the modern 2015=100 basis via the 1988 overlap with
  the current ONS series. Coverage 1949–2025.
- **Wage**: extended back to 1968 using the Adult Male median column from
  the GB sheet (the only data published in the NES era), scaled by the
  combined/male ratio at the 1984 overlap.
- **Net migration**: pre-1991 hand-curated decadal points from HoC Library
  research.
- **Energy**: pre-2004 hand-curated from DESNZ Quarterly Energy Prices and
  rough nominal estimates back to 1953.
- **Rent index**: pre-2005 from the RPI housing-rent component rebased to
  align with IPHRP at 2005.
- **Persons per household**: pre-1961 from GRO census-era estimates.

Netflix (2012+) and avocado (2008+) deliberately left short — backdating
these would be fabrication, not estimation, since the products didn't exist.

### Phase 8 — Visual distinction for estimated portions
- Added optional `verifiedFrom: number` to the `Series` schema.
- Chart now splits each LinePath into two segments: pre-verifiedFrom renders
  dashed at 0.55 opacity, verifiedFrom-onwards renders solid full-opacity.
  The two segments share a boundary point so the line stays visually continuous.
- Applied to both Indexed and Raw modes, and to the AffordabilityChart's
  ratio line (which inherits the wage series' verifiedFrom).
- "Solid = ONS published, dashed = modelled estimate or proxy" — viewers can
  now see the rigor boundary directly in the chart.

---

## Format

When adding a new entry, lead with a heading like `## YYYY-MM-DD — short title`
and use sub-headings for each meaningful change. Capture the *what* and the
*why*, especially when a methodology choice was made (e.g. "we don't backdate
Netflix because that would be fabrication"). Keep entries skimmable — bullet
lists over prose.
