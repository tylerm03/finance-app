import { createClient } from '@/lib/supabase/server'
import ConnectBankButton from '../connect-bank-button'
import SyncInvestmentsButton from '../sync-investments-button'

export default async function SavingsPage() {
  const supabase = await createClient()

  const { data: holdings, error } = await supabase
    .from('holdings')
    .select('*, accounts(name, type, subtype), securities(name, ticker_symbol, type)')
    .order('institution_value', { ascending: false })

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 p-6 text-gray-100">
        <p className="rounded border border-red-800 bg-red-950 p-3 text-red-400">
          Error loading holdings: {error.message}
        </p>
      </div>
    )
  }

  const grouped = new Map<string, any[]>()
  for (const h of holdings || []) {
    const accountName = h.accounts?.name || 'Unknown account'
    if (!grouped.has(accountName)) grouped.set(accountName, [])
    grouped.get(accountName)!.push(h)
  }

  const total = (holdings || []).reduce((sum, h) => sum + Number(h.institution_value || 0), 0)

  return (
    <div className="min-h-screen bg-gray-950 p-6 text-gray-100">
      <p className="mb-1 text-sm text-gray-400">Total savings & investments</p>
      <p className="mb-8 text-6xl font-semibold tabular-nums">${total.toFixed(2)}</p>

      <div className="mb-6 flex gap-3">
        <ConnectBankButton />
        <SyncInvestmentsButton />
      </div>

      {(!holdings || holdings.length === 0) && (
        <p className="text-gray-400">
          No holdings yet — connect Schwab above, then click Sync investments.
        </p>
      )}

      {holdings && holdings.length > 0 && (
        <div className="space-y-6">
          {[...grouped.entries()].map(([accountName, items]) => {
            const accountTotal = items.reduce((s, h) => s + Number(h.institution_value || 0), 0)
            return (
              <div key={accountName} className="overflow-hidden rounded-lg border border-gray-800">
                <div className="flex items-center justify-between bg-gray-900 p-3">
                  <span className="font-medium text-gray-100">{accountName}</span>
                  <span className="tabular-nums text-gray-100">${accountTotal.toFixed(2)}</span>
                </div>
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
                    {items.map((h) => (
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
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
