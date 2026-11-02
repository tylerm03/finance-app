// Direct connection to Schwab's Trader API for live balances and positions.
// Server-only: uses the app secret from env and the signed-in user's tokens.
//
// Env (set in .env.local and on your host):
//   SCHWAB_APP_KEY, SCHWAB_APP_SECRET   from developer.schwab.com -> My Apps
//   SCHWAB_REDIRECT_URI                 the exact Callback URL registered there,
//                                       e.g. https://your-site.vercel.app/api/schwab/callback

import type { createClient } from '@/lib/supabase/server'

type Supabase = Awaited<ReturnType<typeof createClient>>

const API = process.env.SCHWAB_API_BASE || 'https://api.schwabapi.com'
const REFRESH_DAYS = 7 // Schwab makes you sign in again after 7 days
const MAX_AGE_SECONDS = 30 // re-fetch from Schwab when stored data is older than this

export type SchwabState = 'not_configured' | 'setup_needed' | 'not_connected' | 'connected' | 'expired' | 'error'

export type SchwabAccount = {
  account_hash: string
  last4: string
  type: string | null
  liquidation_value: number
  cash_balance: number
  day_change: number
  updated_at: string
}

export type SchwabPosition = {
  account_hash: string
  symbol: string
  description: string | null
  asset_type: string | null
  quantity: number
  market_value: number
  average_price: number | null
  day_change: number
  updated_at: string
}

export type SchwabStatus = {
  state: SchwabState
  updatedAt: string | null
  refreshExpiresAt: string | null
  error: string | null
  // Worked out on the server so pages don't need the clock while rendering
  secondsSinceUpdate: number | null
  secondsUntilExpiry: number | null
}

function withAges(s: Omit<SchwabStatus, 'secondsSinceUpdate' | 'secondsUntilExpiry'>): SchwabStatus {
  const now = Date.now()
  return {
    ...s,
    secondsSinceUpdate: s.updatedAt ? Math.max(0, Math.round((now - new Date(s.updatedAt).getTime()) / 1000)) : null,
    secondsUntilExpiry: s.refreshExpiresAt ? Math.round((new Date(s.refreshExpiresAt).getTime() - now) / 1000) : null,
  }
}

export type SchwabData = { status: SchwabStatus; accounts: SchwabAccount[]; positions: SchwabPosition[] }

export function schwabConfig() {
  const key = process.env.SCHWAB_APP_KEY
  const secret = process.env.SCHWAB_APP_SECRET
  const redirect = process.env.SCHWAB_REDIRECT_URI
  if (!key || !secret || !redirect) return null
  return { key, secret, redirect }
}

export function authorizeUrl(state: string) {
  const c = schwabConfig()!
  return API + '/v1/oauth/authorize?client_id=' + encodeURIComponent(c.key) + '&redirect_uri=' + encodeURIComponent(c.redirect) + '&state=' + encodeURIComponent(state)
}

type TokenResponse = { access_token: string; refresh_token?: string; expires_in?: number }

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const c = schwabConfig()!
  const res = await fetch(API + '/v1/oauth/token', {
    method: 'POST',
    cache: 'no-store',
    headers: {
      Authorization: 'Basic ' + Buffer.from(c.key + ':' + c.secret).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(body).toString(),
  })
  if (!res.ok) throw new Error('Schwab sign-in failed (' + res.status + '): ' + (await res.text()).slice(0, 200))
  return res.json()
}

function tableMissing(e: { code?: string; message?: string } | null) {
  return !!e && (e.code === '42P01' || e.code === 'PGRST205' || /does not exist|schema cache/i.test(e.message || ''))
}

// Called from the OAuth callback: swap the one-time code for tokens and save them
export async function connectWithCode(supabase: Supabase, code: string) {
  const c = schwabConfig()!
  const t = await tokenRequest({ grant_type: 'authorization_code', code, redirect_uri: c.redirect })
  if (!t.refresh_token) throw new Error('Schwab did not return a refresh token')
  const now = Date.now()
  const { error } = await supabase.from('schwab_tokens').upsert(
    {
      access_token: t.access_token,
      refresh_token: t.refresh_token,
      access_expires_at: new Date(now + (t.expires_in || 1800) * 1000).toISOString(),
      refresh_expires_at: new Date(now + REFRESH_DAYS * 86400000).toISOString(),
      updated_at: new Date(now).toISOString(),
    },
    { onConflict: 'user_id' }
  )
  if (error) throw new Error(error.message)
}

