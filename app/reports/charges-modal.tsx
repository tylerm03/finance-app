'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, X } from 'lucide-react'
import { formatMoney } from '@/lib/format'
import { MerchantLogo } from '../transactions/transactions-view'
import type { Txn } from '../transactions/types'

function shortDate(day: string) {
  return new Date(day + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Every charge behind one stream of the Sankey or one bar of the Breakdown
export default function ChargesModal({
  title,
  emoji,
  subtitle,
  txns,
  kind,
  href,
  onClose,
  onOpenTxn,
}: {
  title: string
  emoji: string
  subtitle: string // e.g. the date range
  txns: Txn[]
  kind: 'income' | 'expense'
  href: string | null // "View in Transactions" link, when there's a single category
  onClose: () => void
  onOpenTxn: (t: Txn) => void
}) {
  const [sort, setSort] = useState<'date' | 'amount'>('date')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Spending is positive; refunds and income show as money in
  const value = (t: Txn) => (kind === 'expense' ? t.amount : -t.amount)
  const moneyIn = (v: number) => (kind === 'income' ? v > 0 : v < 0)
  const total = txns.reduce((s, t) => s + value(t), 0)
  const rows = useMemo(
    () =>
      [...txns].sort((a, b) =>
        sort === 'amount' ? Math.abs(b.amount) - Math.abs(a.amount) : a.date < b.date ? 1 : a.date > b.date ? -1 : 0
      ),
    [txns, sort]
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#1f1d1a]/40" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label={title} className="relative flex max-h-[82vh] w-full max-w-[640px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#efedea] px-6 pb-4 pt-5">
          <div className="min-w-0">
            <h3 className="flex items-center gap-2.5 text-[21px] font-semibold">
              {emoji && <span className="text-[22px] leading-none">{emoji}</span>}
              <span className="truncate">{title}</span>
            </h3>
            <p className="mt-1 text-[14px] text-[#77736d]">
              <span className="font-medium tabular-nums text-[#1f1d1a]">{formatMoney(total)}</span> ·{' '}
              {txns.length} {txns.length === 1 ? (kind === 'expense' ? 'charge' : 'deposit') : kind === 'expense' ? 'charges' : 'deposits'} · {subtitle}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="mt-1 shrink-0 text-[#1f1d1a] hover:text-[#77736d]">
            <X size={22} />
          </button>
        </div>

        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex rounded-lg bg-[#f1efec] p-0.5 text-[13px]">
            {(
              [
                ['date', 'Newest'],
                ['amount', 'Largest'],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setSort(k)}
                className={'rounded-md px-3 py-1.5 font-medium ' + (sort === k ? 'bg-white text-[#1f1d1a] shadow-sm' : 'text-[#77736d]')}
              >
                {label}
              </button>
            ))}
          </div>
          {href && (
            <Link href={href} className="flex items-center gap-1.5 text-[14px] font-medium text-orange-500 hover:text-orange-600">
              View in Transactions
              <ArrowRight size={15} />
            </Link>
          )}
        </div>

        <div className="flex-1 overflow-y-auto border-t border-[#efedea]">
          {rows.length === 0 && <p className="px-6 py-8 text-center text-[15px] text-[#77736d]">Nothing in this range.</p>}
          {rows.map((t) => {
            const v = value(t)
            const share = total > 0 && v > 0 ? (v / total) * 100 : null
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onOpenTxn(t)}
                className="flex w-full items-center gap-3.5 border-b border-[#f1efec] px-6 py-3 text-left last:border-b-0 hover:bg-[#faf9f7]"
              >
                <MerchantLogo t={t} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] text-[#1f1d1a]">{t.merchant}</p>
                  <p className="truncate text-[13px] text-[#77736d]">
                    {shortDate(t.date)}
                    {t.accountName && ' · ' + t.accountName}
                    {t.pending && ' · Pending'}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={'text-[15px] tabular-nums ' + (moneyIn(v) ? 'text-[#2e8f57]' : 'text-[#1f1d1a]')}>
                    {moneyIn(v) ? '+' : ''}
                    {formatMoney(Math.abs(v))}
                  </p>
                  {share !== null && <p className="text-[12px] tabular-nums text-[#8a8680]">{share.toFixed(1)}%</p>}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
