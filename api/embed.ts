export const config = { runtime: "edge" };

/**
 * Embed snippet endpoint — returns a minimal HTML page with an iframe
 * pointing at the main avos+flix app with ?embed=1 set.
 *
 * Usage: copy the <iframe> tag below and paste it into your page, or
 * link to this endpoint and let your CMS render the page in an iframe.
 *
 * Example embed code:
 *   <iframe
 *     src="https://avos-flix.vercel.app/?embed=1"
 *     width="100%"
 *     height="600"
 *     style="border:none;"
 *     title="avos+flix — UK generational wealth dashboard"
 *     loading="lazy"
 *   ></iframe>
 */

const renderHtml = (APP_URL: string) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>avos+flix embed</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0f172a; font-family: system-ui, sans-serif; color: #f1f5f9; padding: 2rem 1rem; }
    h1 { font-size: 1.25rem; margin-bottom: 0.5rem; }
    p  { font-size: 0.875rem; color: #94a3b8; margin-bottom: 1.5rem; }
    .preview { width: 100%; aspect-ratio: 16/9; border: none; border-radius: 0.5rem; }
    pre { background: #1e293b; border-radius: 0.5rem; padding: 1rem; font-size: 0.8rem; overflow-x: auto; color: #7dd3fc; }
    code { white-space: pre; }
  </style>
</head>
<body>
  <h1>avos+flix — embed</h1>
  <p>Copy the snippet below to embed the UK generational wealth dashboard on your site.</p>

  <pre><code>&lt;iframe
  src="${APP_URL}"
  width="100%"
  height="600"
  style="border:none;"
  title="avos+flix &mdash; UK generational wealth dashboard"
  loading="lazy"
&gt;&lt;/iframe&gt;</code></pre>

  <br />
  <p>Live preview:</p>
  <iframe
    class="preview"
    src="${APP_URL}"
    title="avos+flix — UK generational wealth dashboard"
    loading="lazy"
  ></iframe>
</body>
</html>`;

export default async function handler(req: Request): Promise<Response> {
  // Point the snippet at whichever deployment served this request.
  const appUrl = `${new URL(req.url).origin}/?embed=1`;
  return new Response(renderHtml(appUrl), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
