'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIES } from '@/lib/categorization/categories'
import { categoryDisplay } from '@/lib/categorization/category-display'
import Combobox from './combobox'
import type { AccountOption } from './types'

const INPUT =
  'h-12 w-full rounded-lg border border-[#e4e1dc] bg-white px-4 text-[16px] text-[#1f1d1a] outline-none placeholder:text-[#8a8680] focus:border-[#c9c5bf]'

const CATEGORY_OPTIONS = CATEGORIES.filter((c) => c !== 'EXCLUDED').map((c) => ({
  value: c,
  label: categoryDisplay(c).label,
  prefix: categoryDisplay(c).emoji,
}))

function today() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

export default function AddDrawer({
  accounts,
  merchants,
  onClose,
}: {
  accounts: AccountOption[]
  merchants: string[]
  onClose: () => void
}) {
  const router = useRouter()
  const [accountId, setAccountId] = useState(accounts[0]?.id || '')
  const [merchant, setMerchant] = useState<string | null>(null)
  const [kind, setKind] = useState<'expense' | 'income'>('expense')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(today())
  const [category, setCategory] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const merchantOptions = useMemo(() => merchants.map((m) => ({ value: m, label: m })), [merchants])

  const valid = !!merchant?.trim() && Number(amount) > 0 && !!date

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    setBusy(true)
    setError(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Not logged in')
      setBusy(false)
      return
    }
    const value = Math.abs(Number(amount))
    const { error } = await supabase.from('transactions').insert({
      user_id: user.id,
      account_id: accountId || null,
      txn_date: date,
      posted_date: date,
      // Same sign convention as Plaid: positive = money out
      amount: kind === 'expense' ? value : -value,
      merchant_name: merchant!.trim(),
      description: merchant!.trim(),
      category,
      category_source: category ? 'manual' : null,
      pending: false,
      source: 'manual',
    })
    setBusy(false)
    if (error) {
      setError(error.message)
      return
    }
    onClose()
    router.refresh()
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-[#1f1d1a]/35" onClick={onClose} />
      <form onSubmit={save} className="relative flex h-full w-full max-w-[600px] flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between px-8 pb-5 pt-6">
          <h2 className="text-[26px] font-semibold tracking-tight text-[#1f1d1a]">Add transaction</h2>
          <button type="button" onClick={onClose} className="text-[#1f1d1a] hover:text-[#77736d]">
            <X size={24} strokeWidth={2} />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto border-t border-[#efedea] px-8 py-7">
          <div className="flex rounded-lg bg-[#f1efec] p-1">
            {(['expense', 'income'] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={
                  'h-10 flex-1 rounded-md text-[15px] font-medium capitalize ' +
                  (kind === k ? 'bg-white text-[#1f1d1a] shadow-sm' : 'text-[#77736d]')
                }
              >
                {k}
              </button>
            ))}
          </div>

          <label className="block">
            <span className="mb-2.5 block text-[16px] font-medium">Amount</span>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[16px] text-[#77736d]">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className={INPUT + ' pl-8 tabular-nums'}
                required
              />
            </div>
          </label>

          <div>
            <span className="mb-2.5 block text-[16px] font-medium">Merchant</span>
            <Combobox options={merchantOptions} value={merchant} onChange={setMerchant} placeholder="Search merchants..." allowCustom />
          </div>

          <div>
            <span className="mb-2.5 block text-[16px] font-medium">Category</span>
            <Combobox options={CATEGORY_OPTIONS} value={category} onChange={setCategory} placeholder="Search categories..." />
          </div>

          <label className="block">
            <span className="mb-2.5 block text-[16px] font-medium">Date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={INPUT} required />
          </label>

          <label className="block">
            <span className="mb-2.5 block text-[16px] font-medium">Account</span>
            <div className="relative">
              <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={INPUT + ' cursor-pointer appearance-none pr-11'}>
                <option value="">No account</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#3b3834]" />
            </div>
          </label>

          {error && <p className="text-[14px] text-[#d6402b]">{error}</p>}
        </div>

        <div className="flex justify-end gap-3 border-t border-[#efedea] px-8 py-5">
          <button
            type="button"
            onClick={onClose}
            className="h-12 rounded-lg border border-[#e4e1dc] bg-white px-6 text-[16px] font-medium text-[#1f1d1a] hover:bg-[#faf9f7]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!valid || busy}
            className="h-12 rounded-lg bg-orange-500 px-6 text-[16px] font-medium text-white hover:bg-orange-600 disabled:bg-orange-300"
          >
            {busy ? 'Saving...' : 'Add transaction'}
          </button>
        </div>
      </form>
    </div>
  )
}
