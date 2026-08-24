import { createClient } from '@/lib/supabase/server'
import MonthSelector from './month-selector'
import SpendingPieChart from './spending-pie-chart'
import SpendingLegend from './spending-legend'

export default async function SpendingPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const { month } = await searchParams
  const supabase = await createClient()

  const now = new Date()
  const selectedMonth = month || (now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0'))
  const [year, monthNum] = selectedMonth.split('-').map(Number)

  const rangeStart = new Date(year, monthNum - 1, 1).toISOString().split('T')[0]
  const rangeEnd = new Date(year, monthNum, 0).toISOString().split('T')[0]

  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('category, amount')
    .gte('txn_date', rangeStart)
    .lte('txn_date', rangeEnd)
    .gt('amount', 0)

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 p-6 text-gray-100">
        <p className="rounded border border-red-800 bg-red-950 p-3 text-red-400">
          Error loading spending: {error.message}
        </p>
      </div>
    )
  }

  const totals = new Map<string, number>()
  for (const t of transactions || []) {
    const cat = t.category || 'Other'
    totals.set(cat, (totals.get(cat) || 0) + Number(t.amount))
  }

  const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1])
  const grandTotal = sorted.reduce((sum, [, amt]) => sum + amt, 0)
  const otherTotal = totals.get('Other') || 0
  const otherPct = grandTotal > 0 ? (otherTotal / grandTotal) * 100 : 0
  const chartData = sorted.map(([category, amount]) => ({ category, amount }))

  return (
    <div className="min-h-screen bg-gray-950 p-6 text-gray-100">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="mb-1 text-sm text-gray-400">Spending</p>
          <p className="text-4xl font-semibold tabular-nums">${grandTotal.toFixed(2)}</p>
        </div>
        <MonthSelector selected={selectedMonth} />
      </div>

      {otherPct > 15 && (
        <p className="mb-4 rounded border border-red-800 bg-red-950 p-2 text-sm text-red-400">
          {otherPct.toFixed(0)}% of spending is uncategorized — check the Other bucket.
        </p>
      )}

      {sorted.length === 0 && (
        <p className="text-gray-400">No spending recorded for this month.</p>
      )}

      {sorted.length > 0 && (
        <div className="grid grid-cols-1 gap-6 rounded border border-gray-800 bg-gray-900 p-4 sm:grid-cols-2">
          <SpendingPieChart data={chartData} />
          <SpendingLegend data={chartData} total={grandTotal} />
        </div>
      )}
    </div>
  )
}
