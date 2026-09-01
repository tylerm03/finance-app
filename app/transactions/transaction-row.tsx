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
  plaid: 'bg-blue-100 text-blue-600',
  rule: 'bg-gray-200 text-gray-600',
  manual: 'bg-gray-200 text-gray-600',
  ai: 'bg-purple-100 text-purple-600',
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

  const rowClassName = hasDetail
    ? 'border-t border-gray-200 cursor-pointer hover:bg-gray-50'
    : 'border-t border-gray-200'

  const badgeClassName =
    'rounded-full px-2 py-0.5 text-xs ' +
    (sourceBadgeStyles[t.category_source] || 'bg-gray-200 text-gray-600')

  const amountClassName =
    'p-3 text-right tabular-nums ' + (t.amount < 0 ? 'text-green-600' : 'text-gray-900')

  return (
    <>
      <tr className={rowClassName} onClick={() => hasDetail && setExpanded(!expanded)}>
        <td className="p-3 text-gray-500">{t.txn_date}</td>
        <td className="p-3 text-gray-500">{accountName || '\u2014'}</td>
        <td className="p-3">
          <div className="flex items-center gap-2">
            {t.logo_url && (
              <img src={t.logo_url} alt="" className="h-5 w-5 rounded-full" />
            )}
            <span>{t.merchant_name || t.description || "Unknown"}</span>
            {t.pending && (
              <span className="rounded border border-gray-300 px-1.5 py-0.5 text-xs text-gray-500">
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
          {t.category_source && <span className={badgeClassName}>{t.category_source}</span>}
        </td>
        <td className={amountClassName}>
          {t.amount < 0 ? '+' : '-'}$
          {Math.abs(t.amount).toFixed(2)}
        </td>
      </tr>
      {expanded && (
        <tr className="border-t border-gray-200 bg-gray-50">
          <td colSpan={6} className="p-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {plaidCategory?.detailed && (
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">Detail category</p>
                  <p className="text-gray-900">
                    {plaidCategory.detailed.replaceAll('_', ' ').toLowerCase()}
                  </p>
                </div>
              )}
              {t.payment_channel && (
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">Channel</p>
                  <p className="text-gray-900">{t.payment_channel.replaceAll('_', ' ')}</p>
                </div>
              )}
              {location?.city && (
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">Location</p>
                  <p className="text-gray-900">
                    {location.city}
                    {location.region ? ', ' + location.region : ''}
                  </p>
                </div>
              )}
              {plaidCategory?.confidence_level && (
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">Confidence</p>
                  <p className="text-gray-900">
                    {plaidCategory.confidence_level.replaceAll('_', ' ').toLowerCase()}
                  </p>
                </div>
              )}
              {websiteUrl && (
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">Website</p>
                  
                    
                    <a href={websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {t.website}
                  </a>
                </div>
              )}
              {t.merchant_entity_id && (
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">Merchant ID</p>
                  <p className="truncate text-gray-900">{t.merchant_entity_id}</p>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
