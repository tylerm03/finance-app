'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

import { CHART_COLORS } from '@/lib/categorization/chart-colors'

type Slice = { category: string; amount: number }

export default function SpendingPieChart({ data }: { data: Slice[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="amount"
          nameKey="category"
          cx="50%"
          cy="50%"
          innerRadius={70}
          outerRadius={120}
          paddingAngle={1}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="#0a0a0b" />
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
