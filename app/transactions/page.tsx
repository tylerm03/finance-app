import { createClient } from '@/lib/supabase/server'
import ConnectBankButton from '../connect-bank-button'
import SyncButton from '../sync-button'
import CategorizeButton from '../categorize-button'
import RefreshBalancesButton from '../refresh-balances-button'
import TransactionRow from './transaction-row'
import TransactionFilters from './transaction-filters'
import SpendingPieChart from '../spending/spending-pie-chart'
import SpendingLegend from '../spending/spending-legend'
import { isCreditCardPayment } from '@/lib/categorization/transfers'

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; account?: string; q?: string }>
}) {
  const { category, account, q } = await searchParams
  const supabase = await createClient()

  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, name')
    .order('name')

  // This month's spending, for the chart at the top of the page
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const { data: monthTxns } = await supabase
    .from('transactions')
    .select('category, amount, description, merchant_name, plaid_category')
    .gte('txn_date', monthStart)
    .gt('amount', 0)

  const totals = new Map<string, number>()
  for (const t of monthTxns || []) {
    if (isCreditCardPayment(t)) continue
    const cat = t.category || 'Other'
    totals.set(cat, (totals.get(cat) || 0) + Number(t.amount))
  }
  const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1])
  const chartTotal = sorted.reduce((sum, [, amt]) => sum + amt, 0)
  const chartData = sorted.map(([cat, amount]) => ({ category: cat, amount }))

  let query = supabase
    .from('transactions')
    .select('*, accounts(name)')
    .order('txn_date', { ascending: false })

  if (category === '__uncategorized__') {
    query = query.is('category', null)
  } else if (category) {
    query = query.eq('category', category)
  }

  if (account) {
    query = query.eq('account_id', account)
  }

  if (q) {
    const escaped = q.replace(/[%_]/g, '\\$&')
    query = query.or(
      'merchant_name.ilike.%' + escaped + '%,description.ilike.%' + escaped + '%'
    )
  }

  const { data: transactions, error } = await query

  return (
    <div className="min-h-screen bg-white p-6 text-gray-900">
      {chartData.length > 0 && (
        <div className="mb-6 grid grid-cols-1 gap-4 rounded border border-gray-200 bg-gray-50 p-4 sm:grid-cols-2">
          <SpendingPieChart data={chartData} />
          <SpendingLegend data={chartData} total={chartTotal} />
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-medium">Transactions</h1>
        <TransactionFilters accounts={accounts || []} />
      </div>

      <div className="mb-6 flex gap-3">
        <ConnectBankButton />
        <SyncButton />
        <CategorizeButton />
        <RefreshBalancesButton />
      </div>

      {error && (
        <p className="rounded border border-red-300 bg-red-50 p-3 text-red-600">
          Error loading transactions: {error.message}
        </p>
      )}

      {!error && transactions?.length === 0 && (
        <p className="text-gray-500">No transactions match these filters.</p>
      )}

      {!error && transactions && transactions.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Account</th>
                <th className="p-3 text-left">Merchant</th>
                <th className="p-3 text-left">Category</th>
                <th className="p-3 text-left">Source</th>
                <th className="p-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t: any) => (
                <TransactionRow key={t.id} t={t} accountName={t.accounts?.name} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
