'use client'

import { useState } from 'react'
import CategorySelect from './category-select'

type Location = {
  address?: string
  city?: string
  region?: string
  postal_code?: string
} | null

export default function TransactionRow({ t }: { t: any }) {
  const [expanded, setExpanded] = useState(false)
  const location: Location = t.location

  const hasDetail =
    t.payment_channel || (location && (location.city || location.address)) || t.pending

  return (
    <>
      <tr
        className={`border-t border-gray-800 ${hasDetail ? 'cursor-pointer hover:bg-gray-900/50' : ''}`}
        onClick={() => hasDetail && setExpanded(!expanded)}
      >
        <td className="p-3 text-gray-400">{t.txn_date}</td>
        <td className="p-3">
          <div className="flex items-center gap-2">
            {t.logo_url && (
              <img src={t.logo_url} alt="" className="h-5 w-5 rounded-full" />
            )}
            <span>{t.merchant_name}</span>
            {t.pending && (
              <span className="rounded border border-gray-700 px-1.5 py-0.5 text-xs text-gray-400">
                pending
              </span>
            )}
          </div>
        </td>
        <td className="p-3" onClick={(e) => e.stopPropagation()}>
          <CategorySelect
            transactionId={t.id}
            merchantEntityId={t.merchant_entity_id}
            currentCategory={t.category}
          />
        </td>
        <td
          className={`p-3 text-right tabular-nums ${
            t.amount < 0 ? 'text-green-400' : 'text-gray-100'
          }`}
        >
          {t.amount < 0 ? '+' : '-'}$
          {Math.abs(t.amount).toFixed(2)}
        </td>
      </tr>
      {expanded && (
        <tr className="border-t border-gray-800 bg-gray-900/30">
          <td colSpan={4} className="p-3 text-sm text-gray-400">
            <div className="flex flex-wrap gap-x-6 gap-y-1">
              {t.payment_channel && <span>Channel: {t.payment_channel}</span>}
              {location?.city && (
                <span>
                  Location: {location.city}
                  {location.region ? `, ${location.region}` : ''}
                </span>
              )}
              {t.description && <span>Raw: {t.description}</span>}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
