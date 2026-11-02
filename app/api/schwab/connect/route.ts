import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { authorizeUrl, schwabConfig } from '@/lib/schwab/server'

// Sends you to Schwab to sign in and choose which accounts to share
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', request.url))
  if (!schwabConfig()) return NextResponse.redirect(new URL('/settings?schwab=not_configured', request.url))

  const state = crypto.randomUUID()
  const res = NextResponse.redirect(authorizeUrl(state))
  res.cookies.set('schwab_state', state, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 600, path: '/' })
  return res
}
