import { CATEGORIES } from './categories'

// Categories mirror Plaid's own primary personal_finance_category
// values directly. No translation, no special-casing.
export function mapPlaidCategory(plaidCategory: {
  primary?: string
  detailed?: string
} | null): string {
  if (!plaidCategory?.primary) return 'OTHER_EXPENSE'
  return CATEGORIES.includes(plaidCategory.primary) ? plaidCategory.primary : 'OTHER_EXPENSE'
}
