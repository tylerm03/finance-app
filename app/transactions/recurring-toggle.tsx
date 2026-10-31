'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Check, Copy, Repeat } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { companyKey } from '@/lib/recurring/detect'
import { BUDGET_SETUP_SQL } from '@/lib/budget/setup-sql'
import type { Txn } from './types'

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

type State =
  | { kind: 'loading' }
  | { kind: 'none' }
  | { kind: 'marked'; id: string; day: number }
  | { kind: 'setup' }
  | { kind: 'error'; message: string }

const missing = (e: { code?: string; message?: string }) =>
  e.code === '42P01' || e.code === 'PGRST205' || /does not exist|schema cache/i.test(e.message || '')

// "Make recurring" button in the edit panel: adds this company to the
// Recurring calendar every month on this transaction's day.
export default function RecurringToggle({ txn }: { txn: Txn }) {
  const key = companyKey(txn)
  const day = Number(txn.date.slice(8, 10))
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    createClient()
      .from('recurring_marks')
      .select('id, day')
      .eq('merchant_key', key)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) setState(missing(error) ? { kind: 'setup' } : { kind: 'error', message: error.message })
        else {
          const mark = (data || []).find((m) => m.day === day) || (data || [])[0]
          setState(mark ? { kind: 'marked', id: mark.id, day: mark.day } : { kind: 'none' })
        }
      })
    return () => {
      cancelled = true
    }
  }, [key, day])

  async function mark() {
    setBusy(true)
    const { data, error } = await createClient()
      .from('recurring_marks')
      .upsert(
        {
          merchant_key: key,
          merchant: txn.merchant,
          day,
          amount: txn.amount,
          category: txn.category,
          account_id: txn.accountId,
          start_date: txn.date,
        },
        { onConflict: 'user_id,merchant_key,day' }
      )
      .select('id')
      .single()
    setBusy(false)
    if (error) setState(missing(error) ? { kind: 'setup' } : { kind: 'error', message: error.message })
    else setState({ kind: 'marked', id: data.id, day })
  }

  async function unmark(id: string) {
    setBusy(true)
    const { error } = await createClient().from('recurring_marks').delete().eq('id', id)
    setBusy(false)
    if (error) setState({ kind: 'error', message: error.message })
    else setState({ kind: 'none' })
  }

  return (
    <div>
      <p className="mb-2.5 text-[16px] font-medium text-[#1f1d1a]">Recurring</p>

      {state.kind === 'loading' && <div className="h-12 animate-pulse rounded-lg bg-[#f4f3f1]" />}

      {state.kind === 'none' && (
        <button
          type="button"
          onClick={mark}
          disabled={busy}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-[#e4e1dc] bg-white text-[16px] font-medium text-[#1f1d1a] hover:bg-[#faf9f7] disabled:opacity-60"
        >
          <Repeat size={17} />
          {busy ? 'Saving...' : 'Make recurring · every month on the ' + ordinal(day)}
        </button>
      )}

      {state.kind === 'marked' && (
        <div className="flex h-12 items-center justify-between gap-3 rounded-lg bg-[#e1f3e8] px-4 text-[15px] text-[#1f6b40]">
          <span className="flex items-center gap-2">
            <Check size={17} strokeWidth={2.5} />
            Recurring every month on the {ordinal(state.day)}
          </span>
          <span className="flex items-center gap-4">
            <Link href="/recurring" className="font-medium underline-offset-2 hover:underline">
              View
            </Link>
            <button
              type="button"
              disabled={busy}
              onClick={() => unmark(state.id)}
              className="font-medium text-[#5f5b55] hover:text-[#c8321e] disabled:opacity-50"
            >
              Undo
            </button>
          </span>
        </div>
      )}

      {state.kind === 'setup' && (
        <div className="rounded-lg border border-[#f3d9b8] bg-[#fdf8f1] p-4 text-[14px] text-[#5f5b55]">
          <p className="mb-3">
            Marking payments as recurring needs a one-time database update. Copy the setup, then in Supabase open{' '}
            <b>SQL Editor → New query</b>, paste it and click <b>Run</b>.
          </p>
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(BUDGET_SETUP_SQL)
              setCopied(true)
            }}
            className="flex h-9 items-center gap-2 rounded-lg bg-orange-500 px-3 text-[14px] font-medium text-white hover:bg-orange-600"
          >
            <Copy size={15} />
            {copied ? 'Copied' : 'Copy setup SQL'}
          </button>
        </div>
      )}

      {state.kind === 'error' && <p className="text-[14px] text-[#d6402b]">{state.message}</p>}
    </div>
  )
}
