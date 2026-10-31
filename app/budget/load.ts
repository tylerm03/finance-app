import { createClient } from '@/lib/supabase/server'
import { classify, expenseGroup, incomeSource, INCOME_SOURCE_LIST } from '@/lib/reports/compute'
import { BUDGET_EXPENSE_CATEGORIES, defaultGroup, type BudgetGroup } from '@/lib/budget/groups'
import { categoryDisplay } from '@/lib/categorization/category-display'
import { loadTransactions } from '../transactions/load'
import type { Txn } from '../transactions/types'
import type { BudgetData, BudgetRow } from './types'

function pad(n: number) {
  return String(n).padStart(2, '0')
}

// Budget rows for a month (YYYY-MM, default this month). Shared by the Budget
// page and the Dashboard. Pass transactions in if you've already loaded them.
export async function loadBudget(monthParam?: string, given?: Txn[]): Promise<BudgetData> {
  const now = new Date()
  const thisMonth = now.getFullYear() + '-' + pad(now.getMonth() + 1)
  const month = monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : thisMonth

  const [y, m] = month.split('-').map(Number)
  const daysInMonth = new Date(y, m, 0).getDate()
  const monthStart = month + '-01'
  const monthEnd = month + '-' + pad(daysInMonth)

  const elapsed =
    month < thisMonth ? 1 : month > thisMonth ? 0 : (now.getDate() - 1 + now.getHours() / 24) / daysInMonth

  const supabase = await createClient()
  const [loaded, budgetsRes, groupsRes] = await Promise.all([
    given ? Promise.resolve({ transactions: given, error: null }) : loadTransactions({ from: monthStart, to: monthEnd }, 20000),
    supabase
      .from('budgets')
      .select('month, category, amount')
      .lte('month', monthStart)
      .order('month', { ascending: false })
      .limit(5000),
    supabase.from('budget_categories').select('category, grp'),
  ])

  // The tables don't exist until the setup SQL has been run
  const tableMissing = (e: { code?: string; message?: string } | null) =>
    !!e && (e.code === '42P01' || e.code === 'PGRST205' || /does not exist|schema cache/i.test(e.message || ''))
  const setupNeeded = tableMissing(budgetsRes.error) || tableMissing(groupsRes.error)

  // This month's budget, or the most recent earlier month's if this one isn't set yet
  const budgetByKey = new Map<string, number>()
  for (const b of budgetsRes.data || []) {
    if (!budgetByKey.has(b.category)) budgetByKey.set(b.category, Number(b.amount))
  }

  const groupByCategory = new Map<string, BudgetGroup>()
  for (const g of groupsRes.data || []) groupByCategory.set(g.category, g.grp as BudgetGroup)

  const { transactions, error } = loaded
  const actualByKey = new Map<string, number>()
  for (const t of transactions) {
    if (t.date < monthStart || t.date > monthEnd) continue
    const kind = classify(t)
    if (kind === 'skip') continue
    const key = kind === 'income' ? 'income:' + incomeSource(t).key : expenseGroup(t).key
    actualByKey.set(key, (actualByKey.get(key) || 0) + (kind === 'income' ? -t.amount : t.amount))
  }

  const rows: BudgetRow[] = [
    ...INCOME_SOURCE_LIST.map((s) => {
      const key = 'income:' + s.key
      return {
        key,
        kind: 'income' as const,
        group: 'income' as const,
        label: s.label,
        emoji: s.emoji,
        budget: budgetByKey.has(key) ? budgetByKey.get(key)! : null,
        actual: actualByKey.get(key) || 0,
      }
    }),
    ...[...BUDGET_EXPENSE_CATEGORIES, '__none__'].map((c) => {
      const d = c === '__none__' ? categoryDisplay(null) : categoryDisplay(c)
      return {
        key: c,
        kind: 'expense' as const,
        group: groupByCategory.get(c) || defaultGroup(c),
        label: d.label,
        emoji: d.emoji,
        budget: budgetByKey.has(c) ? budgetByKey.get(c)! : null,
        actual: actualByKey.get(c) || 0,
      }
    }),
  ]

  const data: BudgetData = {
    month,
    monthStart,
    elapsed,
    isCurrentMonth: month === thisMonth,
    rows,
    setupNeeded,
    error: error || (!setupNeeded && (budgetsRes.error?.message || groupsRes.error?.message)) || null,
  }

  return data
}
