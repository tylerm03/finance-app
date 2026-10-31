import type { Txn } from '@/app/transactions/types'

// A payment counts as recurring when the same company charges (or pays you)
// on the same day of the month for at least 3 months in a row.
export const MIN_MONTHS = 3

export type Hit = { date: string; amount: number }

export type Stream = {
  key: string
  merchant: string
  logo: string | null
  day: number // day of month it lands on
  category: string | null
  accountName: string | null
  institution: string | null
  amount: number // latest amount, Plaid sign (positive = money out)
  averageAmount: number
  months: number // longest run of consecutive months
  firstDate: string
  lastDate: string
  nextDate: string
  active: boolean
  manual: boolean // you marked it with "Make recurring"
  markId: string | null
  hits: Hit[] // every transaction from this company, for paid/missed checks
}

function ymKey(y: number, m: number) {
  return y * 12 + (m - 1)
}

function daysIn(y: number, m: number) {
  return new Date(y, m, 0).getDate()
}

// The day a monthly charge lands on in a given month (31st -> 30th in short months)
export function dueDay(day: number, y: number, m: number) {
  return Math.min(day, daysIn(y, m))
}

function iso(y: number, m: number, d: number) {
  return y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0')
}

function normalize(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

// How transactions from the same company are grouped together
export function companyKey(t: { merchantEntityId: string | null; merchant: string }) {
  return t.merchantEntityId || normalize(t.merchant)
}

export function detectRecurring(txns: Txn[], today = new Date()): Stream[] {
  // Group by company
  const byCompany = new Map<string, Txn[]>()
  for (const t of txns) {
    if (t.pending || t.category === 'EXCLUDED' || !t.merchant) continue
    const key = companyKey(t)
    if (!key) continue
    const list = byCompany.get(key) || []
    list.push(t)
    byCompany.set(key, list)
  }

  const todayYM = ymKey(today.getFullYear(), today.getMonth() + 1)
  const streams: Stream[] = []

  for (const [companyKey, list] of byCompany) {
    list.sort((a, b) => (a.date < b.date ? -1 : 1))

    // For each day of the month, which months had a transaction on that day?
    // Charges on the 31st land on the last day of shorter months, so count those too.
    const monthsByDay = new Map<number, Map<number, Txn>>()
    for (const t of list) {
      const y = Number(t.date.slice(0, 4))
      const m = Number(t.date.slice(5, 7))
      const d = Number(t.date.slice(8, 10))
      const days = d === daysIn(y, m) && d < 31 ? Array.from({ length: 31 - d + 1 }, (_, i) => d + i) : [d]
      for (const day of days) {
        const months = monthsByDay.get(day) || new Map<number, Txn>()
        months.set(ymKey(y, m), t)
        monthsByDay.set(day, months)
      }
    }

    const used = new Set<string>()
    for (const [day, months] of [...monthsByDay.entries()].sort((a, b) => a[0] - b[0])) {
      const keys = [...months.keys()].sort((a, b) => a - b)
      // Longest run of back-to-back months, and the run that ends most recently
      let best = 1
      let run = 1
      for (let i = 1; i < keys.length; i++) {
        run = keys[i] === keys[i - 1] + 1 ? run + 1 : 1
        best = Math.max(best, run)
      }
      if (best < MIN_MONTHS) continue

      const runTxns = keys.map((k) => months.get(k)!)
      const last = runTxns[runTxns.length - 1]
      // Skip a "31st" stream that's really the same charges as an earlier day
      if (used.has(last.id)) continue
      runTxns.forEach((t) => used.add(t.id))

      const lastYM = keys[keys.length - 1]
      // Still going if it happened this month or last month
      const active = todayYM - lastYM <= 1
      const ny = Math.floor((lastYM + 1) / 12)
      const nm = ((lastYM + 1) % 12) + 1
      const recent = runTxns.slice(-MIN_MONTHS)

      streams.push({
        key: companyKey + ':' + day,
        merchant: last.merchant,
        logo: last.logo,
        day,
        category: last.category,
        accountName: last.accountName,
        institution: last.institution,
        amount: last.amount,
        averageAmount: recent.reduce((s, t) => s + t.amount, 0) / recent.length,
        months: best,
        firstDate: runTxns[0].date,
        lastDate: last.date,
        nextDate: iso(ny, nm, dueDay(day, ny, nm)),
        active,
        manual: false,
        markId: null,
        hits: list.map((t) => ({ date: t.date, amount: t.amount })),
      })
    }
  }

  return sortStreams(streams)
}

function sortStreams(streams: Stream[]) {
  return streams.sort((a, b) => (a.nextDate < b.nextDate ? -1 : a.nextDate > b.nextDate ? 1 : a.merchant.localeCompare(b.merchant)))
}

export type RecurringMark = {
  id: string
  merchant_key: string
  merchant: string
  day: number
  amount: number
  category: string | null
  start_date: string
}

// Adds the payments you marked yourself. If the rule already found the same
// company on the same day, that one is just flagged as yours.
export function withMarks(streams: Stream[], marks: RecurringMark[], txns: Txn[], today = new Date()): Stream[] {
  const out = [...streams]
  const todayISO = iso(today.getFullYear(), today.getMonth() + 1, today.getDate())
  for (const m of marks) {
    const key = m.merchant_key + ':' + m.day
    const existing = out.find((s) => s.key === key)
    if (existing) {
      existing.manual = true
      existing.markId = m.id
      existing.active = true
      continue
    }
    const list = txns
      .filter((t) => !t.pending && companyKey(t) === m.merchant_key)
      .sort((a, b) => (a.date < b.date ? -1 : 1))
    const last = list[list.length - 1]
    const lastDate = last && last.date >= m.start_date ? last.date : m.start_date
    // Next due: this month's date unless it's already been paid this month
    const y = today.getFullYear()
    const mo = today.getMonth() + 1
    const paidThisMonth = lastDate.slice(0, 7) === todayISO.slice(0, 7)
    const ny = paidThisMonth && mo === 12 ? y + 1 : y
    const nm = paidThisMonth ? (mo % 12) + 1 : mo
    out.push({
      key,
      merchant: last?.merchant || m.merchant,
      logo: last?.logo || null,
      day: m.day,
      category: last?.category ?? m.category,
      accountName: last?.accountName || null,
      institution: last?.institution || null,
      amount: Number(m.amount),
      averageAmount: Number(m.amount),
      months: 0,
      firstDate: m.start_date,
      lastDate,
      nextDate: iso(ny, nm, dueDay(m.day, ny, nm)),
      active: true,
      manual: true,
      markId: m.id,
      hits: list.map((t) => ({ date: t.date, amount: t.amount })),
    })
  }
  return sortStreams(out)
}

export type Occurrence = {
  stream: Stream
  date: string // due date in this month
  status: 'paid' | 'upcoming' | 'overdue'
  amount: number // actual if paid, else expected
}

// What each active stream looks like in a given month: paid (a matching
// transaction within 3 days of the due date), overdue, or still upcoming.
export function occurrencesForMonth(streams: Stream[], y: number, m: number, todayISO: string): Occurrence[] {
  const out: Occurrence[] = []
  const monthKey = ymKey(y, m)
  for (const s of streams) {
    const startYM = ymKey(Number(s.firstDate.slice(0, 4)), Number(s.firstDate.slice(5, 7)))
    if (monthKey < startYM) continue
    const date = iso(y, m, dueDay(s.day, y, m))
    const due = new Date(date + 'T00:00:00').getTime()
    const match = s.hits.find((h) => {
      const diff = Math.abs(new Date(h.date + 'T00:00:00').getTime() - due) / 86400000
      return diff <= 3 && Math.sign(h.amount) === Math.sign(s.amount)
    })
    if (match) {
      out.push({ stream: s, date, status: 'paid', amount: match.amount })
      continue
    }
    // Stopped streams only show where they actually happened
    if (!s.active && date > s.lastDate) continue
    out.push({ stream: s, date, status: date < todayISO ? 'overdue' : 'upcoming', amount: s.amount })
  }
  return out
}
