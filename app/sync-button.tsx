'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SyncButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<string | null>(null)
  const router = useRouter()

  async function handleSync() {
    setLoading(true)
    setError(null)
    setSummary(null)

    const res = await fetch('/api/plaid/sync', { method: 'POST' })
    const data = await res.json()

    setLoading(false)

    if (data.error) {
      setError(data.error)
      return
    }

    const totals = data.results.reduce(
      (acc: any, r: any) => ({
        added: acc.added + (r.added || 0),
        modified: acc.modified + (r.modified || 0),
      }),
      { added: 0, modified: 0 }
    )

    setSummary(`Synced: ${totals.added} new, ${totals.modified} updated`)
    router.refresh()
  }

  return (
    <div>
      <button
        onClick={handleSync}
        disabled={loading}
        className="rounded border border-orange-500 px-4 py-2 font-medium text-orange-500 hover:bg-orange-50 disabled:opacity-50"
      >
        {loading ? 'Syncing...' : 'Sync transactions'}
      </button>
      {summary && <p className="mt-2 text-sm text-gray-500">{summary}</p>}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}
