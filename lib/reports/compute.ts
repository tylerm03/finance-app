import type { Txn } from '@/app/transactions/types'
import { isCreditCardPayment } from '@/lib/categorization/transfers'
import { categoryDisplay } from '@/lib/categorization/category-display'

// Money moving between your own accounts (transfers, card payments) and
// hidden transactions are neither income nor spending.
export function classify(t: Txn): 'income' | 'expense' | 'skip' {
  if (t.category === 'EXCLUDED' || t.category === 'TRANSFER_IN' || t.category === 'TRANSFER_OUT') return 'skip'
  if (
    isCreditCardPayment({
      description: t.description,
      merchant_name: t.merchant,
      plaid_category: t.plaidDetail ? { detailed: t.plaidDetail } : null,
    })
  )
    return 'skip'
  if (t.category === 'INCOME') return 'income'
  if (!t.category) return t.amount < 0 ? 'income' : 'expense'
  return 'expense'
}

const INCOME_SOURCES: Record<string, { label: string; emoji: string }> = {
  INCOME_WAGES: { label: 'Paychecks', emoji: '💰' },
  INCOME_INTEREST_EARNED: { label: 'Interest', emoji: '💸' },
  INCOME_DIVIDENDS: { label: 'Dividends', emoji: '📈' },
  INCOME_TAX_REFUND: { label: 'Tax Refund', emoji: '🧾' },
  INCOME_RETIREMENT_PENSION: { label: 'Retirement', emoji: '🏖️' },
  INCOME_UNEMPLOYMENT: { label: 'Unemployment', emoji: '🏛️' },
}

// Every income source, in display order (used by the Budget page)
export const INCOME_SOURCE_LIST = [
  ...Object.entries(INCOME_SOURCES).map(([key, v]) => ({ key, ...v })),
  { key: 'OTHER_INCOME', label: 'Other Income', emoji: '💵' },
]

export function incomeSource(t: Txn) {
  const s = t.plaidDetail ? INCOME_SOURCES[t.plaidDetail] : undefined
  return s ? { key: t.plaidDetail!, ...s } : { key: 'OTHER_INCOME', label: 'Other Income', emoji: '💵' }
}

export function expenseGroup(t: Txn) {
  const key = t.category || '__none__'
  return { key, ...categoryDisplay(t.category) }
}

export type Slice = { key: string; label: string; emoji: string; value: number; pct: number }

export type Bucket = { key: string; label: string; income: number; expenses: number; net: number }

export type Period = 'monthly' | 'quarterly' | 'yearly'

export type ReportData = {
  income: number
  expenses: number
  net: number
  savingsRate: number | null
  incomeSlices: Slice[]
  expenseSlices: Slice[]
  // Transactions that count as income or spending, newest first
  included: Txn[]
}

function toSlices(map: Map<string, { label: string; emoji: string; value: number }>): Slice[] {
  const rows = [...map.entries()]
    .map(([key, v]) => ({ key, ...v }))
    .filter((r) => r.value > 0.005)
    .sort((a, b) => b.value - a.value)
  const total = rows.reduce((s, r) => s + r.value, 0)
  return rows.map((r) => ({ ...r, pct: total > 0 ? (r.value / total) * 100 : 0 }))
}

export function buildReport(txns: Txn[]): ReportData {
  const incomeMap = new Map<string, { label: string; emoji: string; value: number }>()
  const expenseMap = new Map<string, { label: string; emoji: string; value: number }>()
  const included: Txn[] = []

  for (const t of txns) {
    const kind = classify(t)
    if (kind === 'skip') continue
    included.push(t)
    if (kind === 'income') {
      const s = incomeSource(t)
      const cur = incomeMap.get(s.key) || { label: s.label, emoji: s.emoji, value: 0 }
      cur.value += -t.amount
      incomeMap.set(s.key, cur)
    } else {
      const g = expenseGroup(t)
      const cur = expenseMap.get(g.key) || { label: g.label, emoji: g.emoji, value: 0 }
      // Refunds (negative amounts) reduce spending in their category
      cur.value += t.amount
      expenseMap.set(g.key, cur)
    }
  }

  const incomeSlices = toSlices(incomeMap)
  const expenseSlices = toSlices(expenseMap)
  const income = incomeSlices.reduce((s, r) => s + r.value, 0)
  const expenses = expenseSlices.reduce((s, r) => s + r.value, 0)
  const net = income - expenses

  return {
    income,
    expenses,
    net,
    savingsRate: income > 0 ? (net / income) * 100 : null,
    incomeSlices,
    expenseSlices,
    included,
  }
}

function bucketKey(day: string, period: Period) {
  const y = day.slice(0, 4)
  const m = Number(day.slice(5, 7))
  if (period === 'yearly') return y
  if (period === 'quarterly') return y + '-Q' + Math.ceil(m / 3)
  return day.slice(0, 7)
}

function bucketLabel(key: string, period: Period) {
  if (period === 'yearly') return key
  if (period === 'quarterly') return key.slice(5) + ' ' + key.slice(0, 4)
  const d = new Date(key + '-01T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function nextKey(key: string, period: Period) {
  if (period === 'yearly') return String(Number(key) + 1)
  if (period === 'quarterly') {
    const y = Number(key.slice(0, 4))
    const q = Number(key.slice(6))
    return q === 4 ? y + 1 + '-Q1' : y + '-Q' + (q + 1)
  }
  const y = Number(key.slice(0, 4))
  const m = Number(key.slice(5, 7))
  return m === 12 ? y + 1 + '-01' : y + '-' + String(m + 1).padStart(2, '0')
}

// Income, spending and net per month/quarter/year, with no gaps
export function buildSeries(included: Txn[], period: Period): Bucket[] {
  if (included.length === 0) return []
  const sums = new Map<string, { income: number; expenses: number }>()
  let min = included[0].date
  let max = included[0].date
  for (const t of included) {
    if (t.date < min) min = t.date
    if (t.date > max) max = t.date
    const k = bucketKey(t.date, period)
    const cur = sums.get(k) || { income: 0, expenses: 0 }
    if (classify(t) === 'income') cur.income += -t.amount
    else cur.expenses += t.amount
    sums.set(k, cur)
  }
  const out: Bucket[] = []
  const last = bucketKey(max, period)
  for (let k = bucketKey(min, period); ; k = nextKey(k, period)) {
    const s = sums.get(k) || { income: 0, expenses: 0 }
    out.push({ key: k, label: bucketLabel(k, period), income: s.income, expenses: s.expenses, net: s.income - s.expenses })
    if (k === last || out.length > 600) break
  }
  return out
}
