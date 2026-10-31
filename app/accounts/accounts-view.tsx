'use client'

import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Car, ChevronDown, Home, Info, Landmark } from 'lucide-react'
import { formatMoney } from '@/lib/format'
import type { AccountGroup, AccountRow, AccountsData } from '@/lib/accounts/build'
import NetWorthChart from './net-worth-chart'
import Sparkline from './sparkline'
import HeaderActions from './header-actions'

const RANGES = [
  { key: '1m', label: '1 month', days: 30 },
  { key: '3m', label: '3 months', days: 90 },
  { key: '6m', label: '6 months', days: 182 },
  { key: '1y', label: '1 year', days: 365 },
] as const

const METRICS = [
  { key: 'net_worth', label: 'Net worth performance', title: 'Net worth' },
  { key: 'assets', label: 'Assets performance', title: 'Assets' },
  { key: 'liabilities', label: 'Liabilities performance', title: 'Liabilities' },
] as const

type RangeKey = (typeof RANGES)[number]['key']
type MetricKey = (typeof METRICS)[number]['key']

const GOOD = 'text-[#2f8f3f]'
const BAD = 'text-[#d6402b]'

function sumSeries(rows: AccountRow[], from: number, to: number): number[] {
  const out = new Array<number>(to - from + 1).fill(0)
  for (const r of rows) {
    for (let i = from; i <= to; i++) out[i - from] += r.series[i]
  }
  return out
}

// "↑ $1,826.10 (2.9%) 1 month change"
function Change({
  start,
  end,
  kind,
  periodLabel,
  size = 'md',
}: {
  start: number
  end: number
  kind: 'asset' | 'liability'
  periodLabel: string
  size?: 'md' | 'lg'
}) {
  const diff = end - start
  const up = diff >= 0
  // For debts, going down is the good direction
  const good = kind === 'liability' ? !up : up
  const pct = start !== 0 ? (diff / Math.abs(start)) * 100 : null
  const Arrow = up ? ArrowUp : ArrowDown
  const flat = Math.abs(diff) < 0.005
  const text = size === 'lg' ? 'text-[17px]' : 'text-[16px]'

  return (
    <span className={'inline-flex items-center gap-1.5 whitespace-nowrap ' + text}>
      <span className={'inline-flex items-center gap-1 font-medium ' + (flat ? 'text-[#77736d]' : good ? GOOD : BAD)}>
        {!flat && <Arrow size={size === 'lg' ? 17 : 16} strokeWidth={2.25} />}
        {formatMoney(Math.abs(diff))}
        {pct !== null && <span>({pct.toFixed(1)}%)</span>}
      </span>
      <span className="text-[#77736d]">{periodLabel} change</span>
    </span>
  )
}

const AVATAR_COLORS = ['#1f5fbf', '#0e7c86', '#6d3fc4', '#b4282e', '#0b6aa2', '#1d7a3a', '#c2501a', '#3b4a5c']

function Avatar({ row }: { row: AccountRow }) {
  if (row.avatar !== 'bank') {
    const Icon = row.avatar === 'vehicle' ? Car : row.avatar === 'home' ? Home : Landmark
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#efedea] text-[#5f5b55]">
        <Icon size={19} strokeWidth={1.75} />
      </div>
    )
  }
  const name = row.institution
  let hash = 0
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) >>> 0
  const initials = name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z0-9]/.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
  return (
    <div
      title={name}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold tracking-tight text-white"
      style={{ backgroundColor: AVATAR_COLORS[hash % AVATAR_COLORS.length] }}
    >
      {initials || '$'}
    </div>
  )
}

