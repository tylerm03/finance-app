// Formats a number as money with thousands separators, e.g. 1385 -> "$1,385.00"
export function formatMoney(amount: number): string {
  const value = Number(amount) || 0
  return '$' + value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
