import { useMemo } from "react"
import type { Series } from "../types/series"

interface Props {
  series: Series[]
}

const SHORT_NAMES: Array<[RegExp, string]> = [
  [/Office for National Statistics|ONS/i, "ONS"],
  [/Nationwide/i, "Nationwide"],
  [/Land Registry|HPI/i, "HM Land Registry"],
  [/Bank of England|BoE/i, "Bank of England"],
  [/Ofgem|DESNZ/i, "Ofgem / DESNZ"],
  [/Netflix/i, "Netflix"],
  [/Office for Students|Department for Education/i, "DfE / OfS"],
  [/Student Loans|Commons Library/i, "SLC"],
  [/Office of Rail|ORR|DfT/i, "ORR / DfT"],
  [/Low Pay Commission|gov\.uk/i, "Low Pay Commission"],
  [/MHCLG|Levelling Up|council/i, "MHCLG"],
  [/datahub/i, "datahub.io"],
]

function shortName(name: string): string {
  for (const [re, label] of SHORT_NAMES) {
    if (re.test(name)) return label
  }
  return name.split(/[,—-]/)[0].trim().slice(0, 28)
}

export function SourceStrip({ series }: Props) {
  const distinct = useMemo(() => {
    const seen = new Map<string, { name: string; url: string }>()
    for (const s of series) {
      const key = shortName(s.source.name)
      if (!seen.has(key)) seen.set(key, { name: key, url: s.source.url })
    }
    return [...seen.values()]
  }, [series])

  if (distinct.length === 0) return null

  return (
    <div className="mt-4 pt-3 border-t border-(--color-border) text-[10px] text-(--color-muted) font-mono leading-relaxed">
      <span className="opacity-60">Sources: </span>
      {distinct.map((d, i) => (
        <span key={d.name}>
          <a
            href={d.url}
            target="_blank"
            rel="noreferrer"
            className="hover:text-white underline-offset-2 hover:underline"
          >
            {d.name}
          </a>
          {i < distinct.length - 1 && <span className="opacity-40"> · </span>}
        </span>
      ))}
    </div>
  )
}
