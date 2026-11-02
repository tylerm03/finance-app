import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { connectWithCode, loadSchwab, schwabConfig } from '@/lib/schwab/server'

// Schwab sends you back here after you sign in
export async function GET(request: NextRequest) {
  const url = request.nextUrl
  const back = (result: string) => {
    const res = NextResponse.redirect(new URL('/settings?schwab=' + result, url.origin))
    res.cookies.delete('schwab_state')
    return res
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', url.origin))
  if (!schwabConfig()) return back('not_configured')

  // Make sure this sign-in was started from this browser
  const expected = request.cookies.get('schwab_state')?.value
  const state = url.searchParams.get('state')
  if (!expected || (state && state !== expected)) return back('expired_link')

  const code = url.searchParams.get('code')
  if (!code) return back(url.searchParams.get('error') ? 'denied' : 'failed')

  try {
    await connectWithCode(supabase, code)
    await loadSchwab(supabase, { force: true })
    return back('connected')
  } catch (e) {
    console.error('Schwab connect failed:', e)
    return back('failed')
  }
}
