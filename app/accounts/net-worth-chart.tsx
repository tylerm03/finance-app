'use client'

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatMoney } from '@/lib/format'

const LINE = '#16a6cf'

function shortDate(day: string) {
  return new Date(day + 'T00:00:00Z').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

// 682500 -> "$682.5K", 1250000 -> "$1.25M"
function compactMoney(v: number) {
  const sign = v < 0 ? '-' : ''
  const a = Math.abs(v)
  if (a >= 1e6) return sign + '$' + +(a / 1e6).toFixed(2) + 'M'
  if (a >= 1e3) return sign + '$' + +(a / 1e3).toFixed(1) + 'K'
  return sign + '$' + Math.round(a)
}

type Point = { date: string; value: number }

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: Point }[] }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="rounded-lg border border-[#e4e1dc] bg-white px-3 py-2 shadow-sm">
      <p className="text-[13px] text-[#77736d]">{shortDate(p.date)}</p>
      <p className="text-[15px] font-medium tabular-nums text-[#1f1d1a]">{formatMoney(p.value)}</p>
    </div>
  )
}

export default function NetWorthChart({ data, maxLabels = 16 }: { data: Point[]; maxLabels?: number }) {
  const values = data.map((d) => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const pad = max === min ? Math.max(Math.abs(max) * 0.01, 100) : (max - min) * 0.04
  const domain: [number, number] = [min - pad, max + pad]
  const ticks = Array.from({ length: 5 }, (_, i) => domain[0] + ((domain[1] - domain[0]) * i) / 4)
  // Roughly 16 date labels across (fewer in narrow cards), like one every other day for a month
  const interval = Math.max(0, Math.ceil(data.length / maxLabels) - 1)

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 4, right: 28, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="netWorthFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={LINE} stopOpacity={0.26} />
            <stop offset="100%" stopColor={LINE} stopOpacity={0.03} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#ecebe8" />
        <XAxis
          dataKey="date"
          tickFormatter={shortDate}
          interval={interval}
          axisLine={false}
          tickLine={false}
          tickMargin={14}
          tick={{ fill: '#77736d', fontSize: 13 }}
        />
        <YAxis
          domain={domain}
          ticks={ticks}
          tickFormatter={compactMoney}
          axisLine={false}
          tickLine={false}
          width={76}
          tickMargin={12}
          tick={{ fill: '#77736d', fontSize: 13 }}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#cfcbc5', strokeDasharray: '3 3' }} />
        <Area
          type="linear"
          dataKey="value"
          stroke={LINE}
          strokeWidth={2.5}
          fill="url(#netWorthFill)"
          dot={false}
          activeDot={{ r: 4, fill: LINE, stroke: '#ffffff', strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
