'use client'

import { useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, ChevronRight, Download } from 'lucide-react'
import { formatMoney } from '@/lib/format'
import { categoryDisplay } from '@/lib/categorization/category-display'
import { buildReport, buildSeries, classify, expenseGroup, incomeSource, type Period, type Slice } from '@/lib/reports/compute'
import InstitutionAvatar from '../institution-avatar'
import { BTN, DateButton, FiltersButton, presets } from '../transactions/top-bar'
import { MerchantLogo } from '../transactions/transactions-view'
import EditDrawer from '../transactions/edit-drawer'
import type { AccountOption, Txn, TxnParams } from '../transactions/types'
import Sankey from './sankey'
import TrendBars, { type BarMode, type Tab } from './trend-bars'
import ViewPicker, { type PickerOption } from './view-picker'
import { downloadSummaryPng, downloadSvgAsPng } from './download'
import ChargesModal from './charges-modal'

const CARD = 'rounded-xl bg-white shadow-[0_1px_3px_rgba(30,25,20,0.06)]'
const GREEN_TEXT = 'text-[#2e8f57]'
const RED_TEXT = 'text-[#d43c3c]'

const TABS: { key: Tab; label: string }[] = [
  { key: 'cashflow', label: 'Cash Flow' },
  { key: 'spending', label: 'Spending' },
  { key: 'income', label: 'Income' },
]

const CHART_OPTIONS: PickerOption<'sankey' | 'bars'>[] = [
  { key: 'sankey', label: 'Sankey', desc: 'Visualize your cash flow streams', thumb: 'sankey' },
  { key: 'bars', label: 'Trend Bars', desc: 'Track your behavior over time', thumb: 'bars' },
]

const LOWER_OPTIONS: PickerOption<'transactions' | 'breakdown'>[] = [
  { key: 'transactions', label: 'Transactions', desc: 'Every transaction in the range', thumb: 'list' },
  { key: 'breakdown', label: 'Breakdown', desc: 'Income & expenses, biggest to smallest', thumb: 'breakdown' },
]

