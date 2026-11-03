// Builds everything the Accounts page needs from raw Supabase rows:
// account groups, per-account daily balance history and update labels.
//
// We don't store balance snapshots, so history is reconstructed by walking
// backwards from each account's current balance through its transactions.
// Investment accounts and manual assets have no transaction trail, so their
// history is flat at the current value.

export const HISTORY_DAYS = 365

export type GroupKey =
  | 'cash'
  | 'credit'
  | 'investments'
  | 'loans'
  | 'real_estate'
  | 'vehicles'
  | 'other'

export type GroupKind = 'asset' | 'liability'

export const GROUP_META: Record<GroupKey, { label: string; kind: GroupKind; color: string }> = {
  cash: { label: 'Cash', kind: 'asset', color: '#3fa34d' },
  credit: { label: 'Credit Cards', kind: 'liability', color: '#e8462a' },
  investments: { label: 'Investments', kind: 'asset', color: '#7dd8f6' },
  loans: { label: 'Loans', kind: 'liability', color: '#f6c51b' },
  real_estate: { label: 'Real Estate', kind: 'asset', color: '#8b4fd1' },
  vehicles: { label: 'Vehicles', kind: 'asset', color: '#f26b1d' },
  other: { label: 'Other', kind: 'asset', color: '#9ca3af' },
}

// Display order of the account cards on the page
const GROUP_ORDER: GroupKey[] = ['cash', 'credit', 'investments', 'loans', 'real_estate', 'vehicles', 'other']

export type RawAccount = {
  id: string
  name: string | null
  type: string | null
  subtype: string | null
  current_balance: number | string | null
  balance_updated_at: string | null
  plaid_item_id: string | null
}

export type RawTxn = {
  account_id: string | null
  txn_date: string
  amount: number | string
  pending: boolean | null
}

export type RawAsset = {
  id: string
  name: string | null
  type: string | null
  trim?: string | null
  current_value: number | string | null
  value_updated_at: string | null
}

export type AccountRow = {
  id: string
  name: string
  subtitle: string
  institution: string
  avatar: 'bank' | 'manual' | 'vehicle' | 'home'
  logo: string | null // bank logo (data: URL) when Plaid has one
  balance: number
  updatedLabel: string
  // Daily end-of-day balances, aligned with AccountsData.dates
  series: number[]
  // What an investment account holds, biggest first (empty for other accounts)
  holdings?: AccountHolding[]
}

export type AccountHolding = {
  symbol: string | null
  name: string
  quantity: number | null
  value: number
  dayChange: number | null // only for live Schwab positions
}

export type AccountGroup = {
  key: GroupKey
  label: string
  kind: GroupKind
  color: string
  accounts: AccountRow[]
}

export type AccountsData = {
  dates: string[] // YYYY-MM-DD, oldest first, last is today
  groups: AccountGroup[]
}

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10)
}

function titleCase(s: string) {
  return s.replace(/\b[a-z]/g, (c) => c.toUpperCase())
}

export function timeAgo(iso: string | null, now: Date): string {
  if (!iso) return ''
  const mins = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 60000))
  if (mins < 1) return 'just now'
  if (mins < 60) return mins + (mins === 1 ? ' minute ago' : ' minutes ago')
  const hours = Math.round(mins / 60)
  if (hours < 24) return hours + (hours === 1 ? ' hour ago' : ' hours ago')
  const days = Math.round(hours / 24)
  if (days < 30) return days + (days === 1 ? ' day ago' : ' days ago')
  const months = Math.round(days / 30)
  return months + (months === 1 ? ' month ago' : ' months ago')
}

function groupForAccount(type: string | null): GroupKey {
  switch (type) {
    case 'depository':
      return 'cash'
    case 'credit':
      return 'credit'
    case 'investment':
    case 'brokerage':
      return 'investments'
    case 'loan':
      return 'loans'
    default:
      return 'other'
  }
}

function groupForAsset(type: string | null): GroupKey {
  if (type === 'vehicle') return 'vehicles'
  if (type === 'real_estate' || type === 'property' || type === 'home') return 'real_estate'
  return 'other'
}

export function buildAccountsData(input: {
  accounts: RawAccount[]
  transactions: RawTxn[]
  holdingsByAccount: Map<string, number>
  institutionByItem: Map<string, string>
  logoByItem?: Map<string, string | null>
  assets: RawAsset[]
  now?: Date
}): AccountsData {
  const now = input.now || new Date()

  const dates: string[] = []
  for (let i = HISTORY_DAYS; i >= 0; i--) {
    const d = new Date(now)
    d.setUTCDate(d.getUTCDate() - i)
    dates.push(isoDay(d))
  }
  const last = dates.length - 1

  // account_id -> (day -> summed Plaid amount). Plaid amounts are positive
  // for money leaving the account and negative for money coming in.
  const flows = new Map<string, Map<string, number>>()
  for (const t of input.transactions) {
    if (!t.account_id || t.pending) continue
    let byDay = flows.get(t.account_id)
    if (!byDay) {
      byDay = new Map()
      flows.set(t.account_id, byDay)
    }
    byDay.set(t.txn_date, (byDay.get(t.txn_date) || 0) + Number(t.amount || 0))
  }

  const groups = new Map<GroupKey, AccountRow[]>()
  const push = (key: GroupKey, row: AccountRow) => {
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(row)
  }

  for (const a of input.accounts) {
    const key = groupForAccount(a.type)
    const holdings = input.holdingsByAccount.get(a.id)
    const balance = holdings !== undefined ? holdings : Number(a.current_balance || 0)

    const series = new Array<number>(dates.length).fill(balance)
    const byDay = flows.get(a.id)
    if (byDay && (key === 'cash' || key === 'credit' || key === 'loans')) {
      // Walk backwards: the balance at the end of the previous day is today's
      // balance with today's transactions undone.
      const isLiability = GROUP_META[key].kind === 'liability'
      for (let i = last; i > 0; i--) {
        const amt = byDay.get(dates[i]) || 0
        series[i - 1] = isLiability ? series[i] - amt : series[i] + amt
      }
    }

    const institution = a.plaid_item_id ? input.institutionByItem.get(a.plaid_item_id) || '' : ''

    push(key, {
      id: a.id,
      name: a.name || 'Account',
      subtitle: a.subtype ? titleCase(a.subtype) : titleCase(GROUP_META[key].label),
      institution,
      avatar: institution ? 'bank' : 'manual',
      logo: (a.plaid_item_id && input.logoByItem?.get(a.plaid_item_id)) || null,
      balance,
      updatedLabel: timeAgo(a.balance_updated_at, now),
      series,
    })
  }

  for (const asset of input.assets) {
    const key = groupForAsset(asset.type)
    const value = Number(asset.current_value || 0)
    push(key, {
      id: 'asset-' + asset.id,
      name: asset.name || 'Asset',
      subtitle: key === 'vehicles' ? 'Vehicle' : key === 'real_estate' ? 'Real Estate' : 'Asset',
      institution: '',
      avatar: key === 'vehicles' ? 'vehicle' : key === 'real_estate' ? 'home' : 'manual',
      logo: null,
      balance: value,
      updatedLabel: timeAgo(asset.value_updated_at, now),
      series: new Array<number>(dates.length).fill(value),
    })
  }

  return {
    dates,
    groups: GROUP_ORDER.filter((k) => groups.has(k)).map((k) => ({
      key: k,
      ...GROUP_META[k],
      accounts: groups.get(k)!.sort((x, y) => Math.abs(y.balance) - Math.abs(x.balance)),
    })),
  }
}
