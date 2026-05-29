-- ─────────────────────────────────────────────────────────────
-- SAM · 0003 functions & triggers
--  • handle_new_user(): bootstrap every new signup with a profile,
--    the 6 base categories, and 2 starter accounts (cash + card)
--    so the app is immediately usable end-to-end.
--  • delete_user(): let an authenticated user delete their own
--    auth account (cascades to all owned rows).
-- ─────────────────────────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  display_name text;
begin
  display_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (id, full_name, member_since)
  values (new.id, display_name, current_date)
  on conflict (id) do nothing;

  -- base categories ("habrá una base de categorías básicas")
  insert into public.categories (user_id, key, name, icon, color, monthly_cap, sort) values
    (new.id, 'food',      'Food & Drink',  '🍔', '#e8824a', 600, 0),
    (new.id, 'housing',   'Housing',       '🏠', '#58a6ff', 900, 1),
    (new.id, 'transport', 'Transport',     '▶',  '#bc8cff', 250, 2),
    (new.id, 'subs',      'Subscriptions', '⬡',  '#e3b341', 80,  3),
    (new.id, 'ent',       'Entertainment', '✦',  '#56d364', 200, 4),
    (new.id, 'misc',      'Misc',          '●',  '#8b949e', 150, 5)
  on conflict (user_id, key) do nothing;

  -- starter accounts (cash + card)
  insert into public.accounts (user_id, name, type, balance, credit_limit, last4, icon, color, sort) values
    (new.id, 'Cash', 'cash', 0, null, null,   '◉', '#56d364', 0),
    (new.id, 'Card', 'card', 0, 2000, '4281', '▭', '#e3b341', 1);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── self-service account deletion (Profile › danger › delete) ──
create or replace function public.delete_user()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from auth.users where id = (select auth.uid());
end;
$$;

revoke all on function public.delete_user() from public, anon;
grant execute on function public.delete_user() to authenticated;
