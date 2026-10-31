import { createClient } from '@/lib/supabase/server'
import type { RawTxn } from '@/lib/accounts/build'
import { classify } from '@/lib/reports/compute'
import { detectRecurring, withMarks, type RecurringMark } from '@/lib/recurring/detect'
import { loadTransactions } from './transactions/load'
import type { Txn } from './transactions/types'
import { loadAccounts } from './accounts/load'
import { loadBudget } from './budget/load'
import DashboardView from './dashboard/dashboard-view'
import type { DashboardData, Holding } from './dashboard/types'

function pad(n: number) {
  return String(n).padStart(2, '0')
}

// Running total of spending for each day of a month
function cumulative(txns: Txn[], y: number, m: number, uptoDay?: number) {
  const days = new Date(y, m, 0).getDate()
  const prefix = y + '-' + pad(m) + '-'
  const perDay = new Array<number>(days).fill(0)
  for (const t of txns) {
    if (!t.date.startsWith(prefix) || t.pending || classify(t) !== 'expense') continue
    perDay[Number(t.date.slice(8, 10)) - 1] += t.amount
  }
  const out: number[] = []
  let sum = 0
  for (let d = 0; d < (uptoDay ?? days); d++) {
    sum += perDay[d]
    out.push(Math.round(sum * 100) / 100)
  }
  return out
}

function label(y: number, m: number) {
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export default async function Dashboard() {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() + 1
  // 15 months covers net worth history, last year's comparison and recurring detection
  const from = new Date(y, m - 1 - 15, 1)
  const fromDay = from.getFullYear() + '-' + pad(from.getMonth() + 1) + '-01'

  const supabase = await createClient()
  const { transactions, error } = await loadTransactions({ from: fromDay }, 20000)
  const raw: RawTxn[] = transactions.map((t) => ({
    account_id: t.accountId,
    txn_date: t.date,
    amount: t.amount,
    pending: t.pending,
  }))

  const [accounts, budget, marksRes, holdingsRes, userRes] = await Promise.all([
    loadAccounts(raw),
    loadBudget(undefined, transactions),
    supabase.from('recurring_marks').select('id, merchant_key, merchant, day, amount, category, start_date'),
    supabase.from('holdings').select('institution_value, securities(name, ticker_symbol)'),
    supabase.auth.getUser(),
  ])

  const marks = (marksRes.error ? [] : marksRes.data || []) as RecurringMark[]
  const streams = withMarks(detectRecurring(transactions), marks, transactions)

  // Combine the same security held in several accounts
  const byHolding = new Map<string, Holding>()
  for (const h of holdingsRes.data || []) {
    const sec = (Array.isArray(h.securities) ? h.securities[0] : h.securities) as { name?: string; ticker_symbol?: string } | null
    const key = sec?.ticker_symbol || sec?.name || 'Other'
    const cur = byHolding.get(key) || { key, ticker: sec?.ticker_symbol || null, name: sec?.name || key, value: 0 }
    cur.value += Number(h.institution_value || 0)
    byHolding.set(key, cur)
  }
  const investmentsTotal = accounts.data.groups
    .filter((g) => g.key === 'investments')
    .flatMap((g) => g.accounts)
    .reduce((s, a) => s + a.balance, 0)

  const lm = m === 1 ? 12 : m - 1
  const ly = m === 1 ? y - 1 : y
  const meta = userRes.data.user?.user_metadata || {}
  const fullName = (meta.first_name || meta.full_name || meta.name || '') as string

  const data: DashboardData = {
    name: fullName ? fullName.split(' ')[0] : null,
    accounts: accounts.data,
    budget,
    spending: {
      thisMonth: cumulative(transactions, y, m, now.getDate()),
      lastMonth: cumulative(transactions, ly, lm),
      lastYear: cumulative(transactions, y - 1, m),
      monthLabel: label(y, m),
      lastMonthLabel: label(ly, lm),
      lastYearLabel: label(y - 1, m),
    },
    recent: transactions.slice(0, 40),
    merchants: [...new Set(transactions.map((t) => t.merchant))].sort().slice(0, 500),
    streams,
    holdings: [...byHolding.values()].sort((a, b) => b.value - a.value).slice(0, 8),
    investmentsTotal,
    error: error || accounts.error,
  }

  return <DashboardView data={data} />
}
