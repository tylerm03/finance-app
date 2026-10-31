'use client'

import { useState } from 'react'

export function money0(v: number) {
  const r = Math.round(v)
  return (r < 0 ? '-$' : '$') + Math.abs(r).toLocaleString('en-US')
}

// The boxed number you click to type a budget. Saves when you leave the box or press Enter.
export default function BudgetInput({
  value,
  onSave,
  disabled,
}: {
  value: number | null
  onSave: (amount: number) => void
  disabled?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState('')

  function commit() {
    setEditing(false)
    const cleaned = text.replace(/[$,\s]/g, '')
    if (cleaned === '' && value === null) return
    const n = cleaned === '' ? 0 : Number(cleaned)
    if (!Number.isFinite(n) || n < 0) return
    const rounded = Math.round(n * 100) / 100
    if (rounded !== value) onSave(rounded)
  }

  return (
    <input
      inputMode="decimal"
      disabled={disabled}
      value={editing ? text : value === null ? '' : money0(value)}
      placeholder="$0"
      onFocus={(e) => {
        setEditing(true)
        setText(value === null || value === 0 ? '' : String(value))
        requestAnimationFrame(() => e.target.select())
      }}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') {
          setText(value === null ? '' : String(value))
          setEditing(false)
          requestAnimationFrame(() => (e.target as HTMLInputElement).blur())
        }
      }}
      className="h-9 w-[92px] rounded-md border border-[#e4e1dc] bg-white px-3 text-right text-[15px] tabular-nums text-[#1f1d1a] outline-none placeholder:text-[#b3afa9] hover:border-[#cfcbc5] focus:border-[#1a9bb8] focus:ring-1 focus:ring-[#1a9bb8] disabled:bg-[#f6f5f3]"
    />
  )
}
