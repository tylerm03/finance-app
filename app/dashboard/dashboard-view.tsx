'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { LayoutGrid } from 'lucide-react'
import { BudgetCard, CARD, InvestmentsCard, NetWorthCard, RecurringCard, SpendingCard, TransactionsCard } from './cards'
import type { DashboardData } from './types'
import SchwabBanner from '../schwab-banner'

const WIDGETS = [
  ['budget', 'Budget'],
  ['networth', 'Net worth'],
  ['spending', 'Spending'],
  ['transactions', 'Transactions'],
  ['recurring', 'Recurring'],
  ['investments', 'Investments'],
] as const
type WidgetKey = (typeof WIDGETS)[number][0]

// Which cards you've hidden, remembered in this browser
const STORAGE_KEY = 'dashboard-hidden'
const listeners = new Set<() => void>()
function readHidden(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || ''
  } catch {
    return ''
  }
}
function writeHidden(keys: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, keys.join(','))
  } catch {}
  listeners.forEach((l) => l())
}
function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

function Customize({ hidden }: { hidden: string[] }) {
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
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-10 items-center gap-2 rounded-lg border border-[#e4e1dc] bg-white px-4 text-[15px] font-medium hover:bg-[#faf9f7]"
      >
        <LayoutGrid size={16} />
        Customize
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-30 w-60 rounded-xl border border-[#e4e1dc] bg-white p-1.5 shadow-xl">
          <p className="px-3 pb-1 pt-2 text-[13px] font-medium text-[#77736d]">Show on dashboard</p>
          {WIDGETS.map(([k, label]) => (
            <label key={k} className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-[15px] hover:bg-[#f6f5f3]">
              {label}
              <input
                type="checkbox"
                checked={!hidden.includes(k)}
                onChange={(e) => writeHidden(e.target.checked ? hidden.filter((h) => h !== k) : [...hidden, k])}
                className="h-4 w-4 accent-orange-500"
              />
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

export default function DashboardView({ data }: { data: DashboardData }) {
  const hiddenRaw = useSyncExternalStore(subscribe, readHidden, () => '')
  const hidden = hiddenRaw ? hiddenRaw.split(',') : []
  const show = (k: WidgetKey) => !hidden.includes(k)

  const left = [
    show('budget') && <BudgetCard key="budget" budget={data.budget} />,
    show('networth') && <NetWorthCard key="networth" data={data.accounts} />,
  ].filter(Boolean)
  const right = [
    show('spending') && <SpendingCard key="spending" s={data.spending} />,
    show('transactions') && <TransactionsCard key="transactions" recent={data.recent} merchants={data.merchants} />,
    show('recurring') && <RecurringCard key="recurring" streams={data.streams} />,
    show('investments') && <InvestmentsCard key="investments" total={data.investmentsTotal} dayChange={data.investmentsDayChange} holdings={data.holdings} />,
  ].filter(Boolean)

  return (
    <div className="min-h-full bg-[#f6f5f3] font-sans text-[#1f1d1a]">
      <header className="flex items-center justify-between gap-4 px-6 pb-3 pt-4">
        <h1 className="text-[22px] font-semibold">{data.name ? 'Welcome back, ' + data.name + '!' : 'Welcome back!'}</h1>
        <Customize hidden={hidden} />
      </header>

      <div className="px-4 pb-8">
        {data.error && <p className={CARD + ' mb-4 p-5 text-[15px] text-[#d6402b]'}>{data.error}</p>}
        <div className="mb-4 empty:hidden">
          <SchwabBanner status={data.schwab} />
        </div>
        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
          <div className="space-y-4">{left}</div>
          <div className="space-y-4">{right}</div>
        </div>
        {left.length + right.length === 0 && (
          <p className={CARD + ' p-8 text-center text-[15px] text-[#77736d]'}>All cards are hidden. Use Customize to bring some back.</p>
        )}
      </div>
    </div>
  )
}
