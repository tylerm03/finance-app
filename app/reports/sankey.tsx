'use client'

import { useState } from 'react'
import { formatMoney } from '@/lib/format'
import type { Slice } from '@/lib/reports/compute'
import { useWidth } from './use-width'

const BLUE = '#1aa0c8'
const BLUE_SOFT = '#cfe6ef'
const GREEN = '#2e9e64'
const GREEN_SOFT = '#d4ebdf'
// Expense category colors, in the soft-but-saturated style of the design
const CATEGORY_COLORS = ['#f0c74a', '#9b4fc4', '#f29b4b', '#e2627a', '#4f7fd9', '#3bb3a4', '#c58bd8', '#e8b93c', '#7aa95c', '#d9785a', '#6c8fb3', '#b5a26a']

const BAR = 14
const MIN_SLOT = 46 // vertical room for a two-line label
const GAP = 10
const BASE_HEIGHT = 540

type Node = { key: string; label: string; emoji?: string; value: number; pct: number; color: string; y: number; h: number; slot: number }

function stack(items: Omit<Node, 'y' | 'h' | 'slot'>[], k: number, minSlot: number) {
  let y = 0
  return items.map((it) => {
    const h = Math.max(2, it.value * k)
    const slot = Math.max(h, minSlot)
    const node = { ...it, y, h, slot }
    y += slot + GAP
    return node
  })
}

function band(x0: number, y0: number, x1: number, y1: number, h0: number, h1: number) {
  const xm = (x0 + x1) / 2
  return (
    'M' + x0 + ',' + y0 +
    ' C' + xm + ',' + y0 + ' ' + xm + ',' + y1 + ' ' + x1 + ',' + y1 +
    ' L' + x1 + ',' + (y1 + h1) +
    ' C' + xm + ',' + (y1 + h1) + ' ' + xm + ',' + (y0 + h0) + ' ' + x0 + ',' + (y0 + h0) +
    ' Z'
  )
}

// Running totals: where each band starts inside the shared bar
function offsets(heights: number[]) {
  const out: number[] = []
  let acc = 0
  for (const h of heights) {
    out.push(acc)
    acc += h
  }
  return out
}

function pctText(p: number) {
  return '(' + (p >= 99.995 ? '100' : p.toFixed(2)) + '%)'
}

function Label({
  x,
  y,
  anchor,
  title,
  value,
  pct,
  underline = false,
}: {
  x: number
  y: number
  anchor: 'start' | 'end'
  title: string
  value: number
  pct: number
  underline?: boolean
}) {
  return (
    <text x={x} y={y} textAnchor={anchor} style={{ fontFamily: 'inherit' }}>
      <tspan x={x} dy="-0.35em" fontSize={14} fill="#4a4641" textDecoration={underline ? 'underline' : undefined}>
        {title}
      </tspan>
      <tspan x={x} dy="1.35em" fontSize={16} fontWeight={600} fill="#1f1d1a">
        {formatMoney(value)} {pctText(pct)}
      </tspan>
    </text>
  )
}

