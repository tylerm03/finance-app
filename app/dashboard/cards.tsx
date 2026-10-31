'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight } from 'lucide-react'
import { Area, ComposedChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatMoney } from '@/lib/format'
import { categoryDisplay } from '@/lib/categorization/category-display'
import { GROUPS } from '@/lib/budget/groups'
import { occurrencesForMonth, type Occurrence, type Stream } from '@/lib/recurring/detect'
import NetWorthChart from '../accounts/net-worth-chart'
import { BlockRow, type Block } from '../budget/side-panel'
import { MerchantLogo } from '../transactions/transactions-view'
import EditDrawer from '../transactions/edit-drawer'
import type { Txn } from '../transactions/types'
import type { AccountsData } from '@/lib/accounts/build'
import type { BudgetData } from '../budget/types'
import type { Holding, SpendingSeries } from './types'

export const CARD = 'overflow-hidden rounded-xl bg-white shadow-[0_1px_3px_rgba(30,25,20,0.06)]'
const GREEN = 'text-[#2e8f57]'
const RED = 'text-[#d43c3c]'

function money0(v: number) {
  return (v < 0 ? '-' : '') + '$' + Math.round(Math.abs(v)).toLocaleString('en-US')
}

function CardHeader({ title, subtitle, right }: { title: React.ReactNode; subtitle?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex min-h-[68px] items-center justify-between gap-4 border-b border-[#efedea] px-5 py-3">
      <p className="flex min-w-0 flex-wrap items-baseline gap-x-2 text-[18px] font-semibold">
        {title}
        {subtitle && <span className="text-[16px] font-medium text-[#77736d]">{subtitle}</span>}
      </p>
      {right}
    </div>
  )
}

function Select<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <div className="relative shrink-0">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="h-10 cursor-pointer appearance-none rounded-lg border border-[#e4e1dc] bg-white pl-3.5 pr-10 text-[15px] text-[#1f1d1a] outline-none hover:bg-[#faf9f7] focus:border-[#c9c5bf]"
      >
        {options.map(([k, l]) => (
          <option key={k} value={k}>
            {l}
          </option>
        ))}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2" />
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="px-5 py-8 text-center text-[15px] text-[#77736d]">{children}</div>
}

/* ---------------- Budget ---------------- */

