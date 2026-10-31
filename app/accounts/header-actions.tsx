'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePlaidLink, type PlaidLinkOnSuccess } from 'react-plaid-link'
import { Plus, RefreshCw } from 'lucide-react'

export default function HeaderActions() {
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  // Refresh all = update bank balances, then investment holdings
  async function refreshAll() {
    setRefreshing(true)
    setMessage(null)
    try {
      const balances = await fetch('/api/plaid/balances', { method: 'POST' }).then((r) => r.json())
      const investments = await fetch('/api/plaid/investments', { method: 'POST' }).then((r) => r.json())
      const errors = (balances.errors?.length || 0) + (investments.errors?.length || 0)
      if (errors) setMessage(errors + (errors === 1 ? ' account' : ' accounts') + " couldn't refresh")
    } catch {
      setMessage('Refresh failed')
    }
    setRefreshing(false)
    router.refresh()
  }

  async function addAccount() {
    setMessage(null)
    const data = await fetch('/api/plaid/link-token', { method: 'POST' }).then((r) => r.json())
    if (data.error) {
      setMessage(data.error)
      return
    }
    setLinkToken(data.link_token)
  }

  const onSuccess: PlaidLinkOnSuccess = async (public_token) => {
    const res = await fetch('/api/plaid/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ public_token }),
    })
    const data = await res.json()
    setLinkToken(null)
    if (data.error) {
      setMessage(data.error)
      return
    }
    // Pull in the new accounts' details and balances
    await fetch('/api/plaid/balances', { method: 'POST' })
    router.refresh()
  }

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
    onExit: () => setLinkToken(null),
  })

  useEffect(() => {
    if (linkToken && ready) open()
  }, [linkToken, ready, open])

  return (
    <div className="flex items-center gap-3">
      {message && <span className="text-[14px] text-[#d6402b]">{message}</span>}
      <button
        type="button"
        onClick={refreshAll}
        disabled={refreshing}
        className="flex h-10 items-center gap-2 rounded-lg border border-[#e4e1dc] bg-white px-4 text-[15px] font-medium text-[#1f1d1a] hover:bg-[#faf9f7] disabled:opacity-60"
      >
        <RefreshCw size={16} strokeWidth={2} className={refreshing ? 'animate-spin' : ''} />
        {refreshing ? 'Refreshing...' : 'Refresh all'}
      </button>
      <button
        type="button"
        onClick={addAccount}
        className="flex h-10 items-center gap-2 rounded-lg bg-orange-500 px-4 text-[15px] font-medium text-white hover:bg-orange-600"
      >
        <Plus size={17} strokeWidth={2.25} />
        Add account
      </button>
    </div>
  )
}