export default function Sankey({
  incomeSlices,
  expenseSlices,
  income,
  expenses,
  onSelectExpense,
}: {
  incomeSlices: Slice[]
  expenseSlices: Slice[]
  income: number
  expenses: number
  // Clicking a spending stream: the category keys it covers, its label and emoji
  onSelectExpense?: (keys: string[], label: string, emoji: string) => void
}) {
  const { ref, width } = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<string | null>(null)

  const net = income - expenses
  const total = Math.max(income, expenses)
  if (total <= 0) {
    return (
      <div ref={ref} className="flex h-[300px] items-center justify-center text-[15px] text-[#77736d]">
        No income or spending in this range.
      </div>
    )
  }
  const base = income > 0 ? income : expenses
  const pctOf = (v: number) => (v / base) * 100
  const k = BASE_HEIGHT / total

  // Left: where money came from
  const left = stack(
    [
      ...incomeSlices.map((s) => ({ key: 'in-' + s.key, label: s.label, emoji: s.emoji, value: s.value, pct: pctOf(s.value), color: BLUE })),
      ...(net < 0 ? [{ key: 'savings', label: 'From savings', emoji: '🏦', value: -net, pct: pctOf(-net), color: '#8a8680' }] : []),
    ],
    k,
    MIN_SLOT
  )

  // Right: where it went. Small categories beyond the top 11 roll into "Other".
  const top = expenseSlices.slice(0, 11)
  const restValue = expenseSlices.slice(11).reduce((s, r) => s + r.value, 0)
  const right = stack(
    [
      ...(net > 0 ? [{ key: 'net', label: 'Net Income', value: net, pct: pctOf(net), color: GREEN }] : []),
      ...top.map((s, i) => ({ key: 'ex-' + s.key, label: s.label, emoji: s.emoji, value: s.value, pct: pctOf(s.value), color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] })),
      ...(restValue > 0 ? [{ key: 'ex-rest', label: 'Everything else', emoji: '📦', value: restValue, pct: pctOf(restValue), color: '#b8b3ac' }] : []),
    ],
    k,
    MIN_SLOT
  )

  const midH = total * k
  const height = Math.max(midH, ...[left, right].map((col) => (col.length ? col[col.length - 1].y + col[col.length - 1].slot : 0))) + 8

  const x0 = 0
  const x1 = Math.round(width * 0.24)
  const x2 = Math.round(width * 0.48)
  const x3 = width - BAR

  // Bands from each source into the Income bar
  const inStarts = offsets(left.map((n) => n.value * k))
  const inLinks = left.map((n, i) => {
    const h = n.value * k
    const d = band(x0 + BAR, n.y, x1, inStarts[i], h, h)
    return { key: n.key, d, color: n.key === 'savings' ? '#e6e3df' : BLUE_SOFT }
  })

  // Bands from the green outflow bar into each destination
  const outStarts = offsets(right.map((n) => n.value * k))
  const outLinks = right.map((n, i) => {
    const h = n.value * k
    const d = band(x2 + BAR, outStarts[i], x3, n.y, h, h)
    return { key: n.key, d, color: n.color }
  })

  const dim = (key: string) => (hover && hover !== key ? 0.35 : 1)

  // Spending streams open the list of charges behind them
  const clickable = (key: string) => !!onSelectExpense && key.startsWith('ex-')
  function select(key: string) {
    if (!clickable(key)) return
    const node = right.find((n) => n.key === key)
    if (!node) return
    const keys = key === 'ex-rest' ? expenseSlices.slice(11).map((s) => s.key) : [key.slice(3)]
    onSelectExpense!(keys, node.label, node.emoji || '')
  }

  return (
    <div ref={ref} className="w-full">
      <svg width={width} height={height} viewBox={'0 0 ' + width + ' ' + height} className="block" data-chart="sankey">
        <defs>
          <linearGradient id="sankeyMid" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor={BLUE_SOFT} />
            <stop offset="55%" stopColor={BLUE_SOFT} />
            <stop offset="100%" stopColor={GREEN_SOFT} />
          </linearGradient>
          {outLinks.map((l) => (
            <linearGradient key={l.key} id={'sk-' + l.key} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor={GREEN_SOFT} stopOpacity={0.9} />
              <stop offset="100%" stopColor={l.color} stopOpacity={l.key === 'net' ? 0.35 : 0.3} />
            </linearGradient>
          ))}
        </defs>

        {inLinks.map((l) => (
          <path key={l.key} d={l.d} fill={l.color} opacity={dim(l.key)} onMouseEnter={() => setHover(l.key)} onMouseLeave={() => setHover(null)} />
        ))}
        {/* Income block between the blue and green bars */}
        <rect x={x1 + BAR} y={0} width={x2 - x1 - BAR} height={midH} fill="url(#sankeyMid)" />
        {outLinks.map((l) => (
          <path
            key={l.key}
            d={l.d}
            fill={'url(#sk-' + l.key + ')'}
            opacity={dim(l.key)}
            onMouseEnter={() => setHover(l.key)}
            onMouseLeave={() => setHover(null)}
            onClick={() => select(l.key)}
            className={clickable(l.key) ? 'cursor-pointer' : ''}
          />
        ))}

        {left.map((n) => (
          <g key={n.key} opacity={dim(n.key)}>
            <rect x={x0} y={n.y} width={BAR} height={n.h} fill={n.color} />
            <Label
              x={x0 + BAR + 16}
              y={n.y + Math.max(n.h, MIN_SLOT) / 2}
              anchor="start"
              title={(n.emoji ? n.emoji + ' ' : '') + n.label}
              value={n.value}
              pct={n.pct}
            />
          </g>
        ))}

        <rect x={x1} y={0} width={BAR} height={midH} fill={BLUE} />
        <rect x={x2} y={0} width={BAR} height={midH} fill={GREEN} />
        <Label x={x1 + BAR + 16} y={midH / 2} anchor="start" title="Income" value={income} pct={income > 0 ? 100 : 0} />

        {right.map((n) => (
          <g
            key={n.key}
            opacity={dim(n.key)}
            onMouseEnter={() => setHover(n.key)}
            onMouseLeave={() => setHover(null)}
            onClick={() => select(n.key)}
            onKeyDown={(e) => e.key === 'Enter' && select(n.key)}
            role={clickable(n.key) ? 'button' : undefined}
            tabIndex={clickable(n.key) ? 0 : undefined}
            aria-label={clickable(n.key) ? 'Show charges for ' + n.label : undefined}
            className={clickable(n.key) ? 'cursor-pointer outline-none' : ''}
          >
            {/* Invisible hit area so the whole label block is clickable */}
            {clickable(n.key) && (
              <rect x={x2 + BAR + 40} y={n.y} width={x3 + BAR - (x2 + BAR + 40)} height={Math.max(n.h, MIN_SLOT)} fill="transparent" />
            )}
            <rect x={x3} y={n.y} width={BAR} height={n.h} fill={n.color} />
            <Label
              x={x3 - 16}
              y={n.y + Math.max(n.h, MIN_SLOT) / 2}
              anchor="end"
              title={(n.emoji ? n.emoji + ' ' : '') + n.label}
              value={n.value}
              pct={n.pct}
            />
          </g>
        ))}
      </svg>
    </div>
  )
}
