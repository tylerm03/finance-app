'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function DeletePaystubButton({ id }: { id: string }) {
  const router = useRouter()
  const supabase = createClient()

  async function handleDelete() {
    await supabase.from('paystubs').delete().eq('id', id)
    router.refresh()
  }

  return (
    <button
      onClick={handleDelete}
      className="text-xs text-gray-400 hover:text-red-600"
    >
      Delete
    </button>
  )
}
