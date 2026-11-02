// One-time Supabase setup for Budget, Forecast, Recurring and Schwab. The Budget page shows this with a
// Copy button until the tables exist; paste it into Supabase -> SQL Editor -> Run.
export const BUDGET_SETUP_SQL = `-- App setup (Budget, Forecast, Recurring, Schwab). Run this once in Supabase: SQL Editor -> New query -> paste -> Run.
-- Safe to run more than once.

-- One row per category per month you've set a budget for.
-- category is a spending category code (e.g. FOOD_AND_DRINK) or an income
-- source prefixed with "income:" (e.g. income:INCOME_WAGES).
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  month date not null, -- first day of the month
  category text not null,
  amount numeric(12, 2) not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, month, category)
);

-- Which budget group each spending category belongs to.
create table if not exists public.budget_categories (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category text not null,
  grp text not null check (grp in ('fixed', 'flexible', 'non_monthly')),
  primary key (user_id, category)
);

-- Only you can see or change your own budget rows
alter table public.budgets enable row level security;
alter table public.budget_categories enable row level security;

drop policy if exists "own budgets" on public.budgets;
create policy "own budgets" on public.budgets
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own budget categories" on public.budget_categories;
create policy "own budget categories" on public.budget_categories
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Forecast scenarios (Budget -> Forecast tab)
create table if not exists public.forecast_scenarios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null default 'Base Plan',
  icon text not null default 'trending-up',
  color text not null default '#ecebe8',
  assumptions jsonb not null default '{}'::jsonb,
  events jsonb not null default '[]'::jsonb,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.forecast_scenarios enable row level security;

drop policy if exists "own forecast scenarios" on public.forecast_scenarios;
create policy "own forecast scenarios" on public.forecast_scenarios
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Payments you've marked as recurring yourself (Transactions -> Make recurring)
create table if not exists public.recurring_marks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  merchant_key text not null,
  merchant text not null,
  day int not null check (day between 1 and 31),
  amount numeric(12, 2) not null,
  category text,
  account_id uuid,
  start_date date not null,
  created_at timestamptz not null default now(),
  unique (user_id, merchant_key, day)
);

alter table public.recurring_marks enable row level security;

drop policy if exists "own recurring marks" on public.recurring_marks;
create policy "own recurring marks" on public.recurring_marks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Schwab direct connection (Settings -> Schwab). Tokens are only readable by you.
create table if not exists public.schwab_tokens (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  access_token text not null,
  refresh_token text not null,
  access_expires_at timestamptz not null,
  refresh_expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.schwab_accounts (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  account_hash text not null,
  last4 text not null,
  type text,
  liquidation_value numeric(14, 2) not null default 0,
  cash_balance numeric(14, 2) not null default 0,
  day_change numeric(14, 2) not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, account_hash)
);

create table if not exists public.schwab_positions (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  account_hash text not null,
  symbol text not null,
  description text,
  asset_type text,
  quantity numeric(18, 6) not null default 0,
  market_value numeric(14, 2) not null default 0,
  average_price numeric(14, 4),
  day_change numeric(14, 2) not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, account_hash, symbol)
);

alter table public.schwab_tokens enable row level security;
alter table public.schwab_accounts enable row level security;
alter table public.schwab_positions enable row level security;

drop policy if exists "own schwab tokens" on public.schwab_tokens;
create policy "own schwab tokens" on public.schwab_tokens
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "own schwab accounts" on public.schwab_accounts;
create policy "own schwab accounts" on public.schwab_accounts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "own schwab positions" on public.schwab_positions;
create policy "own schwab positions" on public.schwab_positions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
`
