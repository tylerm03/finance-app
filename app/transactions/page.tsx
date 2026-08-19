import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import ConnectBankButton from '../connect-bank-button'
import SyncButton from '../sync-button'
import CategorizeButton from '../categorize-button'
import TransactionRow from './transaction-row'

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const { filter } = await searchParams
  const uncategorizedOnly = filter === 'uncategorized'

  const supabase = await createClient()

  let query = supabase
    .from('transactions')
    .select('*, accounts(name)')
    .order('txn_date', { ascending: false })

  if (uncategorizedOnly) {
    query = query.is('category', null)
  }

  const { data: transactions, error } = await query

  return (
    <div className="min-h-screen bg-gray-950 p-6 text-gray-100">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-medium">Transactions</h1>
        <div className="flex gap-4 text-sm">
          <Link
            href="/transactions"
            className={!uncategorizedOnly ? 'text-blue-400' : 'text-gray-400 hover:text-blue-400'}
          >
            All
          </Link>
          <Link
            href="/transactions?filter=uncategorized"
            className={uncategorizedOnly ? 'text-blue-400' : 'text-gray-400 hover:text-blue-400'}
          >
            Uncategorized
          </Link>
        </div>
      </div>

      <div className="mb-6 flex gap-3">
        <ConnectBankButton />
        <SyncButton />
        <CategorizeButton />
      </div>

      {error && (
        <p className="rounded border border-red-800 bg-red-950 p-3 text-red-400">
          Error loading transactions: {error.message}
        </p>
      )}

      {!error && transactions?.length === 0 && (
        <p className="text-gray-400">
          {uncategorizedOnly ? 'Nothing uncategorized \u2014 all caught up.' : 'No transactions yet.'}
        </p>
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
