import { createClient } from '@/lib/supabase/server'
import { buildReport } from '@/lib/reports/compute'
import { defaultAssumptions, type Assumptions, type Scenario } from '@/lib/forecast/model'
import { loadTransactions } from '../../transactions/load'
import { loadAccounts } from '../../accounts/load'

export type ForecastAccount = { name: string; type: string; balance: number }

export type ForecastData = {
  scenarios: Scenario[]
  linkedNetWorth: number
  accounts: ForecastAccount[]
  defaults: Assumptions
  setupNeeded: boolean
  error: string | null
}

export async function loadForecast(): Promise<ForecastData> {
  const supabase = await createClient()
  const since = new Date()
  since.setFullYear(since.getFullYear() - 1)
  const sinceDay = since.toISOString().slice(0, 10)

  const [scenariosRes, txns] = await Promise.all([
    supabase
      .from('forecast_scenarios')
      .select('id, name, icon, color, assumptions, events, position')
      .order('position')
      .order('created_at'),
    loadTransactions({ from: sinceDay }, 20000),
  ])

  const e = scenariosRes.error
  const setupNeeded = !!e && (e.code === '42P01' || e.code === 'PGRST205' || /does not exist|schema cache/i.test(e.message))

  // Today's net worth, from the same accounts (and live Schwab numbers) as the Accounts page
  const loaded = await loadAccounts(
    txns.transactions.map((t) => ({ account_id: t.accountId, txn_date: t.date, amount: t.amount, pending: t.pending }))
  )
  const accounts: ForecastAccount[] = loaded.data.groups
    .flatMap((g) =>
      g.accounts.map((a) => ({
        name: a.name,
        type: g.label === 'Credit Cards' ? 'Credit Card' : g.label === 'Loans' ? 'Loan' : g.label,
        balance: g.kind === 'liability' ? -a.balance : a.balance,
      }))
    )
    .sort((x, y) => Math.abs(y.balance) - Math.abs(x.balance))
  const linkedNetWorth = accounts.reduce((s, a) => s + a.balance, 0)

  // Starting guesses come from the last 12 months
  const report = buildReport(txns.transactions)
  const defaults = defaultAssumptions({ income: report.income, spending: report.expenses, netWorth: linkedNetWorth })

  const scenarios: Scenario[] = (scenariosRes.data || []).map((s) => ({
    id: s.id,
    name: s.name,
    icon: s.icon,
    color: s.color,
    assumptions: { ...defaults, ...(s.assumptions as Partial<Assumptions>) },
    events: Array.isArray(s.events) ? s.events : [],
    position: s.position,
  }))

  return {
    scenarios,
    linkedNetWorth,
    accounts,
    defaults,
    setupNeeded,
    error: setupNeeded ? null : e?.message || txns.error || null,
  }
}
