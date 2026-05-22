import { useState } from "react"

type Check = "yes" | "no" | "partial"

interface PolicyRow {
  nation: string
  flag: string
  tuition: { label: string; check: Check }
  prescriptions: { label: string; check: Check }
  councilTax: { label: string; check: Check }
}

const ROWS: PolicyRow[] = [
  {
    nation: "Scotland",
    flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
    tuition: { label: "£0 (Scottish-domiciled, since 2001)", check: "yes" },
    prescriptions: { label: "Free (since 2011)", check: "yes" },
    councilTax: { label: "Frozen 2023–2025", check: "yes" },
  },
  {
    nation: "Wales",
    flag: "🏴󠁧󠁢󠁷󠁬󠁳󠁿",
    tuition: { label: "£9,000 but larger maintenance grants", check: "partial" },
    prescriptions: { label: "Free (since 2007)", check: "yes" },
    councilTax: { label: "Rising, no freeze", check: "no" },
  },
  {
    nation: "England",
    flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    tuition: { label: "£9,535 (2025)", check: "no" },
    prescriptions: { label: "£9.90/item (2024–25)", check: "no" },
    councilTax: { label: "Rising ~5%/yr", check: "no" },
  },
]

function CheckIcon({ check }: { check: Check }) {
  if (check === "yes") {
    return (
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-bold" title="Yes / benefit applies">
        ✓
      </span>
    )
  }
  if (check === "partial") {
    return (
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/15 text-amber-400 text-xs font-bold" title="Partial benefit">
        ~
      </span>
    )
  }
  return (
    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-500/15 text-rose-400 text-xs font-bold" title="No benefit / higher cost">
      ✗
    </span>
  )
}

export function PolicyDifferencesNote() {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-xl border border-(--color-border) bg-(--color-surface) overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-(--color-surface-2) transition"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-amber-400 text-base" aria-hidden>⚠</span>
          <span className="text-sm font-medium text-(--color-text)">Devolved differences</span>
          <span className="text-xs text-(--color-muted)">
            — this dashboard shows England/UK figures; Scotland and Wales have materially different policies
          </span>
        </div>
        <span
          className="text-(--color-muted) text-xs font-mono shrink-0 transition-transform"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          aria-hidden
        >
          ▾
        </span>
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-(--color-border)">
          <p className="text-xs text-(--color-muted) mt-4 mb-4 leading-relaxed max-w-2xl">
            The three key policy differences that change the financial picture for younger people depending on where they live in the UK:
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="text-(--color-muted) border-b border-(--color-border)">
                  <th className="text-left pb-2 pr-4 font-medium">Nation</th>
                  <th className="text-left pb-2 pr-4 font-medium">University tuition</th>
                  <th className="text-left pb-2 pr-4 font-medium">NHS prescriptions</th>
                  <th className="text-left pb-2 font-medium">Council tax</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr key={row.nation} className="border-b border-(--color-border) last:border-0">
                    <td className="py-3 pr-4 font-medium text-(--color-text) whitespace-nowrap">
                      <span className="mr-1.5" aria-hidden>{row.flag}</span>
                      {row.nation}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-start gap-2">
                        <CheckIcon check={row.tuition.check} />
                        <span className="text-(--color-muted) leading-relaxed">{row.tuition.label}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-start gap-2">
                        <CheckIcon check={row.prescriptions.check} />
                        <span className="text-(--color-muted) leading-relaxed">{row.prescriptions.label}</span>
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="flex items-start gap-2">
                        <CheckIcon check={row.councilTax.check} />
                        <span className="text-(--color-muted) leading-relaxed">{row.councilTax.label}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-(--color-muted) mt-4 leading-relaxed opacity-70">
            Sources: Student Awards Agency Scotland; Welsh Government Higher Education; NHS BSA; relevant local government finance settlements.
          </p>
        </div>
      )}
    </div>
  )
}
