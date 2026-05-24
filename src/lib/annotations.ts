export interface Annotation {
  year: number
  label: string
  description?: string
}

export const HISTORICAL_EVENTS: Annotation[] = [
  { year: 1980, label: "Right to Buy", description: "Housing Act lets council tenants buy at deep discounts — 2.6M sales by 2020." },
  { year: 1986, label: "Big Bang", description: "London Stock Exchange deregulation triggers the late-80s asset boom." },
  { year: 1989, label: "Lawson boom peak", description: "House prices peak; rate rises to 15% follow." },
  { year: 1992, label: "Black Wednesday", description: "Sterling crashes out of the ERM. Rates spike, then collapse." },
  { year: 1997, label: "BoE independence", description: "MPC takes over rate-setting; inflation targeting begins." },
  { year: 1998, label: "Tuition fees introduced", description: "First £1,000-a-year undergraduate fees in England." },
  { year: 2003, label: "Buy-to-let boom", description: "Buy-to-let mortgage lending peaks; private landlords now own 20% of housing stock by 2023 vs 9% in 2001." },
  { year: 2007, label: "Northern Rock", description: "First UK bank run in 150 years — credit crunch begins." },
  { year: 2008, label: "GFC", description: "Bank Rate cut from 5% to 0.5% in nine months." },
  { year: 2012, label: "Tuition trebled", description: "Annual fee cap raised to £9,000." },
  { year: 2012, label: "Auto-enrolment", description: "Workplace pension auto-enrolment begins — a genuine improvement, but still insufficient to close the defined-benefit pension gap boomers enjoyed." },
  { year: 2013, label: "Help to Buy", description: "Government equity loan scheme pushes house prices up further; first-time buyers need smaller deposits but pay higher prices." },
  { year: 2016, label: "Brexit vote", description: "Sterling drops 10% overnight; import prices climb." },
  { year: 2016, label: "Stamp Duty reform", description: "3% surcharge on additional properties makes buy-to-let more expensive but doesn't reverse landlord share gains." },
  { year: 2020, label: "COVID-19", description: "Stamp Duty holiday + £450bn QE; house prices surge." },
  { year: 2022, label: "Truss mini-budget", description: "Gilt market dislocation; mortgage rates double in weeks." },
]
