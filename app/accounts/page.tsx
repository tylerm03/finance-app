import { createClient } from '@/lib/supabase/server'
import { buildAccountsData, HISTORY_DAYS, type RawTxn } from '@/lib/accounts/build'
import AccountsView from './accounts-view'

const PAGE_SIZE = 1000

export default async function AccountsPage() {
  const supabase = await createClient()

  const since = new Date()
  since.setUTCDate(since.getUTCDate() - HISTORY_DAYS)
  const sinceDay = since.toISOString().slice(0, 10)

  const [accountsRes, holdingsRes, itemsRes, assetsRes] = await Promise.all([
    supabase
      .from('accounts')
      .select('id, name, type, subtype, current_balance, balance_updated_at, plaid_item_id'),
    supabase.from('holdings').select('account_id, institution_value'),
    supabase.from('plaid_items').select('plaid_item_id, institution_name'),
    supabase.from('assets').select('id, name, type, trim, current_value, value_updated_at'),
  ])

  // Supabase caps each response at 1000 rows, so page through a year of transactions
  const transactions: RawTxn[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('transactions')
      .select('account_id, txn_date, amount, pending')
      .gte('txn_date', sinceDay)
      .order('txn_date', { ascending: false })
      .range(from, from + PAGE_SIZE - 1)
    if (error || !data) break
    transactions.push(...data)
    if (data.length < PAGE_SIZE) break
  }

  const error = accountsRes.error || holdingsRes.error || assetsRes.error
  if (error) {
    return (
      <div className="min-h-full bg-[#f6f5f3] p-6 text-gray-900">
        <p className="rounded border border-red-300 bg-red-50 p-3 text-red-600">
          Error loading accounts: {error.message}
        </p>
      </div>
    )
  }

  const holdingsByAccount = new Map<string, number>()
  for (const h of holdingsRes.data || []) {
    holdingsByAccount.set(
      h.account_id,
      (holdingsByAccount.get(h.account_id) || 0) + Number(h.institution_value || 0)
    )
  }

  const institutionByItem = new Map<string, string>()
  for (const item of itemsRes.data || []) {
    institutionByItem.set(item.plaid_item_id, item.institution_name)
  }

  const data = buildAccountsData({
    accounts: accountsRes.data || [],
    transactions,
    holdingsByAccount,
    institutionByItem,
    assets: assetsRes.data || [],
  })

  return <AccountsView data={data} />
}
