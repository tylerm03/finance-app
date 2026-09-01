'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { CATEGORIES } from '@/lib/categorization/categories'

type Account = { id: string; name: string }

export default function TransactionFilters({ accounts }: { accounts: Account[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchText, setSearchText] = useState(searchParams.get('q') || '')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push('/transactions?' + params.toString())
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      updateParam('q', searchText)
    }, 400)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText])

  return (
    <div className="flex flex-wrap gap-3">
      <input
        type="text"
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        placeholder="Search transactions..."
        className="rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400"
      />

      <select
        value={searchParams.get('category') || ''}
        onChange={(e) => updateParam('category', e.target.value)}
        className="rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900"
      >
        <option value="">All categories</option>
        <option value="__uncategorized__">Uncategorized</option>
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <select
        value={searchParams.get('account') || ''}
        onChange={(e) => updateParam('account', e.target.value)}
        className="rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900"
      >
        <option value="">All accounts</option>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>
    </div>
  )
}
