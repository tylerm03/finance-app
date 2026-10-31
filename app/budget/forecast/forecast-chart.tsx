'use client'

import { useState } from 'react'
import { formatMoney } from '@/lib/format'
import { EVENT_KINDS, type Assumptions, type ForecastEvent, type Projection } from '@/lib/forecast/model'
import { EVENT_COLORS, ICONS } from '@/lib/forecast/icons'
import { TrendingUp } from 'lucide-react'
import { useWidth } from '../../reports/use-width'

const HEIGHT = 500
const PAD_L = 88
const PAD_R = 28
const PAD_T = 18
const PAD_B = 46
const MARK = 28
const MARK_GAP = 7

type Marker = { key: string; year: number; icon: string; colors: [string, string]; title: string; detail: string }

function niceStep(range: number, steps: number) {
  const raw = range / steps
  const mag = Math.pow(10, Math.floor(Math.log10(raw || 1)))
  const n = raw / mag
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag
}

function axisMoney(v: number) {
  if (v === 0) return '$0'
  const s = v < 0 ? '-' : ''
  const a = Math.abs(v)
  if (a >= 1e6) return s + '$' + (a / 1e6).toFixed(2) + 'M'
  if (a >= 1e3) return s + '$' + Math.round(a / 1e3) + 'K'
  return s + '$' + Math.round(a)
}

