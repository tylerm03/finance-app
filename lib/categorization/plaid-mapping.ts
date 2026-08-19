// Maps Plaid's primary personal_finance_category to our own taxonomy.
// Plaid's full list has ~16 primary categories; this covers all of them.
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

// Plaid's detailed sub-category catches things the primary category
// blurs together — this overrides the primary mapping when matched.
export const plaidDetailedOverrides: Record<string, string> = {
  FOOD_AND_DRINK_GROCERIES: 'Groceries',
  FOOD_AND_DRINK_COFFEE: 'Dining',
  FOOD_AND_DRINK_RESTAURANT: 'Dining',
  GENERAL_MERCHANDISE_CLOTHING_AND_ACCESSORIES: 'Clothing',
  ENTERTAINMENT_TV_AND_MOVIES: 'Subscriptions',
  ENTERTAINMENT_MUSIC_AND_AUDIO: 'Subscriptions',
  RENT_AND_UTILITIES_RENT: 'Rent',
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
