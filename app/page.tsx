import { createClient } from '@/lib/supabase/server'
import ConnectBankButton from './connect-bank-button'
import SyncButton from './sync-button'

export default async function Home() {
  const supabase = await createClient()

  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*')
    .order('txn_date', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-950 p-6 text-gray-100">
      <h1 className="mb-6 text-xl font-medium">Recent Transactions</h1>
      <div className="mb-6 flex gap-3">
        <ConnectBankButton />
        <SyncButton />
      </div>

      {error && (
        <p className="rounded border border-red-800 bg-red-950 p-3 text-red-400">
          Error loading transactions: {error.message}
        </p>
      )}

      {!error && transactions?.length === 0 && (
        <p className="text-gray-400">No transactions yet.</p>
      )}

      {!error && transactions && transactions.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-900 text-gray-400">
              <tr>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Merchant</th>
                <th className="p-3 text-left">Category</th>
                <th className="p-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id} className="border-t border-gray-800">
                  <td className="p-3 text-gray-400">{t.txn_date}</td>
                  <td className="p-3">{t.merchant_name}</td>
                  <td className="p-3 text-gray-400">{t.category}</td>
                  <td
                    className={`p-3 text-right tabular-nums ${
                      t.amount < 0 ? 'text-green-400' : 'text-gray-100'
                    }`}
                  >
                    {t.amount < 0 ? '+' : '-'}$
                    {Math.abs(t.amount).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
