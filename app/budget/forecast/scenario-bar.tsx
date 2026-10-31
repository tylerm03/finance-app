'use client'

import { useEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { compact, project, type Scenario } from '@/lib/forecast/model'
import { Icon, colorPair } from '@/lib/forecast/icons'

export function useOutside<T extends HTMLElement>(open: boolean, close: () => void) {
  const ref = useRef<T>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open, close])
  return ref
}

function StatsCard({ s, linkedNetWorth }: { s: Scenario; linkedNetWorth: number }) {
  const p = project(s.assumptions, s.events, linkedNetWorth)
  const rows: [string, string][] = [
    ['Net worth today', compact(p.start.netWorth)],
    ['Net worth at retirement', compact(p.netWorthAtRetirement)],
    ['Retirement age', String(s.assumptions.retirementAge)],
    ['Net worth at end', compact(p.netWorthAtEnd)],
    ['Life events', String(s.events.length)],
  ]
  return (
    <div className="absolute left-1/2 top-[calc(100%+12px)] z-40 w-[330px] -translate-x-1/2 rounded-xl bg-[#1f1d1a] px-6 py-5 text-left shadow-xl">
      <span className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-[#1f1d1a]" />
      <p className="mb-4 text-[16px] font-medium text-white">{s.name}</p>
      <dl className="space-y-2.5">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between text-[14px]">
            <dt className="text-[#a8a39c]">{k}</dt>
            <dd className="font-medium tabular-nums text-white">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

export default function ScenarioBar({
  scenarios,
  activeId,
  linkedNetWorth,
  onSelect,
  onNew,
  onDuplicate,
}: {
  scenarios: Scenario[]
  activeId: string
  linkedNetWorth: number
  onSelect: (id: string) => void
  onNew: () => void
  onDuplicate: () => void
}) {
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [menu, setMenu] = useState(false)
  const menuRef = useOutside<HTMLDivElement>(menu, () => setMenu(false))

  return (
    <div className="flex flex-wrap items-center gap-2">
      {scenarios.map((s) => {
        const [bg, fg] = colorPair(s.color)
        const active = s.id === activeId
        return (
          <div key={s.id} className="relative" onMouseEnter={() => setHoverId(s.id)} onMouseLeave={() => setHoverId(null)}>
            <button
              type="button"
              onClick={() => onSelect(s.id)}
              className={
                'flex h-10 items-center gap-2 rounded-full border px-4 text-[15px] font-medium transition-colors ' +
                (active ? 'border-[#1f1d1a] bg-white text-[#1f1d1a]' : 'border-transparent text-[#5f5b55] hover:bg-[#ebe9e5]')
              }
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full" style={{ backgroundColor: bg, color: fg }}>
                <Icon name={s.icon} size={12} />
              </span>
              {s.name}
            </button>
            {hoverId === s.id && <StatsCard s={s} linkedNetWorth={linkedNetWorth} />}
          </div>
        )
      })}

      <div ref={menuRef} className="relative">
        <button
          type="button"
          aria-label="New scenario"
          onClick={() => setMenu(!menu)}
          className={'flex h-10 w-10 items-center justify-center rounded-full hover:bg-[#ebe9e5] ' + (menu ? 'bg-[#ebe9e5]' : '')}
        >
          <Plus size={20} strokeWidth={2} />
        </button>
        {menu && (
          <div className="absolute left-0 top-[calc(100%+6px)] z-40 w-64 rounded-xl border border-[#e4e1dc] bg-white p-2 shadow-xl">
            <button
              type="button"
              onClick={() => {
                setMenu(false)
                onNew()
              }}
              className="block w-full rounded-lg px-4 py-3 text-left text-[16px] hover:bg-[#f6f5f3]"
            >
              Start from scratch
            </button>
            <button
              type="button"
              onClick={() => {
                setMenu(false)
                onDuplicate()
              }}
              className="block w-full rounded-lg px-4 py-3 text-left text-[16px] hover:bg-[#f6f5f3]"
            >
              Duplicate existing scenario
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