export function BudgetCard({ budget }: { budget: BudgetData }) {
  const [mode, setMode] = useState<'expenses' | 'income'>('expenses')
  const month = new Date(budget.month + '-01T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const rows = budget.rows
  const sum = (rs: typeof rows, f: (r: (typeof rows)[number]) => number) => rs.reduce((s, r) => s + f(r), 0)

  const blocks: Block[] =
    mode === 'expenses'
      ? GROUPS.map((g) => {
          const rs = rows.filter((r) => r.kind === 'expense' && r.group === g.key)
          return { key: g.key, title: g.label, budget: sum(rs, (r) => r.budget || 0), actual: sum(rs, (r) => r.actual), verb: 'spent', kind: 'expense' as const, pace: g.key === 'flexible' }
        }).filter((b) => b.budget > 0 || b.actual > 0)
      : rows
          .filter((r) => r.kind === 'income' && (r.budget || r.actual))
          .map((r) => ({ key: r.key, title: r.emoji + ' ' + r.label, budget: r.budget || 0, actual: r.actual, verb: 'received', kind: 'income' as const }))

  const nothingBudgeted = !rows.some((r) => r.budget)

  return (
    <section className={CARD}>
      <CardHeader
        title={<Link href="/budget" className="hover:underline">Budget</Link>}
        subtitle={month}
        right={<Select value={mode} onChange={setMode} options={[['expenses', 'Expenses'], ['income', 'Income']]} />}
      />
      {budget.setupNeeded || nothingBudgeted ? (
        <Empty>
          No budget set for this month yet.{' '}
          <Link href="/budget" className="font-medium text-orange-500 hover:text-orange-600">
            Set up your budget
          </Link>
        </Empty>
      ) : blocks.length === 0 ? (
        <Empty>Nothing to show yet.</Empty>
      ) : (
        <div className="-mt-px">
          {blocks.map((b) => (
            <BlockRow key={b.key} b={b} elapsed={budget.elapsed} showMarker={budget.isCurrentMonth} />
          ))}
        </div>
      )}
    </section>
  )
}

/* ---------------- Net worth ---------------- */

const RANGES: [string, string, number][] = [
  ['1m', '1 month', 30],
  ['3m', '3 months', 90],
  ['6m', '6 months', 182],
  ['1y', '1 year', 365],
]

export function NetWorthCard({ data }: { data: AccountsData }) {
  const [range, setRange] = useState('1m')
  const days = RANGES.find((r) => r[0] === range)![2]
  const to = data.dates.length - 1
  const from = Math.max(0, to - days)

  const series = useMemo(() => {
    const out: { date: string; value: number }[] = []
    for (let i = from; i <= to; i++) {
      let v = 0
      for (const g of data.groups) for (const a of g.accounts) v += (g.kind === 'liability' ? -1 : 1) * a.series[i]
      out.push({ date: data.dates[i], value: v })
    }
    return out
  }, [data, from, to])

  const start = series[0]?.value ?? 0
  const end = series[series.length - 1]?.value ?? 0
  const diff = end - start
  const pct = start !== 0 ? (diff / Math.abs(start)) * 100 : 0
  const Arrow = diff >= 0 ? ArrowUp : ArrowDown

  return (
    <section className={CARD}>
      <CardHeader
        title={
          <Link href="/accounts" className="hover:underline">
            {formatMoney(end)} net worth
          </Link>
        }
        subtitle={
          <span className={'inline-flex items-center gap-1 ' + (diff >= 0 ? GREEN : RED)}>
            <Arrow size={15} strokeWidth={2.5} />
            {formatMoney(Math.abs(diff))} ({pct.toFixed(Math.abs(pct) < 1 ? 1 : 0)}%)
          </span>
        }
        right={<Select value={range} onChange={setRange} options={RANGES.map(([k, l]) => [k, l])} />}
      />
      {data.groups.length === 0 ? (
        <Empty>
          No accounts yet. <Link href="/accounts" className="font-medium text-orange-500">Add an account</Link>
        </Empty>
      ) : (
        <div className="px-3 pb-3 pt-5">
          <NetWorthChart data={series} maxLabels={8} />
        </div>
      )}
    </section>
  )
}

/* ---------------- Spending ---------------- */

function compactAxis(v: number) {
  if (v >= 1000) return '$' + +(v / 1000).toFixed(1) + 'K'
  return '$' + Math.round(v)
}

export function SpendingCard({ s }: { s: SpendingSeries }) {
  const [compare, setCompare] = useState<'lastMonth' | 'lastYear'>('lastMonth')
  const other = compare === 'lastMonth' ? s.lastMonth : s.lastYear
  const otherLabel = compare === 'lastMonth' ? s.lastMonthLabel : s.lastYearLabel
  const total = s.thisMonth[s.thisMonth.length - 1] || 0
  const days = Math.max(other.length, new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate())
  const data = Array.from({ length: days }, (_, i) => ({
    day: i + 1,
    current: i < s.thisMonth.length ? s.thisMonth[i] : null,
    other: i < other.length ? other[i] : null,
  }))
  const sameDayOther = other[Math.min(s.thisMonth.length, other.length) - 1] || 0
  const delta = total - sameDayOther

  return (
    <section className={CARD}>
      <CardHeader
        title={
          <Link href="/reports" className="hover:underline">
            Spending
          </Link>
        }
        subtitle={money0(total) + ' this month'}
        right={
          <Select
            value={compare}
            onChange={setCompare}
            options={[
              ['lastMonth', 'This month vs. last month'],
              ['lastYear', 'This month vs. last year'],
            ]}
          />
        }
      />
      <div className="px-3 pb-2 pt-5">
        <ResponsiveContainer width="100%" height={230}>
          <ComposedChart data={data} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff8237" stopOpacity={0.55} />
                <stop offset="100%" stopColor="#ff8237" stopOpacity={0.35} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#ecebe8" />
            <XAxis
              dataKey="day"
              tickFormatter={(d) => 'Day ' + d}
              ticks={data.filter((d) => d.day % 3 === 0 || d.day === days).map((d) => d.day)}
              axisLine={false}
              tickLine={false}
              tickMargin={10}
              tick={{ fill: '#77736d', fontSize: 12 }}
            />
            <YAxis tickFormatter={compactAxis} axisLine={false} tickLine={false} width={54} tick={{ fill: '#77736d', fontSize: 12 }} tickCount={5} />
            <Tooltip
              formatter={(v, n) => [formatMoney(Number(v)), n === 'current' ? s.monthLabel : otherLabel]}
              labelFormatter={(d) => 'Day ' + d}
              contentStyle={{ borderRadius: 8, border: '1px solid #e4e1dc', fontSize: 13 }}
            />
            <Area type="linear" dataKey="current" stroke="#ff8237" strokeWidth={3} fill="url(#spendFill)" dot={false} connectNulls={false} isAnimationActive={false} />
            <Line type="linear" dataKey="other" stroke="#8a8680" strokeWidth={2.5} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 pb-2 pt-1 text-[12px] text-[#5f5b55]">
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded bg-[#8a8680]" />
            {otherLabel}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded bg-orange-500" />
            This month
          </span>
          {other.length > 0 && (
            <span className={delta > 0 ? RED : GREEN}>
              {money0(Math.abs(delta))} {delta > 0 ? 'more' : 'less'} than by this day in {otherLabel.split(' ')[0]}
            </span>
          )}
        </div>
      </div>
    </section>
  )
}

/* ---------------- Transactions ---------------- */

export function TransactionsCard({ recent, merchants }: { recent: Txn[]; merchants: string[] }) {
  const [filter, setFilter] = useState<'all' | 'expenses' | 'income'>('all')
  const [editing, setEditing] = useState<Txn | null>(null)
  const rows = recent.filter((t) => (filter === 'all' ? true : filter === 'income' ? t.amount < 0 : t.amount > 0)).slice(0, 5)

  return (
    <section className={CARD}>
      <CardHeader
        title={
          <Link href="/transactions" className="hover:underline">
            Transactions
          </Link>
        }
        subtitle="Most recent"
        right={
          <Select
            value={filter}
            onChange={setFilter}
            options={[
              ['all', 'All transactions'],
              ['expenses', 'Expenses'],
              ['income', 'Income'],
            ]}
          />
        }
      />
      {rows.length === 0 && <Empty>No transactions yet.</Empty>}
      {rows.map((t, i) => {
        const cat = categoryDisplay(t.category)
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => setEditing(t)}
            className={
              'grid w-full grid-cols-[minmax(0,1fr)_minmax(0,1fr)_130px_18px] items-center gap-4 px-5 py-3 text-left text-[15px] hover:bg-[#faf9f7] ' +
              (i ? 'border-t border-[#f1efec]' : '')
            }
          >
            <span className="flex min-w-0 items-center gap-3">
              <MerchantLogo t={t} />
              <span className="truncate">{t.merchant}</span>
            </span>
            <span className={'flex min-w-0 items-center gap-2 ' + (t.category ? '' : 'text-[#d6402b]')}>
              <span className="shrink-0">{cat.emoji}</span>
              <span className="truncate">{cat.label}</span>
            </span>
            <span className="flex items-center justify-end gap-3">
              {t.pending && (
                <span title="Pending" className="flex h-6 w-6 items-center justify-center rounded-full bg-[#f1efec] text-[11px] font-semibold text-[#5f5b55]">
                  P
                </span>
              )}
              <span className={'tabular-nums ' + (t.amount < 0 ? GREEN : '')}>
                {t.amount < 0 ? '+' : ''}
                {formatMoney(Math.abs(t.amount))}
              </span>
            </span>
            <ChevronRight size={18} />
          </button>
        )
      })}
      {editing && <EditDrawer txns={[editing]} merchants={merchants} onClose={() => setEditing(null)} onDone={() => setEditing(null)} />}
    </section>
  )
}

/* ---------------- Recurring ---------------- */

function iso(d: Date) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

function dueLabel(o: Occurrence, today: string) {
  if (o.status === 'overdue') return 'Not seen yet'
  if (o.date === today) return 'Today'
  const t = new Date(today + 'T00:00:00')
  t.setDate(t.getDate() + 1)
  if (o.date === iso(t)) return 'Tomorrow'
  return new Date(o.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function RecurringCard({ streams }: { streams: Stream[] }) {
  const [range, setRange] = useState<'month' | '7' | '30'>('month')
  const now = new Date()
  const today = iso(now)
  const y = now.getFullYear()
  const m = now.getMonth() + 1
  const next = new Date(y, m, 1)

  const all = [
    ...occurrencesForMonth(streams, y, m, today),
    ...occurrencesForMonth(streams, next.getFullYear(), next.getMonth() + 1, today),
  ].filter((o) => o.status !== 'paid' && o.stream.active)

  const end =
    range === 'month'
      ? iso(new Date(y, m, 0))
      : iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() + Number(range)))
  const due = all
    .filter((o) => o.date <= end && (o.status === 'overdue' || o.date >= today))
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .filter((o, i, list) => list.findIndex((x) => x.stream.key === o.stream.key) === i)
  const remaining = due.filter((o) => o.amount > 0).reduce((s, o) => s + o.amount, 0)

  return (
    <section className={CARD}>
      <CardHeader
        title={
          <Link href="/recurring" className="hover:underline">
            Recurring
          </Link>
        }
        subtitle={money0(remaining) + ' remaining due'}
        right={
          <Select
            value={range}
            onChange={setRange}
            options={[
              ['month', 'This month'],
              ['7', 'Next 7 days'],
              ['30', 'Next 30 days'],
            ]}
          />
        }
      />
      {due.length === 0 && <Empty>{streams.length ? 'Nothing else due.' : 'No recurring payments found yet.'}</Empty>}
      {due.slice(0, 5).map((o, i) => {
        const cat = categoryDisplay(o.stream.category)
        return (
          <div key={o.stream.key} className={'flex items-center gap-3.5 px-5 py-3.5 ' + (i ? 'border-t border-[#f1efec]' : '')}>
            <MerchantLogo
              t={{ merchant: o.stream.merchant, logo: o.stream.logo } as Txn}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[16px] font-medium">{o.stream.merchant}</p>
              <p className="truncate text-[14px] text-[#77736d]">
                {cat.label} • Every month
              </p>
            </div>
            <div className="text-right">
              <p className={'text-[16px] font-medium tabular-nums ' + (o.amount < 0 ? GREEN : '')}>
                {o.amount < 0 ? '+' : ''}
                {formatMoney(Math.abs(o.amount))}
              </p>
              <p className={'text-[14px] ' + (o.status === 'overdue' ? 'text-[#8a6100]' : 'text-[#77736d]')}>{dueLabel(o, today)}</p>
            </div>
          </div>
        )
      })}
      {due.length > 5 && (
        <Link href="/recurring" className="block border-t border-[#f1efec] px-5 py-3 text-center text-[14px] font-medium text-orange-500 hover:text-orange-600">
          View all {due.length}
        </Link>
      )}
    </section>
  )
}

/* ---------------- Investments ---------------- */

export function InvestmentsCard({ total, holdings }: { total: number; holdings: Holding[] }) {
  const sum = holdings.reduce((s, h) => s + h.value, 0) || 1
  return (
    <section className={CARD}>
      <CardHeader
        title={
          <Link href="/savings" className="hover:underline">
            {formatMoney(total)} investments
          </Link>
        }
      />
      <p className="bg-[#f4f3f1] px-5 py-2.5 text-[14px] text-[#5f5b55]">Top holdings</p>
      {holdings.length === 0 && <Empty>No holdings synced yet.</Empty>}
      {holdings.slice(0, 5).map((h, i) => (
        <div key={h.key} className={'flex items-center gap-3.5 px-5 py-3 ' + (i ? 'border-t border-[#f1efec]' : '')}>
          <span className="flex h-9 min-w-12 items-center justify-center rounded-lg bg-[#f1efec] px-2 text-[12px] font-semibold text-[#3b3834]">
            {(h.ticker || h.name).slice(0, 5).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px]">{h.name}</p>
            <div className="mt-1.5 h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-[#ecebe8]">
              <div className="h-full rounded-full bg-[#7dd8f6]" style={{ width: (h.value / sum) * 100 + '%' }} />
            </div>
          </div>
          <div className="text-right">
            <p className="text-[15px] tabular-nums">{formatMoney(h.value)}</p>
            <p className="text-[13px] text-[#77736d]">{((h.value / sum) * 100).toFixed(1)}%</p>
          </div>
        </div>
      ))}
    </section>
  )
}
