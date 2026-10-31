'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

export type ThumbKind = 'sankey' | 'bars' | 'list' | 'breakdown'

// Tiny pictures of each view, used in the pickers
export function Thumb({ kind, w = 64, h = 44 }: { kind: ThumbKind; w?: number; h?: number }) {
  return (
    <svg width={w} height={h} viewBox="0 0 64 44" className="shrink-0">
      {kind === 'sankey' && (
        <>
          <path d="M4 6 C24 6 24 4 40 4 L40 18 C24 18 24 30 4 30 Z" fill="#cfe6ef" />
          <path d="M40 4 C50 4 50 4 60 4 L60 10 C50 10 50 10 40 10 Z" fill="#cdebd9" />
          <path d="M40 10 C50 10 50 16 60 16 L60 24 C50 24 50 18 40 18 Z" fill="#f6e4b4" />
          <path d="M40 18 C50 18 50 28 60 28 L60 33 C50 33 50 22 40 22 Z" fill="#e7cdf0" />
          <path d="M40 22 C50 22 50 36 60 36 L60 40 C50 40 50 26 40 26 Z" fill="#f6d1b8" />
          <rect x="2" y="6" width="3" height="24" fill="#8fcbe0" />
          <rect x="58" y="16" width="3" height="8" fill="#f0c74a" />
          <rect x="58" y="28" width="3" height="5" fill="#c58bd8" />
          <rect x="58" y="36" width="3" height="4" fill="#f29b4b" />
        </>
      )}
      {kind === 'bars' && (
        <>
          <rect x="6" y="20" width="9" height="20" fill="#bfe6cf" />
          <rect x="18" y="26" width="9" height="14" fill="#f6c3c8" />
          <rect x="30" y="8" width="9" height="32" fill="#bfe6cf" />
          <rect x="42" y="22" width="9" height="18" fill="#f6c3c8" />
          <path d="M6 30 L20 26 L34 18 L48 22 L58 20" stroke="#b9b5af" strokeWidth="1.2" fill="none" />
        </>
      )}
      {kind === 'list' && (
        <>
          {[8, 18, 28, 38].map((y) => (
            <g key={y}>
              <circle cx="8" cy={y} r="2.5" fill="#d9d6d1" />
              <rect x="15" y={y - 2} width={y % 20 === 8 ? 40 : 30} height="4" rx="2" fill="#d9d6d1" />
            </g>
          ))}
        </>
      )}
      {kind === 'breakdown' && (
        <>
          <rect x="4" y="4" width="56" height="7" rx="1.5" fill="#bfe6cf" />
          <rect x="4" y="13" width="34" height="7" rx="1.5" fill="#bfe6cf" />
          <rect x="4" y="24" width="44" height="7" rx="1.5" fill="#f6c3c8" />
          <rect x="4" y="33" width="26" height="7" rx="1.5" fill="#f6c3c8" />
        </>
      )}
    </svg>
  )
}

export type PickerOption<T extends string> = { key: T; label: string; desc: string; thumb: ThumbKind }

export default function ViewPicker<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: PickerOption<T>[]
  onChange: (v: T) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = options.find((o) => o.key === value) || options[0]

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const Chevron = open ? ChevronUp : ChevronDown

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={
          'flex h-11 items-center gap-3 rounded-lg border bg-white pl-3 pr-4 text-[16px] font-medium text-[#1f1d1a] hover:bg-[#faf9f7] ' +
          (open ? 'border-[#1a9bb8] ring-1 ring-[#1a9bb8]' : 'border-[#e4e1dc]')
        }
      >
        <Thumb kind={current.thumb} w={40} h={27} />
        {current.label}
        <Chevron size={17} strokeWidth={2.25} />
      </button>
      {open && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-30 w-[400px] rounded-xl border border-[#e4e1dc] bg-white p-2 shadow-xl">
          {options.map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => {
                onChange(o.key)
                setOpen(false)
              }}
              className={
                'flex w-full items-center gap-4 rounded-lg border-2 px-3 py-3 text-left ' +
                (o.key === value ? 'border-[#1a9bb8]' : 'border-transparent hover:bg-[#f6f5f3]')
              }
            >
              <Thumb kind={o.thumb} />
              <span>
                <span className="block text-[16px] font-semibold text-[#1f1d1a]">{o.label}</span>
                <span className="block text-[14px] text-[#77736d]">{o.desc}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
