export default function TransactionSummary({ transactions }: { transactions: any[] }) {
  const total = transactions.length

  const largest = transactions.reduce(
    (max, t) => (Math.abs(t.amount) > Math.abs(max?.amount ?? 0) ? t : max),
    null as any
  )

  const largestExpense = transactions
    .filter((t) => t.amount > 0)
    .reduce((max, t) => (t.amount > (max?.amount ?? 0) ? t : max), null as any)

  const avgAmount =
    total > 0 ? transactions.reduce((s, t) => s + Number(t.amount), 0) / total : 0

  const totalIncome = transactions
    .filter((t) => t.amount < 0)
    .reduce((s, t) => s + Math.abs(Number(t.amount)), 0)

  const totalSpending = transactions
    .filter((t) => t.amount > 0)
    .reduce((s, t) => s + Number(t.amount), 0)

  const dates = transactions.map((t) => t.txn_date).sort()
  const firstDate = dates[0]
  const lastDate = dates[dates.length - 1]

  function fmt(n: number) {
    return (n < 0 ? '-$' : '+$') + Math.abs(n).toFixed(2)
  }

  return (
    <div className="w-72 shrink-0 rounded-lg border border-gray-200 bg-white p-5">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Summary</h2>

      <div className="space-y-3 text-sm">
        <Row label="Total transactions" value={total.toLocaleString()} />
        <Row
          label="Largest transaction"
          value={largest ? '$' + Math.abs(largest.amount).toFixed(2) : '—'}
        />
        <Row
          label="Largest expense"
          value={largestExpense ? '$' + Number(largestExpense.amount).toFixed(2) : '—'}
        />
        <Row
          label="Average transaction"
          value={fmt(-avgAmount)}
          valueClass={avgAmount < 0 ? 'text-green-600' : 'text-gray-900'}
        />
        <Row label="Total income" value={'+$' + totalIncome.toFixed(2)} valueClass="text-green-600" />
        <Row label="Total spending" value={'$' + totalSpending.toFixed(2)} />
        <Row label="First transaction" value={firstDate || '—'} />
        <Row label="Last transaction" value={lastDate || '—'} />
      </div>
    </div>
  )
}

function Row({
  label,
  value,
  valueClass,
}: {
  label: string
  value: string
  valueClass?: string
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-500">{label}</span>
      <span className={'tabular-nums font-medium ' + (valueClass || 'text-gray-900')}>
        {value}
      </span>
    </div>
  )
}
