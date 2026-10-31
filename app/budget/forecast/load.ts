import { createClient } from '@/lib/supabase/server'
import { buildReport } from '@/lib/reports/compute'
import { defaultAssumptions, type Assumptions, type Scenario } from '@/lib/forecast/model'
import { loadTransactions } from '../../transactions/load'

export type ForecastAccount = { name: string; type: string; balance: number }

export type ForecastData = {
  scenarios: Scenario[]
  linkedNetWorth: number
  accounts: ForecastAccount[]
  defaults: Assumptions
  setupNeeded: boolean
  error: string | null
}

const TYPE_LABEL: Record<string, string> = {
  depository: 'Cash',
  investment: 'Investments',
  brokerage: 'Investments',
  credit: 'Credit Card',
  loan: 'Loan',
}

export async function loadForecast(): Promise<ForecastData> {
  const supabase = await createClient()
  const since = new Date()
  since.setFullYear(since.getFullYear() - 1)
  const sinceDay = since.toISOString().slice(0, 10)

  const [scenariosRes, accountsRes, holdingsRes, assetsRes, txns] = await Promise.all([
    supabase
      .from('forecast_scenarios')
      .select('id, name, icon, color, assumptions, events, position')
      .order('position')
      .order('created_at'),
    supabase.from('accounts').select('id, name, type, current_balance'),
    supabase.from('holdings').select('account_id, institution_value'),
    supabase.from('assets').select('name, type, current_value'),
    loadTransactions({ from: sinceDay }, 20000),
  ])

  const e = scenariosRes.error
  const setupNeeded = !!e && (e.code === '42P01' || e.code === 'PGRST205' || /does not exist|schema cache/i.test(e.message))

  // Today's net worth, counted the same way as the Accounts page
  const holdings = new Map<string, number>()
  for (const h of holdingsRes.data || []) {
    holdings.set(h.account_id, (holdings.get(h.account_id) || 0) + Number(h.institution_value || 0))
  }
  const accounts: ForecastAccount[] = []
  for (const a of accountsRes.data || []) {
    const raw = holdings.has(a.id) ? holdings.get(a.id)! : Number(a.current_balance || 0)
    const liability = a.type === 'credit' || a.type === 'loan'
    accounts.push({ name: a.name || 'Account', type: TYPE_LABEL[a.type || ''] || 'Other', balance: liability ? -raw : raw })
  }
  for (const a of assetsRes.data || []) {
    accounts.push({
      name: a.name || 'Asset',
      type: a.type === 'vehicle' ? 'Vehicle' : 'Asset',
      balance: Number(a.current_value || 0),
    })
  }
  accounts.sort((x, y) => Math.abs(y.balance) - Math.abs(x.balance))
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
