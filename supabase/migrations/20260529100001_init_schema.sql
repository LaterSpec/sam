-- ─────────────────────────────────────────────────────────────
-- SAM · 0001 init schema
-- Core domain tables. Every user-owned row references auth.users.
-- gen_random_uuid() is a Postgres 13+ builtin (no extension needed).
-- ─────────────────────────────────────────────────────────────

-- profiles ── 1:1 with auth.users
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  full_name    text        not null default 'there',
  username     text,
  plan         text        not null default 'pro',
  streak       integer     not null default 0,
  currency     text        not null default 'USD',
  prefs        jsonb       not null default
                 '{"notifications":true,"biometric":true,"theme":"dark","rollover":false}'::jsonb,
  member_since date        not null default current_date,
  created_at   timestamptz not null default now()
);

-- accounts ── cash / card / checking / savings, each holds a balance
create table public.accounts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users (id) on delete cascade,
  name         text        not null,
  type         text        not null default 'cash'
                 check (type in ('cash','card','checking','savings')),
  balance      numeric(14,2) not null default 0,
  credit_limit numeric(14,2),
  last4        text,
  icon         text        not null default '◉',
  color        text        not null default '#58a6ff',
  sort         integer     not null default 0,
  created_at   timestamptz not null default now()
);
create index accounts_user_id_idx on public.accounts (user_id);

-- categories ── base spending categories with a monthly cap
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users (id) on delete cascade,
  key         text        not null,
  name        text        not null,
  icon        text        not null default '●',
  color       text        not null default '#8b949e',
  monthly_cap numeric(14,2) not null default 0,
  sort        integer     not null default 0,
  created_at  timestamptz not null default now(),
  unique (user_id, key)
);
create index categories_user_id_idx on public.categories (user_id);

-- transactions ── expense or income lines
create table public.transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users (id) on delete cascade,
  account_id  uuid        references public.accounts (id)   on delete set null,
  category_id uuid        references public.categories (id) on delete set null,
  name        text        not null,
  amount      numeric(14,2) not null,
  kind        text        not null default 'expense'
                 check (kind in ('expense','income')),
  icon        text,
  notes       text,
  occurred_at timestamptz not null default now(),
  created_at  timestamptz not null default now()
);
create index transactions_user_id_idx     on public.transactions (user_id);
create index transactions_category_id_idx on public.transactions (category_id);
create index transactions_occurred_at_idx on public.transactions (occurred_at desc);

-- goals
create table public.goals (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users (id) on delete cascade,
  name       text        not null,
  icon       text        not null default '◆',
  color      text        not null default '#58a6ff',
  target     numeric(14,2) not null default 0,
  saved      numeric(14,2) not null default 0,
  eta        text,
  done       boolean     not null default false,
  sort       integer     not null default 0,
  created_at timestamptz not null default now()
);
create index goals_user_id_idx on public.goals (user_id);

-- income_sources
create table public.income_sources (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users (id) on delete cascade,
  name       text        not null,
  amount     numeric(14,2) not null default 0,
  icon       text        not null default '◆',
  color      text        not null default '#56d364',
  freq       text        not null default 'monthly',
  next_date  text,
  sort       integer     not null default 0,
  created_at timestamptz not null default now()
);
create index income_sources_user_id_idx on public.income_sources (user_id);

-- savings_buckets
create table public.savings_buckets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users (id) on delete cascade,
  name       text        not null,
  icon       text        not null default '◼',
  color      text        not null default '#58a6ff',
  balance    numeric(14,2) not null default 0,
  target     numeric(14,2) not null default 0,
  apy        numeric(5,2)  not null default 4.2,
  sort       integer     not null default 0,
  created_at timestamptz not null default now()
);
create index savings_buckets_user_id_idx on public.savings_buckets (user_id);
