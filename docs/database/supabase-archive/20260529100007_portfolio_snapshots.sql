-- ─────────────────────────────────────────────────────────────
-- SAM · 0007 portfolio value snapshots
-- A real, forward-growing time series of each user's total portfolio value.
-- The app records a snapshot on first buy and then on an interval while open,
-- so the performance chart starts at "day 0" (first purchase) and grows over
-- time instead of being a backtest. Append-only.
-- ─────────────────────────────────────────────────────────────

create table public.portfolio_snapshots (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  value       numeric(18,2) not null,
  captured_at timestamptz not null default now()
);
create index portfolio_snapshots_user_idx on public.portfolio_snapshots (user_id, captured_at);

alter table public.portfolio_snapshots enable row level security;

create policy "portfolio_snapshots_select_own" on public.portfolio_snapshots
  for select to authenticated using (user_id = (select auth.uid()));
create policy "portfolio_snapshots_insert_own" on public.portfolio_snapshots
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "portfolio_snapshots_delete_own" on public.portfolio_snapshots
  for delete to authenticated using (user_id = (select auth.uid()));

grant select, insert, delete on public.portfolio_snapshots to authenticated;
grant all on public.portfolio_snapshots to service_role;
