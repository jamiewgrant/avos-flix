/**
 * Generates a styled 1200×630 share card PNG using the Canvas API.
 * No external dependencies — pure browser canvas.
 */
export async function generateShareCard(
  statLines: string[],
  title: string,
): Promise<string> {
  const W = 1200
  const H = 630

  const canvas = document.createElement("canvas")
  canvas.width = W
  canvas.height = H

  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Could not get 2D canvas context")

  // ── Background ──────────────────────────────────────────────────────────
  ctx.fillStyle = "#0a0a0a"
  ctx.fillRect(0, 0, W, H)

  // ── Subtle decorative gradient (top-right purple glow) ──────────────────
  const grd = ctx.createRadialGradient(W, 0, 0, W, 0, 600)
  grd.addColorStop(0, "rgba(168, 85, 247, 0.12)")
  grd.addColorStop(1, "rgba(168, 85, 247, 0)")
  ctx.fillStyle = grd
  ctx.fillRect(0, 0, W, H)

  // ── Top-left: brand ─────────────────────────────────────────────────────
  ctx.fillStyle = "#ffffff"
  ctx.font = "600 48px system-ui, -apple-system, sans-serif"
  ctx.textBaseline = "top"
  ctx.fillText("avos+flix", 60, 52)

  // ── Top-right: URL ──────────────────────────────────────────────────────
  ctx.fillStyle = "#a855f7"
  ctx.font = "400 20px system-ui, -apple-system, sans-serif"
  ctx.textBaseline = "top"
  ctx.textAlign = "right"
  ctx.fillText("avosflix.app", W - 60, 60)

  // ── Centre: title ───────────────────────────────────────────────────────
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillStyle = "#ffffff"
  ctx.font = "600 56px system-ui, -apple-system, sans-serif"

  // Wrap title if long
  const titleLines = wrapText(ctx, title, W - 120)
  const titleLineHeight = 68
  const titleBlockH = titleLines.length * titleLineHeight
  const statCount = Math.min(statLines.length, 4)
  const statLineHeight = 40
  const statGap = 12
  const statBlockH = statCount * (statLineHeight + statGap)
  const totalContentH = titleBlockH + 32 + statBlockH
  const contentStartY = (H - totalContentH) / 2

  for (let i = 0; i < titleLines.length; i++) {
    const y = contentStartY + i * titleLineHeight + titleLineHeight / 2
    ctx.fillText(titleLines[i], W / 2, y)
  }

  // ── Stat lines ───────────────────────────────────────────────────────────
  ctx.font = "400 28px system-ui, -apple-system, sans-serif"
  ctx.fillStyle = "#a1a1aa"
  const statsStartY = contentStartY + titleBlockH + 32

  for (let i = 0; i < statCount; i++) {
    const y = statsStartY + i * (statLineHeight + statGap) + statLineHeight / 2
    ctx.fillText(statLines[i], W / 2, y)
  }

  // ── Bottom-left: tagline ─────────────────────────────────────────────────
  ctx.textAlign = "left"
  ctx.textBaseline = "bottom"
  ctx.fillStyle = "#52525b"
  ctx.font = "400 18px system-ui, -apple-system, sans-serif"
  ctx.fillText("The numbers behind the avocado-toast argument", 60, H - 48)

  return canvas.toDataURL("image/png")
}

/** Naive word-wrap: splits text into lines that fit within maxWidth px. */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(" ")
  const lines: string[] = []
  let current = ""

  for (const word of words) {
    const test = current ? `${current} ${word}` : word
    if (ctx.measureText(test).width <= maxWidth) {
      current = test
    } else {
      if (current) lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)
  return lines.length ? lines : [text]
}
