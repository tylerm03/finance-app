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

  const { data: items, error: itemsError } = await supabase
    .from('plaid_items')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')

  if (itemsError) {
    console.error('Error fetching plaid_items:', itemsError)
    return NextResponse.json({ error: itemsError.message }, { status: 500 })
  }

  let updated = 0
  const errors: string[] = []

  for (const item of items || []) {
    try {
      const response = await plaidClient.accountsGet({
        access_token: item.access_token,
      })

      for (const acc of response.data.accounts) {
        const { error } = await supabase.from('accounts').upsert(
          {
            user_id: user.id,
            plaid_account_id: acc.account_id,
            plaid_item_id: item.plaid_item_id,
            name: acc.name,
            official_name: acc.official_name,
            type: acc.type,
            subtype: acc.subtype,
            current_balance: acc.balances.current,
            available_balance: acc.balances.available,
            balance_updated_at: new Date().toISOString(),
          },
          { onConflict: 'plaid_account_id' }
        )
        if (error) {
          errors.push(item.institution_name + ' / ' + acc.name + ': ' + error.message)
        } else {
          updated++
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error('Balances fetch error for item ' + item.id + ':', error)
      errors.push(item.institution_name + ': ' + message)
    }
  }

  return NextResponse.json({ updated, errors })
}
