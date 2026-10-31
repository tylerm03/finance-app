'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SetPasswordForm() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    if (password !== confirm) {
      setMessage({ ok: false, text: "Passwords don't match." })
      return
    }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password })
    setSaving(false)
    if (error) {
      setMessage({ ok: false, text: error.message })
      return
    }
    setPassword('')
    setConfirm('')
    setMessage({ ok: true, text: 'Password saved.' })
  }

  const input =
    'h-11 w-full rounded-lg border border-[#e4e1dc] bg-white px-3 text-[15px] outline-none focus:border-[#c9c5bf]'

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="password"
        placeholder="New password"
        autoComplete="new-password"
        minLength={6}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className={input}
        required
      />
      <input
        type="password"
        placeholder="Confirm password"
        autoComplete="new-password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        className={input}
        required
      />
      {message && (
        <p className={'text-[14px] ' + (message.ok ? 'text-[#2f8f3f]' : 'text-[#d6402b]')}>{message.text}</p>
      )}
      <button
        type="submit"
        disabled={saving}
        className="h-10 rounded-lg bg-orange-500 px-4 text-[15px] font-medium text-white hover:bg-orange-600 disabled:opacity-60"
      >
        {saving ? 'Saving...' : 'Save password'}
      </button>
    </form>
  )
}
