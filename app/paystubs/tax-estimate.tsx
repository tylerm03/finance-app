'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatMoney } from '@/lib/format'

const STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
  'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho',
  'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana',
  'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
  'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
  'New Hampshire', 'New Jersey', 'New Mexico', 'New York',
  'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon',
  'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
  'West Virginia', 'Wisconsin', 'Wyoming', 'District of Columbia',
]

export default function TaxEstimate({
  annualGrossIncome,
  initialState,
  initialZip,
}: {
  annualGrossIncome: number
  initialState: string | null
  initialZip: string | null
}) {
  const [state, setState] = useState(initialState || '')
  const [zip, setZip] = useState(initialZip || '')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleEstimate() {
    if (!state) {
      setError('Pick a state first')
      return
    }
    setLoading(true)
    setError(null)
    setResult(null)

    const res = await fetch('/api/paystubs/estimate-tax', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ annualGrossIncome, state, zipCode: zip }),
    })
    const data = await res.json()

    setLoading(false)

    if (data.error) {
      setError(data.error)
      return
    }

    setResult(data)
    router.refresh()
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Estimated tax burden</h2>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs text-gray-500">State</label>
          <select
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
          >
            <option value="">Select a state</option>
            {STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">Zip code (optional)</label>
          <input
            type="text"
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            placeholder="00000"
            className="w-28 rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
          />
        </div>
        <button
          onClick={handleEstimate}
          disabled={loading}
          className="rounded bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-400 disabled:opacity-50"
        >
          {loading ? 'Estimating...' : 'Estimate'}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {result && (
        <div className="grid grid-cols-2 gap-4 border-t border-gray-200 pt-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-gray-500">Federal tax</p>
            <p className="text-lg font-semibold text-gray-900">{formatMoney(result.federal_tax)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">State tax</p>
            <p className="text-lg font-semibold text-gray-900">{formatMoney(result.state_tax)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">FICA</p>
            <p className="text-lg font-semibold text-gray-900">{formatMoney(result.fica_tax)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Effective rate</p>
            <p className="text-lg font-semibold text-gray-900">{result.effective_rate}%</p>
          </div>
          {result.source_note && (
            <p className="col-span-2 text-xs text-gray-500 sm:col-span-4">
              {result.source_note} — this is an estimate, not tax advice.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
