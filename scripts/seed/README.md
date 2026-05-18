# Seed data

These files are committed snapshots used as **fallbacks** when an ETL fetcher cannot reach its upstream source (sandbox, offline build, upstream outage). Fresh runs of `npm run etl` will overwrite the resulting `public/data/series.json` with upstream data when network is available.

| File | Source | Update cadence | How to refresh |
|---|---|---|---|
| `boe-rate-daily.csv` | Bank of England Bank Rate via datahub.io mirror | When BoE changes the rate | `npm run etl` (auto-fetches upstream) |
| `cpih-annual.csv` | ONS CPIH all-items index (series `l522/mm23`), 2015=100 | Monthly | `npm run etl` |
| `hpi-annual.csv` | HM Land Registry UK HPI (UK-wide Average price) | Monthly | `npm run etl` — file path includes the snapshot date, may need updating in `scripts/sources/landRegistry.ts` |
| `ashe-annual.csv` | ONS ASHE Table 1.7a (median gross annual pay, full-time, UK) | Annual (October release) | Manual: download the ASHE Table 1 zip from ONS, open `PROV - Annual Pay - Gross 2025` sheet, append a `year,median` row. |

ASHE is the only series without a programmatic fetcher — ONS publishes it only as a zipped XLSX, and a 35-row file isn't worth the parsing complexity. One line a year by hand is the right answer.
