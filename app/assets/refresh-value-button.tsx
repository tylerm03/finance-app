'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RefreshValueButton({
  assetId,
  vin,
  year,
  make,
  model,
  trim,
  mileage,
}: {
  assetId: string
  vin: string | null
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
      body: JSON.stringify({ assetId, vin, year, make, model, trim, mileage }),
    })
    setLoading(false)
    router.refresh()
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:border-orange-500 hover:text-orange-500 disabled:opacity-50"
    >
      {loading ? 'Refreshing...' : 'Refresh value'}
    </button>
  )
}
