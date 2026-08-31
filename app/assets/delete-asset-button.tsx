'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function DeleteAssetButton({ assetId }: { assetId: string }) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleDelete() {
    setDeleting(true)
    await supabase.from('assets').delete().eq('id', assetId)
    setDeleting(false)
    router.refresh()
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">Delete?</span>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="rounded border border-red-800 px-2 py-1 text-xs text-red-400 hover:bg-red-950 disabled:opacity-50"
        >
          {deleting ? 'Deleting...' : 'Confirm'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs text-gray-400 hover:text-gray-100"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-xs text-gray-500 hover:text-red-400"
    >
      Delete
    </button>
  )
}
