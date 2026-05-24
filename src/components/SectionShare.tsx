import { useState } from 'react'

interface Props {
  title: string
  hashtags?: string
}

export default function SectionShare({ title }: Props) {
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    const url = window.location.href
    const text = title + ' — avos+flix'

    if (navigator.share) {
      try {
        await navigator.share({ title, url, text })
        return
      } catch {
        // User cancelled or share failed — fall through to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard not available — silently fail
    }
  }

  return (
    <button
      onClick={handleShare}
      aria-label="Share this section"
      className="text-[11px] font-mono text-(--color-muted) hover:text-(--color-text) transition px-2 py-1 rounded border border-(--color-border) hover:border-(--color-text)/30"
    >
      {copied ? 'Copied!' : '📤'}
    </button>
  )
}
