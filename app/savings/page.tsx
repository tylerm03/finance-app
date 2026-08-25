import { createClient } from '@/lib/supabase/server'
import ConnectBankButton from '../connect-bank-button'
import SyncInvestmentsButton from '../sync-investments-button'

export default async function SavingsPage() {
  const supabase = await createClient()

  // Only investment-type accounts and savings accounts belong here —
  // checking/credit accounts stay on the Transactions page.
  const { data: accounts, error: accountsError } = await supabase
    .from('accounts')
    .select('*')
    .or('type.eq.investment,subtype.eq.savings')
    .order('name')

  const { data: holdings, error: holdingsError } = await supabase
    .from('holdings')
    .select('*, securities(name, ticker_symbol)')

  const error = accountsError || holdingsError

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 p-6 text-gray-100">
        <p className="rounded border border-red-800 bg-red-950 p-3 text-red-400">
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

  return (
    <div className="min-h-screen bg-gray-950 p-6 text-gray-100">
      <p className="mb-1 text-sm text-gray-400">Total savings & investments</p>
      <p className="mb-8 text-6xl font-semibold tabular-nums">${total.toFixed(2)}</p>

      <div className="mb-6 flex gap-3">
        <ConnectBankButton />
        <SyncInvestmentsButton />
      </div>

      {(!accounts || accounts.length === 0) && (
        <p className="text-gray-400">
          No savings or investment accounts yet — connect Schwab above, then click Sync investments.
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

            return (
              <div key={account.id} className="overflow-hidden rounded-lg border border-gray-800">
                <div className="flex items-center justify-between bg-gray-900 p-3">
                  <div>
                    <span className="font-medium text-gray-100">{account.name}</span>
                    <span className="ml-2 text-xs text-gray-400">{account.subtype}</span>
                  </div>
                  <span className="tabular-nums text-gray-100">${accountTotal.toFixed(2)}</span>
                </div>

                {accountHoldings.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-900/50 text-gray-400">
                      <tr>
                        <th className="p-3 text-left">Security</th>
                        <th className="p-3 text-right">Quantity</th>
                        <th className="p-3 text-right">Price</th>
                        <th className="p-3 text-right">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accountHoldings.map((h) => (
                        <tr key={h.id} className="border-t border-gray-800">
                          <td className="p-3">
                            {h.securities?.name || 'Unknown security'}
                            {h.securities?.ticker_symbol && (
                              <span className="ml-2 text-gray-400">{h.securities.ticker_symbol}</span>
                            )}
                          </td>
                          <td className="p-3 text-right tabular-nums text-gray-100">
                            {Number(h.quantity).toFixed(3)}
                          </td>
                          <td className="p-3 text-right tabular-nums text-gray-100">
                            ${Number(h.institution_price || 0).toFixed(2)}
                          </td>
                          <td className="p-3 text-right tabular-nums text-gray-100">
                            ${Number(h.institution_value || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="p-3 text-sm text-gray-400">Cash balance, no holdings.</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
