'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SyncInvestmentsButton() {
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleClick() {
    setLoading(true)
    setError(null)
    setSummary(null)

    const res = await fetch('/api/plaid/investments', { method: 'POST' })
    const data = await res.json()

    setLoading(false)

    if (data.error) {
      setError(data.error)
      return
    }

    setSummary(
      data.holdingsSynced + ' holdings synced across ' + data.accountsSynced + ' accounts'
    )
    router.refresh()
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="rounded border border-blue-600 px-4 py-2 font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50"
      >
        {loading ? 'Syncing...' : 'Sync investments'}
      </button>
      {summary && <p className="mt-2 text-sm text-gray-500">{summary}</p>}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}
