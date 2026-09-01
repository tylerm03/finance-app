import { createClient } from '@/lib/supabase/server'
import ConnectBankButton from '../connect-bank-button'
import SyncInvestmentsButton from '../sync-investments-button'
import AddManualAccount from './add-manual-account'
import HoldingsPieChart from './holdings-pie-chart'
import HoldingsLegend from './holdings-legend'

export default async function SavingsPage() {
  const supabase = await createClient()

  const { data: accounts, error: accountsError } = await supabase
    .from('accounts')
    .select('*')
    .or('type.eq.investment,subtype.eq.savings,subtype.eq.checking')
    .order('name')

  const { data: holdings, error: holdingsError } = await supabase
    .from('holdings')
    .select('*, securities(name, ticker_symbol)')

  const error = accountsError || holdingsError

  if (error) {
    return (
      <div className="min-h-screen bg-white p-6 text-gray-900">
        <p className="rounded border border-red-300 bg-red-50 p-3 text-red-600">
          Error loading savings: {error.message}
        </p>
      </div>
    )
  }

  const holdingsByAccount = new Map<string, any[]>()
  for (const h of holdings || []) {
    if (!holdingsByAccount.has(h.account_id)) holdingsByAccount.set(h.account_id, [])
    holdingsByAccount.get(h.account_id)!.push(h)
  }

  const total = (accounts || []).reduce((sum, a) => {
    const accountHoldings = holdingsByAccount.get(a.id) || []
    if (accountHoldings.length > 0) {
      return sum + accountHoldings.reduce((s, h) => s + Number(h.institution_value || 0), 0)
    }
    return sum + Number(a.current_balance || 0)
  }, 0)

  function cashLabel(subtype: string | null) {
    if (subtype === 'checking') return 'Checking balance'
    if (subtype === 'savings') return 'Savings balance'
    return 'Cash balance, no holdings'
  }

  return (
    <div className="min-h-screen bg-white p-6 text-gray-900">
      <p className="mb-1 text-sm text-gray-500">Total savings & investments</p>
      <p className="mb-8 text-6xl font-semibold tabular-nums">${total.toFixed(2)}</p>

      <div className="mb-6 flex gap-3">
        <ConnectBankButton />
        <SyncInvestmentsButton />
        <AddManualAccount />
      </div>

      {(!accounts || accounts.length === 0) && (
        <p className="text-gray-500">
          No savings or investment accounts yet — connect a bank above, then click Sync investments.
        </p>
      )}

      {accounts && accounts.length > 0 && (
        <div className="space-y-6">
          {accounts.map((account) => {
            const accountHoldings = holdingsByAccount.get(account.id) || []
            const accountTotal =
              accountHoldings.length > 0
                ? accountHoldings.reduce((s, h) => s + Number(h.institution_value || 0), 0)
                : Number(account.current_balance || 0)

            const chartData = accountHoldings.map((h) => ({
              name: h.securities?.ticker_symbol || h.securities?.name || 'Unknown',
              value: Number(h.institution_value || 0),
              quantity: Number(h.quantity || 0),
            }))

            return (
              <div key={account.id} className="overflow-hidden rounded-lg border border-gray-200">
                <div className="flex items-center justify-between bg-gray-50 p-3">
                  <div>
                    <span className="font-medium text-gray-900">{account.name}</span>
                    <span className="ml-2 text-xs text-gray-500">{account.subtype}</span>
                  </div>
                  <span className="tabular-nums text-gray-900">${accountTotal.toFixed(2)}</span>
                </div>

                {accountHoldings.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
                    <HoldingsPieChart data={chartData} />
                    <HoldingsLegend data={chartData} total={accountTotal} />
                  </div>
                ) : (
                  <p className="p-3 text-sm text-gray-500">{cashLabel(account.subtype)}</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
