// A loose "same payer / same merchant" key that ignores the numbers banks
// stuff into descriptions, e.g. "ACME CORP PAYROLL PPD ID: 98213 10/15"
// and "ACME CORP PAYROLL PPD ID: 98214 11/01" both become "acme corp payroll ppd id".
export function matchKey(merchantName: string | null | undefined, description: string | null | undefined) {
  const text = (merchantName || description || '').toLowerCase()
  return text
    .replace(/[0-9]+/g, ' ')
    .replace(/[^a-z]+/g, ' ')
    .split(' ')
    .filter((w) => w.length > 1)
    .join(' ')
    .trim()
}
