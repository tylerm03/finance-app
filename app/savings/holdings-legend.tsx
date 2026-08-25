import { CHART_COLORS } from '@/lib/categorization/chart-colors'

type Slice = { name: string; value: number; quantity: number }

export default function HoldingsLegend({
  data,
  total,
}: {
  data: Slice[]
  total: number
}) {
  return (
    <div className="space-y-1">
      {data.map((d, i) => {
        const pct = total > 0 ? (d.value / total) * 100 : 0
        return (
          <div key={d.name} className="flex items-center justify-between py-1.5 text-sm">
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
              />
              <span className="text-gray-100">{d.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-gray-400">{pct.toFixed(0)}%</span>
              <span className="tabular-nums text-gray-100">${d.value.toFixed(2)}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