function GroupCard({
  group,
  from,
  to,
  periodLabel,
}: {
  group: AccountGroup
  from: number
  to: number
  periodLabel: string
}) {
  const [open, setOpen] = useState(true)
  const series = sumSeries(group.accounts, from, to)

  return (
    <section className="overflow-hidden rounded-xl bg-white shadow-[0_1px_3px_rgba(30,25,20,0.06)]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-4 px-5 py-[18px] text-left"
      >
        <ChevronDown
          size={18}
          strokeWidth={2}
          className={'shrink-0 text-[#3b3834] transition-transform ' + (open ? '' : '-rotate-90')}
        />
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-[17px] font-medium text-[#1f1d1a]">{group.label}</span>
          <Change start={series[0]} end={series[series.length - 1]} kind={group.kind} periodLabel={periodLabel} />
        </span>
        <span className="text-[17px] font-medium tabular-nums text-[#1f1d1a]">
          {formatMoney(series[series.length - 1])}
        </span>
      </button>

      {open &&
        group.accounts.map((row) => (
          <div key={row.id} className="flex items-center gap-4 border-t border-[#efedea] px-5 py-4">
            <Avatar row={row} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[16px] text-[#1f1d1a]">{row.name}</p>
              <p className="truncate text-[14px] text-[#77736d]">{row.subtitle}</p>
            </div>
            <div className="hidden w-[132px] shrink-0 md:block">
              <Sparkline values={row.series.slice(from, to + 1)} />
            </div>
            <div className="w-[150px] shrink-0 text-right">
              <p className="text-[16px] tabular-nums text-[#1f1d1a]">{formatMoney(row.balance)}</p>
              <p className="text-[14px] text-[#77736d]">{row.updatedLabel}</p>
            </div>
          </div>
        ))}
    </section>
  )
}

function SummarySection({
  title,
  groups,
  mode,
}: {
  title: string
  groups: { key: string; label: string; color: string; value: number }[]
  mode: 'totals' | 'percent'
}) {
  const total = groups.reduce((s, g) => s + g.value, 0)
  const sorted = [...groups].sort((a, b) => b.value - a.value)
  const show = (v: number) =>
    mode === 'totals' ? formatMoney(v) : (total > 0 ? (v / total) * 100 : 0).toFixed(1) + '%'

  return (
    <div className="border-t border-[#efedea] px-6 py-6">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-[17px] font-medium text-[#1f1d1a]">{title}</span>
        <span className="text-[17px] tabular-nums text-[#3b3834]">
          {mode === 'totals' ? formatMoney(total) : '100%'}
        </span>
      </div>

      <div className="mb-5 flex h-2.5 w-full overflow-hidden rounded-full bg-[#efedea]">
        {total > 0 &&
          sorted.map((g) => (
            <div
              key={g.key}
              style={{ width: (g.value / total) * 100 + '%', backgroundColor: g.color }}
              className="h-full"
            />
          ))}
      </div>

      <ul className="space-y-3">
        {sorted.map((g) => (
          <li key={g.key} className="flex items-center justify-between text-[16px]">
            <span className="flex items-center gap-3 text-[#1f1d1a]">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: g.color }} />
              {g.label}
            </span>
            <span className="tabular-nums text-[#1f1d1a]">{show(g.value)}</span>
          </li>
        ))}
        {sorted.length === 0 && <li className="text-[15px] text-[#77736d]">None</li>}
      </ul>
    </div>
  )
}

function Select<T extends string>({
  value,
  onChange,
  options,
  className = '',
}: {
  value: T
  onChange: (v: T) => void
  options: readonly { key: T; label: string }[]
  className?: string
}) {
  return (
    <div className={'relative ' + className}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="h-[46px] w-full cursor-pointer appearance-none rounded-lg border border-[#e4e1dc] bg-white pl-4 pr-10 text-[16px] text-[#1f1d1a] outline-none focus:border-[#c9c5bf]"
      >
        {options.map((o) => (
          <option key={o.key} value={o.key}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#3b3834]"
      />
    </div>
  )
}

export default function AccountsView({ data }: { data: AccountsData }) {
  const [range, setRange] = useState<RangeKey>('1m')
  const [metric, setMetric] = useState<MetricKey>('net_worth')
  const [summaryMode, setSummaryMode] = useState<'totals' | 'percent'>('totals')

  const rangeDef = RANGES.find((r) => r.key === range)!
  const metricDef = METRICS.find((m) => m.key === metric)!
  const to = data.dates.length - 1
  const from = Math.max(0, to - rangeDef.days)
  const periodLabel = rangeDef.label.replace(/s$/, '')

  const { chartData, start, end } = useMemo(() => {
    const assetRows = data.groups.filter((g) => g.kind === 'asset').flatMap((g) => g.accounts)
    const debtRows = data.groups.filter((g) => g.kind === 'liability').flatMap((g) => g.accounts)
    const assets = sumSeries(assetRows, from, to)
    const debts = sumSeries(debtRows, from, to)
    const values =
      metric === 'assets' ? assets : metric === 'liabilities' ? debts : assets.map((a, i) => a - debts[i])
    return {
      chartData: values.map((value, i) => ({ date: data.dates[from + i], value })),
      start: values[0] ?? 0,
      end: values[values.length - 1] ?? 0,
    }
  }, [data, from, to, metric])

  const summary = (kind: 'asset' | 'liability') =>
    data.groups
      .filter((g) => g.kind === kind)
      .map((g) => ({
        key: g.key,
        label: g.label,
        color: g.color,
        value: g.accounts.reduce((s, a) => s + a.balance, 0),
      }))

  return (
    <div className="min-h-full bg-[#f6f5f3] font-sans text-[#1f1d1a]">
      <header className="flex items-center justify-between gap-4 px-6 pb-3 pt-4">
        <h1 className="text-[22px] font-medium">Accounts</h1>
        <HeaderActions />
      </header>

      <div className="space-y-4 px-4 pb-8">
        {/* Net worth */}
        <section className="rounded-xl bg-white px-6 pb-5 pt-6 shadow-[0_1px_3px_rgba(30,25,20,0.06)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="mb-2 flex items-center gap-2 text-[13px] font-medium uppercase tracking-[0.12em] text-[#77736d]">
                {metricDef.title}
                <Info size={15} strokeWidth={1.75} />
              </p>
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <span className="text-[30px] font-semibold tabular-nums leading-tight">{formatMoney(end)}</span>
                <Change
                  start={start}
                  end={end}
                  kind={metric === 'liabilities' ? 'liability' : 'asset'}
                  periodLabel={periodLabel}
                  size="lg"
                />
              </div>
            </div>
            <div className="flex gap-4">
              <Select value={metric} onChange={setMetric} options={METRICS} className="w-[230px]" />
              <Select value={range} onChange={setRange} options={RANGES} className="w-[160px]" />
            </div>
          </div>

          <div className="mt-6">
            <NetWorthChart data={chartData} />
          </div>
        </section>

        {data.groups.length === 0 ? (
          <section className="rounded-xl bg-white p-8 text-center text-[#77736d] shadow-[0_1px_3px_rgba(30,25,20,0.06)]">
            No accounts yet. Use Add account to connect a bank.
          </section>
        ) : (
          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,2.3fr)_minmax(300px,1fr)]">
            <div className="space-y-4">
              {data.groups.map((g) => (
                <GroupCard key={g.key} group={g} from={from} to={to} periodLabel={periodLabel} />
              ))}
            </div>

            <aside className="overflow-hidden rounded-xl bg-white shadow-[0_1px_3px_rgba(30,25,20,0.06)] lg:sticky lg:top-4">
              <div className="flex items-center justify-between px-6 py-4">
                <span className="text-[17px] font-medium">Summary</span>
                <div className="flex text-[15px]">
                  {(['totals', 'percent'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setSummaryMode(m)}
                      className={
                        'rounded-full px-5 py-2 font-medium capitalize transition-colors ' +
                        (summaryMode === m ? 'bg-[#f1efec] text-[#1f1d1a]' : 'text-[#77736d] hover:text-[#1f1d1a]')
                      }
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <SummarySection title="Assets" groups={summary('asset')} mode={summaryMode} />
              <SummarySection title="Liabilities" groups={summary('liability')} mode={summaryMode} />
            </aside>
          </div>
        )}
      </div>
    </div>
  )
}
