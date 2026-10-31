import TransactionsView from './transactions-view'
import { loadTransactions } from './load'
import type { TxnParams } from './types'

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<TxnParams>
}) {
  const params = await searchParams
  const { transactions, accounts, error } = await loadTransactions(params)

  return (
    <TransactionsView
      transactions={transactions}
      accounts={accounts}
      params={params}
      error={error}
    />
  )
}
