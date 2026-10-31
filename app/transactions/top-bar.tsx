'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, ListFilter, Plus, RefreshCw, Search, X } from 'lucide-react'
import { CATEGORIES } from '@/lib/categorization/categories'
import { categoryDisplay } from '@/lib/categorization/category-display'
import type { AccountOption, TxnParams } from './types'

export const BTN =
  'flex h-11 items-center gap-2 rounded-lg border border-[#e4e1dc] bg-white px-4 text-[16px] font-medium text-[#1f1d1a] hover:bg-[#faf9f7] disabled:opacity-60'

export function useParamUpdater(params: TxnParams, basePath = '/transactions') {
  const router = useRouter()
  return (updates: Partial<TxnParams>) => {
    const next = new URLSearchParams()
    const merged = { ...params, ...updates }
    for (const [k, v] of Object.entries(merged)) if (v) next.set(k, v)
    const qs = next.toString()
    router.push(basePath + (qs ? '?' + qs : ''))
  }
}

function usePopover() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])
  return { open, setOpen, ref }
}

function iso(d: Date) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

export function presets() {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const daysAgo = (n: number) => {
    const d = new Date(now)
    d.setDate(d.getDate() - n)
    return iso(d)
  }
  return [
    { label: 'This month', from: iso(new Date(y, m, 1)), to: '' },
    { label: 'Last month', from: iso(new Date(y, m - 1, 1)), to: iso(new Date(y, m, 0)) },
    { label: 'Last 30 days', from: daysAgo(30), to: '' },
    { label: 'Last 90 days', from: daysAgo(90), to: '' },
    { label: 'This year', from: iso(new Date(y, 0, 1)), to: '' },
    { label: 'All time', from: '', to: '' },
  ]
}

const Dot = () => <span className="h-2 w-2 rounded-full bg-orange-500" />

function SearchButton({ params }: { params: TxnParams }) {
  const update = useParamUpdater(params)
  const [open, setOpen] = useState(!!params.q)
  const [text, setText] = useState(params.q || '')
  const first = useRef(true)

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    const t = setTimeout(() => update({ q: text }), 400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text])

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={BTN}>
        <Search size={17} strokeWidth={2} />
        Search
      </button>
    )
  }
  return (
    <div className="relative">
      <Search size={17} strokeWidth={2} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#1f1d1a]" />
      <input
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => !text && setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setText('')
            setOpen(false)
          }
        }}
        placeholder="Search transactions..."
        className="h-11 w-64 rounded-lg border border-[#e4e1dc] bg-white pl-11 pr-9 text-[16px] outline-none focus:border-[#c9c5bf]"
      />
      {text && (
        <button
          type="button"
          onClick={() => {
            setText('')
            setOpen(false)
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#77736d] hover:text-[#1f1d1a]"
        >
          <X size={16} />
        </button>
      )}
    </div>
  )
}

