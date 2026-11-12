// Build-time entry: renders a page to static HTML. Used only by
// scripts/prerender.mjs (via `vite build --ssr`), never shipped to browsers.
import { prerender } from 'react-dom/static'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'
import type { PageDef } from './lib/pages'
import type { SeriesData } from './types/series'

export { PAGES, SITE_URL, pagePath } from './lib/pages'
export { QAS } from './lib/faq'

async function renderOnce(page: PageDef, data: SeriesData): Promise<string> {
  const { prelude } = await prerender(
    <ErrorBoundary>
      <App initialData={data} page={page} />
    </ErrorBoundary>,
    // Keep every section inline. By default React moves large Suspense
    // boundaries into hidden fragments that an inline script swaps in later.
    { progressiveChunkSize: Number.MAX_SAFE_INTEGER },
  )
  return new Response(prelude).text()
}

export async function render(page: PageDef, data: SeriesData): Promise<string> {
  // Rendered twice on purpose. The first pass loads every lazy() section; React
  // would emit those as hidden fragments swapped in by inline scripts, leaving
  // "loading…" placeholders for anything that doesn't run JavaScript. On the
  // second pass the modules are already loaded, so the sections render inline.
  await renderOnce(page, data)
  return renderOnce(page, data)
}
