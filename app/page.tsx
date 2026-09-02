import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatMoney } from '@/lib/format'

export default async function Home() {
  const supabase = await createClient()

  const now = new Date()
  const dayOfMonth = now.getDate()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]

  const [
    thisMonthRes,
    lastMonthRes,
    uncategorizedRes,
    upcomingRes,
    savingsAccountsRes,
    holdingsRes,
    assetsRes,
  ] = await Promise.all([
    supabase.from('transactions').select('amount, plaid_category').gte('txn_date', monthStart).gt('amount', 0),
    supabase.from('transactions').select('amount, plaid_category').gte('txn_date', lastMonthStart).lte('txn_date', lastMonthEnd).gt('amount', 0),
    supabase.from('transactions').select('id', { count: 'exact', head: true }).is('category', null),
    supabase.from('recurring_obligations').select('*').eq('is_active', true).neq('status', 'cleared').order('next_due_date', { ascending: true }).limit(3),
    supabase.from('accounts').select('id, current_balance').or('type.eq.investment,subtype.eq.savings,subtype.eq.checking'),
    supabase.from('holdings').select('account_id, institution_value'),
    supabase.from('assets').select('current_value'),
  ])

  function isCreditCardPayment(t: any) {
    return t.plaid_category?.detailed === 'LOAN_PAYMENTS_CREDIT_CARD_PAYMENT'
  }

  const spentThisMonth = (thisMonthRes.data || [])
    .filter((t) => !isCreditCardPayment(t))
    .reduce((s, t) => s + Number(t.amount), 0)
  const spentLastMonth = (lastMonthRes.data || [])
    .filter((t) => !isCreditCardPayment(t))
    .reduce((s, t) => s + Number(t.amount), 0)
  const uncategorizedCount = uncategorizedRes.count || 0
  const upcoming = upcomingRes.data || []

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

  const expectedPaceAmount = spentLastMonth * (dayOfMonth / daysInMonth)
  const paceDiff = spentThisMonth - expectedPaceAmount
  const onTrack = spentLastMonth === 0 || paceDiff <= expectedPaceAmount * 0.1

  return (
    <div className="min-h-screen bg-white p-6 text-gray-900">
      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-sm text-gray-500">Spent this month</p>
          <p className="text-5xl font-semibold tabular-nums">
            {formatMoney(spentThisMonth)}
          </p>
        </div>
        <div>
          <p className="mb-1 text-sm text-gray-500">Net worth</p>
          <p className="text-5xl font-semibold tabular-nums text-orange-500">
            {formatMoney(netWorth)}
          </p>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded border border-gray-200 bg-white p-4">
          <p className="mb-1 text-sm text-gray-500">Pace</p>
          <p className={'text-lg font-medium ' + (onTrack ? 'text-orange-500' : 'text-red-600')}>
            {spentLastMonth === 0
              ? 'Not enough history yet'
              : onTrack
              ? 'On track'
              : "Ahead of last month's pace"}
          </p>
        </div>

        <div className="rounded border border-gray-200 bg-white p-4">
          <p className="mb-1 text-sm text-gray-500">Coming up</p>
          {upcoming.length === 0 && <p className="text-gray-900">Nothing due soon</p>}
          {upcoming.map((o) => (
            <p key={o.id} className="text-sm text-gray-900">
              {o.name} — {formatMoney(Number(o.expected_amount))}{' '}
              <span className="text-gray-500">({o.next_due_date || 'date unknown'})</span>
            </p>
          ))}
        </div>

        <Link
          href="/transactions?category=__uncategorized__"
          className={
            'rounded border p-4 ' +
            (uncategorizedCount > 0 ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white')
          }
        >
          <p className="mb-1 text-sm text-gray-500">Uncategorized</p>
          <p className={'text-lg font-medium ' + (uncategorizedCount > 0 ? 'text-red-600' : 'text-gray-900')}>
            {uncategorizedCount === 0 ? 'All caught up' : uncategorizedCount + ' to review'}
          </p>
        </Link>
      </div>
    </div>
  )
}
