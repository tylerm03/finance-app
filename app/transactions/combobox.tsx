'use client'

import { useMemo, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

export type ComboOption = { value: string; label: string; prefix?: string }

// A searchable dropdown: type to filter, click to pick. With allowCustom,
// whatever you type is kept as the value (used for merchant names).
export default function Combobox({
  options,
  value,
  onChange,
  placeholder,
  allowCustom = false,
}: {
  options: ComboOption[]
  value: string | null
  onChange: (value: string | null) => void
  placeholder: string
  allowCustom?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = options.find((o) => o.value === value)
  const shown = open ? query : selected ? (selected.prefix ? selected.prefix + '  ' : '') + selected.label : value || ''

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options
    return list.slice(0, 100)
  }, [options, query])

  function pick(v: string | null) {
    onChange(v)
    setOpen(false)
    setQuery('')
    inputRef.current?.blur()
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        value={shown}
        placeholder={placeholder}
        onFocus={() => {
          setQuery('')
          setOpen(true)
        }}
        onChange={(e) => {
          setQuery(e.target.value)
          if (allowCustom) onChange(e.target.value || null)
        }}
        onBlur={() => {
          setOpen(false)
          setQuery('')
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            if (filtered[0] && !allowCustom) pick(filtered[0].value)
            else inputRef.current?.blur()
          }
          if (e.key === 'Escape') {
            e.stopPropagation()
            inputRef.current?.blur()
          }
        }}
        className="h-12 w-full rounded-lg border border-[#e4e1dc] bg-white pl-4 pr-11 text-[16px] text-[#1f1d1a] outline-none placeholder:text-[#8a8680] focus:border-[#c9c5bf]"
      />
      <ChevronDown
        size={18}
        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#3b3834]"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute left-0 right-0 top-[calc(100%+4px)] z-10 max-h-64 overflow-y-auto rounded-lg border border-[#e4e1dc] bg-white py-1 shadow-lg">
          {filtered.map((o) => (
            <li key={o.value}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(o.value)}
                className={
                  'flex w-full items-center gap-2 px-4 py-2 text-left text-[15px] hover:bg-[#f6f5f3] ' +
                  (o.value === value ? 'font-medium text-[#1f1d1a]' : 'text-[#3b3834]')
                }
              >
                {o.prefix && <span>{o.prefix}</span>}
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