export function DateButton({ params, basePath }: { params: TxnParams; basePath?: string }) {
  const update = useParamUpdater(params, basePath)
  const { open, setOpen, ref } = usePopover()
  const [from, setFrom] = useState(params.from || '')
  const [to, setTo] = useState(params.to || '')
  const list = presets()
  const active = list.find((p) => p.from === (params.from || '') && p.to === (params.to || ''))

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(!open)} className={BTN}>
        <Calendar size={16} strokeWidth={2} />
        {params.from || params.to ? (active ? active.label : 'Custom dates') : 'Date'}
        {(params.from || params.to) && <Dot />}
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-30 w-72 rounded-xl border border-[#e4e1dc] bg-white p-2 shadow-lg">
          {list.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                update({ from: p.from, to: p.to })
                setFrom(p.from)
                setTo(p.to)
                setOpen(false)
              }}
              className={
                'block w-full rounded-lg px-3 py-2 text-left text-[15px] hover:bg-[#f6f5f3] ' +
                (active?.label === p.label ? 'font-medium' : '')
              }
            >
              {p.label}
            </button>
          ))}
          <div className="mt-2 border-t border-[#efedea] px-3 pb-1 pt-3">
            <p className="mb-2 text-[13px] font-medium text-[#77736d]">Custom range</p>
            <div className="flex items-center gap-2">
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 min-w-0 flex-1 rounded-md border border-[#e4e1dc] px-2 text-[14px]" />
              <span className="text-[#77736d]">–</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 min-w-0 flex-1 rounded-md border border-[#e4e1dc] px-2 text-[14px]" />
            </div>
            <button
              type="button"
              onClick={() => {
                update({ from, to })
                setOpen(false)
              }}
              className="mt-3 h-9 w-full rounded-lg bg-orange-500 text-[14px] font-medium text-white hover:bg-orange-600"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function FiltersButton({
  params,
  accounts,
  basePath,
}: {
  params: TxnParams
  accounts: AccountOption[]
  basePath?: string
}) {
  const update = useParamUpdater(params, basePath)
  const { open, setOpen, ref } = usePopover()
  const count = (params.category ? 1 : 0) + (params.account ? 1 : 0)
  const select =
    'h-10 w-full rounded-lg border border-[#e4e1dc] bg-white px-3 text-[15px] outline-none focus:border-[#c9c5bf]'

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(!open)} className={BTN}>
        <ListFilter size={16} strokeWidth={2} />
        Filters
        {count > 0 && <Dot />}
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-30 w-80 space-y-4 rounded-xl border border-[#e4e1dc] bg-white p-4 shadow-lg">
          <label className="block">
            <span className="mb-1.5 block text-[14px] font-medium">Category</span>
            <select value={params.category || ''} onChange={(e) => update({ category: e.target.value })} className={select}>
              <option value="">All categories</option>
              <option value="__uncategorized__">Uncategorized</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {categoryDisplay(c).emoji} {categoryDisplay(c).label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[14px] font-medium">Account</span>
            <select value={params.account || ''} onChange={(e) => update({ account: e.target.value })} className={select}>
              <option value="">All accounts</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          {count > 0 && (
            <button
              type="button"
              onClick={() => update({ category: '', account: '' })}
              className="text-[14px] font-medium text-orange-500 hover:text-orange-600"
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// Pull new transactions from the banks, then auto-categorize anything new
function SyncButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  async function run() {
    setLoading(true)
    setNote(null)
    try {
      const sync = await fetch('/api/plaid/sync', { method: 'POST' }).then((r) => r.json())
      if (sync.error) throw new Error(sync.error)
      const added = (sync.results || []).reduce((s: number, r: { added?: number }) => s + (r.added || 0), 0)
      const cat = await fetch('/api/categorize', { method: 'POST' }).then((r) => r.json())
      setNote(
        added + ' new' + (cat.stillUncategorized ? ', ' + cat.stillUncategorized + ' uncategorized' : '')
      )
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'Sync failed')
    }
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="flex items-center gap-3">
      {note && <span className="text-[14px] text-[#77736d]">{note}</span>}
      <button type="button" onClick={run} disabled={loading} className={BTN}>
        <RefreshCw size={16} strokeWidth={2} className={loading ? 'animate-spin' : ''} />
        {loading ? 'Syncing...' : 'Sync'}
      </button>
    </div>
  )
}

export default function TopBar({
  params,
  accounts,
  onAdd,
}: {
  params: TxnParams
  accounts: AccountOption[]
  onAdd: () => void
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 px-6 pb-3 pt-4">
      <h1 className="text-[22px] font-medium">Transactions</h1>
      <div className="flex flex-wrap items-center gap-3">
        <SearchButton params={params} />
        <DateButton params={params} />
        <FiltersButton params={params} accounts={accounts} />
        <span className="mx-1 h-6 w-px bg-[#d9d6d1]" />
        <SyncButton />
        <button
          type="button"
          onClick={onAdd}
          className="flex h-11 items-center gap-2 rounded-lg bg-orange-500 px-5 text-[16px] font-medium text-white hover:bg-orange-600"
        >
          <Plus size={18} strokeWidth={2.25} />
          Add transaction
        </button>
      </div>
    </header>
  )
}
