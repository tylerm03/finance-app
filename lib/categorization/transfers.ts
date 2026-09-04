// Detects credit card payment transactions — both sides of the pair.
// Plaid reliably tags the actual debit ("PAYMENT TO CHASE CARD...")
// with detailed = LOAN_PAYMENTS_CREDIT_CARD_PAYMENT, but issuers often
// post a SECOND matching "Thank You" / confirmation line item that
// Plaid gives no category data for at all. That second one has to be
// caught by description pattern instead, or it slips through as
// phantom income every single time you pay a card.
export function isCreditCardPayment(t: {
  description?: string | null
  merchant_name?: string | null
  plaid_category?: { detailed?: string } | null
}): boolean {
  if (t.plaid_category?.detailed === 'LOAN_PAYMENTS_CREDIT_CARD_PAYMENT') return true

  const text = ((t.description || '') + ' ' + (t.merchant_name || '')).toLowerCase()

  const patterns = [
    /payment.*thank you/,
    /thank you.*payment/,
    /^payment to .*card/,
    /automatic payment/,
    /\bautopay\b/,
    /online payment.*thank you/,
  ]

  return patterns.some((p) => p.test(text))
}
