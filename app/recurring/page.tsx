import { createClient } from '@/lib/supabase/server'
import RefreshRecurringButton from '../refresh-recurring-button'
import MarkPaidButton from './mark-paid-button'

export default async function RecurringPage() {
  const supabase = await createClient()

  const { data: obligations, error } = await supabase
    .from('recurring_obligations')
    .select('*')
    .eq('is_active', true)
    .order('next_due_date', { ascending: true })

  return (
    <div className="min-h-screen bg-gray-950 p-6 text-gray-100">
      <h1 className="mb-6 text-xl font-medium">Recurring</h1>
      <div className="mb-6">
        <RefreshRecurringButton />
      </div>

      {error && (
        <p className="rounded border border-red-800 bg-red-950 p-3 text-red-400">
          Error loading recurring: {error.message}
        </p>
      )}

      {!error && obligations?.length === 0 && (
        <p className="text-gray-400">
          Nothing detected yet — click Refresh recurring above.
        </p>
      )}

      {!error && obligations && obligations.length > 0 && (
        <div className="space-y-2">
          {obligations.map((o) => (
            <div
              key={o.id}
              className="flex items-center justify-between rounded border border-gray-800 bg-gray-900 p-3"
            >
              <div>
                <p className="text-gray-100">{o.name}</p>
                <p className="text-sm text-gray-400">
                  {o.cadence} · due {o.next_due_date || 'unknown'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="tabular-nums text-gray-100">
                  ${Number(o.expected_amount).toFixed(2)}
                </span>
                <StatusBadge status={o.status} />
                {o.status === 'estimated' && <MarkPaidButton id={o.id} />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    estimated: 'text-gray-400 border-gray-700',
    marked_paid: 'text-blue-400 border-blue-800',
    cleared: 'text-green-400 border-green-800',
  }
  return (
    <span className={`rounded border px-2 py-0.5 text-xs ${styles[status] || styles.estimated}`}>
      {status.replace('_', ' ')}
    </span>
  )
}
