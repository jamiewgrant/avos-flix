import type { Series } from "../../src/types/series.ts"

// UK annual average unleaded petrol pump price (pence per litre).
// Pre-2000 values are estimated from BEIS historical data (dashed).
// 2000+ from BEIS/RAC Foundation records (solid).

const META = {
  id: "fuel-price",
  name: "Petrol pump price (pence per litre)",
  description: "Annual average UK unleaded petrol pump price (pence per litre). Pre-2000 estimated from BEIS historical data; solid from 2000.",
  unit: "index" as const,
  color: "#b45309",
  source: {
    name: "BEIS / RAC Foundation — UK average unleaded pump price",
    url: "https://www.racfoundation.org/data/uk-pump-prices-over-time",
  },
  region: "uk",
  verifiedFrom: 2000,
}

const POINTS = [
  { year: 1970, value: 7 },
  { year: 1975, value: 15 },
  { year: 1980, value: 28 },
  { year: 1985, value: 40 },
  { year: 1990, value: 44 },
  { year: 1995, value: 56 },
  { year: 2000, value: 76 },
  { year: 2001, value: 73 },
  { year: 2002, value: 71 },
  { year: 2003, value: 74 },
  { year: 2004, value: 79 },
  { year: 2005, value: 86 },
  { year: 2006, value: 92 },
  { year: 2007, value: 96 },
  { year: 2008, value: 109 },
  { year: 2009, value: 96 },
  { year: 2010, value: 117 },
  { year: 2011, value: 132 },
  { year: 2012, value: 136 },
  { year: 2013, value: 133 },
  { year: 2014, value: 128 },
  { year: 2015, value: 109 },
  { year: 2016, value: 103 },
  { year: 2017, value: 116 },
  { year: 2018, value: 125 },
  { year: 2019, value: 127 },
  { year: 2020, value: 104 },
  { year: 2021, value: 130 },
  { year: 2022, value: 165 },
  { year: 2023, value: 148 },
  { year: 2024, value: 142 },
  { year: 2025, value: 138 },
]

export async function fetchSeries(): Promise<Series> {
  return { ...META, points: POINTS }
}
