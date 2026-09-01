'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RefreshBalancesButton() {
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)
  const router = useRouter()

  async function handleClick() {
    setLoading(true)
    setSummary(null)

    const res = await fetch('/api/plaid/balances', { method: 'POST' })
    const data = await res.json()

    setLoading(false)
    setSummary(data.updated + ' accounts updated' + (data.errors?.length ? ', ' + data.errors.length + ' errors' : ''))
    router.refresh()
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="rounded border border-blue-600 px-4 py-2 font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50"
      >
        {loading ? 'Refreshing...' : 'Refresh account details'}
      </button>
      {summary && <p className="mt-2 text-sm text-gray-500">{summary}</p>}
    </div>
  )
}
