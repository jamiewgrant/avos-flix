// Post-build step: writes real HTML into dist/ for every page in
// src/lib/pages.ts, with per-page <head> metadata and structured data, plus
// sitemap.xml. Without this, crawlers that don't run JavaScript see an empty
// <div id="root">.
//
// Runs after `vite build` (client → dist/) and
// `vite build --ssr src/entry-server.tsx` (renderer → dist-ssr/).
import { readFile, rm, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { pathToFileURL } from "node:url"

const DIST = resolve("dist")
const SSR = resolve("dist-ssr")

const { render, PAGES, QAS, SITE_URL, pagePath } = await import(
  pathToFileURL(resolve(SSR, "entry-server.js")).href
)

const template = await readFile(resolve(DIST, "index.html"), "utf8")
const data = JSON.parse(await readFile(resolve(DIST, "data", "series.json"), "utf8"))
const lastmod = String(data.metadata?.generatedAt ?? new Date().toISOString()).slice(0, 10)

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
// JSON-LD lives in a <script>; keep "</script" from ending it early.
const ld = (obj) =>
  `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, "\\u003c")}</script>`

function structuredData(page, url) {
  const out = []
  const hasFaq = page.sections === "all" || page.sections.includes("faq")
  if (page.slug === "") {
    const years = Object.values(data.series).flatMap((s) => s.points.map((p) => p.year))
    out.push({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "avos+flix",
      url: `${SITE_URL}/`,
      description: page.description,
    })
    out.push({
      "@context": "https://schema.org",
      "@type": "Dataset",
      name: "avos+flix — UK wages, house prices and cost-of-living series",
      description:
        "Annual UK time series compiled for the avos+flix dashboard: median wages, house prices, CPIH inflation, Bank Rate, rent, energy, childcare, council tax, rail fares, tuition, student debt and more. Each series records its upstream source; modelled or hand-compiled portions are flagged.",
      url: `${SITE_URL}/`,
      dateModified: lastmod,
      temporalCoverage: `${Math.min(...years)}/${Math.max(...years)}`,
      spatialCoverage: "United Kingdom",
      isAccessibleForFree: true,
      variableMeasured: Object.values(data.series).map((s) => s.name),
      distribution: [
        { "@type": "DataDownload", encodingFormat: "application/json", contentUrl: `${SITE_URL}/data/series.json` },
      ],
    })
  } else {
    out.push({
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: page.h1,
      description: page.description,
      url,
      isPartOf: { "@type": "WebSite", name: "avos+flix", url: `${SITE_URL}/` },
    })
    out.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "avos+flix", item: `${SITE_URL}/` },
        { "@type": "ListItem", position: 2, name: page.h1, item: url },
      ],
    })
  }
  if (hasFaq) {
    out.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: QAS.map((qa) => ({
        "@type": "Question",
        name: qa.q,
        acceptedAnswer: { "@type": "Answer", text: qa.a },
      })),
    })
  }
  return out.map(ld).join("\n    ")
}

function head(page) {
  const url = `${SITE_URL}${pagePath(page)}`
  const image = `${SITE_URL}/og.png`
  const t = esc(page.title)
  const d = esc(page.description)
  return `<title>${t}</title>
    <meta name="description" content="${d}" />
    <link rel="canonical" href="${url}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="avos+flix" />
    <meta property="og:url" content="${url}" />
    <meta property="og:title" content="${t}" />
    <meta property="og:description" content="${d}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${t}" />
    <meta name="twitter:description" content="${d}" />
    <meta name="twitter:image" content="${image}" />
    <meta name="twitter:image:alt" content="Chart showing UK house prices growing far faster than median wages since 1995" />
    ${structuredData(page, url)}`
}

const HEAD_RE = /<!--seo:start-->[\s\S]*?<!--seo:end-->/
const ROOT = '<div id="root"></div>'
if (!HEAD_RE.test(template) || !template.includes(ROOT)) {
  throw new Error("prerender: index.html is missing the seo markers or the empty #root")
}

for (const page of PAGES) {
  const body = await render(page, data)
  if (!body.includes("<h1")) throw new Error(`prerender: no <h1> rendered for "${page.slug || "/"}"`)
  const html = template
    .replace(HEAD_RE, () => `<!--seo:start-->\n    ${head(page)}\n    <!--seo:end-->`)
    .replace(ROOT, () => `<div id="root" data-prerendered>${body}</div>`)
  // Topic pages are flat files (dist/<slug>.html); vercel.json's cleanUrls
  // serves them at /<slug>.
  await writeFile(resolve(DIST, page.slug ? `${page.slug}.html` : "index.html"), html)
  console.log(`  prerendered ${pagePath(page)} (${(html.length / 1024).toFixed(0)} kB)`)
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PAGES.map(
  (p) => `  <url>
    <loc>${SITE_URL}${pagePath(p)}</loc>
    <lastmod>${lastmod}</lastmod>
  </url>`,
).join("\n")}
</urlset>
`
await writeFile(resolve(DIST, "sitemap.xml"), sitemap)
console.log(`  sitemap.xml: ${PAGES.length} URLs, lastmod ${lastmod}`)

await rm(SSR, { recursive: true, force: true })
