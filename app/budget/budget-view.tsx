'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, ChevronDown, Eye, EyeOff, Settings } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { GROUPS } from '@/lib/budget/groups'
import BudgetInput, { money0 } from './budget-input'
import SidePanel from './side-panel'
import SettingsDrawer from './settings-drawer'
import SetupCard from './setup-card'
import PageTabs from './page-tabs'
import type { BudgetData, BudgetRow } from './types'

const COLS = 'grid grid-cols-[minmax(0,1fr)_150px_130px_140px]'
const CARD = 'overflow-hidden rounded-xl bg-white shadow-[0_1px_3px_rgba(30,25,20,0.06)]'
const GREEN = '#2e9e64'
const RED = '#e5484d'

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
}

function monthTitle(month: string) {
  return new Date(month + '-01T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export function remainingOf(r: { kind: 'income' | 'expense'; budget: number | null; actual: number }) {
  return (r.budget || 0) - r.actual
}

function Pill({ value, kind }: { value: number; kind: 'income' | 'expense' }) {
  const zero = Math.round(value) === 0
  const good = kind === 'income' || value > 0
  const cls = zero
    ? 'bg-[#ecebe8] text-[#77736d]'
    : good
      ? 'bg-[#e1f3e8] text-[#2e8f57]'
      : 'bg-[#fde6e3] text-[#d43c3c]'
  return (
    <span className={'inline-flex h-7 items-center rounded-full px-2.5 text-[15px] font-medium tabular-nums ' + cls}>
      {money0(value)}
    </span>
  )
}

function TotalText({ value, kind, className = '' }: { value: number; kind: 'income' | 'expense'; className?: string }) {
  const color = Math.round(value) === 0 ? '#77736d' : kind === 'income' || value > 0 ? '#2e8f57' : '#d43c3c'
  return (
    <span className={'tabular-nums ' + className} style={{ color }}>
      {money0(value)}
    </span>
  )
}

function ProgressBar({ row }: { row: BudgetRow }) {
  const budget = row.budget || 0
  const over = row.kind === 'expense' && row.actual > budget + 0.005
  const pct = budget > 0 ? Math.min(1, Math.max(0, row.actual / budget)) : row.actual > 0 && row.kind === 'expense' ? 1 : 0
  return (
    <div className="relative col-span-3 h-[3px] bg-[#e6e4e0]">
      <div className="absolute inset-y-0 left-0" style={{ width: pct * 100 + '%', backgroundColor: over ? RED : GREEN }} />
    </div>
  )
}

function Row({ row, onSave, disabled }: { row: BudgetRow; onSave: (key: string, v: number) => void; disabled: boolean }) {
  return (
    <div className="border-t border-[#f1efec]">
      <div className={COLS + ' items-center'}>
        <div className="flex h-[49px] min-w-0 items-center gap-3 border-r border-[#efedea] px-5">
          <span className="w-5 shrink-0 text-center text-[16px] leading-none">{row.emoji}</span>
          <span className="min-w-0">
            <span className="block truncate text-[15px] text-[#1f1d1a]">{row.label}</span>
            {row.autofillFrom && (
              <span className="block truncate text-[12px] text-[#8a8680]">Filled from {row.autofillFrom}&apos;s income</span>
            )}
          </span>
        </div>
        <div className="flex justify-end pr-4">
          <BudgetInput value={row.budget} disabled={disabled} onSave={(v) => onSave(row.key, v)} />
        </div>
        <div className="pr-5 text-right text-[15px] tabular-nums text-[#1f1d1a]">{money0(row.actual)}</div>
        <div className="flex justify-end pr-4">
          <Pill value={remainingOf(row)} kind={row.kind} />
        </div>
      </div>
      <div className={COLS}>
        <div className="border-r border-[#efedea]" />
        <ProgressBar row={row} />
      </div>
    </div>
  )
}

function sum(rows: BudgetRow[], f: (r: BudgetRow) => number) {
  return rows.reduce((s, r) => s + f(r), 0)
}

// A row is tucked away when it has no budget and nothing happened in it this month
const isHidden = (r: BudgetRow) => !r.budget && Math.abs(r.actual) < 0.005

function GroupCard({
  title,
  rows,
  kind,
  onSave,
  disabled,
  showAllByDefault,
}: {
  title: string
  rows: BudgetRow[]
  kind: 'income' | 'expense'
  onSave: (key: string, v: number) => void
  disabled: boolean
  showAllByDefault: boolean
}) {
  const [open, setOpen] = useState(true)
  const [showHidden, setShowHidden] = useState(showAllByDefault)
  const visible = rows.filter((r) => showHidden || !isHidden(r))
  const hiddenCount = rows.filter(isHidden).length
  const budget = sum(rows, (r) => r.budget || 0)
  const actual = sum(rows, (r) => r.actual)

  return (
    <section className={CARD}>
      <div className={COLS + ' items-center'}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex h-[52px] min-w-0 items-center gap-3 border-r border-[#efedea] px-5 text-left"
        >
          <ChevronDown size={16} strokeWidth={2.25} className={'shrink-0 transition-transform ' + (open ? '' : '-rotate-90')} />
          <span className="truncate text-[17px] font-semibold">{title}</span>
        </button>
        <span className="pr-5 text-right text-[17px] font-semibold tabular-nums">{money0(budget)}</span>
        <span className="pr-5 text-right text-[17px] font-semibold tabular-nums">{money0(actual)}</span>
        <TotalText value={budget - actual} kind={kind} className="pr-5 text-right text-[17px] font-semibold" />
      </div>

      {open && (
        <>
          {visible.map((r) => (
            <Row key={r.key} row={r} onSave={onSave} disabled={disabled} />
          ))}
          {hiddenCount > 0 && (
            <div className={COLS + ' border-t border-[#f1efec]'}>
              <button
                type="button"
                onClick={() => setShowHidden(!showHidden)}
                className="flex h-[46px] items-center gap-3 border-r border-[#efedea] px-5 text-left text-[14px] text-[#77736d] hover:text-[#1f1d1a]"
              >
                {showHidden ? <EyeOff size={16} /> : <Eye size={16} />}
                {(showHidden ? 'Hide ' : 'Show ') + hiddenCount + ' unbudgeted'}
              </button>
              <span className="col-span-3" />
            </div>
          )}
        </>
      )}
    </section>
  )
}

function SectionHeader({ title, open, onToggle }: { title: string; open: boolean; onToggle: () => void }) {
  return (
    <div className={COLS + ' h-10 items-center rounded-lg bg-[#ebe9e5] text-[14px] text-[#77736d]'}>
      <button type="button" onClick={onToggle} className="flex items-center gap-3 px-5 text-left">
        <ChevronDown size={15} strokeWidth={2.25} className={'transition-transform ' + (open ? '' : '-rotate-90')} />
        {title}
      </button>
      <span className="pr-5 text-right">Budget</span>
      <span className="pr-5 text-right">Actual</span>
      <span className="pr-5 text-right">Remaining</span>
    </div>
  )
}

function TotalCard({ title, rows, kind }: { title: string; rows: BudgetRow[]; kind: 'income' | 'expense' }) {
  const budget = sum(rows, (r) => r.budget || 0)
  const actual = sum(rows, (r) => r.actual)
  return (
    <section className={CARD + ' ' + COLS + ' items-center'}>
      <span className="flex h-[54px] items-center border-r border-[#efedea] px-5 text-[17px] font-semibold">{title}</span>
      <span className="pr-5 text-right text-[17px] font-semibold tabular-nums">{money0(budget)}</span>
      <span className="pr-5 text-right text-[17px] font-semibold tabular-nums">{money0(actual)}</span>
      <TotalText value={budget - actual} kind={kind} className="pr-5 text-right text-[17px] font-semibold" />
    </section>
  )
}

export default function BudgetView({ data }: { data: BudgetData }) {
  const router = useRouter()
  const [overrides, setOverrides] = useState<Record<string, number>>({})
  const [incomeOpen, setIncomeOpen] = useState(true)
  const [expensesOpen, setExpensesOpen] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const rows = useMemo(
    () => data.rows.map((r) => (r.key in overrides ? { ...r, budget: overrides[r.key], autofillFrom: null } : r)),
    [data.rows, overrides]
  )
  const incomeRows = rows.filter((r) => r.kind === 'income')
  const expenseRows = rows.filter((r) => r.kind === 'expense')
  // Nothing budgeted yet: show every category so there's something to fill in
  const firstTime = !data.rows.some((r) => r.budget && !r.autofillFrom)
  const disabled = data.setupNeeded

  async function save(key: string, amount: number) {
    setOverrides((o) => ({ ...o, [key]: amount }))
    setSaveError(null)
    const { error } = await createClient()
      .from('budgets')
      .upsert(
        { month: data.monthStart, category: key, amount, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,month,category' }
      )
    if (error) setSaveError("Couldn't save: " + error.message)
    else router.refresh()
  }

  const go = (month: string) => router.push('/budget' + (month ? '?month=' + month : ''))

  return (
    <div className="min-h-full bg-[#f6f5f3] font-sans text-[#1f1d1a]">
      <header className="flex flex-wrap items-center justify-between gap-4 px-6 pb-3 pt-4">
        <div className="flex items-center gap-7">
          <h1 className="text-[22px] font-medium">{monthTitle(data.month)}</h1>
          <PageTabs active="budget" />
        </div>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Previous month" onClick={() => go(shiftMonth(data.month, -1))} className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-[#ebe9e5]">
            <ArrowLeft size={19} strokeWidth={2} />
          </button>
          <button type="button" aria-label="Next month" onClick={() => go(shiftMonth(data.month, 1))} className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-[#ebe9e5]">
            <ArrowRight size={19} strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => go('')}
            disabled={data.isCurrentMonth}
            className="ml-1 h-10 rounded-lg border border-[#e4e1dc] bg-white px-4 text-[15px] font-medium hover:bg-[#faf9f7] disabled:opacity-60"
          >
            Today
          </button>
          <span className="mx-2 h-6 w-px bg-[#d9d6d1]" />
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            disabled={disabled}
            className="flex h-10 items-center gap-2 rounded-lg border border-[#e4e1dc] bg-white px-4 text-[15px] font-medium hover:bg-[#faf9f7] disabled:opacity-60"
          >
            <Settings size={16} strokeWidth={2} />
            Settings
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 items-start gap-4 px-4 pb-8 lg:grid-cols-[minmax(0,1fr)_330px]">
        <div className="space-y-3">
          {data.setupNeeded && <SetupCard />}
          {data.error && <p className={CARD + ' p-5 text-[15px] text-[#d6402b]'}>{data.error}</p>}
          {saveError && <p className={CARD + ' p-4 text-[15px] text-[#d6402b]'}>{saveError}</p>}

          <SectionHeader title="Income" open={incomeOpen} onToggle={() => setIncomeOpen(!incomeOpen)} />
          {incomeOpen && (
            <GroupCard title="Income" rows={incomeRows} kind="income" onSave={save} disabled={disabled} showAllByDefault={firstTime} />
          )}
          <TotalCard title="Total Income" rows={incomeRows} kind="income" />

          <div className="pt-2" />
          <SectionHeader title="Expenses" open={expensesOpen} onToggle={() => setExpensesOpen(!expensesOpen)} />
          {expensesOpen &&
            GROUPS.map((g) => {
              const groupRows = expenseRows.filter((r) => r.group === g.key)
              if (groupRows.length === 0) return null
              return (
                <GroupCard
                  key={g.key}
                  title={g.label}
                  rows={groupRows}
                  kind="expense"
                  onSave={save}
                  disabled={disabled}
                  showAllByDefault={firstTime}
                />
              )
            })}
          <TotalCard title="Total Expenses" rows={expenseRows} kind="expense" />
        </div>

        <SidePanel rows={rows} elapsed={data.elapsed} isCurrentMonth={data.isCurrentMonth} />
      </div>

      {settingsOpen && (
        <SettingsDrawer
          rows={expenseRows}
          onClose={() => setSettingsOpen(false)}
          onSaved={() => {
            setSettingsOpen(false)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}

