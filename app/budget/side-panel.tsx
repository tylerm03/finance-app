'use client'

import { useState } from 'react'
import { Info } from 'lucide-react'
import { GROUPS } from '@/lib/budget/groups'
import { money0 } from './budget-input'
import type { BudgetRow } from './types'

const GREEN = '#2e9e64'
const RED = '#e5484d'
const MARKER = '#f2c230'

export type Block = {
  key: string
  title: string
  budget: number
  actual: number
  verb: string // "spent" or "received"
  kind: 'income' | 'expense'
  pace?: boolean // warn if spending is ahead of the calendar
}

export function BlockRow({ b, elapsed, showMarker }: { b: Block; elapsed: number; showMarker: boolean }) {
  const remaining = b.budget - b.actual
  const pct = b.budget > 0 ? Math.min(1, b.actual / b.budget) : b.actual > 0 && b.kind === 'expense' ? 1 : 0
  const over = b.kind === 'expense' && remaining < -0.005
  const ahead = b.kind === 'expense' && b.pace && showMarker && b.budget > 0 && b.actual / b.budget > elapsed + 0.05
  const remColor = b.kind === 'income' ? '#2e8f57' : over ? '#d43c3c' : ahead ? '#b7791f' : '#2e8f57'

  return (
    <div className="border-t border-[#efedea] px-5 py-4">
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <span className="text-[14px] text-[#1f1d1a]">{b.title}</span>
        <span className="text-[14px] tabular-nums text-[#77736d]">{money0(b.budget)} budget</span>
      </div>
      <div className="relative mb-2.5 h-2 rounded-full bg-[#e6e4e0]">
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: pct * 100 + '%', backgroundColor: over ? RED : GREEN }}
        />
        {showMarker && b.kind === 'expense' && elapsed > 0 && elapsed < 1 && (
          <div
            title="Today"
            className="absolute -top-0.5 h-3 w-1 rounded-sm"
            style={{ left: 'calc(' + elapsed * 100 + '% - 2px)', backgroundColor: MARKER }}
          />
        )}
      </div>
      <div className="flex items-baseline justify-between gap-3 text-[14px] tabular-nums">
        <span className="font-semibold text-[#1f1d1a]">
          {money0(b.actual)} {b.verb}
        </span>
        <span className="font-semibold" style={{ color: remColor }}>
          {over ? money0(-remaining) + ' over' : money0(remaining) + ' remaining'}
        </span>
      </div>
    </div>
  )
}

export default function SidePanel({
  rows,
  elapsed,
  isCurrentMonth,
}: {
  rows: BudgetRow[]
  elapsed: number
  isCurrentMonth: boolean
}) {
  const [tab, setTab] = useState<'summary' | 'income' | 'expenses'>('expenses')
  const income = rows.filter((r) => r.kind === 'income')
  const expenses = rows.filter((r) => r.kind === 'expense')
  const total = (rs: BudgetRow[], f: (r: BudgetRow) => number) => rs.reduce((s, r) => s + f(r), 0)

  const incomeBudget = total(income, (r) => r.budget || 0)
  const expenseBudget = total(expenses, (r) => r.budget || 0)
  const left = incomeBudget - expenseBudget
  const overBudgeted = left < -0.005

  let blocks: Block[] = []
  if (tab === 'expenses') {
    blocks = GROUPS.map((g) => {
      const rs = expenses.filter((r) => r.group === g.key)
      return {
        key: g.key,
        title: g.label,
        budget: total(rs, (r) => r.budget || 0),
        actual: total(rs, (r) => r.actual),
        verb: 'spent',
        kind: 'expense' as const,
        pace: g.key === 'flexible',
      }
    }).filter((b) => b.budget > 0 || b.actual > 0)
  } else if (tab === 'income') {
    blocks = income
      .filter((r) => r.budget || r.actual)
      .map((r) => ({ key: r.key, title: r.emoji + ' ' + r.label, budget: r.budget || 0, actual: r.actual, verb: 'received', kind: 'income' as const }))
  } else {
    blocks = [
      { key: 'in', title: 'Income', budget: incomeBudget, actual: total(income, (r) => r.actual), verb: 'received', kind: 'income' },
      { key: 'ex', title: 'Expenses', budget: expenseBudget, actual: total(expenses, (r) => r.actual), verb: 'spent', kind: 'expense', pace: true },
    ]
  }

  const net = total(income, (r) => r.actual) - total(expenses, (r) => r.actual)

  return (
    <aside className="overflow-hidden rounded-xl bg-white shadow-[0_1px_3px_rgba(30,25,20,0.06)] lg:sticky lg:top-4">
      <div className="p-4">
        <div
          className={
            'rounded-lg px-4 py-6 text-center ' + (overBudgeted ? 'bg-[#fde6e3] text-[#c8321e]' : 'bg-[#e1f3e8] text-[#23824b]')
          }
        >
          <p className="text-[32px] font-semibold tabular-nums leading-none">{money0(Math.abs(left))}</p>
          <p className="mt-2 flex items-center justify-center gap-1.5 text-[16px] font-medium">
            {overBudgeted ? 'Over budget' : 'Left to budget'}
            <span title="Budgeted income minus budgeted expenses for this month">
              <Info size={15} strokeWidth={2} />
            </span>
          </p>
        </div>

        <div className="mt-4 flex justify-center gap-1 text-[14px]">
          {(['summary', 'income', 'expenses'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={
                'rounded-full px-4 py-2 font-medium capitalize transition-colors ' +
                (tab === t ? 'bg-[#efedea] text-[#1f1d1a]' : 'text-[#77736d] hover:text-[#1f1d1a]')
              }
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {blocks.map((b) => (
        <BlockRow key={b.key} b={b} elapsed={elapsed} showMarker={isCurrentMonth} />
      ))}
      {blocks.length === 0 && (
        <p className="border-t border-[#efedea] px-5 py-6 text-center text-[14px] text-[#77736d]">Nothing budgeted yet.</p>
      )}
      {tab === 'summary' && (
        <div className="flex items-baseline justify-between border-t border-[#efedea] px-5 py-4 text-[14px]">
          <span className="text-[#1f1d1a]">Net so far</span>
          <span className="font-semibold tabular-nums" style={{ color: net < 0 ? '#d43c3c' : '#2e8f57' }}>
            {money0(net)}
          </span>
        </div>
      )}
    </aside>
  )
}
