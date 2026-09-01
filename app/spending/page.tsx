import { createClient } from '@/lib/supabase/server'
import MonthSelector from './month-selector'
import CashFlowSankey from './cash-flow-sankey'

export default async function CashFlowPage({
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

  if (error) {
    return (
      <div className="min-h-screen bg-white p-6 text-gray-900">
        <p className="rounded border border-red-300 bg-red-50 p-3 text-red-600">
          Error loading cash flow: {error.message}
        </p>
      </div>
    )
  }

  // Income = negative amounts (our sign convention), flipped positive
  const income = (transactions || [])
    .filter((t) => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0)

  const expensesByCategory = new Map<string, number>()
  for (const t of transactions || []) {
    if (t.amount <= 0) continue
    const cat = t.category || 'Other'
    expensesByCategory.set(cat, (expensesByCategory.get(cat) || 0) + Number(t.amount))
  }

  const totalExpenses = [...expensesByCategory.values()].reduce((s, v) => s + v, 0)
  const savings = Math.max(income - totalExpenses, 0)

  // Build Sankey nodes/links: Income -> Savings, Income -> each category
  const nodes = [{ name: 'Income' }]
  const links: { source: number; target: number; value: number }[] = []

  if (savings > 0) {
    nodes.push({ name: 'Savings' })
    links.push({ source: 0, target: nodes.length - 1, value: savings })
  }

  const sortedCategories = [...expensesByCategory.entries()].sort((a, b) => b[1] - a[1])
  for (const [cat, amount] of sortedCategories) {
    nodes.push({ name: cat })
    links.push({ source: 0, target: nodes.length - 1, value: amount })
  }

  return (
    <div className="min-h-screen bg-white p-6 text-gray-900">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="mb-1 text-sm text-gray-500">Cash flow</p>
          <p className="text-4xl font-semibold tabular-nums">${income.toFixed(2)}</p>
          <p className="text-sm text-gray-500">
            income · ${totalExpenses.toFixed(2)} spent · ${savings.toFixed(2)} saved
          </p>
        </div>
        <MonthSelector selected={selectedMonth} />
      </div>

      {links.length === 0 && (
        <p className="text-gray-500">No income or spending recorded for this month.</p>
      )}

      {links.length > 0 && (
        <div className="overflow-x-auto rounded border border-gray-200 bg-gray-50 p-4">
          <CashFlowSankey nodes={nodes} links={links} />
        </div>
      )}
    </div>
  )
}
