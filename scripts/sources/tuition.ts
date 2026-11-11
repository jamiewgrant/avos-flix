import type { Series } from "../../src/types/series.ts"

const META = {
  id: "tuition-uk",
  name: "Undergraduate tuition fees (England, max)",
  description: "Maximum annual undergraduate tuition fee chargeable by English universities. Pre-1998 = £0 (no fees). Top-up fees raised the cap to £3,000 in 2006; the Browne reforms tripled it to £9,000 in 2012. Held flat at £9,250 since 2017.",
  unit: "GBP" as const,
  color: "#d946ef",
  source: {
    name: "Department for Education / Office for Students fee cap history",
    url: "https://www.officeforstudents.org.uk/advice-and-guidance/fees-and-funding/",
  },
  region: "england",
}

const POINTS = [
  { year: 1990, value: 0 },
  { year: 1997, value: 0 },
  { year: 1998, value: 1000 },
  { year: 1999, value: 1025 },
  { year: 2000, value: 1050 },
  { year: 2001, value: 1075 },
  { year: 2002, value: 1100 },
  { year: 2003, value: 1125 },
  { year: 2004, value: 1150 },
  { year: 2005, value: 1175 },
  { year: 2006, value: 3000 },
  { year: 2007, value: 3070 },
  { year: 2008, value: 3145 },
  { year: 2009, value: 3225 },
  { year: 2010, value: 3290 },
  { year: 2011, value: 3375 },
  { year: 2012, value: 9000 },
  { year: 2013, value: 9000 },
  { year: 2014, value: 9000 },
  { year: 2015, value: 9000 },
  { year: 2016, value: 9000 },
  { year: 2017, value: 9250 },
  { year: 2018, value: 9250 },
  { year: 2019, value: 9250 },
  { year: 2020, value: 9250 },
  { year: 2021, value: 9250 },
  { year: 2022, value: 9250 },
  { year: 2023, value: 9250 },
  { year: 2024, value: 9250 },
  { year: 2025, value: 9535 },
  { year: 2026, value: 9535 },
]

export async function fetchSeries(): Promise<Series> {
  return { ...META, points: POINTS }
}