export async function disconnect(supabase: Supabase, userId: string) {
  await supabase.from('schwab_positions').delete().eq('user_id', userId)
  await supabase.from('schwab_accounts').delete().eq('user_id', userId)
  await supabase.from('schwab_tokens').delete().eq('user_id', userId)
}

type Tokens = {
  user_id: string
  access_token: string
  refresh_token: string
  access_expires_at: string
  refresh_expires_at: string
}

// Access tokens only last 30 minutes; swap the refresh token for a new one when needed
async function accessToken(supabase: Supabase, t: Tokens) {
  if (new Date(t.access_expires_at).getTime() - Date.now() > 60_000) return t.access_token
  const r = await tokenRequest({ grant_type: 'refresh_token', refresh_token: t.refresh_token })
  await supabase
    .from('schwab_tokens')
    .update({
      access_token: r.access_token,
      refresh_token: r.refresh_token || t.refresh_token,
      access_expires_at: new Date(Date.now() + (r.expires_in || 1800) * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', t.user_id)
  return r.access_token
}

type RawPosition = {
  longQuantity?: number
  shortQuantity?: number
  averagePrice?: number
  marketValue?: number
  currentDayProfitLoss?: number
  instrument?: { symbol?: string; description?: string; assetType?: string; type?: string }
}
type RawAccount = {
  securitiesAccount?: {
    type?: string
    accountNumber?: string
    positions?: RawPosition[]
    currentBalances?: { liquidationValue?: number; cashBalance?: number; totalCash?: number }
  }
}

async function fetchLive(token: string, userId: string) {
  const headers = { Authorization: 'Bearer ' + token, Accept: 'application/json' }
  const [numbersRes, accountsRes] = await Promise.all([
    fetch(API + '/trader/v1/accounts/accountNumbers', { headers, cache: 'no-store' }),
    fetch(API + '/trader/v1/accounts?fields=positions', { headers, cache: 'no-store' }),
  ])
  if (!numbersRes.ok || !accountsRes.ok) {
    const bad = !numbersRes.ok ? numbersRes : accountsRes
    throw new Error('Schwab returned ' + bad.status + ': ' + (await bad.text()).slice(0, 200))
  }
  const numbers = (await numbersRes.json()) as { accountNumber: string; hashValue: string }[]
  const raw = (await accountsRes.json()) as RawAccount[]
  const hashFor = new Map(numbers.map((n) => [n.accountNumber, n.hashValue]))
  const now = new Date().toISOString()

  const accounts: (SchwabAccount & { user_id: string })[] = []
  const positions: (SchwabPosition & { user_id: string })[] = []
  for (const a of raw) {
    const s = a.securitiesAccount
    if (!s?.accountNumber) continue
    // Never store the full account number: keep Schwab's hash and the last 4 digits
    const hash = hashFor.get(s.accountNumber) || 'acct-' + s.accountNumber.slice(-4)
    let dayChange = 0
    for (const p of s.positions || []) {
      const symbol = p.instrument?.symbol || p.instrument?.description || 'UNKNOWN'
      dayChange += Number(p.currentDayProfitLoss || 0)
      positions.push({
        user_id: userId,
        account_hash: hash,
        symbol,
        description: p.instrument?.description || null,
        asset_type: p.instrument?.assetType || p.instrument?.type || null,
        quantity: Number(p.longQuantity || 0) - Number(p.shortQuantity || 0),
        market_value: Number(p.marketValue || 0),
        average_price: p.averagePrice ?? null,
        day_change: Number(p.currentDayProfitLoss || 0),
        updated_at: now,
      })
    }
    accounts.push({
      user_id: userId,
      account_hash: hash,
      last4: s.accountNumber.slice(-4),
      type: s.type || null,
      liquidation_value: Number(s.currentBalances?.liquidationValue || 0),
      cash_balance: Number(s.currentBalances?.cashBalance ?? s.currentBalances?.totalCash ?? 0),
      day_change: Math.round(dayChange * 100) / 100,
      updated_at: now,
    })
  }
  // Same symbol in one account (rare): combine so the primary key holds
  const merged = new Map<string, SchwabPosition & { user_id: string }>()
  for (const p of positions) {
    const k = p.account_hash + '|' + p.symbol
    const cur = merged.get(k)
    if (cur) {
      cur.quantity += p.quantity
      cur.market_value += p.market_value
      cur.day_change += p.day_change
    } else merged.set(k, { ...p })
  }
  return { accounts, positions: [...merged.values()] }
}

// Stored Schwab data, refreshed from Schwab first if it's more than 30 seconds old.
// Any failure falls back to the last stored numbers with the error attached.
export async function loadSchwab(supabase: Supabase, opts: { force?: boolean } = {}): Promise<SchwabData> {
  const empty = (state: SchwabState, error: string | null = null): SchwabData => ({
    status: withAges({ state, updatedAt: null, refreshExpiresAt: null, error }),
    accounts: [],
    positions: [],
  })

  const [tokensRes, accountsRes, positionsRes] = await Promise.all([
    supabase.from('schwab_tokens').select('user_id, access_token, refresh_token, access_expires_at, refresh_expires_at').maybeSingle(),
    supabase.from('schwab_accounts').select('account_hash, last4, type, liquidation_value, cash_balance, day_change, updated_at'),
    supabase.from('schwab_positions').select('account_hash, symbol, description, asset_type, quantity, market_value, average_price, day_change, updated_at'),
  ])
  if (tableMissing(tokensRes.error)) return empty('setup_needed')
  if (tokensRes.error) return empty('error', tokensRes.error.message)

  const num = <T extends Record<string, unknown>>(rows: T[] | null, keys: string[]) =>
    (rows || []).map((r) => {
      const o: Record<string, unknown> = { ...r }
      for (const k of keys) if (o[k] !== null && o[k] !== undefined) o[k] = Number(o[k])
      return o
    })
  let accounts = num(accountsRes.data, ['liquidation_value', 'cash_balance', 'day_change']) as SchwabAccount[]
  let positions = num(positionsRes.data, ['quantity', 'market_value', 'average_price', 'day_change']) as SchwabPosition[]
  const stored = (state: SchwabState, error: string | null, refreshExpiresAt: string | null): SchwabData => ({
    status: withAges({
      state,
      updatedAt: accounts.reduce<string | null>((m, a) => (!m || a.updated_at > m ? a.updated_at : m), null),
      refreshExpiresAt,
      error,
    }),
    accounts,
    positions,
  })

  const tokens = tokensRes.data as Tokens | null
  if (!tokens) return accounts.length ? stored('not_connected', null, null) : empty(schwabConfig() ? 'not_connected' : 'not_configured')
  if (!schwabConfig()) return stored('not_configured', null, tokens.refresh_expires_at)
  if (new Date(tokens.refresh_expires_at).getTime() <= Date.now()) return stored('expired', null, tokens.refresh_expires_at)

  const newest = accounts.reduce((m, a) => Math.max(m, new Date(a.updated_at).getTime()), 0)
  if (!opts.force && accounts.length && Date.now() - newest < MAX_AGE_SECONDS * 1000) {
    return stored('connected', null, tokens.refresh_expires_at)
  }

  try {
    const token = await accessToken(supabase, tokens)
    const live = await fetchLive(token, tokens.user_id)
    // Replace what's stored with the live snapshot
    await supabase.from('schwab_positions').delete().eq('user_id', tokens.user_id)
    await supabase.from('schwab_accounts').delete().eq('user_id', tokens.user_id)
    if (live.accounts.length) await supabase.from('schwab_accounts').insert(live.accounts)
    if (live.positions.length) await supabase.from('schwab_positions').insert(live.positions)
    accounts = live.accounts
    positions = live.positions
    return stored('connected', null, tokens.refresh_expires_at)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    // A rejected refresh token means Schwab wants you to sign in again
    const expired = message.startsWith('Schwab sign-in failed')
    return stored(expired ? 'expired' : 'error', expired ? null : message, tokens.refresh_expires_at)
  }
}

// Plaid also sees Schwab accounts. When Schwab is connected directly, hide
// Plaid's copies of the brokerage accounts so nothing is counted twice.
export function isPlaidSchwabBrokerage(institution: string | null | undefined, type: string | null | undefined) {
  return /schwab/i.test(institution || '') && (type === 'investment' || type === 'brokerage')
}

export function schwabAccountName(a: SchwabAccount) {
  // MARGIN/CASH are plain brokerage accounts; keep short codes like IRA in capitals
  const kind =
    a.type === 'MARGIN' || a.type === 'CASH'
      ? 'Brokerage'
      : a.type
        ? a.type
            .split('_')
            .map((w) => (w.length <= 4 ? w : w.charAt(0) + w.slice(1).toLowerCase()))
            .join(' ')
        : 'Account'
  return 'Schwab ' + kind + ' ••' + a.last4
}
