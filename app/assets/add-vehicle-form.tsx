'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AddVehicleForm() {
  const [open, setOpen] = useState(false)
  const [vin, setVin] = useState('')
  const [mileage, setMileage] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSaving(false)
      return
    }

    let year: string | null = null
    let make: string | null = null
    let model: string | null = null
    let trim: string | null = null

    try {
      const decodeRes = await fetch(
        'https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/' + vin + '?format=json'
      )
      const decodeData = await decodeRes.json()
      const results = decodeData.Results || []
      const findValue = (variable: string) =>
        results.find((r: any) => r.Variable === variable)?.Value || null

      year = findValue('Model Year')
      make = findValue('Make')
      model = findValue('Model')
      trim = findValue('Trim')
    } catch {
      setError('Could not decode VIN — check that it was entered correctly.')
      setSaving(false)
      return
    }

    if (!make || !model) {
      setError('VIN could not be decoded. Double check it and try again.')
      setSaving(false)
      return
    }

    const name = [year, make, model].filter(Boolean).join(' ')

    // Just save the vehicle — no automatic value lookup. Use the
    // "Refresh value" button on the card when you want a price.
    const { error: insertError } = await supabase.from('assets').insert({
      user_id: user.id,
      name,
      type: 'vehicle',
      vin,
      year: year ? parseInt(year) : null,
      make,
      model,
      trim,
      mileage: mileage ? parseInt(mileage) : null,
    })

    if (insertError) {
      setError(insertError.message)
      setSaving(false)
      return
    }

    setSaving(false)
    setOpen(false)
    setVin('')
    setMileage('')
    router.refresh()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded bg-orange-500 px-4 py-2 font-medium text-white hover:bg-orange-500"
      >
        Add a vehicle
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 rounded border border-gray-200 bg-gray-50 p-4">
      <div>
        <label className="mb-1 block text-xs text-gray-500">VIN</label>
        <input
          type="text"
          value={vin}
          onChange={(e) => setVin(e.target.value)}
          placeholder="1HGBH41JXMN109186"
          required
          className="w-48 rounded border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-gray-500">Mileage (optional)</label>
        <input
          type="number"
          value={mileage}
          onChange={(e) => setMileage(e.target.value)}
          placeholder="45000"
          className="w-28 rounded border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
        />
      </div>
      <button
        type="submit"
        disabled={saving}
        className="rounded bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-500 disabled:opacity-50"
      >
        {saving ? 'Decoding VIN...' : 'Save'}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="rounded px-4 py-2 text-sm text-gray-500 hover:text-gray-900"
      >
        Cancel
      </button>
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </form>
  )
}
