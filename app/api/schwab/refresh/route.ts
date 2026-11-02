import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { loadSchwab } from '@/lib/schwab/server'

// Pull fresh numbers from Schwab right now (used by Refresh all)
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const { status } = await loadSchwab(supabase, { force: true })
  return NextResponse.json({ state: status.state, error: status.error })
}
