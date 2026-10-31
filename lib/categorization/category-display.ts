// Friendly names and emoji for the category codes stored on transactions.
const DISPLAY: Record<string, { label: string; emoji: string }> = {
  INCOME: { label: 'Income', emoji: '💵' },
  TRANSFER_IN: { label: 'Transfer In', emoji: '🔁' },
  TRANSFER_OUT: { label: 'Transfer Out', emoji: '🔁' },
  LOAN_PAYMENTS: { label: 'Loan Payments', emoji: '🏦' },
  BANK_FEES: { label: 'Bank Fees', emoji: '🧾' },
  ENTERTAINMENT: { label: 'Entertainment', emoji: '🎬' },
  FOOD_AND_DRINK: { label: 'Food & Drink', emoji: '🍔' },
  GENERAL_MERCHANDISE: { label: 'Shopping', emoji: '🛍️' },
  HOME_IMPROVEMENT: { label: 'Home Improvement', emoji: '🔨' },
  MEDICAL: { label: 'Medical', emoji: '💊' },
  PERSONAL_CARE: { label: 'Personal Care', emoji: '💅' },
  GENERAL_SERVICES: { label: 'Services', emoji: '🧰' },
  GOVERNMENT_AND_NON_PROFIT: { label: 'Government & Non-Profit', emoji: '🏛️' },
  TRANSPORTATION: { label: 'Transportation', emoji: '🚗' },
  TRAVEL: { label: 'Travel & Vacation', emoji: '🏝️' },
  RENT_AND_UTILITIES: { label: 'Rent & Utilities', emoji: '🏠' },
  OTHER_EXPENSE: { label: 'Other', emoji: '📦' },
  EXCLUDED: { label: 'Hidden', emoji: '🙈' },
}

export function categoryDisplay(code: string | null | undefined) {
  if (!code) return { label: 'Uncategorized', emoji: '❔' }
  return DISPLAY[code] || { label: code.replaceAll('_', ' ').toLowerCase(), emoji: '📦' }
}
