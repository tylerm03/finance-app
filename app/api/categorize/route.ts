import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { mapPlaidCategory } from '@/lib/categorization/plaid-mapping'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select('id, merchant_entity_id, plaid_category')
    .eq('user_id', user.id)
    .is('category', null)

  if (txError) {
    console.error('Error fetching uncategorized transactions:', txError)
    return NextResponse.json({ error: txError.message }, { status: 500 })
  }

  if (!transactions || transactions.length === 0) {
    return NextResponse.json({ tier1: 0, tier2: 0, stillUncategorized: 0 })
  }

  const { data: rules } = await supabase
    .from('category_rules')
    .select('merchant_entity_id, category')
    .eq('user_id', user.id)

  const ruleMap = new Map(
    (rules || [])
      .filter((r) => r.merchant_entity_id)
      .map((r) => [r.merchant_entity_id, r.category])
  )

  let tier1 = 0
  let tier2 = 0
  let stillUncategorized = 0

  for (const t of transactions) {
    let category: string | null = null
    let source: string | null = null

    if (t.merchant_entity_id && ruleMap.has(t.merchant_entity_id)) {
      category = ruleMap.get(t.merchant_entity_id)!
      source = 'rule'
      tier1++
    } else {
      const mapped = mapPlaidCategory(t.plaid_category as any)
      if (mapped !== 'Other') {
        category = mapped
        source = 'plaid'
        tier2++
      } else {
        stillUncategorized++
      }
    }

    if (category) {
      await supabase
        .from('transactions')
        .update({ category, category_source: source })
        .eq('id', t.id)
    }
  }

  return NextResponse.json({ tier1, tier2, stillUncategorized })
}
