import { createClient } from '@/lib/supabase/server'
import { formatMoney } from '@/lib/format'

const PERIODS_PER_YEAR: Record<string, number> = {
  weekly: 52,
  biweekly: 26,
  semimonthly: 24,
  monthly: 12,
}

export default async function Home() {
  const supabase = await createClient()

  const [savingsAccountsRes, holdingsRes, assetsRes, paystubsRes] = await Promise.all([
    supabase.from('accounts').select('id, current_balance').in('type', ['investment', 'depository']),
    supabase.from('holdings').select('account_id, institution_value'),
    supabase.from('assets').select('current_value'),
    supabase.from('paystubs').select('net_pay, pay_frequency'),
  ])

  // Net worth: savings/investment account holdings or cash balance,
  // plus tracked assets (vehicles, etc.)
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

  // Average monthly net (take-home) pay, converting each paystub to a
  // monthly-equivalent based on its frequency before averaging — same
  // approach as the Paystubs page.
  const monthlyNetEquivalents = (paystubsRes.data || []).map((p) => {
    const periodsPerYear = PERIODS_PER_YEAR[p.pay_frequency] || 26
    return Number(p.net_pay) * (periodsPerYear / 12)
  })

  const avgMonthlyNet =
    monthlyNetEquivalents.length > 0
      ? monthlyNetEquivalents.reduce((s, v) => s + v, 0) / monthlyNetEquivalents.length
      : 0

  const budgetThird = avgMonthlyNet / 3

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
              <p className="text-sm text-gray-500">Rent</p>
              <p className="text-2xl font-semibold tabular-nums text-gray-900">
                {formatMoney(budgetThird)}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <p className="text-sm text-gray-500">Expenses</p>
              <p className="text-2xl font-semibold tabular-nums text-gray-900">
                {formatMoney(budgetThird)}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <p className="text-sm text-gray-500">Savings</p>
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
