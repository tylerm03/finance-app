'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function MarkPaidButton({ id }: { id: string }) {
  const router = useRouter()
  const supabase = createClient()

  async function handleClick() {
    await supabase
      .from('recurring_obligations')
      .update({ status: 'marked_paid', paid_marked_date: new Date().toISOString().split('T')[0] })
      .eq('id', id)
    router.refresh()
  }

  return (
    <button
      onClick={handleClick}
      className="rounded border border-gray-700 px-2 py-1 text-xs text-gray-300 hover:border-blue-500 hover:text-blue-400"
    >
      Mark paid
    </button>
  )
}
