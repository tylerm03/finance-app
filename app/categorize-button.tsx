'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CategorizeButton() {
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleClick() {
    setLoading(true)
    setError(null)
    setSummary(null)

    const res = await fetch('/api/categorize', { method: 'POST' })
    const data = await res.json()

    setLoading(false)

    if (data.error) {
      setError(data.error)
      return
    }

    setSummary(
      'Categorized: ' + data.tier1 + ' by rule, ' + data.tier2 + ' by Plaid mapping, ' +
      data.tier3 + ' by AI, ' + data.stillUncategorized + ' still uncategorized'
    )
    router.refresh()
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="rounded border border-blue-500 px-4 py-2 font-medium text-blue-400 hover:bg-blue-500/10 disabled:opacity-50"
      >
        {loading ? 'Categorizing...' : 'Categorize transactions'}
      </button>
      {summary && <p className="mt-2 text-sm text-gray-400">{summary}</p>}
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  )
}
