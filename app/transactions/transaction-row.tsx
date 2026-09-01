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
  plaid: 'bg-orange-100 text-orange-500',
  rule: 'bg-gray-200 text-gray-600',
  manual: 'bg-gray-200 text-gray-600',
  ai: 'bg-purple-100 text-purple-600',
}

const avatarColors = [
  'bg-orange-100 text-orange-700',
  'bg-blue-100 text-blue-700',
  'bg-green-100 text-green-700',
  'bg-purple-100 text-purple-700',
  'bg-pink-100 text-pink-700',
  'bg-teal-100 text-teal-700',
]

function avatarColorFor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return avatarColors[Math.abs(hash) % avatarColors.length]
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
  const displayName = t.merchant_name || t.description || 'Unknown'

  const hasDetail =
    plaidCategory?.detailed || t.payment_channel || location?.city || t.website || t.merchant_entity_id

  const rowClassName = hasDetail
    ? 'border-b border-gray-200 cursor-pointer hover:bg-gray-50'
    : 'border-b border-gray-200'

  const badgeClassName =
    'rounded-full px-2 py-0.5 text-xs ' +
    (sourceBadgeStyles[t.category_source] || 'bg-gray-200 text-gray-600')

  const amountClassName =
    'py-2 px-3 text-right tabular-nums ' + (t.amount < 0 ? 'text-green-600' : 'text-gray-900')

  return (
    <>
      <tr className={rowClassName} onClick={() => hasDetail && setExpanded(!expanded)}>
        <td className="py-2 px-3 text-gray-500">{t.txn_date}</td>
        <td className="py-2 px-3 text-gray-500">{accountName || '\u2014'}</td>
        <td className="py-2 px-3">
          <div className="flex items-center gap-3">
            {t.logo_url ? (
              <img src={t.logo_url} alt="" className="h-8 w-8 rounded-lg object-cover" />
            ) : (
              <div
                className={
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ' +
                  avatarColorFor(displayName)
                }
              >
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <span>{displayName}</span>
            {t.pending && (
              <span className="rounded border border-gray-300 px-1.5 py-0.5 text-xs text-gray-500">
                pending
              </span>
            )}
          </div>
        </td>
        <td className="py-2 px-3" onClick={(e) => e.stopPropagation()}>
          <CategorySelect
            transactionId={t.id}
            merchantEntityId={t.merchant_entity_id}
            currentCategory={t.category}
          />
        </td>
        <td className="py-2 px-3">
          {t.category_source && <span className={badgeClassName}>{t.category_source}</span>}
        </td>
        <td className={amountClassName}>
          {t.amount < 0 ? '+' : '-'}$
          {Math.abs(t.amount).toFixed(2)}
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-gray-200 bg-gray-50">
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
                    className="text-orange-500 hover:underline"
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
