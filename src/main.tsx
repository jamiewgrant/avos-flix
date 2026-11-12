import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'
import { pageForPath } from './lib/pages'
import type { SeriesData } from './types/series'

const container = document.getElementById('root')!
const page = pageForPath(window.location.pathname)

function mount(data: SeriesData | null) {
  // The build writes static HTML for each page into #root (see
  // scripts/prerender.mjs) so there is real content before any script runs.
  // That markup has no charts and no state, so it is replaced, not hydrated.
  container.removeAttribute('data-prerendered')
  createRoot(container).render(
    <StrictMode>
      <ErrorBoundary>
        <App initialData={data} page={page} />
      </ErrorBoundary>
      <Analytics />
      <SpeedInsights />
    </StrictMode>,
  )
}

// Fetch the data first so the swap from static HTML to the live app happens in
// one step, instead of static page → loading skeleton → app. If the fetch
// fails, App retries it itself and shows its own error state.
fetch('/data/series.json')
  .then((r) => (r.ok ? (r.json() as Promise<SeriesData>) : null))
  .catch(() => null)
  .then(mount)
