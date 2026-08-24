'use client'

import { useRouter } from 'next/navigation'

function getMonthOptions() {
  const options = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
    const label = d.toLocaleString('default', { month: 'long', year: 'numeric' })
    options.push({ value, label })
  }
  return options
}

export default function MonthSelector({ selected }: { selected: string }) {
  const router = useRouter()
  const options = getMonthOptions()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    router.push('/spending?month=' + e.target.value)
  }

  return (
    <select
      value={selected}
      onChange={handleChange}
      className="rounded border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-gray-100"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}
