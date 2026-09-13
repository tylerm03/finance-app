import { createClient } from '@/lib/supabase/server'
import { formatMoney } from '@/lib/format'
import { isCreditCardPayment } from '@/lib/categorization/transfers'
import SpendingPieChart from './spending/spending-pie-chart'

const PERIODS_PER_YEAR: Record<string, number> = {
  weekly: 52,
  biweekly: 26,
  semimonthly: 24,
  monthly: 12,
}

function BudgetVsActual({ spent, budget }: { spent: number; budget: number }) {
  const over = spent > budget
  return (
    <p className={'text-sm ' + (over ? 'text-red-600' : 'text-gray-500')}>
      {formatMoney(spent)} of {formatMoney(budget)} budgeted
      {over ? ' — over' : ''}
    </p>
  )
}

export default async function Home() {
  const supabase = await createClient()

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

  const [savingsAccountsRes, holdingsRes, assetsRes, paystubsRes, monthTxnsRes] = await Promise.all([
    supabase.from('accounts').select('id, current_balance').in('type', ['investment', 'depository']),
    supabase.from('holdings').select('account_id, institution_value'),
    supabase.from('assets').select('current_value'),
    supabase.from('paystubs').select('net_pay, pay_frequency'),
    supabase
      .from('transactions')
      .select('category, amount, merchant_name, description, plaid_category')
      .gte('txn_date', monthStart)
      .gt('amount', 0),
  ])

  const holdingsByAccount = new Map<string, number>()
  for (const h of holdingsRes.data || []) {
    holdingsByAccount.set(
      h.account_id,
      (holdingsByAccount.get(h.account_id) || 0) + Number(h.institution_value || 0)
    )
  }
  const savingsTotal = (savingsAccountsRes.data || []).reduce((sum, a) => {
    const holdingsValue = holdingsByAccount.get(a.id)
    return sum + (holdingsValue !== undefined ? holdingsValue : Number(a.current_balance || 0))
  }, 0)
  const assetsTotal = (assetsRes.data || []).reduce((sum, a) => sum + Number(a.current_value || 0), 0)
  const netWorth = savingsTotal + assetsTotal

  const monthlyNetEquivalents = (paystubsRes.data || []).map((p) => {
    const periodsPerYear = PERIODS_PER_YEAR[p.pay_frequency] || 26
    return Number(p.net_pay) * (periodsPerYear / 12)
  })
  const avgMonthlyNet =
    monthlyNetEquivalents.length > 0
      ? monthlyNetEquivalents.reduce((s, v) => s + v, 0) / monthlyNetEquivalents.length
      : 0
  const budgetThird = avgMonthlyNet / 3

  const validTxns = (monthTxnsRes.data || []).filter(
    (t) => !isCreditCardPayment(t) && t.category !== 'EXCLUDED'
  )

  const rentTxns = validTxns.filter((t) => t.category === 'RENT_AND_UTILITIES')
  const otherTxns = validTxns.filter((t) => t.category !== 'RENT_AND_UTILITIES')

  const rentTotal = rentTxns.reduce((s, t) => s + Number(t.amount), 0)
  const otherTotal = otherTxns.reduce((s, t) => s + Number(t.amount), 0)

  const rentByMerchant = new Map<string, number>()
  for (const t of rentTxns) {
    const label = t.merchant_name || t.description || 'Other'
    rentByMerchant.set(label, (rentByMerchant.get(label) || 0) + Number(t.amount))
  }
  const rentChartData = [...rentByMerchant.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount]) => ({ category, amount }))

  const otherByCategory = new Map<string, number>()
  for (const t of otherTxns) {
    const cat = t.category || 'OTHER_EXPENSE'
    otherByCategory.set(cat, (otherByCategory.get(cat) || 0) + Number(t.amount))
  }
  const otherChartData = [...otherByCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount]) => ({ category, amount }))

  return (
    <div className="min-h-screen bg-white p-6 text-gray-900">
      <div className="mb-10">
        <p className="mb-1 text-sm text-gray-500">Net worth</p>
        <p className="text-5xl font-semibold tabular-nums">{formatMoney(netWorth)}</p>
      </div>

      <div>
        <h2 className="mb-1 text-lg font-semibold text-gray-900">Budget</h2>
        <p className="mb-4 text-sm text-gray-500">
          Based on average monthly take-home pay of {formatMoney(avgMonthlyNet)}, split evenly
        </p>

        {avgMonthlyNet === 0 ? (
          <p className="text-gray-500">
            No paystubs yet — add one on the Paystubs page to see your budget breakdown.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900">Rent</p>
                <BudgetVsActual spent={rentTotal} budget={budgetThird} />
              </div>
              {rentChartData.length === 0 ? (
                <p className="text-sm text-gray-500">No rent/utilities spending recorded yet this month.</p>
              ) : (
                <div className="flex justify-center">
                  <SpendingPieChart data={rentChartData} />
                </div>
              )}
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900">Expenses</p>
                <BudgetVsActual spent={otherTotal} budget={budgetThird} />
              </div>
              {otherChartData.length === 0 ? (
                <p className="text-sm text-gray-500">No other spending recorded yet this month.</p>
              ) : (
                <div className="flex justify-center">
                  <SpendingPieChart data={otherChartData} />
                </div>
              )}
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <p className="text-sm font-medium text-gray-900">Savings</p>
              <p className="text-2xl font-semibold tabular-nums text-orange-500">
                {formatMoney(budgetThird)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
