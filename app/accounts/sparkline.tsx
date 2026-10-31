'use client'

import { Line, LineChart, ReferenceLine, YAxis } from 'recharts'

// Small gray trend line for one account, with a dashed line at the
// starting balance so you can see if it ended up above or below it.
export default function Sparkline({ values }: { values: number[] }) {
  const data = values.map((v, i) => ({ i, v }))
  const min = Math.min(...values)
  const max = Math.max(...values)
  const pad = max === min ? 1 : (max - min) * 0.1

  return (
    <LineChart width={132} height={36} data={data} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
      <YAxis hide domain={[min - pad, max + pad]} />
      <ReferenceLine y={values[0]} stroke="#cfcbc5" strokeDasharray="4 4" />
      <Line
        type="linear"
        dataKey="v"
        stroke="#8a8680"
        strokeWidth={1.5}
        dot={false}
        isAnimationActive={false}
      />
    </LineChart>
  )
}
