'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Info, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIES } from '@/lib/categorization/categories'
import { categoryDisplay } from '@/lib/categorization/category-display'
import { formatMoney } from '@/lib/format'
import InstitutionAvatar from '../institution-avatar'
import Combobox from './combobox'
import RecurringToggle from './recurring-toggle'
import type { Txn } from './types'

const CATEGORY_OPTIONS = CATEGORIES.filter((c) => c !== 'EXCLUDED').map((c) => ({
  value: c,
  label: categoryDisplay(c).label,
  prefix: categoryDisplay(c).emoji,
}))

const INPUT =
  'h-12 w-full rounded-lg border border-[#e4e1dc] bg-white px-4 text-[16px] text-[#1f1d1a] outline-none placeholder:text-[#8a8680] focus:border-[#c9c5bf]'

function Field({ label, children, info }: { label: string; children: React.ReactNode; info?: string }) {
  return (
    <div>
      <p className="mb-2.5 flex items-center gap-1.5 text-[16px] font-medium text-[#1f1d1a]">
        {label}
        {info && (
          <span title={info} className="text-[#3b3834]">
            <Info size={14} strokeWidth={2} />
          </span>
        )}
      </p>
      {children}
    </div>
  )
}

function longDate(day: string) {
  return new Date(day + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export default function EditDrawer({
  txns,
  merchants,
  onClose,
  onDone,
}: {
  txns: Txn[]
  merchants: string[]
  onClose: () => void
  onDone: () => void
}) {
  const router = useRouter()
  const single = txns.length === 1 ? txns[0] : null
  const n = txns.length

  const [merchant, setMerchant] = useState<string | null>(single ? single.merchant : null)
  const [category, setCategory] = useState<string | null>(
    single && single.category !== 'EXCLUDED' ? single.category : null
  )
  const [date, setDate] = useState(single ? single.date : '')
  const [hide, setHide] = useState<'' | 'hide' | 'unhide'>('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const accounts = useMemo(() => {
    const seen = new Map<string, { name: string; institution: string | null }>()
    for (const t of txns) {
      const key = t.accountId || 'none'
      if (!seen.has(key)) seen.set(key, { name: t.accountName || 'No account', institution: t.institution })
    }
    return [...seen.values()]
  }, [txns])

  const merchantOptions = useMemo(() => merchants.map((m) => ({ value: m, label: m })), [merchants])

  // Only send fields that actually changed
  const changes = useMemo(() => {
    const c: Record<string, string | null> = {}
    const m = merchant?.trim()
    if (m && (!single || m !== single.merchant)) c.merchant_name = m
    if (category && (!single || category !== single.category)) {
      c.category = category
      c.category_source = 'manual'
    }
    if (date && (!single || date !== single.date)) c.txn_date = date
    if (hide === 'hide') {
      c.category = 'EXCLUDED'
      c.category_source = 'manual'
    }
    if (hide === 'unhide' && !c.category) c.category = null
    return c
  }, [merchant, category, date, hide, single])

  const hasChanges = Object.keys(changes).length > 0

  async function save() {
    if (!hasChanges) return
    setBusy(true)
    setError(null)
    const supabase = createClient()
    const ids = txns.map((t) => t.id)

    let query = supabase.from('transactions').update(changes).in('id', ids)
    // "Unhide" only applies to hidden transactions
    if (hide === 'unhide' && changes.category === null) query = query.eq('category', 'EXCLUDED')
    const { error } = await query
    if (error) {
      setError(error.message)
      setBusy(false)
      return
    }

    // Remember the category for these merchants, like picking it in the old dropdown did
    if (changes.category && changes.category !== 'EXCLUDED') {
      const entityIds = [...new Set(txns.map((t) => t.merchantEntityId).filter(Boolean))] as string[]
      for (const entityId of entityIds) {
        const { data: existing } = await supabase
          .from('category_rules')
          .select('id')
          .eq('merchant_entity_id', entityId)
          .maybeSingle()
        if (existing) {
          await supabase.from('category_rules').update({ category: changes.category }).eq('id', existing.id)
        } else {
          await supabase.from('category_rules').insert({ merchant_entity_id: entityId, category: changes.category })
        }
      }
    }

    setBusy(false)
    onDone()
    router.refresh()
  }

  async function remove() {
    const ok = window.confirm(
      'Delete ' + (n === 1 ? 'this transaction' : n + ' transactions') + "? This can't be undone."
    )
    if (!ok) return
    setBusy(true)
    const { error } = await createClient()
      .from('transactions')
      .delete()
      .in('id', txns.map((t) => t.id))
    setBusy(false)
    if (error) {
      setError(error.message)
      return
    }
    onDone()
    router.refresh()
  }

  const details = single
    ? ([
        ['Original statement', single.description],
        ['Bank category', single.plaidDetail?.replaceAll('_', ' ').toLowerCase()],
        ['Channel', single.channel?.replaceAll('_', ' ')],
        ['Location', single.location],
        ['Website', single.website],
        ['Status', single.pending ? 'Pending' : null],
      ].filter(([, v]) => v) as [string, string][])
    : []

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-[#1f1d1a]/35" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-[600px] flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between px-8 pb-5 pt-6">
          <h2 className="text-[26px] font-semibold tracking-tight text-[#1f1d1a]">
            {single ? 'Edit transaction' : 'Edit ' + n + ' transactions'}
          </h2>
          <button type="button" onClick={onClose} className="text-[#1f1d1a] hover:text-[#77736d]">
            <X size={24} strokeWidth={2} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="flex items-center gap-4 bg-[#f6f5f3] px-8 py-5">
            <div className="flex">
              {accounts.slice(0, 3).map((a, i) => (
                <InstitutionAvatar
                  key={i}
                  name={a.institution}
                  size={48}
                  className={'ring-2 ring-[#f6f5f3] ' + (i > 0 ? '-ml-4' : '')}
                />
              ))}
            </div>
            <div className="min-w-0">
              {single ? (
                <>
                  <p className="truncate text-[17px] font-medium text-[#1f1d1a]">
                    {single.amount < 0 ? '+' : ''}
                    {formatMoney(Math.abs(single.amount))} · {single.accountName || 'No account'}
                  </p>
                  <p className="truncate text-[14px] text-[#77736d]">{longDate(single.date)}</p>
                </>
              ) : (
                <>
                  <p className="text-[17px] font-medium text-[#1f1d1a]">
                    {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'} selected
                  </p>
                  <p className="truncate text-[14px] text-[#77736d]">{accounts.map((a) => a.name).join(', ')}</p>
                </>
              )}
            </div>
          </div>

          <div className="space-y-6 px-8 py-7">
            <Field label="Merchant">
              <Combobox
                options={merchantOptions}
                value={merchant}
                onChange={setMerchant}
                placeholder="Search merchants..."
                allowCustom
              />
            </Field>

            <Field label="Category">
              <Combobox
                options={CATEGORY_OPTIONS}
                value={category}
                onChange={setCategory}
                placeholder="Search categories..."
              />
            </Field>

            <Field label="Date">
              <input
                type={date ? 'date' : 'text'}
                value={date}
                placeholder="Change date..."
                onFocus={(e) => {
                  e.currentTarget.type = 'date'
                }}
                onBlur={(e) => {
                  if (!e.currentTarget.value) e.currentTarget.type = 'text'
                }}
                onChange={(e) => setDate(e.target.value)}
                className={INPUT}
              />
            </Field>

            <Field label="Hide transactions" info="Hidden transactions are left out of totals and charts.">
              <div className="relative">
                <select
                  value={hide}
                  onChange={(e) => setHide(e.target.value as typeof hide)}
                  className={INPUT + ' cursor-pointer appearance-none pr-11'}
                >
                  <option value="">No change</option>
                  <option value="hide">Hide</option>
                  <option value="unhide">Unhide</option>
                </select>
                <ChevronDown size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#3b3834]" />
              </div>
            </Field>

            {single && <RecurringToggle txn={single} />}

            {details.length > 0 && (
              <div className="rounded-lg border border-[#efedea]">
                {details.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-6 border-b border-[#efedea] px-4 py-3 text-[15px] last:border-b-0">
                    <span className="shrink-0 text-[#77736d]">{k}</span>
                    <span className="truncate text-right text-[#1f1d1a]">{v}</span>
                  </div>
                ))}
              </div>
            )}

            {error && <p className="text-[14px] text-[#d6402b]">{error}</p>}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[#efedea] px-8 py-5">
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="h-12 rounded-lg border border-[#e4e1dc] bg-white px-5 text-[16px] font-medium text-[#c8321e] hover:bg-[#fdf3f1] disabled:opacity-60"
          >
            {single ? 'Delete transaction' : 'Delete ' + n + ' transactions'}
          </button>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-12 rounded-lg border border-[#e4e1dc] bg-white px-6 text-[16px] font-medium text-[#1f1d1a] hover:bg-[#faf9f7]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={!hasChanges || busy}
              className="h-12 rounded-lg bg-orange-500 px-6 text-[16px] font-medium text-white hover:bg-orange-600 disabled:bg-orange-300"
            >
              {busy ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </aside>
    </div>
  )
}
