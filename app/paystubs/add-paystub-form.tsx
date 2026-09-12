'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AddPaystubForm() {
  const [open, setOpen] = useState(false)
  const [payDate, setPayDate] = useState('')
  const [grossPay, setGrossPay] = useState('')
  const [netPay, setNetPay] = useState('')
  const [frequency, setFrequency] = useState('biweekly')
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

    await supabase.from('paystubs').insert({
      user_id: user.id,
      pay_date: payDate,
      gross_pay: parseFloat(grossPay),
      net_pay: parseFloat(netPay),
      pay_frequency: frequency,
    })

    setSaving(false)
    setOpen(false)
    setPayDate('')
    setGrossPay('')
    setNetPay('')
    router.refresh()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded bg-orange-500 px-4 py-2 font-medium text-white hover:bg-orange-400"
      >
        Add a paystub
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 rounded border border-gray-200 bg-gray-50 p-4">
      <div>
        <label className="mb-1 block text-xs text-gray-500">Pay date</label>
        <input
          type="date"
          value={payDate}
          onChange={(e) => setPayDate(e.target.value)}
          required
          className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-gray-500">Gross pay (pre-tax)</label>
        <input
          type="number"
          step="0.01"
          value={grossPay}
          onChange={(e) => setGrossPay(e.target.value)}
          placeholder="0.00"
          required
          className="w-32 rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-gray-500">Net pay (take-home)</label>
        <input
          type="number"
          step="0.01"
          value={netPay}
          onChange={(e) => setNetPay(e.target.value)}
          placeholder="0.00"
          required
          className="w-32 rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-gray-500">Pay frequency</label>
        <select
          value={frequency}
          onChange={(e) => setFrequency(e.target.value)}
          className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
        >
          <option value="weekly">Weekly</option>
          <option value="biweekly">Biweekly</option>
          <option value="semimonthly">Semimonthly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={saving}
        className="rounded bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-400 disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save'}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="rounded px-4 py-2 text-sm text-gray-500 hover:text-gray-900"
      >
        Cancel
      </button>
    </form>
  )
}
