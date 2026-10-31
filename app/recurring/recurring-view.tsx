'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, ArrowRight, Check, ChevronDown, MoreHorizontal, SlidersHorizontal } from 'lucide-react'
import { formatMoney } from '@/lib/format'
import { categoryDisplay } from '@/lib/categorization/category-display'
import { occurrencesForMonth, MIN_MONTHS, type Occurrence, type Stream } from '@/lib/recurring/detect'
import InstitutionAvatar from '../institution-avatar'

const CARD = 'rounded-xl bg-white shadow-[0_1px_3px_rgba(30,25,20,0.06)]'
const BTN = 'flex h-10 items-center gap-2 rounded-lg border border-[#e4e1dc] bg-white px-4 text-[15px] font-medium hover:bg-[#faf9f7]'
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function todayISO() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

function signed(amount: number) {
  // Plaid sign: negative = money in
  return (amount < 0 ? '+' : '') + formatMoney(Math.abs(amount))
}

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

function shortDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function useOutside<T extends HTMLElement>(open: boolean, close: () => void) {
  const ref = useRef<T>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open, close])
  return ref
}

function Logo({ s, size = 32 }: { s: Stream; size?: number }) {
  const [broken, setBroken] = useState(false)
  if (s.logo && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={s.logo}
        alt=""
        onError={() => setBroken(true)}
        className="shrink-0 rounded-full border border-[#efedea] object-cover"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-[#f1efec] font-semibold text-[#5f5b55]"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {s.merchant.charAt(0).toUpperCase()}
    </span>
  )
}

function Chip({ o }: { o: Occurrence }) {
  const income = o.amount < 0
  const style =
    o.status === 'paid'
      ? 'bg-[#e1f3e8] text-[#1f6b40]'
      : o.status === 'overdue'
        ? 'bg-[#fbefd6] text-[#8a6100]'
        : 'bg-[#f1efec] text-[#3b3834]'
  const title =
    o.stream.merchant +
    ' · ' +
    signed(o.amount) +
    (o.status === 'paid' ? ' · paid' : o.status === 'overdue' ? ' · not seen yet' : ' · expected')
  return (
    <div title={title} className={'flex items-center gap-1 rounded-md px-1.5 py-[3px] text-[12px] leading-tight ' + style}>
      {o.status === 'paid' && <Check size={11} strokeWidth={3} className="shrink-0" />}
      <span className="min-w-0 flex-1 truncate">{o.stream.merchant}</span>
      <span className={'shrink-0 tabular-nums ' + (income ? 'text-[#23824b]' : '')}>{signed(o.amount)}</span>
    </div>
  )
}

function DayCell({ day, items, isToday }: { day: number | null; items: Occurrence[]; isToday: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const shown = expanded ? items : items.slice(0, 3)
  return (
    <div className="min-h-[108px] border-b border-r border-[#efedea] p-2">
      {day !== null && (
        <>
          <span
            className={
              'mb-1.5 inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[13px] ' +
              (isToday ? 'bg-orange-500 font-semibold text-white' : 'text-[#77736d]')
            }
          >
            {day}
          </span>
          <div className="space-y-1">
            {shown.map((o) => (
              <Chip key={o.stream.key} o={o} />
            ))}
            {items.length > 3 && (
              <button type="button" onClick={() => setExpanded(!expanded)} className="px-1.5 text-[12px] font-medium text-[#77736d] hover:text-[#1f1d1a]">
                {expanded ? 'Show less' : '+' + (items.length - 3) + ' more'}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function RowMenu({ s }: { s: Stream }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  async function unmark() {
    if (!s.markId) return
    if (!window.confirm('Stop treating ' + s.merchant + ' as recurring?')) return
    setBusy(true)
    await createClient().from('recurring_marks').delete().eq('id', s.markId)
    setBusy(false)
    setOpen(false)
    router.refresh()
  }

  const ref = useOutside<HTMLDivElement>(open, () => setOpen(false))
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="More"
        onClick={() => setOpen(!open)}
        className={'flex h-8 w-8 items-center justify-center rounded-lg text-[#5f5b55] hover:bg-[#f1efec] ' + (open ? 'bg-[#f1efec]' : '')}
      >
        <MoreHorizontal size={18} />
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+4px)] z-30 w-52 rounded-xl border border-[#e4e1dc] bg-white p-1.5 shadow-xl">
          <Link
            href={'/transactions?q=' + encodeURIComponent(s.merchant)}
            className="block rounded-lg px-3 py-2.5 text-[15px] hover:bg-[#f6f5f3]"
          >
            View transactions
          </Link>
          {s.markId && (
            <button
              type="button"
              disabled={busy}
              onClick={unmark}
              className="block w-full rounded-lg px-3 py-2.5 text-left text-[15px] text-[#c8321e] hover:bg-[#fdecea] disabled:opacity-50"
            >
              Stop treating as recurring
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function ViewOptions({
  showExpenses,
  showIncome,
  showStopped,
  set,
}: {
  showExpenses: boolean
  showIncome: boolean
  showStopped: boolean
  set: (k: 'showExpenses' | 'showIncome' | 'showStopped', v: boolean) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useOutside<HTMLDivElement>(open, () => setOpen(false))
  const opt = (k: 'showExpenses' | 'showIncome' | 'showStopped', label: string, value: boolean) => (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg px-3 py-2.5 text-[15px] hover:bg-[#f6f5f3]">
      {label}
      <input type="checkbox" checked={value} onChange={(e) => set(k, e.target.checked)} className="h-4 w-4 accent-orange-500" />
    </label>
  )
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(!open)} className={BTN}>
        <SlidersHorizontal size={16} />
        View options
        <ChevronDown size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-30 w-60 rounded-xl border border-[#e4e1dc] bg-white p-1.5 shadow-xl">
          {opt('showExpenses', 'Show bills & expenses', showExpenses)}
          {opt('showIncome', 'Show income', showIncome)}
          {opt('showStopped', 'Show stopped', showStopped)}
        </div>
      )}
    </div>
  )
}

export default function RecurringView({ streams, error }: { streams: Stream[]; error: string | null }) {
  const today = todayISO()
  const [tab, setTab] = useState<'upcoming' | 'all'>('upcoming')
  const [cursor, setCursor] = useState(() => ({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) }))
  const [opts, setOpts] = useState({ showExpenses: true, showIncome: true, showStopped: false })
  const [listOpen, setListOpen] = useState(true)

  const visible = useMemo(
    () => streams.filter((s) => (s.amount < 0 ? opts.showIncome : opts.showExpenses)),
    [streams, opts.showIncome, opts.showExpenses]
  )

  const occurrences = useMemo(() => occurrencesForMonth(visible, cursor.y, cursor.m, today), [visible, cursor, today])
  const byDay = useMemo(() => {
    const map = new Map<number, Occurrence[]>()
    for (const o of occurrences) {
      const d = Number(o.date.slice(8, 10))
      map.set(d, [...(map.get(d) || []), o])
    }
    for (const list of map.values()) list.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
    return map
  }, [occurrences])

  // Upcoming: what's still expected in roughly the next month, including anything late
  const upcoming = useMemo(() => {
    const horizon = new Date()
    horizon.setDate(horizon.getDate() + 35)
    const end = horizon.toISOString().slice(0, 10)
    const thisMonth = occurrencesForMonth(visible, Number(today.slice(0, 4)), Number(today.slice(5, 7)), today)
    const next = new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 1)
    const nextMonth = occurrencesForMonth(visible, next.getFullYear(), next.getMonth() + 1, today)
    return [...thisMonth, ...nextMonth]
      .filter((o) => o.status !== 'paid' && o.date <= end && o.stream.active)
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      // One line per bill: if it's late, show the late one rather than next month's too
      .filter((o, i, list) => list.findIndex((x) => x.stream.key === o.stream.key) === i)
  }, [visible, today])

  const daysInMonth = new Date(cursor.y, cursor.m, 0).getDate()
  const lead = new Date(cursor.y, cursor.m - 1, 1).getDay()
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  while (cells.length % 7) cells.push(null)

  const monthLabel = new Date(cursor.y, cursor.m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const move = (delta: number) => {
    const d = new Date(cursor.y, cursor.m - 1 + delta, 1)
    setCursor({ y: d.getFullYear(), m: d.getMonth() + 1 })
  }
  const isThisMonth = cursor.y === Number(today.slice(0, 4)) && cursor.m === Number(today.slice(5, 7))

  const allRows = streams
    .filter((s) => (s.amount < 0 ? opts.showIncome : opts.showExpenses))
    .filter((s) => opts.showStopped || s.active)
    .sort((a, b) => a.merchant.localeCompare(b.merchant))

  const COLS = 'grid grid-cols-[minmax(0,1.4fr)_100px_minmax(0,1fr)_minmax(0,1.2fr)_120px_40px] items-center gap-4'

  return (
    <div className="min-h-full bg-[#f6f5f3] font-sans text-[#1f1d1a]">
      <header className="flex flex-wrap items-center justify-between gap-4 px-6 pb-3 pt-4">
        <div className="flex items-center gap-7">
          <h1 className="text-[22px] font-medium">Recurring</h1>
          <nav className="flex gap-6">
            {(
              [
                ['upcoming', 'Upcoming'],
                ['all', 'All merchants'],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setTab(k)}
                className={
                  'border-b-2 pb-1 pt-1.5 text-[17px] font-medium transition-colors ' +
                  (tab === k ? 'border-orange-500 text-orange-500' : 'border-transparent text-[#77736d] hover:text-[#1f1d1a]')
                }
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
        <ViewOptions {...opts} set={(k, v) => setOpts({ ...opts, [k]: v })} />
      </header>

      <div className="space-y-4 px-4 pb-8">
        {error && <p className={CARD + ' p-5 text-[15px] text-[#d6402b]'}>Error loading transactions: {error}</p>}

        {streams.length === 0 && !error && (
          <p className={CARD + ' p-8 text-center text-[15px] text-[#77736d]'}>
            Nothing recurring found yet. A payment shows up here once the same company charges or pays you on the same day
            of the month {MIN_MONTHS} months in a row.
          </p>
        )}

        {tab === 'upcoming' && (
          <>
            <section className={CARD + ' overflow-hidden'}>
              <div className="flex items-center justify-between px-6 py-5">
                <h2 className="text-[20px] font-medium">{monthLabel}</h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isThisMonth}
                    onClick={() => setCursor({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) })}
                    className={BTN + ' disabled:opacity-60'}
                  >
                    Today
                  </button>
                  <button type="button" aria-label="Previous month" onClick={() => move(-1)} className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-[#f1efec]">
                    <ArrowLeft size={19} />
                  </button>
                  <button type="button" aria-label="Next month" onClick={() => move(1)} className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-[#f1efec]">
                    <ArrowRight size={19} />
                  </button>
                </div>
              </div>
              <div className="px-6 pb-6">
                <div className="grid grid-cols-7 pb-3 text-center text-[14px] text-[#77736d]">
                  {DAYS.map((d) => (
                    <span key={d}>{d}</span>
                  ))}
                </div>
                <div className="grid grid-cols-7 overflow-hidden rounded-lg border-l border-t border-[#efedea]">
                  {cells.map((d, i) => {
                    const iso = d ? cursor.y + '-' + String(cursor.m).padStart(2, '0') + '-' + String(d).padStart(2, '0') : ''
                    return <DayCell key={cursor.y + '-' + cursor.m + '-' + i} day={d} items={d ? byDay.get(d) || [] : []} isToday={iso === today} />
                  })}
                </div>
                <div className="mt-4 flex flex-wrap gap-5 text-[13px] text-[#77736d]">
                  <span className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-[#e1f3e8]" />Paid</span>
                  <span className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-[#f1efec]" />Expected</span>
                  <span className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-[#fbefd6]" />Due date passed, not seen yet</span>
                </div>
              </div>
            </section>

            <section className={CARD + ' overflow-hidden'}>
              <div className={COLS + ' px-6 py-4 text-[14px] text-[#77736d]'}>
                <button type="button" onClick={() => setListOpen(!listOpen)} className="flex items-center gap-2.5 text-left text-[18px] font-medium text-[#1f1d1a]">
                  <ChevronDown size={17} strokeWidth={2.25} className={'transition-transform ' + (listOpen ? '' : '-rotate-90')} />
                  Upcoming
                </button>
                <span>Due Date</span>
                <span>Category</span>
                <span>Account</span>
                <span className="text-right">Amount</span>
                <span />
              </div>
              {listOpen && upcoming.length === 0 && (
                <p className="border-t border-[#f1efec] px-6 py-6 text-[15px] text-[#77736d]">Nothing else expected in the next few weeks.</p>
              )}
              {listOpen &&
                upcoming.map((o) => {
                  const cat = categoryDisplay(o.stream.category)
                  return (
                    <div key={o.stream.key + o.date} className={COLS + ' border-t border-[#f1efec] px-6 py-3.5 text-[15px]'}>
                      <div className="flex min-w-0 items-center gap-3">
                        <Logo s={o.stream} />
                        <div className="min-w-0">
                          <p className="truncate text-[16px]">{o.stream.merchant}</p>
                          <p className="text-[13px] text-[#77736d]">Every month on the {ordinal(o.stream.day)}</p>
                        </div>
                      </div>
                      <span className={o.status === 'overdue' ? 'text-[#8a6100]' : ''}>
                        {shortDate(o.date)}
                        {o.status === 'overdue' && <span className="block text-[12px]">Not seen yet</span>}
                      </span>
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="shrink-0">{cat.emoji}</span>
                        <span className="truncate">{cat.label}</span>
                      </span>
                      <span className="flex min-w-0 items-center gap-2.5">
                        <InstitutionAvatar name={o.stream.institution} size={22} />
                        <span className="truncate">{o.stream.accountName || 'No account'}</span>
                      </span>
                      <span className={'text-right font-medium tabular-nums ' + (o.amount < 0 ? 'text-[#23824b]' : '')}>{signed(o.amount)}</span>
                      <RowMenu s={o.stream} />
                    </div>
                  )
                })}
            </section>
          </>
        )}

        {tab === 'all' && streams.length > 0 && (
          <section className={CARD + ' overflow-hidden'}>
            <table className="w-full text-[15px]">
              <thead className="text-[14px] text-[#77736d]">
                <tr>
                  <th className="px-6 py-4 text-left font-normal">Merchant</th>
                  <th className="px-4 py-4 text-left font-normal">Category</th>
                  <th className="px-4 py-4 text-left font-normal">Account</th>
                  <th className="px-4 py-4 text-left font-normal">Last paid</th>
                  <th className="px-4 py-4 text-left font-normal">Next due</th>
                  <th className="px-4 py-4 text-right font-normal">Avg. amount</th>
                  <th className="w-12" />
                </tr>
              </thead>
              <tbody>
                {allRows.map((s) => {
                  const cat = categoryDisplay(s.category)
                  return (
                    <tr key={s.key} className="border-t border-[#f1efec]">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <Logo s={s} />
                          <div className="min-w-0">
                            <p className="truncate text-[16px]">{s.merchant}</p>
                            <p className="text-[13px] text-[#77736d]">
                              Every month on the {ordinal(s.day)} · {s.manual && s.months < 3 ? 'added by you' : s.months + ' months in a row'}
                              {!s.active && <span className="ml-2 rounded-full bg-[#f1efec] px-2 py-0.5 text-[12px]">Stopped</span>}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        {cat.emoji} {cat.label}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="flex items-center gap-2.5">
                          <InstitutionAvatar name={s.institution} size={22} />
                          {s.accountName || 'No account'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-[#5f5b55]">{shortDate(s.lastDate)}</td>
                      <td className="px-4 py-3.5">{s.active ? shortDate(s.nextDate) : '—'}</td>
                      <td className={'px-4 py-3.5 text-right font-medium tabular-nums ' + (s.averageAmount < 0 ? 'text-[#23824b]' : '')}>
                        {signed(s.averageAmount)}
                      </td>
                      <td className="pr-4">
                        <RowMenu s={s} />
                      </td>
                    </tr>
                  )
                })}
                {allRows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-6 text-[15px] text-[#77736d]">
                      Nothing matches the view options.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </div>
  )
}
