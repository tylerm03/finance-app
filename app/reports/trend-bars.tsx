'use client'

import { Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatMoney } from '@/lib/format'
import type { Bucket } from '@/lib/reports/compute'

export const GREEN = '#2e9e64'
export const RED = '#e5484d'

export type Tab = 'cashflow' | 'spending' | 'income'
export type BarMode = 'stacked' | 'side'

function money(v: number) {
  return (v < 0 ? '-' : '') + formatMoney(Math.abs(v))
}

type Row = Bucket & { expensesBar: number }

function TrendTooltip({ active, payload, tab }: { active?: boolean; payload?: { payload: Row }[]; tab: Tab }) {
  if (!active || !payload?.length) return null
  const r = payload[0].payload
  const line = (label: string, v: number, color?: string) => (
    <div className="flex justify-between gap-6 text-[14px]">
      <span className="text-[#77736d]">{label}</span>
      <span className="tabular-nums" style={{ color }}>{money(v)}</span>
    </div>
  )
  return (
    <div className="min-w-[200px] rounded-lg border border-[#e4e1dc] bg-white px-3 py-2 shadow-sm">
      <p className="mb-1 text-[14px] font-medium text-[#1f1d1a]">{r.label}</p>
      {tab !== 'spending' && line('Income', r.income, GREEN)}
      {tab !== 'income' && line('Expenses', r.expenses, RED)}
      {tab === 'cashflow' && line('Net', r.net)}
    </div>
  )
}

export default function TrendBars({ data, tab, mode }: { data: Bucket[]; tab: Tab; mode: BarMode }) {
  if (data.length === 0) {
    return <div className="flex h-[300px] items-center justify-center text-[15px] text-[#77736d]">No income or spending in this range.</div>
  }

  const stacked = tab === 'cashflow' && mode === 'stacked'
  const rows: Row[] = data.map((b) => ({ ...b, expensesBar: stacked ? -b.expenses : b.expenses }))
  const avg =
    tab === 'cashflow'
      ? data.reduce((s, b) => s + b.net, 0) / data.length
      : tab === 'income'
        ? data.reduce((s, b) => s + b.income, 0) / data.length
        : data.reduce((s, b) => s + b.expenses, 0) / data.length

  return (
    <div data-chart="trend" className="w-full">
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={rows} stackOffset={stacked ? 'sign' : undefined} margin={{ top: 10, right: 24, bottom: 0, left: 0 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke="#ecebe8" />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tickMargin={12} tick={{ fill: '#77736d', fontSize: 13 }} />
          <YAxis
            tickFormatter={money}
            axisLine={false}
            tickLine={false}
            width={96}
            tickMargin={10}
            tickCount={4}
            tick={{ fill: '#77736d', fontSize: 13 }}
          />
          <Tooltip content={<TrendTooltip tab={tab} />} cursor={{ fill: '#f4f3f1' }} />
          {tab !== 'spending' && <Bar dataKey="income" stackId={stacked ? 'a' : undefined} fill={GREEN} isAnimationActive={false} />}
          {tab !== 'income' && <Bar dataKey="expensesBar" stackId={stacked ? 'a' : undefined} fill={RED} isAnimationActive={false} />}
          <ReferenceLine y={avg} stroke="#3b3834" strokeDasharray="4 4" strokeOpacity={0.7} />
          {tab === 'cashflow' && (
            <Line type="linear" dataKey="net" stroke="#1f1d1a" strokeWidth={3} dot={false} activeDot={{ r: 5, fill: '#1f1d1a', stroke: '#ffffff', strokeWidth: 2 }} isAnimationActive={false} />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
