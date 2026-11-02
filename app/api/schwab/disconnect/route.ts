import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { disconnect } from '@/lib/schwab/server'

// Removes the saved Schwab sign-in and the copied balances and positions
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  await disconnect(supabase, user.id)
  return NextResponse.json({ ok: true })
}