function Dropdown<T extends string>({
  value,
  options,
  onChange,
  icon,
}: {
  value: T
  options: { key: T; label: string }[]
  onChange: (v: T) => void
  icon?: React.ReactNode
}) {
  return (
    <div className="relative">
      {icon && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#1f1d1a]">{icon}</span>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className={
          'h-11 cursor-pointer appearance-none rounded-lg border border-[#e4e1dc] bg-white pr-10 text-[16px] font-medium text-[#1f1d1a] outline-none hover:bg-[#faf9f7] focus:border-[#c9c5bf] ' +
          (icon ? 'pl-10' : 'pl-4')
        }
      >
        {options.map((o) => (
          <option key={o.key} value={o.key}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown size={17} strokeWidth={2.25} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#1f1d1a]" />
    </div>
  )
}

function StackedIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="7" width="3" height="8" rx="0.5" />
      <rect x="6.5" y="3" width="3" height="12" rx="0.5" />
      <rect x="12" y="9" width="3" height="6" rx="0.5" />
    </svg>
  )
}

function Divider() {
  return <span className="mx-1 h-6 w-px bg-[#d9d6d1]" />
}

function Kpi({ value, label, color }: { value: string; label: string; color?: string }) {
  return (
    <div className={CARD + ' px-5 py-6 text-center'}>
      <p
        className={
          'truncate font-semibold tabular-nums leading-tight ' +
          (/^[-+$\d]/.test(value) ? 'text-[26px] ' : 'text-[21px] py-[3px] ') +
          (color || 'text-[#1f1d1a]')
        }
      >
        {value}
      </p>
      <p className="mt-2 text-[13px] font-medium uppercase tracking-[0.12em] text-[#77736d]">{label}</p>
    </div>
  )
}

function BreakdownSection({
  title,
  slices,
  tone,
  onSelect,
}: {
  title: string
  slices: Slice[]
  tone: 'green' | 'red'
  onSelect: (s: Slice) => void
}) {
  const max = slices[0]?.value || 1
  const fill = tone === 'green' ? '#cde9d8' : '#f7cfd3'
  const edge = tone === 'green' ? '#a9d8bd' : '#efb0b7'
  return (
    <div className="mb-6">
      <p className="mb-3 text-[17px] font-semibold text-[#1f1d1a]">{title}</p>
      {slices.length === 0 && <p className="text-[15px] text-[#77736d]">Nothing in this range.</p>}
      <div className="space-y-1.5">
        {slices.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => onSelect(s)}
            className="group relative flex h-11 w-full items-center justify-between rounded-md px-3 text-left"
          >
            <span
              className="absolute inset-y-0 left-0 rounded-md transition-[filter] group-hover:brightness-95"
              style={{ width: Math.max((s.value / max) * 100, 0.6) + '%', backgroundColor: fill, borderLeft: '3px solid ' + edge }}
            />
            <span className="relative flex min-w-0 items-center gap-2.5 text-[15px] text-[#1f1d1a]">
              <span className="text-[16px] leading-none">{s.emoji}</span>
              <span className="truncate group-hover:underline">{s.label}</span>
            </span>
            <span className="relative shrink-0 pl-4 text-[15px] tabular-nums text-[#1f1d1a]">
              {formatMoney(s.value)} <span className="text-[#8a8680]">({s.pct.toFixed(1)}%)</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

function longDate(day: string) {
  return new Date(day + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function shortDate(day: string) {
  return new Date(day + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function rangeLabel(params: TxnParams) {
  if (!params.from && !params.to) return 'All time'
  const match = presets().find((p) => p.from === (params.from || '') && p.to === (params.to || ''))
  if (match) return match.label
  if (params.from && params.to) return shortDate(params.from) + ' – ' + shortDate(params.to)
  return params.from ? 'Since ' + shortDate(params.from) : 'Through ' + shortDate(params.to!)
}

const SORTS = [
  { key: 'date_desc', label: 'Date (newest first)' },
  { key: 'date_asc', label: 'Date (oldest first)' },
  { key: 'amount_desc', label: 'Amount (largest first)' },
  { key: 'amount_asc', label: 'Amount (smallest first)' },
] as const
type SortKey = (typeof SORTS)[number]['key']

function TransactionList({ txns, onOpen }: { txns: Txn[]; onOpen: (t: Txn) => void }) {
  const [limit, setLimit] = useState(150)
  const shown = txns.slice(0, limit)
  const groups: { date: string | null; rows: Txn[] }[] = []
  for (const t of shown) {
    const last = groups[groups.length - 1]
    if (last && last.date === t.date) last.rows.push(t)
    else groups.push({ date: t.date, rows: [t] })
  }

  if (txns.length === 0) {
    return <p className="border-t border-[#efedea] px-6 py-10 text-center text-[16px] text-[#77736d]">No transactions in this range.</p>
  }

  return (
    <div>
      {groups.map((g, gi) => {
        const net = -g.rows.reduce((s, t) => s + t.amount, 0)
        return (
          <div key={g.date! + gi}>
            <div className="flex items-center justify-between bg-[#f4f3f1] px-6 py-3.5 text-[15px] font-medium text-[#77736d]">
              <span>{longDate(g.date!)}</span>
              <span className="tabular-nums">
                {net > 0 ? '+' : ''}
                {formatMoney(Math.abs(net))}
              </span>
            </div>
            {g.rows.map((t) => {
              const cat = categoryDisplay(t.category)
              const income = t.amount < 0
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onOpen(t)}
                  className="grid w-full grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,1.25fr)_130px_20px] items-center gap-4 border-t border-[#f1efec] px-6 py-[15px] text-left text-[17px] hover:bg-[#faf9f7]"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <MerchantLogo t={t} />
                    <span className="truncate">{t.merchant}</span>
                  </span>
                  <span className={'flex min-w-0 items-center gap-2 ' + (t.category ? '' : 'text-[#d6402b]')}>
                    <span className="shrink-0 leading-none">{cat.emoji}</span>
                    <span className="truncate">{cat.label}</span>
                  </span>
                  <span className="flex min-w-0 items-center gap-2.5">
                    <InstitutionAvatar name={t.institution} size={26} />
                    <span className="truncate">{t.accountName || 'No account'}</span>
                  </span>
                  <span className={'text-right tabular-nums ' + (income ? GREEN_TEXT : '')}>
                    {income ? '+' : ''}
                    {formatMoney(Math.abs(t.amount))}
                  </span>
                  <ChevronRight size={20} strokeWidth={2} />
                </button>
              )
            })}
          </div>
        )
      })}
      {txns.length > limit && (
        <div className="border-t border-[#efedea] p-4 text-center">
          <button type="button" onClick={() => setLimit(limit + 150)} className={BTN + ' mx-auto'}>
            Show more ({txns.length - limit} left)
          </button>
        </div>
      )}
    </div>
  )
}

function SortMenu({ value, onChange }: { value: SortKey; onChange: (v: SortKey) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative" onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setOpen(false)}>
      <button type="button" onClick={() => setOpen(!open)} className={BTN}>
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
                onChange(s.key)
                setOpen(false)
              }}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[15px] hover:bg-[#f6f5f3]"
            >
              {s.label}
              {value === s.key && <Check size={16} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ReportsView({
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
  const [tab, setTab] = useState<Tab>('cashflow')
  const [chart, setChart] = useState<'sankey' | 'bars'>('sankey')
  const [period, setPeriod] = useState<Period>('monthly')
  const [barMode, setBarMode] = useState<BarMode>('stacked')
  const [lower, setLower] = useState<'transactions' | 'breakdown'>('breakdown')
  const [groupBy, setGroupBy] = useState<'category' | 'merchant'>('category')
  const [sort, setSort] = useState<SortKey>('date_desc')
  const [editing, setEditing] = useState<Txn | null>(null)
  // The stream / bar whose charges are shown in the pop-up
  const [charges, setCharges] = useState<{
    label: string
    emoji: string
    kind: 'income' | 'expense'
    by: 'category' | 'merchant'
    keys: string[]
  } | null>(null)
  const chartRef = useRef<HTMLDivElement>(null)

  const report = useMemo(() => buildReport(transactions), [transactions])
  const series = useMemo(() => buildSeries(report.included, period), [report, period])
  const months = useMemo(() => Math.max(1, buildSeries(report.included, 'monthly').length), [report])

  const label = rangeLabel(params)
  const activeChart = tab === 'cashflow' ? chart : 'bars'

  // Merchant grouping for the breakdown
  const merchantSlices = useMemo(() => {
    const make = (kind: 'income' | 'expense') => {
      const map = new Map<string, number>()
      for (const t of report.included) {
        if (classify(t) !== kind) continue
        map.set(t.merchant, (map.get(t.merchant) || 0) + (kind === 'income' ? -t.amount : t.amount))
      }
      const rows = [...map.entries()].filter(([, v]) => v > 0.005).sort((a, b) => b[1] - a[1])
      const total = rows.reduce((s, [, v]) => s + v, 0)
      return rows.slice(0, 40).map(([m, v]) => ({ key: m, label: m, emoji: kind === 'income' ? '💵' : '🏪', value: v, pct: (v / total) * 100 }))
    }
    return { income: make('income'), expense: make('expense') }
  }, [report])

  const incomeSlices = groupBy === 'category' ? report.incomeSlices : merchantSlices.income
  const expenseSlices = groupBy === 'category' ? report.expenseSlices : merchantSlices.expense

  const listTxns = useMemo(() => {
    const rows = report.included.filter((t) => {
      if (tab === 'cashflow') return true
      return classify(t) === (tab === 'income' ? 'income' : 'expense')
    })
    const sorted = [...rows]
    if (sort === 'date_desc') sorted.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    if (sort === 'date_asc') sorted.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    if (sort === 'amount_desc') sorted.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
    if (sort === 'amount_asc') sorted.sort((a, b) => Math.abs(a.amount) - Math.abs(b.amount))
    return sorted
  }, [report, tab, sort])

  const merchants = useMemo(() => [...new Set(transactions.map((t) => t.merchant))].sort(), [transactions])

  // Charges behind the clicked stream or bar
  const chargeTxns = useMemo(() => {
    if (!charges) return []
    return report.included.filter((t) => {
      if (classify(t) !== charges.kind) return false
      if (charges.by === 'merchant') return charges.keys.includes(t.merchant)
      const key = charges.kind === 'income' ? incomeSource(t).key : expenseGroup(t).key
      return charges.keys.includes(key)
    })
  }, [charges, report])

  // Link to the same transactions on the Transactions page (one spending category only)
  const chargesHref = (() => {
    if (!charges || charges.kind !== 'expense' || charges.by !== 'category' || charges.keys.length !== 1) return null
    const q = new URLSearchParams()
    q.set('category', charges.keys[0] === '__none__' ? '__uncategorized__' : charges.keys[0])
    if (params.from) q.set('from', params.from)
    if (params.to) q.set('to', params.to)
    if (params.account) q.set('account', params.account)
    return '/transactions?' + q.toString()
  })()

  // KPI cards and summary rows for each tab
  const expenseCount = report.included.filter((t) => classify(t) === 'expense').length
  const incomeCount = report.included.filter((t) => classify(t) === 'income').length
  const topExpense = report.expenseSlices[0]
  const topIncome = report.incomeSlices[0]
  const rate = report.savingsRate === null ? '—' : report.savingsRate.toFixed(1) + '%'

  const kpis: { value: string; label: string; color?: string }[] =
    tab === 'cashflow'
      ? [
          { value: formatMoney(report.income), label: 'Total income', color: GREEN_TEXT },
          { value: formatMoney(report.expenses), label: 'Total expenses', color: RED_TEXT },
          { value: (report.net < 0 ? '-' : '') + formatMoney(Math.abs(report.net)), label: 'Total net income' },
          { value: rate, label: 'Savings rate' },
        ]
      : tab === 'spending'
        ? [
            { value: formatMoney(report.expenses), label: 'Total spending', color: RED_TEXT },
            { value: formatMoney(report.expenses / months), label: 'Average per month' },
            { value: topExpense ? topExpense.emoji + ' ' + topExpense.label : '—', label: 'Top category' },
            { value: String(expenseCount), label: 'Transactions' },
          ]
        : [
            { value: formatMoney(report.income), label: 'Total income', color: GREEN_TEXT },
            { value: formatMoney(report.income / months), label: 'Average per month' },
            { value: topIncome ? topIncome.emoji + ' ' + topIncome.label : '—', label: 'Top source' },
            { value: String(incomeCount), label: 'Transactions' },
          ]

  const summaryRows: [string, string, string?][] =
    tab === 'cashflow'
      ? [
          ['Total income', '+' + formatMoney(report.income), '#2e8f57'],
          ['Total spending', formatMoney(report.expenses)],
          ['Net cash flow', (report.net < 0 ? '-' : '') + formatMoney(Math.abs(report.net))],
          ['Savings rate', rate],
        ]
      : tab === 'spending'
        ? [
            ['Total spending', formatMoney(report.expenses)],
            ['Average per month', formatMoney(report.expenses / months)],
            ['Top category', topExpense ? topExpense.label : '—'],
            ['Transactions', String(expenseCount)],
          ]
        : [
            ['Total income', '+' + formatMoney(report.income), '#2e8f57'],
            ['Average per month', formatMoney(report.income / months)],
            ['Top source', topIncome ? topIncome.label : '—'],
            ['Transactions', String(incomeCount)],
          ]

  const tabName = TABS.find((t) => t.key === tab)!.label

  return (
    <div className="min-h-full bg-[#f6f5f3] font-sans text-[#1f1d1a]">
      <header className="flex flex-wrap items-center justify-between gap-4 px-6 pb-3 pt-4">
        <div className="flex items-center gap-7">
          <h1 className="text-[22px] font-medium">Reports</h1>
          <nav className="flex gap-6">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={
                  'border-b-2 pb-1 pt-1.5 text-[17px] font-medium transition-colors ' +
                  (tab === t.key ? 'border-orange-500 text-orange-500' : 'border-transparent text-[#77736d] hover:text-[#1f1d1a]')
                }
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <DateButton params={params} basePath="/reports" />
          <FiltersButton params={params} accounts={accounts} basePath="/reports" />
        </div>
      </header>

      <div className="space-y-4 px-4 pb-8">
        {error && <p className={CARD + ' p-5 text-[15px] text-[#d6402b]'}>Error loading transactions: {error}</p>}

        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {kpis.map((k) => (
            <Kpi key={k.label} {...k} />
          ))}
        </div>

        {/* Chart */}
        <section className={CARD + ' px-6 pb-6 pt-6'}>
          <h2 className="mb-4 text-[19px] font-medium">{label}</h2>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            {tab === 'cashflow' ? (
              <ViewPicker value={chart} options={CHART_OPTIONS} onChange={setChart} />
            ) : (
              <ViewPicker value="bars" options={CHART_OPTIONS.filter((o) => o.key === 'bars')} onChange={() => {}} />
            )}
            <div className="flex items-center gap-3">
              {activeChart === 'bars' && (
                <>
                  <Dropdown
                    value={period}
                    onChange={setPeriod}
                    options={[
                      { key: 'monthly', label: 'Monthly' },
                      { key: 'quarterly', label: 'Quarterly' },
                      { key: 'yearly', label: 'Yearly' },
                    ]}
                  />
                  {tab === 'cashflow' && (
                    <>
                      <Divider />
                      <Dropdown
                        value={barMode}
                        onChange={setBarMode}
                        icon={<StackedIcon />}
                        options={[
                          { key: 'stacked', label: 'Stacked' },
                          { key: 'side', label: 'Side by side' },
                        ]}
                      />
                    </>
                  )}
                  <Divider />
                </>
              )}
              <button
                type="button"
                title="Download PNG"
                onClick={() => downloadSvgAsPng(chartRef.current, tabName.toLowerCase().replace(' ', '-') + '-' + activeChart + '.png')}
                className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#e4e1dc] bg-white hover:bg-[#faf9f7]"
              >
                <Download size={18} strokeWidth={2} />
              </button>
            </div>
          </div>
          <div ref={chartRef}>
            {activeChart === 'sankey' ? (
              <Sankey
                incomeSlices={report.incomeSlices}
                expenseSlices={report.expenseSlices}
                income={report.income}
                expenses={report.expenses}
                onSelectExpense={(keys, label, emoji) => setCharges({ label, emoji, kind: 'expense', by: 'category', keys })}
              />
            ) : (
              <TrendBars data={series} tab={tab} mode={barMode} />
            )}
          </div>
        </section>

        {/* Breakdown / transactions + summary */}
        <div className={lower === 'breakdown' ? 'grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]' : ''}>
          <section className={CARD + ' overflow-hidden'}>
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5">
              <ViewPicker value={lower} options={LOWER_OPTIONS} onChange={setLower} />
              {lower === 'breakdown' ? (
                <Dropdown
                  value={groupBy}
                  onChange={setGroupBy}
                  options={[
                    { key: 'category', label: 'By category' },
                    { key: 'merchant', label: 'By merchant' },
                  ]}
                />
              ) : (
                <SortMenu value={sort} onChange={setSort} />
              )}
            </div>

            {lower === 'breakdown' ? (
              <div className="px-6 pb-2">
                {tab !== 'spending' && (
                  <BreakdownSection
                    title="Income"
                    slices={incomeSlices}
                    tone="green"
                    onSelect={(sl) => setCharges({ label: sl.label, emoji: sl.emoji, kind: 'income', by: groupBy, keys: [sl.key] })}
                  />
                )}
                {tab !== 'income' && (
                  <BreakdownSection
                    title="Expenses"
                    slices={expenseSlices}
                    tone="red"
                    onSelect={(sl) => setCharges({ label: sl.label, emoji: sl.emoji, kind: 'expense', by: groupBy, keys: [sl.key] })}
                  />
                )}
              </div>
            ) : (
              <TransactionList txns={listTxns} onOpen={setEditing} />
            )}
          </section>

          {lower === 'breakdown' && (
            <aside className={CARD + ' lg:sticky lg:top-4'}>
              <p className="px-6 pb-4 pt-5 text-[19px] font-medium">Summary</p>
              <div className="border-t border-[#efedea] px-6 py-5">
                <p className="mb-4 flex items-center gap-2 text-[15px] font-medium">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <rect x="3" y="5" width="18" height="16" rx="2" />
                    <path d="M3 10h18M8 3v4M16 3v4" />
                  </svg>
                  {label}
                </p>
                <dl className="space-y-4">
                  {summaryRows.map(([k, v, color]) => (
                    <div key={k} className="flex items-center justify-between gap-4">
                      <dt className="text-[15px] text-[#77736d]">{k}</dt>
                      <dd className="truncate text-[17px] tabular-nums" style={{ color: color || '#1f1d1a' }}>
                        {v}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div className="border-t border-[#efedea] px-6 py-4 text-center">
                <button
                  type="button"
                  onClick={() => downloadSummaryPng(tabName + ' summary', label, summaryRows, tabName.toLowerCase().replace(' ', '-') + '-summary.png')}
                  className="text-[16px] font-medium text-[#1a8fb0] hover:text-[#13708a]"
                >
                  Download PNG
                </button>
              </div>
            </aside>
          )}
        </div>
      </div>

      {charges && (
        <ChargesModal
          title={charges.label}
          emoji={charges.by === 'category' ? charges.emoji : ''}
          subtitle={label}
          kind={charges.kind}
          txns={chargeTxns}
          href={chargesHref}
          onClose={() => setCharges(null)}
          onOpenTxn={setEditing}
        />
      )}
      {editing && (
        <EditDrawer txns={[editing]} merchants={merchants} onClose={() => setEditing(null)} onDone={() => setEditing(null)} />
      )}
    </div>
  )
}

