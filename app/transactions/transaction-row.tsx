'use client'

import { useState } from 'react'
import CategorySelect from './category-select'

type Location = {
  address?: string
  city?: string
  region?: string
} | null

type PlaidCategory = {
  primary?: string
  detailed?: string
  confidence_level?: string
} | null

const sourceBadgeStyles: Record<string, string> = {
  plaid: 'bg-blue-500/20 text-blue-400',
  rule: 'bg-gray-700 text-gray-300',
  manual: 'bg-gray-700 text-gray-300',
  ai: 'bg-purple-500/20 text-purple-400',
}

export default function TransactionRow({
  t,
  accountName,
}: {
  t: any
  accountName: string | null
}) {
  const [expanded, setExpanded] = useState(false)
  const location: Location = t.location
  const plaidCategory: PlaidCategory = t.plaid_category
  const websiteUrl = t.website ? 'https://' + t.website : null

  const hasDetail =
    plaidCategory?.detailed || t.payment_channel || location?.city || t.website || t.merchant_entity_id

  return (
    <>
      <tr
        className={`border-t border-gray-800 ${hasDetail ? 'cursor-pointer hover:bg-gray-900/50' : ''}`}
        onClick={() => hasDetail && setExpanded(!expanded)}
      >
        <td className="p-3 text-gray-400">{t.txn_date}</td>
        <td className="p-3 text-gray-400">{accountName || '\u2014'}</td>
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
        <td className="p-3">
          {t.category_source && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                sourceBadgeStyles[t.category_source] || 'bg-gray-700 text-gray-300'
              }`}
            >
              {t.category_source}
            </span>
          )}
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
          <td colSpan={6} className="p-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {plaidCategory?.detailed && (
                <div>
                  <p className="text-xs text-gray-400">Detail category</p>
                  <p className="text-gray-100">
                    {plaidCategory.detailed.replaceAll('_', ' ').toLowerCase()}
                  </p>
                </div>
              )}
              {t.payment_channel && (
                <div>
                  <p className="text-xs text-gray-400">Channel</p>
                  <p className="text-gray-100">{t.payment_channel.replaceAll('_', ' ')}</p>
                </div>
              )}
              {location?.city && (
                <div>
                  <p className="text-xs text-gray-400">Location</p>
                  <p className="text-gray-100">
                    {location.city}
                    {location.region ? ', ' + location.region : ''}
                  </p>
                </div>
              )}
              {plaidCategory?.confidence_level && (
                <div>
                  <p className="text-xs text-gray-400">Confidence</p>
                  <p className="text-gray-100">
                    {plaidCategory.confidence_level.replaceAll('_', ' ').toLowerCase()}
                  </p>
                </div>
              )}
              {websiteUrl && (
                <div>
                  <p className="text-xs text-gray-400">Website</p>
                  
                    href={websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    {t.website}
                  </a>
                </div>
              )}
              {t.merchant_entity_id && (
                <div>
                  <p className="text-xs text-gray-400">Merchant ID</p>
                  <p className="truncate text-gray-100">{t.merchant_entity_id}</p>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
