// Year-by-year net worth projection for the Forecast tab.
// All money inputs are in today's dollars; inflation and raises are applied each year.

export type Assumptions = {
  birthYear: number
  retirementAge: number
  endAge: number // plan runs until this age
  annualIncome: number // take-home pay per year while working
  incomeGrowth: number // % raise per year
  annualSpending: number // per year while working
  retirementSpending: number // per year once retired
  retirementIncome: number // e.g. Social Security / pension, per year
  retirementIncomeAge: number
  inflation: number // %
  returnBefore: number // % investment return while working
  returnAfter: number // % once retired
  startingNetWorth: number | null // null = use your linked accounts
  confirmed: boolean // false until you've opened and saved Edit assumptions
}

export type EventKind = 'one_time_expense' | 'one_time_income' | 'recurring_expense' | 'recurring_income'

export type ForecastEvent = {
  id: string
  name: string
  kind: EventKind
  year: number
  endYear?: number | null // for recurring events
  amount: number // today's dollars (per year for recurring)
  icon: string
}

export type Scenario = {
  id: string
  name: string
  icon: string
  color: string
  assumptions: Assumptions
  events: ForecastEvent[]
  position: number
}

export type YearRow = {
  year: number
  age: number
  income: number
  spending: number
  events: number
  growth: number
  netWorth: number // end of year
  retired: boolean
}

export type Projection = {
  start: { year: number; netWorth: number }
  rows: YearRow[]
  netWorthEOY: number
  netWorthAtRetirement: number
  retirementYear: number
  netWorthAtEnd: number
  runsOutAge: number | null
}

export const EVENT_KINDS: { key: EventKind; label: string; recurring: boolean; sign: 1 | -1 }[] = [
  { key: 'one_time_expense', label: 'One-time expense', recurring: false, sign: -1 },
  { key: 'one_time_income', label: 'One-time income', recurring: false, sign: 1 },
  { key: 'recurring_expense', label: 'Recurring expense', recurring: true, sign: -1 },
  { key: 'recurring_income', label: 'Recurring income', recurring: true, sign: 1 },
]

export function defaultAssumptions(opts: { income: number; spending: number; netWorth: number }): Assumptions {
  const year = new Date().getFullYear()
  const income = Math.round(opts.income / 100) * 100
  const spending = Math.round(opts.spending / 100) * 100
  return {
    birthYear: year - 30,
    retirementAge: 65,
    endAge: 92,
    annualIncome: income,
    incomeGrowth: 3,
    annualSpending: spending,
    retirementSpending: Math.round((spending * 0.8) / 100) * 100,
    retirementIncome: 24000,
    retirementIncomeAge: 67,
    inflation: 2.5,
    returnBefore: 7,
    returnAfter: 5,
    startingNetWorth: null,
    confirmed: false,
  }
}

export function project(a: Assumptions, events: ForecastEvent[], linkedNetWorth: number): Projection {
  const now = new Date()
  const year0 = now.getFullYear()
  // Only the rest of this year is left to grow
  const restOfYear = 1 - (now.getMonth() + now.getDate() / 31) / 12
  const startNW = a.startingNetWorth ?? linkedNetWorth
  const endYear = a.birthYear + Math.max(a.endAge, a.retirementAge + 1)
  const retirementYear = a.birthYear + a.retirementAge

  const rows: YearRow[] = []
  let nw = startNW
  let runsOutAge: number | null = null
  for (let y = year0; y <= endYear; y++) {
    const t = y - year0
    const age = y - a.birthYear
    const retired = age >= a.retirementAge
    const share = y === year0 ? restOfYear : 1
    const infl = Math.pow(1 + a.inflation / 100, t)

    let income = retired ? 0 : a.annualIncome * Math.pow(1 + a.incomeGrowth / 100, t)
    if (age >= a.retirementIncomeAge) income += a.retirementIncome * infl
    const spending = (retired ? a.retirementSpending : a.annualSpending) * infl

    let ev = 0
    for (const e of events) {
      const kind = EVENT_KINDS.find((k) => k.key === e.kind)!
      const hit = kind.recurring ? y >= e.year && y <= (e.endYear ?? e.year) : y === e.year
      if (hit) ev += kind.sign * e.amount * infl * (kind.recurring ? share : 1)
    }

    const r = (retired ? a.returnAfter : a.returnBefore) / 100
    // Growth on the starting balance plus about half a year on this year's savings
    const flow = (income - spending) * share + ev
    const growth = nw * (Math.pow(1 + r, share) - 1) + flow * (r / 2) * share
    nw = nw + growth + flow
    if (nw < 0 && runsOutAge === null) runsOutAge = age
    rows.push({ year: y, age, income: income * share, spending: spending * share, events: ev, growth, netWorth: nw, retired })
  }

  const atRetirement = rows.find((r) => r.year === retirementYear - 1) || rows[0]
  return {
    start: { year: year0, netWorth: startNW },
    rows,
    netWorthEOY: rows[0]?.netWorth ?? startNW,
    netWorthAtRetirement: retirementYear <= year0 ? startNW : atRetirement.netWorth,
    retirementYear,
    netWorthAtEnd: rows[rows.length - 1]?.netWorth ?? startNW,
    runsOutAge,
  }
}

// $817.1K, $8.84M
export function compact(v: number) {
  const s = v < 0 ? '-' : ''
  const a = Math.abs(v)
  if (a >= 1e9) return s + '$' + (a / 1e9).toFixed(2) + 'B'
  if (a >= 1e6) return s + '$' + (a / 1e6).toFixed(2) + 'M'
  if (a >= 1e3) return s + '$' + (a / 1e3).toFixed(1) + 'K'
  return s + '$' + Math.round(a)
}

export function newId() {
  return Math.random().toString(36).slice(2, 10)
}
