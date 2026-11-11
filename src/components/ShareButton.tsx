import { useState } from "react"
import { generateShareCard } from "../lib/shareImage"

interface Props {
  title: string
  stats: string[]
  /** Button text. Defaults to "Share". */
  label?: string
  /** When given, replaces the default button styling entirely. */
  className?: string
}

function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, base64] = dataUrl.split(",")
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/png"
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new File([bytes], filename, { type: mime })
}

const DEFAULT_CLASS =
  "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium " +
  "border border-(--color-border) bg-(--color-surface) text-(--color-text) " +
  "hover:bg-(--color-bg) transition-colors duration-150"

export function ShareButton({ title, stats, label = "Share", className }: Props) {
  const compact = className !== undefined
  const iconSize = compact ? 12 : 16
  const [loading, setLoading] = useState(false)

  async function handleShare() {
    setLoading(true)
    try {
      const dataUrl = await generateShareCard(stats, title)

      // Try Web Share API (works on mobile / some desktop browsers)
      if (
        typeof navigator.share === "function" &&
        navigator.canShare &&
        navigator.canShare({ files: [] })
      ) {
        const file = dataUrlToFile(dataUrl, "avos-flix-share.png")
        try {
          await navigator.share({
            files: [file],
            title,
            text: stats.join(" · "),
          })
          return
        } catch (err) {
          // User cancelled or share failed — fall through to download
          if ((err as DOMException).name === "AbortError") return
        }
      }

      // Fallback: trigger a download
      const a = document.createElement("a")
      a.href = dataUrl
      a.download = "avos-flix-share.png"
      a.style.display = "none"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleShare}
      disabled={loading}
      aria-label={loading ? "Generating share image…" : "Share as image"}
      title="Download or share a summary image of this view"
      className={`${className ?? DEFAULT_CLASS} disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {loading ? (
        <>
          <Spinner size={iconSize} />
          <span>Generating…</span>
        </>
      ) : (
        <>
          <ShareIcon size={iconSize} />
          <span>{label}</span>
        </>
      )}
    </button>
  )
}

function Spinner({ size }: { size: number }) {
  return (
    <svg
      className="animate-spin"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  )
}

function ShareIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  )
}
