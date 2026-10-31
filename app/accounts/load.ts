import { createClient } from '@/lib/supabase/server'
import { buildAccountsData, HISTORY_DAYS, type AccountsData, type RawTxn } from '@/lib/accounts/build'

const PAGE_SIZE = 1000

// Accounts, balances and a year of balance history. Shared by the Accounts
// page and the Dashboard. Pass transactions in if you've already loaded them.
export async function loadAccounts(transactions?: RawTxn[]): Promise<{ data: AccountsData; error: string | null }> {
  const supabase = await createClient()

  const since = new Date()
  since.setUTCDate(since.getUTCDate() - HISTORY_DAYS)
  const sinceDay = since.toISOString().slice(0, 10)

  const [accountsRes, holdingsRes, itemsRes, assetsRes] = await Promise.all([
    supabase.from('accounts').select('id, name, type, subtype, current_balance, balance_updated_at, plaid_item_id'),
    supabase.from('holdings').select('account_id, institution_value'),
    supabase.from('plaid_items').select('plaid_item_id, institution_name'),
    supabase.from('assets').select('id, name, type, trim, current_value, value_updated_at'),
  ])

  let txns = transactions
  if (!txns) {
    // Supabase caps each response at 1000 rows, so page through a year of transactions
    txns = []
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await supabase
        .from('transactions')
        .select('account_id, txn_date, amount, pending')
        .gte('txn_date', sinceDay)
        .order('txn_date', { ascending: false })
        .range(from, from + PAGE_SIZE - 1)
      if (error || !data) break
      txns.push(...data)
      if (data.length < PAGE_SIZE) break
    }
  }

  const holdingsByAccount = new Map<string, number>()
  for (const h of holdingsRes.data || []) {
    holdingsByAccount.set(h.account_id, (holdingsByAccount.get(h.account_id) || 0) + Number(h.institution_value || 0))
  }
  const institutionByItem = new Map<string, string>()
  for (const item of itemsRes.data || []) institutionByItem.set(item.plaid_item_id, item.institution_name)

  const data = buildAccountsData({
    accounts: accountsRes.data || [],
    transactions: txns.filter((t) => t.txn_date >= sinceDay),
    holdingsByAccount,
    institutionByItem,
    assets: assetsRes.data || [],
  })

  const err = accountsRes.error || holdingsRes.error || assetsRes.error
  return { data, error: err ? err.message : null }
}
