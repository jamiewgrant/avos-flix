import { ImageResponse } from "@vercel/og"

export const config = { runtime: "edge" }

const BG = "#0a0a0a"
const SURFACE = "#16171d"
const BORDER = "#2e303a"
const TEXT = "#f5f4f0"
const MUTED = "#9ca3af"
const ACCENT = "#c084fc"
const HOUSE = "#a78bfa"
const WAGE = "#60a5fa"
const CPIH = "#34d399"

export default function handler(_req: Request) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: BG,
          color: TEXT,
          display: "flex",
          flexDirection: "column",
          padding: "60px 72px",
          fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 48,
          }}
        >
          <div
            style={{
              fontSize: 96,
              fontWeight: 700,
              letterSpacing: "-3px",
              lineHeight: 1,
              display: "flex",
            }}
          >
            <span>avos</span>
            <span style={{ color: ACCENT }}>+</span>
            <span>flix</span>
          </div>
          <div
            style={{
              fontSize: 22,
              color: MUTED,
              fontFamily: "ui-monospace, monospace",
              display: "flex",
            }}
          >
            avos-flix.vercel.app
          </div>
        </div>

        <div
          style={{
            fontSize: 38,
            color: MUTED,
            lineHeight: 1.3,
            marginBottom: 56,
            display: "flex",
          }}
        >
          The numbers behind the avocado-toast argument.
        </div>

        <div
          style={{
            display: "flex",
            gap: 24,
            flex: 1,
          }}
        >
          <Stat color={HOUSE} value="5.0×" label="House prices" />
          <Stat color={WAGE} value="2.6×" label="Median wage" />
          <Stat color={CPIH} value="2.1×" label="Inflation (CPIH)" />
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            color: MUTED,
            fontSize: 20,
            fontFamily: "ui-monospace, monospace",
            marginTop: 32,
          }}
        >
          <span>1995 → 2025 · UK</span>
          <span>13 series · ONS · Bank of England · HM Land Registry</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  )
}

function Stat({ color, value, label }: { color: string; value: string; label: string }) {
  return (
    <div
      style={{
        flex: 1,
        background: SURFACE,
        border: `2px solid ${BORDER}`,
        borderRadius: 20,
        padding: "32px 28px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ fontSize: 84, fontWeight: 700, color, letterSpacing: "-2px", lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 22, color: MUTED, lineHeight: 1 }}>{label}</div>
    </div>
  )
}
