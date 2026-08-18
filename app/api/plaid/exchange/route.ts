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

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { public_token } = await request.json()

  try {
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({ public_token })
    const accessToken = exchangeResponse.data.access_token
    const itemId = exchangeResponse.data.item_id

    const itemResponse = await plaidClient.itemGet({ access_token: accessToken })
    const institutionId = itemResponse.data.item.institution_id

    let institutionName = 'Connected Bank'
    if (institutionId) {
      const instResponse = await plaidClient.institutionsGetById({
        institution_id: institutionId,
        country_codes: ['US' as any],
      })
      institutionName = instResponse.data.institution.name
    }

    const { error: dbError } = await supabase.from('plaid_items').insert({
      user_id: user.id,
      plaid_item_id: itemId,
      access_token: accessToken,
      institution_name: institutionName,
      status: 'active',
    })

    if (dbError) {
      console.error('Error storing plaid item:', dbError)
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, institution_name: institutionName })
  } catch (error) {
    console.error('Plaid exchange error:', error)
    return NextResponse.json({ error: 'Failed to exchange token' }, { status: 500 })
  }
}
