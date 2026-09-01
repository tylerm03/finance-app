'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIES } from '@/lib/categorization/categories'

export default function CategorySelect({
  transactionId,
  merchantEntityId,
  currentCategory,
}: {
  transactionId: string
  merchantEntityId: string | null
  currentCategory: string | null
}) {
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const category = e.target.value
    setSaving(true)

    await supabase
      .from('transactions')
      .update({ category, category_source: 'manual' })
      .eq('id', transactionId)

    // Write it back as a tier-1 rule so this merchant never comes
    // up as uncategorized again — but only if we have a stable
    // merchant id to key it on.
    if (merchantEntityId) {
      const { data: existingRule } = await supabase
        .from('category_rules')
        .select('id')
        .eq('merchant_entity_id', merchantEntityId)
        .maybeSingle()

      if (existingRule) {
        await supabase
          .from('category_rules')
          .update({ category })
          .eq('id', existingRule.id)
      } else {
        await supabase.from('category_rules').insert({
          merchant_entity_id: merchantEntityId,
          category,
        })
      }
    }

    setSaving(false)
    router.refresh()
  }

  return (
    <select
      value={currentCategory || ''}
      onChange={handleChange}
      disabled={saving}
      className={`rounded border bg-white px-2 py-1 text-sm ${
        currentCategory
          ? 'border-gray-200 text-gray-900'
          : 'border-red-300 text-red-600'
      }`}
    >
      <option value="" disabled>
        {currentCategory ? currentCategory : 'Uncategorized'}
      </option>
      {CATEGORIES.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  )
}
