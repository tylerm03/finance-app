import { createClient } from '@/lib/supabase/server'
import ConnectBankButton from '../connect-bank-button'
import SyncButton from '../sync-button'
import CategorizeButton from '../categorize-button'
import RefreshBalancesButton from '../refresh-balances-button'
import TransactionRow from './transaction-row'
import TransactionFilters from './transaction-filters'

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
    <div className="min-h-screen bg-gray-950 p-6 text-gray-100">
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
        <p className="rounded border border-red-800 bg-red-950 p-3 text-red-400">
          Error loading transactions: {error.message}
        </p>
      )}

      {!error && transactions?.length === 0 && (
        <p className="text-gray-400">No transactions match these filters.</p>
      )}

      {!error && transactions && transactions.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-900 text-gray-400">
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
