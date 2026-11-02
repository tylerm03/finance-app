import { AlertTriangle, RefreshCw } from 'lucide-react'
import type { SchwabStatus } from '@/lib/schwab/server'

function span(seconds: number | null) {
  if (seconds === null) return 'a while'
  const mins = Math.max(1, Math.round(seconds / 60))
  if (mins < 60) return mins + (mins === 1 ? ' minute' : ' minutes')
  const hours = Math.round(mins / 60)
  if (hours < 48) return hours + (hours === 1 ? ' hour' : ' hours')
  return Math.round(hours / 24) + ' days'
}

// Warns when the Schwab connection has expired, failed, or is about to expire.
// Schwab makes you sign in again every 7 days.
export default function SchwabBanner({ status }: { status: SchwabStatus }) {
  const left = status.secondsUntilExpiry
  const soon = status.state === 'connected' && left !== null && left < 2 * 86400

  if (!(status.state === 'expired' || status.state === 'error' || soon)) return null

  const message =
    status.state === 'expired'
      ? 'Your Schwab connection has expired. Schwab asks you to sign in again every 7 days. Showing numbers from ' + span(status.secondsSinceUpdate) + ' ago.'
      : status.state === 'error'
        ? "Couldn't reach Schwab just now, so these numbers are from " + span(status.secondsSinceUpdate) + ' ago.'
        : 'Your Schwab connection ends in ' + span(left) + '. Sign in again to keep live numbers.'

  return (
    <div
      className={
        'flex flex-wrap items-center justify-between gap-3 rounded-xl px-5 py-3.5 text-[15px] ' +
        (status.state === 'connected' ? 'bg-[#fbf3e4] text-[#7a5a1e]' : 'bg-[#fdecea] text-[#a52a1a]')
      }
    >
      <span className="flex items-center gap-2.5">
        <AlertTriangle size={17} className="shrink-0" />
        {message}
      </span>
      <a
        href="/api/schwab/connect"
        className="flex h-9 items-center gap-2 rounded-lg bg-white px-3.5 text-[14px] font-medium text-[#1f1d1a] shadow-sm hover:bg-[#faf9f7]"
      >
        <RefreshCw size={15} />
        Reconnect Schwab
      </a>
    </div>
  )
}
