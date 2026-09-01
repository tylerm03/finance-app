import { CHART_COLORS } from '@/lib/categorization/chart-colors'

type Slice = { category: string; amount: number }

export default function SpendingLegend({
  data,
  total,
}: {
  data: Slice[]
  total: number
}) {
  return (
    <div className="space-y-1">
      {data.map((d, i) => {
        const pct = total > 0 ? (d.amount / total) * 100 : 0
        return (
          <div key={d.category} className="flex items-center justify-between py-1.5 text-sm">
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
              />
              <span className={d.category === 'Other' ? 'text-red-600' : 'text-gray-900'}>
                {d.category}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-gray-500">{pct.toFixed(0)}%</span>
              <span className="tabular-nums text-gray-900">${d.amount.toFixed(2)}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
