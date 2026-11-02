import type { AccountsData } from '@/lib/accounts/build'
import type { Stream } from '@/lib/recurring/detect'
import type { SchwabStatus } from '@/lib/schwab/server'
import type { BudgetData } from '../budget/types'
import type { Txn } from '../transactions/types'

export type SpendingSeries = {
  thisMonth: number[] // cumulative spending by day, up to today
  lastMonth: number[] // cumulative for the whole of last month
  lastYear: number[] // cumulative for this month last year
  monthLabel: string
  lastMonthLabel: string
  lastYearLabel: string
}

export type Holding = { key: string; ticker: string | null; name: string; value: number }

export type DashboardData = {
  name: string | null
  accounts: AccountsData
  budget: BudgetData
  spending: SpendingSeries
  recent: Txn[]
  merchants: string[]
  streams: Stream[]
  holdings: Holding[]
  investmentsTotal: number
  investmentsDayChange: number | null // live from Schwab when connected
  schwab: SchwabStatus
  error: string | null
}
