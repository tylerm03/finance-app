'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { CATEGORIES } from '@/lib/categorization/categories'

type Account = { id: string; name: string }

export default function TransactionFilters({ accounts }: { accounts: Account[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push('/transactions?' + params.toString())
  }

  return (
    <div className="flex gap-3">
      <select
        value={searchParams.get('category') || ''}
        onChange={(e) => updateParam('category', e.target.value)}
        className="rounded border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-gray-100"
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
        className="rounded border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-gray-100"
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
