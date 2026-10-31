export type Txn = {
  id: string
  date: string // YYYY-MM-DD
  merchant: string
  description: string | null
  logo: string | null
  category: string | null
  amount: number // Plaid sign: positive = money out, negative = money in
  pending: boolean
  accountId: string | null
  accountName: string | null
  institution: string | null
  merchantEntityId: string | null
  plaidDetail: string | null
  channel: string | null
  location: string | null
  website: string | null
}

export type AccountOption = { id: string; name: string; institution: string | null }

export type TxnParams = {
  q?: string
  category?: string
  account?: string
  from?: string
  to?: string
  view?: string
  sort?: string
}
