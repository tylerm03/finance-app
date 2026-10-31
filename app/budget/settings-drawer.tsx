'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { GROUPS, type BudgetGroup } from '@/lib/budget/groups'
import type { BudgetRow } from './types'

// Pick which group (Fixed / Flexible / Non-Monthly) each spending category belongs to
export default function SettingsDrawer({
  rows,
  onClose,
  onSaved,
}: {
  rows: BudgetRow[]
  onClose: () => void
  onSaved: () => void
}) {
  const editable = rows.filter((r) => r.key !== '__none__')
  const [groups, setGroups] = useState<Record<string, BudgetGroup>>(
    Object.fromEntries(editable.map((r) => [r.key, r.group as BudgetGroup]))
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const changed = editable.some((r) => groups[r.key] !== r.group)

  async function save() {
    setSaving(true)
    setError(null)
    const { error } = await createClient()
      .from('budget_categories')
      .upsert(
        editable.map((r) => ({ category: r.key, grp: groups[r.key] })),
        { onConflict: 'user_id,category' }
      )
    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-[#1f1d1a]/35" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-[600px] flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between px-8 pb-5 pt-6">
          <h2 className="text-[26px] font-semibold tracking-tight">Budget settings</h2>
          <button type="button" onClick={onClose} className="hover:text-[#77736d]">
            <X size={24} strokeWidth={2} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto border-t border-[#efedea] px-8 py-6">
          <p className="mb-1 text-[16px] font-medium">Category groups</p>
          <p className="mb-5 text-[14px] text-[#77736d]">
            Fixed is for the same bill every month, Flexible for everyday spending, and Non-Monthly for
            costs that come up now and then.
          </p>
          <div className="divide-y divide-[#efedea] rounded-lg border border-[#efedea]">
            {editable.map((r) => (
              <div key={r.key} className="flex items-center justify-between gap-4 px-4 py-3">
                <span className="flex min-w-0 items-center gap-3 text-[15px]">
                  <span className="w-5 text-center">{r.emoji}</span>
                  <span className="truncate">{r.label}</span>
                </span>
                <div className="flex shrink-0 rounded-lg bg-[#f1efec] p-0.5 text-[13px]">
                  {GROUPS.map((g) => (
                    <button
                      key={g.key}
                      type="button"
                      onClick={() => setGroups({ ...groups, [r.key]: g.key })}
                      className={
                        'rounded-md px-3 py-1.5 font-medium ' +
                        (groups[r.key] === g.key ? 'bg-white text-[#1f1d1a] shadow-sm' : 'text-[#77736d] hover:text-[#1f1d1a]')
                      }
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {error && <p className="mt-4 text-[14px] text-[#d6402b]">{error}</p>}
        </div>
        <div className="flex justify-end gap-3 border-t border-[#efedea] px-8 py-5">
          <button
            type="button"
            onClick={onClose}
            className="h-12 rounded-lg border border-[#e4e1dc] bg-white px-6 text-[16px] font-medium hover:bg-[#faf9f7]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!changed || saving}
            className="h-12 rounded-lg bg-orange-500 px-6 text-[16px] font-medium text-white hover:bg-orange-600 disabled:bg-orange-300"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </aside>
    </div>
  )
}
