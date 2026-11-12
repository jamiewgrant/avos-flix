// The site's pages. Home shows every section; each topic page is a focused
// subset with its own title, description and heading so it can be found (and
// linked to) on its own. scripts/prerender.ts writes one static HTML file per
// entry, and the sitemap is generated from this list.

export const SITE_URL = "https://avos-flix.vercel.app"

export type SectionKey =
  | "intro" | "explore" | "costs" | "cohort" | "affordability" | "mortgage"
  | "renting" | "international" | "counterfactual" | "calculator" | "deposit"
  | "wealth" | "takehome" | "generation" | "boomer" | "graddebt" | "toast"
  | "snapshot" | "pension" | "money" | "policy" | "faq" | "about" | "changelog"

export interface PageDef {
  /** URL path without slashes; "" is the home page. */
  slug: string
  /** Short label for navigation. */
  nav: string
  title: string
  description: string
  /** Page heading and lede. Home keeps its brand hero, so these are topic-only. */
  h1?: string
  lede?: string
  /** Sections to render, in the fixed page order. "all" = everything. */
  sections: SectionKey[] | "all"
}

export const PAGES: PageDef[] = [
  {
    slug: "",
    nav: "Dashboard",
    title: "avos+flix — UK wages vs house prices and the cost of living, charted",
    description:
      "A UK economic dashboard: since 1995 house prices grew 5.3× while wages grew 2.6×, and a young family's basket of costs now takes 96% of take-home pay, up from 70%. The numbers behind the avocado-toast argument.",
    sections: "all",
  },
  {
    slug: "house-prices-vs-wages",
    nav: "House prices vs wages",
    title: "UK house prices vs wages since 1995: the affordability gap — avos+flix",
    description:
      "UK house prices have grown about twice as fast as wages since 1995. Charts of the price-to-salary ratio, mortgage cost as a share of pay, and how long a deposit takes to save.",
    h1: "UK house prices vs wages",
    lede: "How far house prices have pulled away from pay — the price-to-salary ratio, what a mortgage costs out of take-home, and how long a deposit takes.",
    sections: ["explore", "affordability", "mortgage", "counterfactual", "deposit", "calculator", "international", "faq"],
  },
  {
    slug: "cost-of-living",
    nav: "Cost of living",
    title: "UK cost of living vs take-home pay, 1995 to today — avos+flix",
    description:
      "What a typical UK household's bills — housing, energy, childcare, council tax, food, transport — take out of take-home pay, year by year, and what is left after tax and inflation.",
    h1: "UK cost of living vs take-home pay",
    lede: "The household bill, stacked by category against pay after tax — and what the avocado toast actually adds up to.",
    sections: ["costs", "takehome", "toast", "money", "snapshot", "faq"],
  },
  {
    slug: "renting-vs-buying",
    nav: "Renting vs buying",
    title: "Renting vs buying in the UK: rent, mortgages and deposits — avos+flix",
    description:
      "UK rent as a share of take-home pay, what a first-time-buyer mortgage costs, and how many years it takes to save a deposit — charted from official data.",
    h1: "Renting vs buying in the UK",
    lede: "Rent as a share of pay, what the mortgage would cost instead, and how long the deposit takes to save.",
    sections: ["renting", "mortgage", "deposit", "calculator", "faq"],
  },
  {
    slug: "boomers-vs-millennials",
    nav: "Boomers vs millennials",
    title: "Boomers vs millennials: the UK numbers at the same age — avos+flix",
    description:
      "A 30-year-old in 1995 against a 30-year-old today: house prices, take-home pay, rent, tuition and student debt, wealth by age group, and what a pension will actually pay.",
    h1: "Boomers vs millennials, by the numbers",
    lede: "The same age, a different economy — house prices, pay, debt, wealth and pensions compared across generations.",
    sections: ["boomer", "generation", "graddebt", "wealth", "pension", "faq"],
  },
]

export const HOME = PAGES[0]

export function pagePath(page: PageDef): string {
  return page.slug ? `/${page.slug}` : "/"
}

/** Resolve a URL pathname to a page; unknown paths fall back to home. */
export function pageForPath(pathname: string): PageDef {
  const slug = pathname.replace(/^\/+|\/+$/g, "")
  return PAGES.find((p) => p.slug === slug) ?? HOME
}