export default function ForecastChart({
  projection,
  events,
  assumptions,
}: {
  projection: Projection
  events: ForecastEvent[]
  assumptions: Assumptions
}) {
  const { ref, width } = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const [hoverMarker, setHoverMarker] = useState<Marker | null>(null)

  // Point 0 is today; each row is the end of that year
  const points = [
    { year: projection.start.year, age: projection.start.year - assumptions.birthYear, netWorth: projection.start.netWorth, label: 'Today' },
    ...projection.rows.map((r) => ({ year: r.year + 1, age: r.age + 1, netWorth: r.netWorth, label: 'Start of ' + (r.year + 1) })),
  ]
  const x0 = points[0].year
  const x1 = points[points.length - 1].year
  const values = points.map((p) => p.netWorth)
  const step = niceStep(Math.max(...values, 0) - Math.min(...values, 0) || 1, 5)
  const yMax = Math.ceil((Math.max(...values, 0) * 1.08) / step) * step || step
  const yMin = Math.min(0, Math.floor(Math.min(...values) / step) * step)
  const ticks: number[] = []
  for (let v = yMin; v <= yMax + step / 2; v += step) ticks.push(v)

  const plotW = Math.max(100, width - PAD_L - PAD_R)
  const plotH = HEIGHT - PAD_T - PAD_B
  const X = (year: number) => PAD_L + ((year - x0) / Math.max(1, x1 - x0)) * plotW
  const Y = (v: number) => PAD_T + (1 - (v - yMin) / (yMax - yMin)) * plotH

  const path = points.map((p, i) => (i ? 'L' : 'M') + X(p.year).toFixed(1) + ',' + Y(p.netWorth).toFixed(1)).join(' ')
  const yearStep = Math.max(1, Math.ceil((x1 - x0) / Math.max(4, Math.floor(plotW / 82))))
  const yearTicks: number[] = []
  for (let y = x0; y <= x1; y += yearStep) yearTicks.push(y)

  // Event markers along the top, stacked when several land on the same year
  const markers: Marker[] = []
  for (const e of events) {
    const kind = EVENT_KINDS.find((k) => k.key === e.kind)!
    markers.push({
      key: e.id,
      year: e.year,
      icon: e.icon,
      colors: EVENT_COLORS[e.kind],
      title: e.name,
      detail:
        (kind.sign > 0 ? '+' : '-') +
        formatMoney(e.amount).replace('.00', '') +
        (kind.recurring ? '/yr, ' + e.year + '–' + (e.endYear ?? e.year) : ' in ' + e.year),
    })
  }
  markers.push({
    key: 'retire',
    year: projection.retirementYear,
    icon: 'sunrise',
    colors: EVENT_COLORS.retirement,
    title: 'Retirement',
    detail: 'Age ' + assumptions.retirementAge + ' in ' + projection.retirementYear,
  })
  markers.push({
    key: 'end',
    year: x1,
    icon: 'flag',
    colors: EVENT_COLORS.end,
    title: 'End of plan',
    detail: 'Age ' + (x1 - assumptions.birthYear) + ' in ' + x1,
  })
  const byYear = new Map<number, Marker[]>()
  for (const m of markers) {
    if (m.year < x0 || m.year > x1) continue
    byYear.set(m.year, [...(byYear.get(m.year) || []), m])
  }

  const hp = hover !== null ? points[hover] : null

  function onMove(e: React.MouseEvent<SVGRectElement>) {
    const box = e.currentTarget.getBoundingClientRect()
    const year = x0 + ((e.clientX - box.left) / box.width) * (x1 - x0)
    setHover(Math.max(0, Math.min(points.length - 1, Math.round(year - x0))))
  }

  return (
    <div ref={ref} className="relative w-full select-none">
      <svg width={width} height={HEIGHT} className="block">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD_L} x2={width - PAD_R} y1={Y(t)} y2={Y(t)} stroke="#ecebe8" />
            <text x={PAD_L - 16} y={Y(t)} dy="0.35em" textAnchor="end" fontSize={13} fill="#77736d">
              {axisMoney(t)}
            </text>
          </g>
        ))}
        {yearTicks.map((y) => (
          <text key={y} x={X(y)} y={HEIGHT - 14} textAnchor="middle" fontSize={13} fill="#77736d">
            {y}
          </text>
        ))}

        {/* Vertical guide from each marker stack down to the axis */}
        {[...byYear.entries()].map(([year, ms]) => (
          <line key={'l' + year} x1={X(year)} x2={X(year)} y1={PAD_T + ms.length * (MARK + MARK_GAP)} y2={PAD_T + plotH} stroke="#d9d6d1" />
        ))}

        <path d={path} fill="none" stroke="#1f1d1a" strokeWidth={3} strokeDasharray="5 5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={X(points[0].year)} cy={Y(points[0].netWorth)} r={7} fill="#f26b1d" />

        {hp && (
          <g pointerEvents="none">
            <line x1={X(hp.year)} x2={X(hp.year)} y1={PAD_T} y2={PAD_T + plotH} stroke="#b9b5af" strokeDasharray="3 3" />
            <circle cx={X(hp.year)} cy={Y(hp.netWorth)} r={5} fill="#1f1d1a" stroke="#fff" strokeWidth={2} />
          </g>
        )}

        <rect
          x={PAD_L}
          y={PAD_T}
          width={plotW}
          height={plotH}
          fill="transparent"
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
        />

        {[...byYear.entries()].map(([year, ms]) =>
          ms.map((m, i) => {
            const C = ICONS[m.icon] || TrendingUp
            const mx = X(year) - MARK / 2
            const my = PAD_T + i * (MARK + MARK_GAP) - MARK / 2 + 4
            return (
              <g
                key={m.key}
                className="cursor-default"
                onMouseEnter={() => setHoverMarker(m)}
                onMouseLeave={() => setHoverMarker(null)}
              >
                <rect x={mx} y={my} width={MARK} height={MARK} rx={7} fill={m.colors[0]} />
                <C x={mx + 6} y={my + 6} width={16} height={16} color={m.colors[1]} strokeWidth={2.1} />
              </g>
            )
          })
        )}
      </svg>

      {hp && !hoverMarker && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-[#e4e1dc] bg-white px-3 py-2 shadow-md"
          style={{
            left: Math.min(X(hp.year) + 12, width - 190),
            top: Math.max(8, Math.min(Y(hp.netWorth) - 70, HEIGHT - 120)),
          }}
        >
          <p className="text-[13px] text-[#77736d]">
            {hp.label} · age {hp.age}
          </p>
          <p className="text-[16px] font-semibold tabular-nums">{formatMoney(hp.netWorth)}</p>
        </div>
      )}
      {hoverMarker && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg bg-[#1f1d1a] px-3 py-2 text-white shadow-lg"
          style={{ left: Math.min(X(hoverMarker.year) + 18, width - 220), top: PAD_T }}
        >
          <p className="text-[14px] font-medium">{hoverMarker.title}</p>
          <p className="text-[13px] text-[#c9c5bf]">{hoverMarker.detail}</p>
        </div>
      )}
    </div>
  )
}
