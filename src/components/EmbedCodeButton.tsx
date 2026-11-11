import { useState, useRef, useEffect } from "react"

type Preset = "standard" | "compact"

const PRESETS: Record<Preset, { width: number; height: number; label: string }> = {
  standard: { width: 800, height: 520, label: "Standard" },
  compact: { width: 600, height: 380, label: "Compact" },
}

function buildSnippet(width: number, height: number): string {
  // Use whichever origin the dashboard is being served from (prod, preview, local).
  return `<iframe\n  src="${window.location.origin}/?embed=1"\n  width="${width}"\n  height="${height}"\n  frameborder="0"\n  style="border-radius:12px"\n></iframe>`
}

export function EmbedCodeButton() {
  const [open, setOpen] = useState(false)
  const [preset, setPreset] = useState<Preset>("standard")
  const [copied, setCopied] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const { width, height } = PRESETS[preset]
  const snippet = buildSnippet(width, height)

  function handleCopy() {
    navigator.clipboard
      .writeText(snippet)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      })
      .catch(() => {
        // Clipboard blocked — the snippet is still selectable in the box above.
      })
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [open])

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className="px-3 py-1.5 rounded-md font-mono text-xs bg-(--color-surface-2) border border-(--color-border) text-(--color-muted) hover:text-(--color-text) transition"
      >
        &lt;/&gt; Embed
      </button>

      {open && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Embed code"
          className="absolute z-50 mt-2 p-4 rounded-xl border border-(--color-border) bg-(--color-surface) shadow-xl w-80"
          style={{ right: 0 }}
        >
          {/* Size presets */}
          <div className="flex gap-2 mb-3">
            {(Object.entries(PRESETS) as [Preset, typeof PRESETS[Preset]][]).map(
              ([key, val]) => (
                <button
                  key={key}
                  onClick={() => setPreset(key)}
                  className={[
                    "px-2.5 py-1 rounded-md text-xs font-medium border transition",
                    preset === key
                      ? "border-(--color-accent) text-(--color-accent) bg-(--color-surface-2)"
                      : "border-(--color-border) text-(--color-muted) hover:text-(--color-text)",
                  ].join(" ")}
                >
                  {val.label}
                  <span className="ml-1 opacity-60 font-mono">
                    {val.width}×{val.height}
                  </span>
                </button>
              )
            )}
          </div>

          {/* Code snippet */}
          <pre className="text-[11px] font-mono text-(--color-muted) bg-(--color-surface-2) rounded-lg p-3 overflow-x-auto leading-relaxed whitespace-pre-wrap break-all border border-(--color-border)">
            {snippet}
          </pre>

          {/* Copy button */}
          <button
            onClick={handleCopy}
            className="mt-3 w-full px-3 py-1.5 rounded-md text-xs font-medium border border-(--color-border) text-(--color-muted) hover:text-(--color-text) transition bg-(--color-surface-2)"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      )}
    </div>
  )
}
