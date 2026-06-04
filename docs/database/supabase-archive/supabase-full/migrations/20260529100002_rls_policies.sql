-- ─────────────────────────────────────────────────────────────
-- SAM · 0002 row level security
-- Every table is private to its owner. The Data API roles get table
-- privileges; RLS then narrows visibility to auth.uid() === user_id.
-- ─────────────────────────────────────────────────────────────

alter table public.profiles        enable row level security;
alter table public.accounts        enable row level security;
alter table public.categories      enable row level security;
alter table public.transactions    enable row level security;
alter table public.goals           enable row level security;
alter table public.income_sources  enable row level security;
alter table public.savings_buckets enable row level security;

-- ── profiles (keyed on id, not user_id) ──────────────────────
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "profiles_delete_own" on public.profiles
  for delete to authenticated using (id = (select auth.uid()));

-- ── owner policies for the remaining tables ──────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'accounts','categories','transactions','goals','income_sources','savings_buckets'
  ]
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
-- authenticated gets DML (RLS still applies); anon gets nothing here.
grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on
  public.profiles, public.accounts, public.categories, public.transactions,
  public.goals, public.income_sources, public.savings_buckets
to authenticated;

grant all on
  public.profiles, public.accounts, public.categories, public.transactions,
  public.goals, public.income_sources, public.savings_buckets
to service_role;
