import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { mapPlaidCategory } from '@/lib/categorization/plaid-mapping'
import { CATEGORIES } from '@/lib/categorization/categories'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select('id, merchant_entity_id, merchant_name, description, plaid_category')
    .eq('user_id', user.id)
    .is('category', null)

  if (txError) {
    console.error('Error fetching uncategorized transactions:', txError)
    return NextResponse.json({ error: txError.message }, { status: 500 })
  }

  if (!transactions || transactions.length === 0) {
    return NextResponse.json({ tier1: 0, tier2: 0, tier3: 0, stillUncategorized: 0 })
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
  const tier3Candidates: { id: string; merchant_name: string | null; description: string | null }[] = []

  for (const t of transactions) {
    if (t.merchant_entity_id && ruleMap.has(t.merchant_entity_id)) {
      await supabase
        .from('transactions')
        .update({ category: ruleMap.get(t.merchant_entity_id), category_source: 'rule' })
        .eq('id', t.id)
      tier1++
      continue
    }

    const mapped = mapPlaidCategory(t.plaid_category as any)
    if (mapped !== 'Other') {
      await supabase
        .from('transactions')
        .update({ category: mapped, category_source: 'plaid' })
        .eq('id', t.id)
      tier2++
      continue
    }

    // Tier 3 (AI) — applies to any remaining uncategorized transaction,
    // regardless of account type.
    tier3Candidates.push({
      id: t.id,
      merchant_name: t.merchant_name,
      description: t.description,
    })
  }

  let tier3 = 0
  let stillUncategorized = 0

  if (tier3Candidates.length > 0 && process.env.GEMINI_API_KEY) {
    try {
      const list = tier3Candidates
        .map((t) => t.id + ': ' + (t.merchant_name || t.description || 'unknown'))
        .join('\n')

      const prompt =
        'Categorize each transaction below into exactly one of these categories: ' +
        CATEGORIES.join(', ') + '. ' +
        'Transactions (format is id: merchant/description):\n' + list + '\n' +
        'Respond ONLY with a JSON array, no other text, no markdown fences. ' +
        'Format: [{"id": "...", "category": "..."}]. ' +
        'If a transaction is genuinely ambiguous, use "Other".'

      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=' +
          process.env.GEMINI_API_KEY,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        }
      )

      if (!response.ok) {
        const errText = await response.text()
        console.error('Gemini categorize error:', response.status, errText)
        stillUncategorized += tier3Candidates.length
      } else {
        const data = await response.json()
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]'
        const cleaned = text.replace(/```json|```/g, '').trim()

        let results: { id: string; category: string }[] = []
        try {
          results = JSON.parse(cleaned)
        } catch {
          console.error('Failed to parse Gemini categorize response:', cleaned)
          stillUncategorized += tier3Candidates.length
        }

        for (const r of results) {
          const category = CATEGORIES.includes(r.category) ? r.category : 'Other'
          await supabase
            .from('transactions')
            .update({ category, category_source: 'ai' })
            .eq('id', r.id)

          if (category === 'Other') {
            stillUncategorized++
          } else {
            tier3++
          }
        }
      }
    } catch (error) {
      console.error('AI categorization failed:', error)
      stillUncategorized += tier3Candidates.length
    }
  } else if (tier3Candidates.length > 0) {
    stillUncategorized += tier3Candidates.length
  }

  return NextResponse.json({ tier1, tier2, tier3, stillUncategorized })
}
