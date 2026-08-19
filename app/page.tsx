import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function Home() {
  const supabase = await createClient()

  const now = new Date()
  const dayOfMonth = now.getDate()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]

  const [thisMonthRes, lastMonthRes, uncategorizedRes, upcomingRes] = await Promise.all([
    supabase.from('transactions').select('amount').gte('txn_date', monthStart).gt('amount', 0),
    supabase.from('transactions').select('amount').gte('txn_date', lastMonthStart).lte('txn_date', lastMonthEnd).gt('amount', 0),
    supabase.from('transactions').select('id', { count: 'exact', head: true }).is('category', null),
    supabase.from('recurring_obligations').select('*').eq('is_active', true).neq('status', 'cleared').order('next_due_date', { ascending: true }).limit(3),
  ])

  const spentThisMonth = (thisMonthRes.data || []).reduce((s, t) => s + Number(t.amount), 0)
  const spentLastMonth = (lastMonthRes.data || []).reduce((s, t) => s + Number(t.amount), 0)
  const uncategorizedCount = uncategorizedRes.count || 0
  const upcoming = upcomingRes.data || []

  // "On track": compare this month's pace to last month's pace at the
  // same point in the month
  const expectedPaceAmount = spentLastMonth * (dayOfMonth / daysInMonth)
  const paceDiff = spentThisMonth - expectedPaceAmount
  const onTrack = spentLastMonth === 0 || paceDiff <= expectedPaceAmount * 0.1

  return (
    <div className="min-h-screen bg-gray-950 p-6 text-gray-100">
      <p className="mb-1 text-sm text-gray-400">Spent this month</p>
      <p className="mb-8 text-6xl font-semibold tabular-nums">
        ${spentThisMonth.toFixed(2)}
      </p>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded border border-gray-800 bg-gray-900 p-4">
          <p className="mb-1 text-sm text-gray-400">Pace</p>
          <p className={`text-lg font-medium ${onTrack ? 'text-blue-400' : 'text-red-400'}`}>
            {spentLastMonth === 0
              ? 'Not enough history yet'
              : onTrack
              ? 'On track'
              : `Ahead of last month's pace`}
          </p>
        </div>

        <div className="rounded border border-gray-800 bg-gray-900 p-4">
          <p className="mb-1 text-sm text-gray-400">Coming up</p>
          {upcoming.length === 0 && <p className="text-gray-100">Nothing due soon</p>}
          {upcoming.map((o) => (
            <p key={o.id} className="text-sm text-gray-100">
              {o.name} — ${Number(o.expected_amount).toFixed(2)}{' '}
              <span className="text-gray-400">({o.next_due_date || 'date unknown'})</span>
            </p>
          ))}
        </div>

        <Link
          href="/transactions"
          className={`rounded border p-4 ${
            uncategorizedCount > 0
              ? 'border-red-800 bg-red-950'
              : 'border-gray-800 bg-gray-900'
          }`}
        >
          <p className="mb-1 text-sm text-gray-400">Uncategorized</p>
          <p className={`text-lg font-medium ${uncategorizedCount > 0 ? 'text-red-400' : 'text-gray-100'}`}>
            {uncategorizedCount === 0 ? 'All caught up' : `${uncategorizedCount} to review`}
          </p>
        </Link>
      </div>
    </div>
  )
}
