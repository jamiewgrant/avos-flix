export const config = { runtime: "edge" }

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  // Fetch the static file from the same Vercel deployment origin —
  // Edge Functions can't read the filesystem directly.
  const origin = new URL(req.url).origin
  const upstream = await fetch(`${origin}/data/series.json`)

  if (!upstream.ok) {
    return new Response(JSON.stringify({ error: "series.json not found" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    })
  }

  const body = await upstream.text()

  return new Response(body, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  })
}
