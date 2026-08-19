'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RefreshRecurringButton() {
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleClick() {
    setLoading(true)
    setError(null)
    setSummary(null)

    const res = await fetch('/api/plaid/recurring', { method: 'GET' })
    const data = await res.json()

    setLoading(false)

    if (data.error) {
      setError(data.error)
      return
    }

    setSummary(`Found ${data.total} recurring streams (${data.created} new, ${data.updated} updated)`)
    router.refresh()
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="rounded border border-blue-500 px-4 py-2 font-medium text-blue-400 hover:bg-blue-500/10 disabled:opacity-50"
      >
        {loading ? 'Refreshing...' : 'Refresh recurring'}
      </button>
      {summary && <p className="mt-2 text-sm text-gray-400">{summary}</p>}
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  )
}
