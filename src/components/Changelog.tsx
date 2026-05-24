interface ChangelogEntry {
  date: string
  text: string
}

const ENTRIES: ChangelogEntry[] = [
  {
    date: 'May 2026',
    text: 'Household savings ratio added; savings-ratio series from ONS QSA 1980–2024',
  },
  {
    date: 'May 2026',
    text: '39 series: international HPW comparison (UK/Germany/Canada), sector wages (public/private), wealth gap (25–34 vs 55–64)',
  },
  {
    date: 'May 2026',
    text: 'Help to Buy, auto-enrolment, buy-to-let boom annotations added',
  },
  {
    date: 'Apr 2026',
    text: 'Rail fares index, childcare costs, grad salary added',
  },
  {
    date: 'Apr 2026',
    text: 'Personal snapshot waterfall calculator, pension adequacy, deposit timeline',
  },
  {
    date: 'Mar 2026',
    text: 'Initial launch: house prices, wages, CPIH, energy, rent, tuition, student debt, BOE rate',
  },
]

export function Changelog() {
  return (
    <div style={{ maxWidth: '400px' }}>
      <p className="caption" style={{ opacity: 1, marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Data changelog
      </p>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {ENTRIES.map((entry, i) => (
          <li
            key={i}
            style={{
              display: 'flex',
              gap: '0.75rem',
              paddingBottom: '0.5rem',
              alignItems: 'flex-start',
            }}
          >
            <span
              className="caption"
              style={{
                opacity: 1,
                minWidth: '4.5rem',
                paddingTop: '0.05rem',
                flexShrink: 0,
              }}
            >
              {entry.date}
            </span>
            <span className="caption" style={{ opacity: 0.75 }}>
              {entry.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
