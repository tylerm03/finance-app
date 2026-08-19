import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Only look at obligations that are either still estimated (due date
  // may have passed with no explicit "marked paid" from the user) or
  // explicitly marked paid — either way, we're looking for a real
  // transaction that confirms it actually happened.
  const { data: obligations, error: obError } = await supabase
    .from('recurring_obligations')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .in('status', ['estimated', 'marked_paid'])

  if (obError) {
    console.error('Error fetching obligations:', obError)
    return NextResponse.json({ error: obError.message }, { status: 500 })
  }

  let matched = 0
  let stillUnmatched = 0

  for (const ob of obligations || []) {
    if (!ob.next_due_date) {
      stillUnmatched++
      continue
    }

    const dueDate = new Date(ob.next_due_date)
    const windowStart = new Date(dueDate)
    windowStart.setDate(windowStart.getDate() - 5)
    const windowEnd = new Date(dueDate)
    windowEnd.setDate(windowEnd.getDate() + 5)

    // Amount tolerance: within 5% of expected, or $2, whichever is larger —
    // credit card interest/fees can nudge a bill slightly off its usual amount
    const tolerance = Math.max(ob.expected_amount * 0.05, 2)
    const amountMin = ob.expected_amount - tolerance
    const amountMax = ob.expected_amount + tolerance

    const { data: candidates } = await supabase
      .from('transactions')
      .select('id, amount, txn_date')
      .eq('user_id', user.id)
      .gte('txn_date', windowStart.toISOString().split('T')[0])
      .lte('txn_date', windowEnd.toISOString().split('T')[0])
      .gte('amount', amountMin)
      .lte('amount', amountMax)
      .is('source', 'plaid')
      .limit(1)

    if (candidates && candidates.length > 0) {
      const match = candidates[0]
      await supabase
        .from('recurring_obligations')
        .update({
          status: 'cleared',
          cleared_date: match.txn_date,
          actual_amount: match.amount,
          matched_transaction_id: match.id,
        })
        .eq('id', ob.id)
      matched++
    } else {
      stillUnmatched++
    }
  }

  return NextResponse.json({ matched, stillUnmatched })
}
