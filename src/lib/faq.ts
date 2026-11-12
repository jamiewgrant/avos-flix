// The FAQ content lives here (not in the component) so the pre-render script
// can also emit it as FAQPage structured data.

export interface QA {
  q: string
  a: string
  chartLink?: { label: string; href: string }
}

export const QAS: QA[] = [
  {
    q: "But interest rates were 15% in the 1980s, you've got it easy.",
    a: "Yes — and houses cost three years of salary. Today's rates are lower but the mortgage principal is enormous. The affordability chart tracks the trade-off; the mortgage-payment chart shows the ceiling has been crossed in both directions, with different mechanics.",
    chartLink: { label: "See the mortgage affordability chart ↓", href: "#housing" },
  },
  {
    q: "It's just inflation. £10k in 1980 is £40k today.",
    a: "Inflation is on the chart as CPIH. Houses outran it ~2.5×, wages didn't keep up either. Use the 'Strip inflation' button on the main chart — the gap between wage growth and house-price growth persists in real terms.",
    chartLink: { label: "Go to main chart ↑", href: "#explore" },
  },
  {
    q: "It's just London skewing the numbers.",
    a: "The Nationwide UK series is the national average. The Land Registry series breaks out London and the North East separately — both have grown faster than wages. The gap is bigger in London but it exists everywhere.",
    chartLink: { label: "Compare regions in the chart ↑", href: "#explore" },
  },
  {
    q: "But avocado toast / Netflix / coffee.",
    a: "Use the toast calculator. Skipping every £5 toast and every £14/month Netflix subscription, every single week, for 30 years, gets you about a fifth of a London deposit at current house-price growth. The deposit-chase chart shows the saving line never catches the target line.",
    chartLink: { label: "Open the toast calculator ↓", href: "#calculators" },
  },
  {
    q: "You're cherry-picking the start year.",
    a: "Try 1953, 1970, 1980, 1995 or 2008 with the Base Year switch on the main chart. The gap between wages and assets opens with every base year that has data; the steepness varies.",
    chartLink: { label: "Go to main chart ↑", href: "#explore" },
  },
  {
    q: "Where's the data from?",
    a: "Every series links its upstream source — ONS for wages and inflation, Nationwide and HM Land Registry for house prices, Bank of England for the Bank Rate, Ofgem for energy. Solid lines are observed; dashed lines are modelled estimates for pre-coverage years.",
  },
]
