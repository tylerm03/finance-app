'use client'

import { useState, useCallback } from 'react'
import { usePlaidLink, type PlaidLinkOnSuccess } from 'react-plaid-link'
import { useRouter } from 'next/navigation'

export default function ConnectBankButton() {
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleClick() {
    setError(null)
    const res = await fetch('/api/plaid/link-token', { method: 'POST' })
    const data = await res.json()

    if (data.error) {
      setError(data.error)
      return
    }

    setLinkToken(data.link_token)
  }

  const onSuccess: PlaidLinkOnSuccess = useCallback(
    async (public_token) => {
      const res = await fetch('/api/plaid/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_token }),
      })
      const data = await res.json()

      if (data.error) {
        setError(data.error)
        return
      }

      router.refresh()
    },
    [router]
  )

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
  })

  if (linkToken && ready) {
    open()
  }

  return (
    <div>
      <button
        onClick={handleClick}
        className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-600"
      >
        Connect a bank
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}
