import { NextResponse } from 'next/server'
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid'
import { createClient } from '@/lib/supabase/server'

const config = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV as keyof typeof PlaidEnvironments],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID!,
      'PLAID-SECRET': process.env.PLAID_SECRET!,
    },
  },
})

const plaidClient = new PlaidApi(config)

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Get all active plaid_items for this user — a user may have connected
  // more than one bank
  const { data: items, error: itemsError } = await supabase
    .from('plaid_items')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')

  if (itemsError) {
    console.error('Error fetching plaid_items:', itemsError)
    return NextResponse.json({ error: itemsError.message }, { status: 500 })
  }

  if (!items || items.length === 0) {
    return NextResponse.json({ error: 'No connected accounts found' }, { status: 400 })
  }

  const results = []

  for (const item of items) {
    try {
      let cursor = item.cursor || undefined
      let added: any[] = []
      let modified: any[] = []
      let removed: any[] = []
      let hasMore = true

      // Plaid paginates — keep pulling pages until has_more is false
      while (hasMore) {
        const response = await plaidClient.transactionsSync({
          access_token: item.access_token,
          cursor: cursor,
        })

        added = added.concat(response.data.added)
        modified = modified.concat(response.data.modified)
        removed = removed.concat(response.data.removed)
        hasMore = response.data.has_more
        cursor = response.data.next_cursor
      }

      // Ensure we have an accounts row for each Plaid account referenced.
      // Upsert on plaid_account_id so re-syncs don't create duplicates.
      const accountIds = new Set([...added, ...modified].map((t) => t.account_id))
      for (const plaidAccountId of accountIds) {
        await supabase.from('accounts').upsert(
          {
            user_id: user.id,
            plaid_account_id: plaidAccountId,
            plaid_item_id: item.plaid_item_id,
            name: 'Account', // refined later by /api/plaid/balances
          },
          { onConflict: 'plaid_account_id' }
        )
      }

      // Map plaid_account_id -> our internal account.id
      const { data: accountRows } = await supabase
        .from('accounts')
        .select('id, plaid_account_id')
        .eq('user_id', user.id)

      const accountMap = new Map(
        (accountRows || []).map((a) => [a.plaid_account_id, a.id])
      )

      // Upsert added + modified transactions. Unattributed rows (no
      // matching account) are counted, not silently dropped.
      let unattributed = 0
      const rows = [...added, ...modified].map((t) => {
        const accountId = accountMap.get(t.account_id) || null
        if (!accountId) unattributed++

        return {
          user_id: user.id,
          account_id: accountId,
          txn_date: t.date,
          posted_date: t.authorized_date || t.date,
          amount: t.amount,
          description: t.original_description || t.name,
          merchant_name: t.merchant_name,
          merchant_entity_id: t.merchant_entity_id,
          plaid_transaction_id: t.transaction_id,
          plaid_category: t.personal_finance_category || null,
          pending: t.pending,
          payment_channel: t.payment_channel,
          location: t.location || null,
          counterparties: t.counterparties || null,
          logo_url: t.logo_url,
          website: t.website,
          source: 'plaid',
        }
      })

      if (rows.length > 0) {
        const { error: upsertError } = await supabase
          .from('transactions')
          .upsert(rows, { onConflict: 'plaid_transaction_id' })

        if (upsertError) {
          console.error('Error upserting transactions:', upsertError)
        }
      }

      // Handle removed transactions
      for (const r of removed) {
        await supabase
          .from('transactions')
          .delete()
          .eq('plaid_transaction_id', r.transaction_id)
      }

      // Save the cursor for next time — this is what makes the next
      // sync incremental instead of re-fetching everything
      await supabase
        .from('plaid_items')
        .update({ cursor })
        .eq('id', item.id)

      results.push({
        institution: item.institution_name,
        added: added.length,
        modified: modified.length,
        removed: removed.length,
        unattributed,
      })
    } catch (error) {
      console.error(`Sync error for item ${item.id}:`, error)
      results.push({
        institution: item.institution_name,
        error: error instanceof Error ? error.message : 'Unknown sync error',
      })
    }
  }

  return NextResponse.json({ results })
}
