'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, ChevronRight, Minus } from 'lucide-react'
import { formatMoney } from '@/lib/format'
import { categoryDisplay } from '@/lib/categorization/category-display'
import InstitutionAvatar from '../institution-avatar'
import TopBar, { BTN, useParamUpdater } from './top-bar'
import EditDrawer from './edit-drawer'
import AddDrawer from './add-drawer'
import type { AccountOption, Txn, TxnParams } from './types'

const VIEWS = [
  { key: '', label: 'All transactions' },
  { key: 'expenses', label: 'Expenses' },
  { key: 'income', label: 'Income' },
  { key: 'uncategorized', label: 'Uncategorized' },
  { key: 'hidden', label: 'Hidden' },
]

const SORTS = [
  { key: '', label: 'Date (newest first)' },
  { key: 'date_asc', label: 'Date (oldest first)' },
  { key: 'amount_desc', label: 'Amount (largest first)' },
  { key: 'amount_asc', label: 'Amount (smallest first)' },
]

const GREEN = 'text-[#2f8f3f]'
const COLS_EDIT = 'grid-cols-[28px_minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,1.25fr)_130px_20px]'
const COLS = 'grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,1.25fr)_130px_20px]'

function longDate(day: string) {
  return new Date(day + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function Checkbox({ state }: { state: 'on' | 'off' | 'some' }) {
  return (
    <span
      className={
        'flex h-6 w-6 items-center justify-center rounded-md border ' +
        (state === 'off' ? 'border-[#d4d0ca] bg-white' : 'border-orange-500 bg-orange-500 text-white')
      }
    >
      {state === 'on' && <Check size={15} strokeWidth={3} />}
      {state === 'some' && <Minus size={15} strokeWidth={3} />}
    </span>
  )
}

const LOGO_BG = ['#fde7d9', '#dbeafe', '#dcfce7', '#ede9fe', '#fce7f3', '#ccfbf1']
const LOGO_FG = ['#b4501c', '#1d4ed8', '#15803d', '#6d28d9', '#be185d', '#0f766e']

function MerchantLogo({ t }: { t: Txn }) {
  const [broken, setBroken] = useState(false)
  if (t.logo && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={t.logo}
        alt=""
        onError={() => setBroken(true)}
        className="h-8 w-8 shrink-0 rounded-full border border-[#efedea] object-cover"
      />
    )
  }
  let hash = 0
  for (const c of t.merchant) hash = (hash * 31 + c.charCodeAt(0)) >>> 0
  const i = hash % LOGO_BG.length
  return (
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold"
      style={{ backgroundColor: LOGO_BG[i], color: LOGO_FG[i] }}
    >
      {t.merchant.charAt(0).toUpperCase()}
    </span>
  )
}

function SortMenu({ params }: { params: TxnParams }) {
  const update = useParamUpdater(params)
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

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(!open)} className={BTN + ' h-12'}>
        Sort
        <ChevronDown size={17} strokeWidth={2.25} />
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-30 w-60 rounded-xl border border-[#e4e1dc] bg-white p-2 shadow-lg">
          {SORTS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => {
                update({ sort: s.key })
                setOpen(false)
              }}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[15px] hover:bg-[#f6f5f3]"
            >
              {s.label}
              {(params.sort || '') === s.key && <Check size={16} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function TransactionsView({
  transactions,
  accounts,
  params,
  error,
}: {
  transactions: Txn[]
  accounts: AccountOption[]
  params: TxnParams
  error: string | null
}) {
  const update = useParamUpdater(params)
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<Txn[] | null>(null)
  const [adding, setAdding] = useState(false)

  const byDate = !params.sort || params.sort.startsWith('date')

  const groups = useMemo(() => {
    if (!byDate) return [{ date: null as string | null, rows: transactions }]
    const out: { date: string | null; rows: Txn[] }[] = []
    for (const t of transactions) {
      const last = out[out.length - 1]
      if (last && last.date === t.date) last.rows.push(t)
      else out.push({ date: t.date, rows: [t] })
    }
    return out
  }, [transactions, byDate])

  const merchants = useMemo(
    () => [...new Set(transactions.map((t) => t.merchant))].sort((a, b) => a.localeCompare(b)),
    [transactions]
  )

  function exitSelecting() {
    setSelecting(false)
    setSelected(new Set())
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (editing || adding) {
        setEditing(null)
        setAdding(false)
      } else if (selecting) {
        exitSelecting()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editing, adding, selecting])

  function toggle(id: string) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  const allState: 'on' | 'off' | 'some' =
    selected.size === 0 ? 'off' : selected.size === transactions.length ? 'on' : 'some'

  return (
    <div className="min-h-full bg-[#f6f5f3] font-sans text-[#1f1d1a]">
      <TopBar params={params} accounts={accounts} onAdd={() => setAdding(true)} />

      <div className="px-4 pb-8">
        <section className="overflow-hidden rounded-xl bg-white shadow-[0_1px_3px_rgba(30,25,20,0.06)]">
          {/* Toolbar */}
          <div className="flex min-h-[80px] items-center justify-between gap-4 px-6 py-4">
            {selecting ? (
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() =>
                    setSelected(allState === 'off' ? new Set(transactions.map((t) => t.id)) : new Set())
                  }
                  aria-label="Select all"
                >
                  <Checkbox state={allState} />
                </button>
                <span className="text-[20px] font-semibold">
                  {selected.size} {selected.size === 1 ? 'transaction' : 'transactions'} selected
                </span>
                <span className="text-[15px] text-[#77736d]">(ESC)</span>
              </div>
            ) : (
              <div className="relative w-[320px] max-w-full">
                <select
                  value={params.view || ''}
                  onChange={(e) => update({ view: e.target.value })}
                  className="h-12 w-full cursor-pointer appearance-none rounded-lg border border-[#e4e1dc] bg-white pl-4 pr-11 text-[17px] text-[#1f1d1a] outline-none focus:border-[#c9c5bf]"
                >
                  {VIEWS.map((v) => (
                    <option key={v.key} value={v.key}>
                      {v.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={17} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#3b3834]" />
              </div>
            )}

            <div className="flex items-center gap-3">
              {selecting ? (
                <>
                  <button type="button" onClick={exitSelecting} className={BTN + ' h-12'}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={selected.size === 0}
                    onClick={() => setEditing(transactions.filter((t) => selected.has(t.id)))}
                    className="h-12 rounded-lg bg-orange-500 px-5 text-[16px] font-medium text-white hover:bg-orange-600 disabled:bg-orange-300"
                  >
                    Edit {selected.size}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setSelecting(true)}
                  disabled={transactions.length === 0}
                  className={BTN + ' h-12'}
                >
                  <Check size={16} strokeWidth={2.25} />
                  Edit multiple
                </button>
              )}
              <span className="mx-1 h-6 w-px bg-[#d9d6d1]" />
              <SortMenu params={params} />
            </div>
          </div>

          {error && <p className="border-t border-[#efedea] px-6 py-5 text-[15px] text-[#d6402b]">Error loading transactions: {error}</p>}

          {!error && transactions.length === 0 && (
            <p className="border-t border-[#efedea] px-6 py-10 text-center text-[16px] text-[#77736d]">
              No transactions match these filters.
            </p>
          )}

          {groups.map((g) => {
            const net = -g.rows.reduce((s, t) => s + t.amount, 0)
            return (
              <div key={g.date || 'all'}>
                {g.date && (
                  <div className="flex items-center justify-between bg-[#f4f3f1] px-6 py-3.5 text-[15px] font-medium text-[#77736d]">
                    <span>{longDate(g.date)}</span>
                    <span className="tabular-nums">
                      {net > 0 ? '+' : ''}
                      {formatMoney(Math.abs(net))}
                    </span>
                  </div>
                )}
                {g.rows.map((t) => {
                  const cat = categoryDisplay(t.category)
                  const income = t.amount < 0
                  const hidden = t.category === 'EXCLUDED'
                  const isSel = selected.has(t.id)
                  return (
                    <div
                      key={t.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => (selecting ? toggle(t.id) : setEditing([t]))}
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter') return
                        if (selecting) toggle(t.id)
                        else setEditing([t])
                      }}
                      className={
                        'grid cursor-pointer items-center gap-4 border-t border-[#f1efec] px-6 py-[15px] text-[17px] transition-colors hover:bg-[#faf9f7] ' +
                        (selecting ? COLS_EDIT : COLS) +
                        (isSel ? ' bg-[#fffaf6]' : '')
                      }
                    >
                      {selecting && <Checkbox state={isSel ? 'on' : 'off'} />}

                      <div className="flex min-w-0 items-center gap-3">
                        <MerchantLogo t={t} />
                        <div className="min-w-0">
                          <p className={'truncate ' + (hidden ? 'text-[#77736d]' : '')}>{t.merchant}</p>
                          {!g.date && <p className="text-[13px] text-[#77736d]">{longDate(t.date)}</p>}
                        </div>
                        {t.pending && (
                          <span className="shrink-0 rounded-full bg-[#f1efec] px-2 py-0.5 text-[12px] font-medium text-[#77736d]">
                            Pending
                          </span>
                        )}
                      </div>

                      <div className={'flex min-w-0 items-center gap-2 ' + (t.category ? '' : 'text-[#d6402b]')}>
                        <span className="shrink-0 text-[17px] leading-none">{cat.emoji}</span>
                        <span className="truncate">{cat.label}</span>
                      </div>

                      <div className="flex min-w-0 items-center gap-2.5">
                        <InstitutionAvatar name={t.institution} size={26} />
                        <span className="truncate">{t.accountName || 'No account'}</span>
                      </div>

                      <span
                        className={
                          'text-right tabular-nums ' + (hidden ? 'text-[#a19d97]' : income ? GREEN : '')
                        }
                      >
                        {income ? '+' : ''}
                        {formatMoney(Math.abs(t.amount))}
                      </span>

                      <ChevronRight size={20} strokeWidth={2} className="text-[#1f1d1a]" />
                    </div>
                  )
                })}
              </div>
            )
          })}
        </section>
      </div>

      {editing && (
        <EditDrawer
          txns={editing}
          merchants={merchants}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null)
            exitSelecting()
          }}
        />
      )}
      {adding && <AddDrawer accounts={accounts} merchants={merchants} onClose={() => setAdding(false)} />}
    </div>
  )
}
