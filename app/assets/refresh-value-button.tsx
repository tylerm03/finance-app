'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RefreshValueButton({
  assetId,
  year,
  make,
  model,
  trim,
  mileage,
}: {
  assetId: string
  year: number | null
  make: string | null
  model: string | null
  trim: string | null
  mileage: number | null
}) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleClick() {
    setLoading(true)
    await fetch('/api/assets/lookup-value', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assetId, year, make, model, trim, mileage }),
    })
    setLoading(false)
    router.refresh()
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="rounded border border-gray-700 px-3 py-1 text-xs text-gray-300 hover:border-blue-500 hover:text-blue-400 disabled:opacity-50"
    >
      {loading ? 'Refreshing...' : 'Refresh value'}
    </button>
  )
}
