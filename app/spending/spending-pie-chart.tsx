'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const COLORS = [
  '#3b82f6', '#60a5fa', '#93c5fd', '#1d4ed8', '#2563eb',
  '#6366f1', '#818cf8', '#a5b4fc', '#4f46e5', '#4338ca',
  '#7c3aed', '#8b5cf6', '#a78bfa', '#5b21b6',
]

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
            <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="#0a0a0b" />
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
