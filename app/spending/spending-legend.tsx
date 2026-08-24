const COLORS = [
  '#3b82f6', '#60a5fa', '#93c5fd', '#1d4ed8', '#2563eb',
  '#6366f1', '#818cf8', '#a5b4fc', '#4f46e5', '#4338ca',
  '#7c3aed', '#8b5cf6', '#a78bfa', '#5b21b6',
]

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
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              <span className={d.category === 'Other' ? 'text-red-400' : 'text-gray-100'}>
                {d.category}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-gray-400">{pct.toFixed(0)}%</span>
              <span className="tabular-nums text-gray-100">${d.amount.toFixed(2)}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
