export type BudgetGroup = 'fixed' | 'flexible' | 'non_monthly'

export const GROUPS: { key: BudgetGroup; label: string; desc: string }[] = [
  { key: 'fixed', label: 'Fixed', desc: 'Same amount every month, like rent or loan payments' },
  { key: 'flexible', label: 'Flexible', desc: 'Day-to-day spending that changes month to month' },
  { key: 'non_monthly', label: 'Non-Monthly', desc: "Costs that don't happen every month, like travel" },
]

// Starting group for each spending category until you change it in Settings
const DEFAULTS: Record<string, BudgetGroup> = {
  RENT_AND_UTILITIES: 'fixed',
  LOAN_PAYMENTS: 'fixed',
  BANK_FEES: 'fixed',
  TRAVEL: 'non_monthly',
  MEDICAL: 'non_monthly',
  HOME_IMPROVEMENT: 'non_monthly',
  GOVERNMENT_AND_NON_PROFIT: 'non_monthly',
}

export function defaultGroup(category: string): BudgetGroup {
  return DEFAULTS[category] || 'flexible'
}

// Spending categories that can be budgeted (not income, transfers or hidden)
export const BUDGET_EXPENSE_CATEGORIES = [
  'RENT_AND_UTILITIES',
  'LOAN_PAYMENTS',
  'BANK_FEES',
  'FOOD_AND_DRINK',
  'GENERAL_MERCHANDISE',
  'TRANSPORTATION',
  'ENTERTAINMENT',
  'PERSONAL_CARE',
  'GENERAL_SERVICES',
  'OTHER_EXPENSE',
  'TRAVEL',
  'MEDICAL',
  'HOME_IMPROVEMENT',
  'GOVERNMENT_AND_NON_PROFIT',
]
