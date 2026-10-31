import { createClient } from '@/lib/supabase/server'
import type { AccountOption, Txn, TxnParams } from './types'

const PAGE_SIZE = 1000

type Row = {
  id: string
  txn_date: string
  merchant_name: string | null
  description: string | null
  logo_url: string | null
  category: string | null
  amount: number | string
  pending: boolean | null
  account_id: string | null
  merchant_entity_id: string | null
  plaid_category: { detailed?: string } | null
  payment_channel: string | null
  location: { city?: string; region?: string } | null
  website: string | null
}

// Loads accounts plus every transaction matching the filters in params.
// Shared by the Transactions and Reports pages.
export async function loadTransactions(params: TxnParams, maxRows = 5000) {
  const { q, category, account, from, to, view, sort } = params
  const supabase = await createClient()

  const [accountsRes, itemsRes] = await Promise.all([
    supabase.from('accounts').select('id, name, plaid_item_id').order('name'),
    supabase.from('plaid_items').select('plaid_item_id, institution_name'),
  ])

  const institutionByItem = new Map<string, string>()
  for (const i of itemsRes.data || []) institutionByItem.set(i.plaid_item_id, i.institution_name)

  const accounts: AccountOption[] = (accountsRes.data || []).map((a) => ({
    id: a.id,
    name: a.name || 'Account',
    institution: a.plaid_item_id ? institutionByItem.get(a.plaid_item_id) || null : null,
  }))
  const accountById = new Map(accounts.map((a) => [a.id, a]))

  function buildQuery() {
    let query = supabase
      .from('transactions')
      .select(
        'id, txn_date, merchant_name, description, logo_url, category, amount, pending, account_id, merchant_entity_id, plaid_category, payment_channel, location, website'
      )

    if (category === '__uncategorized__' || view === 'uncategorized') query = query.is('category', null)
    else if (category) query = query.eq('category', category)

    if (view === 'income') query = query.lt('amount', 0)
    if (view === 'expenses') query = query.gt('amount', 0)
    if (view === 'hidden') query = query.eq('category', 'EXCLUDED')

    if (account) query = query.eq('account_id', account)
    if (from) query = query.gte('txn_date', from)
    if (to) query = query.lte('txn_date', to)

    if (q) {
      const escaped = q.replace(/[,()]/g, ' ').replace(/[%_]/g, '\\$&')
      query = query.or('merchant_name.ilike.%' + escaped + '%,description.ilike.%' + escaped + '%')
    }

    if (sort === 'date_asc') query = query.order('txn_date', { ascending: true })
    else if (sort === 'amount_desc') query = query.order('amount', { ascending: false })
    else if (sort === 'amount_asc') query = query.order('amount', { ascending: true })
    else query = query.order('txn_date', { ascending: false })

    return query.order('id', { ascending: true })
  }

  // Supabase returns at most 1000 rows per request, so page through
  const rows: Row[] = []
  let error: string | null = null
  for (let start = 0; start < maxRows; start += PAGE_SIZE) {
    const res = await buildQuery().range(start, start + PAGE_SIZE - 1)
    if (res.error) {
      error = res.error.message
      break
    }
    rows.push(...((res.data || []) as Row[]))
    if ((res.data || []).length < PAGE_SIZE) break
  }

  const transactions: Txn[] = rows.map((t) => {
    const acct = t.account_id ? accountById.get(t.account_id) : undefined
    const loc = t.location
    return {
      id: t.id,
      date: t.txn_date,
      merchant: t.merchant_name || t.description || 'Unknown',
      description: t.description,
      logo: t.logo_url,
      category: t.category,
      amount: Number(t.amount),
      pending: !!t.pending,
      accountId: t.account_id,
      accountName: acct?.name || null,
      institution: acct?.institution || null,
      merchantEntityId: t.merchant_entity_id,
      plaidDetail: t.plaid_category?.detailed || null,
      channel: t.payment_channel,
      location: loc?.city ? loc.city + (loc.region ? ', ' + loc.region : '') : null,
      website: t.website,
    }
  })

  return { transactions, accounts, error }
}
