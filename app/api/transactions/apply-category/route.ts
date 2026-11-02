import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CATEGORIES } from '@/lib/categorization/categories'
import { matchKey } from '@/lib/categorization/match-key'

const PAGE_SIZE = 1000

// Gives every transaction from the same payer/merchant as this one the same
// category, e.g. mark one paycheck and all your paychecks follow.
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { id, category } = await request.json()
  if (!id || !CATEGORIES.includes(category)) return NextResponse.json({ error: 'Bad request' }, { status: 400 })

  const { data: source, error } = await supabase
    .from('transactions')
    .select('merchant_name, description')
    .eq('id', id)
    .maybeSingle()
  if (error || !source) return NextResponse.json({ error: error?.message || 'Transaction not found' }, { status: 404 })

  const key = matchKey(source.merchant_name, source.description)
  if (!key) return NextResponse.json({ updated: 0 })

  // Find every transaction with the same key (Supabase returns 1000 rows at a time)
  const ids: string[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error: e } = await supabase
      .from('transactions')
      .select('id, merchant_name, description, category')
      .order('id')
      .range(from, from + PAGE_SIZE - 1)
    if (e || !data) break
    for (const t of data) {
      if (t.id !== id && t.category !== category && matchKey(t.merchant_name, t.description) === key) ids.push(t.id)
    }
    if (data.length < PAGE_SIZE) break
  }

  for (let i = 0; i < ids.length; i += 200) {
    await supabase
      .from('transactions')
      .update({ category, category_source: 'manual' })
      .in('id', ids.slice(i, i + 200))
  }

  return NextResponse.json({ updated: ids.length })
}
