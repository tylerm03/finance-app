'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import type { SchwabStatus } from '@/lib/schwab/server'
import SetupCard from '../budget/setup-card'

const BTN_PRIMARY = 'inline-flex h-10 items-center rounded-lg bg-orange-500 px-4 text-[15px] font-medium text-white hover:bg-orange-600'
const BTN = 'inline-flex h-10 items-center rounded-lg border border-[#e4e1dc] bg-white px-4 text-[15px] font-medium hover:bg-[#faf9f7] disabled:opacity-60'

const RESULT: Record<string, { ok: boolean; text: string }> = {
  connected: { ok: true, text: 'Schwab is connected. Your balances and positions are now live.' },
  denied: { ok: false, text: 'Schwab sign-in was cancelled.' },
  failed: { ok: false, text: "Couldn't finish connecting to Schwab. Check the app key, secret and callback URL, then try again." },
  expired_link: { ok: false, text: 'That Schwab sign-in link expired. Start again from here.' },
  not_configured: { ok: false, text: 'Add your Schwab app key and secret first (see below).' },
}

function since(s: number | null) {
  if (s === null) return 'never'
  if (s < 60) return 'just now'
  if (s < 3600) return Math.round(s / 60) + ' min ago'
  if (s < 86400) return Math.round(s / 3600) + ' hr ago'
  return Math.round(s / 86400) + ' days ago'
}

function until(seconds: number | null) {
  if (seconds === null) return ''
  const h = Math.round(seconds / 3600)
  if (h <= 0) return 'now'
  if (h < 48) return 'in ' + h + (h === 1 ? ' hour' : ' hours')
  return 'in ' + Math.round(h / 24) + ' days'
}

export default function SchwabCard({ status, result, accountCount }: { status: SchwabStatus; result: string | null; accountCount: number }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const r = result ? RESULT[result] : null

  async function disconnect() {
    if (!window.confirm('Disconnect Schwab? Live balances and positions will be removed from the app until you connect again.')) return
    setBusy(true)
    await fetch('/api/schwab/disconnect', { method: 'POST' })
    setBusy(false)
    router.replace('/settings')
    router.refresh()
  }

  return (
    <section className="max-w-lg rounded-xl bg-white p-6 shadow-[0_1px_3px_rgba(30,25,20,0.06)]">
      <p className="mb-1 text-[17px] font-medium">Schwab</p>
      <p className="mb-5 text-[15px] text-[#77736d]">
        Live balances and positions straight from Schwab, instead of Plaid&apos;s once-a-day copy. Schwab asks you to sign in
        again every 7 days.
      </p>

      {r && (
        <p className={'mb-4 rounded-lg px-4 py-3 text-[14px] ' + (r.ok ? 'bg-[#e1f3e8] text-[#1f6b40]' : 'bg-[#fdecea] text-[#a52a1a]')}>{r.text}</p>
      )}

      {status.state === 'setup_needed' && <SetupCard what="Schwab connections" />}

      {status.state === 'not_configured' && (
        <ol className="list-decimal space-y-2 pl-5 text-[14px] text-[#3b3834]">
          <li>
            Sign in at <b>developer.schwab.com</b> (a separate login from your Schwab account) and create an app for{' '}
            <b>Accounts and Trading Production</b>.
          </li>
          <li>
            Set its Callback URL to your live site plus <code className="rounded bg-[#f1efec] px-1">/api/schwab/callback</code>.
          </li>
          <li>Wait for the app to show &quot;Ready For Use&quot; (usually a few days).</li>
          <li>
            Add <code className="rounded bg-[#f1efec] px-1">SCHWAB_APP_KEY</code>, <code className="rounded bg-[#f1efec] px-1">SCHWAB_APP_SECRET</code> and{' '}
            <code className="rounded bg-[#f1efec] px-1">SCHWAB_REDIRECT_URI</code> to your site&apos;s environment variables, then redeploy.
          </li>
        </ol>
      )}

      {status.state === 'not_connected' && (
        <a href="/api/schwab/connect" className={BTN_PRIMARY}>
          Connect Schwab
        </a>
      )}

      {(status.state === 'connected' || status.state === 'expired' || status.state === 'error') && (
        <div className="space-y-4">
          <div className="rounded-lg border border-[#efedea] px-4 py-3 text-[14px]">
            {status.state === 'connected' ? (
              <p className="flex items-center gap-2 font-medium text-[#1f6b40]">
                <Check size={16} strokeWidth={2.5} />
                Connected · {accountCount} {accountCount === 1 ? 'account' : 'accounts'}
              </p>
            ) : (
              <p className="font-medium text-[#a52a1a]">{status.state === 'expired' ? 'Sign-in expired' : "Couldn't reach Schwab"}</p>
            )}
            <p className="mt-1 text-[#77736d]">
              Updated {since(status.secondsSinceUpdate)}
              {status.state === 'connected' && status.secondsUntilExpiry !== null && ' · sign-in needed again ' + until(status.secondsUntilExpiry)}
            </p>
            {status.error && <p className="mt-1 text-[#a52a1a]">{status.error}</p>}
          </div>
          <div className="flex gap-3">
            <a href="/api/schwab/connect" className={status.state === 'connected' ? BTN : BTN_PRIMARY}>
              {status.state === 'connected' ? 'Sign in again' : 'Reconnect'}
            </a>
            <button type="button" onClick={disconnect} disabled={busy} className={BTN + ' text-[#c8321e]'}>
              Disconnect
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
