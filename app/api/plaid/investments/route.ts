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

  if (!items || items.length === 0) {
    return NextResponse.json({ error: 'No connected accounts found' }, { status: 400 })
  }

  let accountsSynced = 0
  let holdingsSynced = 0
  let securitiesSynced = 0
  const errors: string[] = []
  const debugLog: string[] = []

  for (const item of items) {
    try {
      const response = await plaidClient.investmentsHoldingsGet({
        access_token: item.access_token,
      })

      const { accounts, holdings, securities } = response.data
      debugLog.push(
        item.institution_name + ': raw response had ' + accounts.length + ' accounts, ' +
        securities.length + ' securities, ' + holdings.length + ' holdings'
      )

      for (const acc of accounts) {
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
          errors.push('account upsert failed: ' + error.message)
        } else {
          accountsSynced++
        }
      }

      for (const sec of securities) {
        const { error } = await supabase.from('securities').upsert(
          {
            id: sec.security_id,
            name: sec.name,
            ticker_symbol: sec.ticker_symbol,
            type: sec.type,
            close_price: sec.close_price,
            close_price_as_of: sec.close_price_as_of,
            iso_currency_code: sec.iso_currency_code,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        )
        if (error) {
          errors.push('security upsert failed: ' + error.message)
        } else {
          securitiesSynced++
        }
      }

      const { data: accountRows } = await supabase
        .from('accounts')
        .select('id, plaid_account_id')
        .eq('user_id', user.id)

      const accountMap = new Map(
        (accountRows || []).map((a) => [a.plaid_account_id, a.id])
      )

      for (const h of holdings) {
        const accountId = accountMap.get(h.account_id)
        if (!accountId) {
          errors.push('holding skipped: no matching account for ' + h.account_id)
          continue
        }

        const { error } = await supabase.from('holdings').upsert(
          {
            user_id: user.id,
            account_id: accountId,
            security_id: h.security_id,
            quantity: h.quantity,
            institution_price: h.institution_price,
            institution_value: h.institution_value,
            cost_basis: h.cost_basis,
            iso_currency_code: h.iso_currency_code,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'account_id,security_id' }
        )
        if (error) {
          errors.push('holding upsert failed: ' + error.message)
        } else {
          holdingsSynced++
        }
      }
    } catch (error: any) {
      const plaidErrorCode = error?.response?.data?.error_code
      if (plaidErrorCode !== 'PRODUCTS_NOT_SUPPORTED') {
        const message = error?.response?.data?.error_message || (error instanceof Error ? error.message : 'Unknown error')
        console.error('Investments sync error for item ' + item.id + ':', error)
        errors.push(item.institution_name + ': ' + message)
      }
    }
  }

  console.log('Investments sync debug:', debugLog, errors)

  return NextResponse.json({ accountsSynced, holdingsSynced, securitiesSynced, errors, debugLog })
}
