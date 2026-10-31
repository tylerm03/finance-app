import { loadTransactions } from '../transactions/load'
import type { TxnParams } from '../transactions/types'
import ReportsView from './reports-view'

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<TxnParams>
}) {
  const params = await searchParams
  // Reports always cover everything in the date range (search/sort don't apply)
  const { transactions, accounts, error } = await loadTransactions(
    { from: params.from, to: params.to, account: params.account, category: params.category },
    20000
  )

  return <ReportsView transactions={transactions} accounts={accounts} params={params} error={error} />
}
