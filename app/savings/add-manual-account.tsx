'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AddManualAccount() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [balance, setBalance] = useState('')
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

    await supabase.from('accounts').insert({
      user_id: user.id,
      name,
      type: 'investment',
      subtype: '401k',
      current_balance: parseFloat(balance),
      balance_updated_at: new Date().toISOString(),
    })

    setSaving(false)
    setOpen(false)
    setName('')
    setBalance('')
    router.refresh()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:border-orange-600 hover:text-orange-600"
      >
        Add manual account
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 rounded border border-gray-200 bg-gray-50 p-4">
      <div>
        <label className="mb-1 block text-xs text-gray-500">Account name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Old 401k"
          required
          className="rounded border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-gray-500">Current balance</label>
        <input
          type="number"
          step="0.01"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          placeholder="0.00"
          required
          className="rounded border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
        />
      </div>
      <button
        type="submit"
        disabled={saving}
        className="rounded bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
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
