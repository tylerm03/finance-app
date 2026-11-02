import type { BudgetGroup } from '@/lib/budget/groups'

export type BudgetRow = {
  key: string // category code, or "income:<source>"
  kind: 'income' | 'expense'
  group: 'income' | BudgetGroup
  label: string
  emoji: string
  budget: number | null // null = never budgeted
  actual: number
  autofillFrom: string | null // e.g. "October" when the budget is last month's actual income
}

export type BudgetData = {
  month: string // YYYY-MM
  monthStart: string // YYYY-MM-01
  // How far through the month we are: 0 for future months, 1 for past ones
  elapsed: number
  isCurrentMonth: boolean
  rows: BudgetRow[]
  setupNeeded: boolean
  error: string | null
}
