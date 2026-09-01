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
    <div className="min-h-screen bg-white p-6 text-gray-900">
      <h1 className="mb-6 text-xl font-medium">Recurring</h1>
      <div className="mb-6">
        <RefreshRecurringButton />
      </div>

      {error && (
        <p className="rounded border border-red-300 bg-red-50 p-3 text-red-600">
          Error loading recurring: {error.message}
        </p>
      )}

      {!error && obligations?.length === 0 && (
        <p className="text-gray-500">
          Nothing detected yet — click Refresh recurring above.
        </p>
      )}

      {!error && obligations && obligations.length > 0 && (
        <div className="space-y-2">
          {obligations.map((o) => (
            <div
              key={o.id}
              className="flex items-center justify-between rounded border border-gray-200 bg-gray-50 p-3"
            >
              <div>
                <p className="text-gray-900">{o.name}</p>
                <p className="text-sm text-gray-500">
                  {o.cadence} · due {o.next_due_date || 'unknown'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="tabular-nums text-gray-900">
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
    estimated: 'text-gray-500 border-gray-300',
    marked_paid: 'text-orange-500 border-orange-300',
    cleared: 'text-green-600 border-green-300',
  }
  return (
    <span className={`rounded border px-2 py-0.5 text-xs ${styles[status] || styles.estimated}`}>
      {status.replace('_', ' ')}
    </span>
  )
}
