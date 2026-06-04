-- ─────────────────────────────────────────────────────────────
-- SAM · 0005 invest / market row level security
--  • market_* tables are GLOBAL reference data: readable by anyone,
--    written only by the Python backend (postgres / service_role,
--    both bypass RLS — no write policy is granted to clients).
--  • holdings / watchlist / trades follow the per-owner model used
--    by the rest of the app (see 0002).
-- ─────────────────────────────────────────────────────────────

alter table public.market_symbols    enable row level security;
alter table public.market_quotes     enable row level security;
alter table public.market_daily_bars enable row level security;
alter table public.holdings           enable row level security;
alter table public.watchlist          enable row level security;
alter table public.trades             enable row level security;

-- ── global market data: read-only to clients ─────────────────
create policy "market_symbols_read"    on public.market_symbols
  for select to anon, authenticated using (true);
create policy "market_quotes_read"     on public.market_quotes
  for select to anon, authenticated using (true);
create policy "market_daily_bars_read" on public.market_daily_bars
  for select to anon, authenticated using (true);

-- ── per-user tables: owner policies (mirror of 0002) ──────────
do $$
declare t text;
begin
  foreach t in array array['holdings','watchlist','trades']
  loop
    execute format(
      'create policy %1$I on public.%2$I for select to authenticated using (user_id = (select auth.uid()));',
      t || '_select_own', t);
    execute format(
      'create policy %1$I on public.%2$I for insert to authenticated with check (user_id = (select auth.uid()));',
      t || '_insert_own', t);
    execute format(
      'create policy %1$I on public.%2$I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));',
      t || '_update_own', t);
    execute format(
      'create policy %1$I on public.%2$I for delete to authenticated using (user_id = (select auth.uid()));',
      t || '_delete_own', t);
  end loop;
end $$;

-- ── Data API grants ──────────────────────────────────────────
grant select on
  public.market_symbols, public.market_quotes, public.market_daily_bars
to anon, authenticated;

grant select, insert, update, delete on
  public.holdings, public.watchlist, public.trades
to authenticated;

grant all on
  public.market_symbols, public.market_quotes, public.market_daily_bars,
  public.holdings, public.watchlist, public.trades
to service_role;
