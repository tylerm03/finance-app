import { createClient } from '@/lib/supabase/server'
import { detectRecurring, withMarks, type RecurringMark } from '@/lib/recurring/detect'
import { loadTransactions } from '../transactions/load'
import RecurringView from './recurring-view'

export default async function RecurringPage() {
  // 15 months of history is plenty to spot 3-month runs and show past months
  const since = new Date()
  since.setMonth(since.getMonth() - 15)
  const supabase = await createClient()
  const [{ transactions, error }, marksRes] = await Promise.all([
    loadTransactions({ from: since.toISOString().slice(0, 10) }, 20000),
    supabase.from('recurring_marks').select('id, merchant_key, merchant, day, amount, category, start_date'),
  ])

  // Marks table may not exist yet (setup SQL not run); the page still works without it
  const marks = (marksRes.error ? [] : marksRes.data || []) as RecurringMark[]
  const streams = withMarks(detectRecurring(transactions), marks, transactions)

  return <RecurringView streams={streams} error={error} />
}
