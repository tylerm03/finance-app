// Maps Plaid's primary personal_finance_category to our own taxonomy.
export const plaidCategoryMap: Record<string, string> = {
  INCOME: 'Income',
  TRANSFER_IN: 'Income',
  TRANSFER_OUT: 'Other',
  LOAN_PAYMENTS: 'Debt Payments',
  BANK_FEES: 'Other',
  ENTERTAINMENT: 'Entertainment',
  FOOD_AND_DRINK: 'Dining',
  GENERAL_MERCHANDISE: 'Shopping',
  HOME_IMPROVEMENT: 'Other',
  MEDICAL: 'Health',
  PERSONAL_CARE: 'Health',
  GENERAL_SERVICES: 'Other',
  GOVERNMENT_AND_NON_PROFIT: 'Other',
  TRANSPORTATION: 'Transport',
  TRAVEL: 'Travel',
  RENT_AND_UTILITIES: 'Utilities',
}

// Detailed sub-category overrides — these win over the primary mapping.
// Only credit card payments specifically get isolated as "Transfer"
// (excluded from spend/income totals) — that's the one Plaid category
// that always represents paying down a balance you already spent on
// the card, never a new expense or real income. Generic transfers
// (savings contributions, moving money between your own accounts)
// keep their normal categorization rather than being lumped in.
export const plaidDetailedOverrides: Record<string, string> = {
  FOOD_AND_DRINK_GROCERIES: 'Groceries',
  FOOD_AND_DRINK_COFFEE: 'Dining',
  FOOD_AND_DRINK_RESTAURANT: 'Dining',
  GENERAL_MERCHANDISE_CLOTHING_AND_ACCESSORIES: 'Clothing',
  ENTERTAINMENT_TV_AND_MOVIES: 'Subscriptions',
  ENTERTAINMENT_MUSIC_AND_AUDIO: 'Subscriptions',
  RENT_AND_UTILITIES_RENT: 'Rent',
  LOAN_PAYMENTS_CREDIT_CARD_PAYMENT: 'Transfer',
}

export function mapPlaidCategory(plaidCategory: {
  primary?: string
  detailed?: string
} | null): string {
  if (!plaidCategory) return 'Other'

  if (plaidCategory.detailed && plaidDetailedOverrides[plaidCategory.detailed]) {
    return plaidDetailedOverrides[plaidCategory.detailed]
  }

  if (plaidCategory.primary && plaidCategoryMap[plaidCategory.primary]) {
    return plaidCategoryMap[plaidCategory.primary]
  }

  return 'Other'
}
