'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { CHART_COLORS } from '@/lib/categorization/chart-colors'

type Slice = { name: string; value: number }

export default function HoldingsPieChart({ data }: { data: Slice[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={95}
          paddingAngle={1}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="#171717" />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: '#171717',
            border: '1px solid #262626',
            borderRadius: '6px',
            color: '#f5f5f5',
          }}
          formatter={(value: any) => '$' + Number(value).toFixed(2)}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
