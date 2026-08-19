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

export async function GET() {
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

  const allStreams: any[] = []

  for (const item of items) {
    try {
      const response = await plaidClient.transactionsRecurringGet({
        access_token: item.access_token,
      })

      // Outflow streams = bills/subscriptions. Inflow streams = recurring
      // income (paychecks etc) — brief scopes v1 to obligations, so we
      // only pull outflows here.
      allStreams.push(...response.data.outflow_streams)
    } catch (error) {
      console.error(`Recurring fetch error for item ${item.id}:`, error)
      return NextResponse.json(
        { error: `Failed to fetch recurring transactions: ${error instanceof Error ? error.message : 'unknown error'}` },
        { status: 500 }
      )
    }
  }

  // Upsert each detected stream into recurring_obligations.
  // Match on name + user, since Plaid's stream_id can shift between calls.
  let created = 0
  let updated = 0

  for (const stream of allStreams) {
    const cadence = mapPlaidFrequency(stream.frequency)
    const expectedAmount = Math.abs(stream.average_amount?.amount || 0)
    const nextDueDate = stream.predicted_next_date || null

    const { data: existing } = await supabase
      .from('recurring_obligations')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', stream.merchant_name || stream.description)
      .maybeSingle()

    if (existing) {
      await supabase
        .from('recurring_obligations')
        .update({
          expected_amount: expectedAmount,
          cadence,
          next_due_date: nextDueDate,
          is_active: stream.is_active,
        })
        .eq('id', existing.id)
      updated++
    } else {
      await supabase.from('recurring_obligations').insert({
        user_id: user.id,
        name: stream.merchant_name || stream.description || 'Unknown',
        expected_amount: expectedAmount,
        cadence,
        next_due_date: nextDueDate,
        status: 'estimated',
        is_active: stream.is_active,
      })
      created++
    }
  }

  return NextResponse.json({ created, updated, total: allStreams.length })
}

function mapPlaidFrequency(freq: string): string {
  switch (freq) {
    case 'WEEKLY':
    case 'BIWEEKLY':
      return 'weekly'
    case 'ANNUALLY':
      return 'annual'
    case 'MONTHLY':
    case 'SEMI_MONTHLY':
    default:
      return 'monthly'
  }
}
