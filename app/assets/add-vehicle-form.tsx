'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AddVehicleForm() {
  const [open, setOpen] = useState(false)
  const [vin, setVin] = useState('')
  const [year, setYear] = useState('')
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')
  const [trim, setTrim] = useState('')
  const [mileage, setMileage] = useState('')
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSaving(false)
      return
    }

    const name = [year, make, model].filter(Boolean).join(' ')

    const { data: asset, error } = await supabase
      .from('assets')
      .insert({
        user_id: user.id,
        name,
        type: 'vehicle',
        vin: vin || null,
        year: year ? parseInt(year) : null,
        make,
        model,
        trim,
        mileage: mileage ? parseInt(mileage) : null,
      })
      .select()
      .single()

    if (!error && asset) {
      await fetch('/api/assets/lookup-value', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId: asset.id, vin, year, make, model, trim, mileage }),
      })
    }

    setSaving(false)
    setOpen(false)
    setVin('')
    setYear('')
    setMake('')
    setModel('')
    setTrim('')
    setMileage('')
    router.refresh()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded bg-blue-500 px-4 py-2 font-medium text-white hover:bg-blue-400"
      >
        Add a vehicle
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 rounded border border-gray-800 bg-gray-900 p-4">
      <div>
        <label className="mb-1 block text-xs text-gray-400">VIN (optional, more accurate)</label>
        <input
          type="text"
          value={vin}
          onChange={(e) => setVin(e.target.value)}
          placeholder="1HGBH41JXMN109186"
          className="w-44 rounded border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-100"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-gray-400">Year</label>
        <input
          type="number"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          placeholder="2022"
          required
          className="w-24 rounded border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-100"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-gray-400">Make</label>
        <input
          type="text"
          value={make}
          onChange={(e) => setMake(e.target.value)}
          placeholder="Honda"
          required
          className="rounded border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-100"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-gray-400">Model</label>
        <input
          type="text"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder="Civic"
          required
          className="rounded border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-100"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-gray-400">Trim (optional)</label>
        <input
          type="text"
          value={trim}
          onChange={(e) => setTrim(e.target.value)}
          placeholder="EX"
          className="rounded border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-100"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-gray-400">Mileage (optional)</label>
        <input
          type="number"
          value={mileage}
          onChange={(e) => setMileage(e.target.value)}
          placeholder="45000"
          className="w-28 rounded border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-100"
        />
      </div>
      <button
        type="submit"
        disabled={saving}
        className="rounded bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-400 disabled:opacity-50"
      >
        {saving ? 'Looking up value...' : 'Save'}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="rounded px-4 py-2 text-sm text-gray-400 hover:text-gray-100"
      >
        Cancel
      </button>
    </form>
  )
}
