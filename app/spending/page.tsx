import { createClient } from '@/lib/supabase/server'
import MonthSelector from './month-selector'
import CashFlowSankey from './cash-flow-sankey'
import { formatMoney } from '@/lib/format'
import { isCreditCardPayment } from '@/lib/categorization/transfers'

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
    .select('category, amount, description, merchant_name, plaid_category')
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

  const income = (transactions || [])
    .filter((t) => t.amount < 0 && !isCreditCardPayment(t))
    .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0)

  const expensesByCategory = new Map<string, number>()
  for (const t of transactions || []) {
    if (t.amount <= 0) continue
    if (isCreditCardPayment(t)) continue
    const cat = t.category || 'Other'
    expensesByCategory.set(cat, (expensesByCategory.get(cat) || 0) + Number(t.amount))
  }

  const totalExpenses = [...expensesByCategory.values()].reduce((s, v) => s + v, 0)
  const netIncome = income - totalExpenses
  const savingsRate = income > 0 ? (netIncome / income) * 100 : 0
  const savings = Math.max(netIncome, 0)

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
        <h1 className="text-xl font-semibold">Cash Flow</h1>
        <MonthSelector selected={selectedMonth} />
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-5 text-center shadow-sm">
          <p className="text-2xl font-semibold text-green-600 tabular-nums">
            {formatMoney(income)}
          </p>
          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-gray-500">
            Total Income
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5 text-center shadow-sm">
          <p className="text-2xl font-semibold text-red-600 tabular-nums">
            {formatMoney(totalExpenses)}
          </p>
          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-gray-500">
            Total Expenses
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5 text-center shadow-sm">
          <p className={'text-2xl font-semibold tabular-nums ' + (netIncome >= 0 ? 'text-gray-900' : 'text-red-600')}>
            {formatMoney(netIncome)}
          </p>
          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-gray-500">
            Total Net Income
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5 text-center shadow-sm">
          <p className="text-2xl font-semibold text-gray-900 tabular-nums">
            {savingsRate.toFixed(1)}%
          </p>
          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-gray-500">
            Savings Rate
          </p>
        </div>
      </div>

      {links.length === 0 && (
        <p className="text-gray-500">No income or spending recorded for this month.</p>
      )}

      {links.length > 0 && (
        <div className="overflow-x-auto rounded border border-gray-200 bg-white p-4 shadow-sm">
          <CashFlowSankey nodes={nodes} links={links} />
        </div>
      )}
    </div>
  )
}
