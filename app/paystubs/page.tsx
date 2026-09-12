import { createClient } from '@/lib/supabase/server'
import AddPaystubForm from './add-paystub-form'
import DeletePaystubButton from './delete-paystub-button'
import TaxEstimate from './tax-estimate'
import { formatMoney } from '@/lib/format'

const PERIODS_PER_YEAR: Record<string, number> = {
  weekly: 52,
  biweekly: 26,
  semimonthly: 24,
  monthly: 12,
}

export default async function PaystubsPage() {
  const supabase = await createClient()

  const { data: paystubs, error } = await supabase
    .from('paystubs')
    .select('*')
    .order('pay_date', { ascending: false })

  const { data: taxSettings } = await supabase
    .from('user_tax_settings')
    .select('*')
    .maybeSingle()

  if (error) {
    return (
      <div className="min-h-screen bg-white p-6 text-gray-900">
        <p className="rounded border border-red-300 bg-red-50 p-3 text-red-600">
          Error loading paystubs: {error.message}
        </p>
      </div>
    )
  }

  // Convert each paystub into a monthly-equivalent figure based on its
  // pay frequency, then average those — so mixing weekly and biweekly
  // entries (e.g. after a job change) still produces a sane average.
  const monthlyEquivalents = (paystubs || []).map((p) => {
    const periodsPerYear = PERIODS_PER_YEAR[p.pay_frequency] || 26
    const monthlyFactor = periodsPerYear / 12
    return {
      gross: Number(p.gross_pay) * monthlyFactor,
      net: Number(p.net_pay) * monthlyFactor,
    }
  })

  const avgMonthlyGross =
    monthlyEquivalents.length > 0
      ? monthlyEquivalents.reduce((s, m) => s + m.gross, 0) / monthlyEquivalents.length
      : 0

  const avgMonthlyNet =
    monthlyEquivalents.length > 0
      ? monthlyEquivalents.reduce((s, m) => s + m.net, 0) / monthlyEquivalents.length
      : 0

  const annualGrossIncome = Math.round(avgMonthlyGross * 12)

  return (
    <div className="min-h-screen bg-white p-6 text-gray-900">
      <h1 className="mb-6 text-2xl font-semibold">Paystubs</h1>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Average monthly pre-tax income</p>
          <p className="text-3xl font-semibold tabular-nums text-gray-900">
            {formatMoney(avgMonthlyGross)}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Average monthly post-tax income</p>
          <p className="text-3xl font-semibold tabular-nums text-green-600">
            {formatMoney(avgMonthlyNet)}
          </p>
        </div>
      </div>

      {annualGrossIncome > 0 && (
        <div className="mb-8">
          <TaxEstimate
            annualGrossIncome={annualGrossIncome}
            initialState={taxSettings?.state || null}
            initialZip={taxSettings?.zip_code || null}
          />
        </div>
      )}

      <div className="mb-6">
        <AddPaystubForm />
      </div>

      {(!paystubs || paystubs.length === 0) && (
        <p className="text-gray-500">No paystubs yet — add one above.</p>
      )}

      {paystubs && paystubs.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Frequency</th>
                <th className="px-3 py-2 text-right">Gross</th>
                <th className="px-3 py-2 text-right">Net</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {paystubs.map((p) => (
                <tr key={p.id} className="border-t border-gray-200">
                  <td className="px-3 py-2 text-gray-900">{p.pay_date}</td>
                  <td className="px-3 py-2 text-gray-500">{p.pay_frequency}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-900">
                    {formatMoney(Number(p.gross_pay))}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-green-600">
                    {formatMoney(Number(p.net_pay))}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <DeletePaystubButton id={p.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
