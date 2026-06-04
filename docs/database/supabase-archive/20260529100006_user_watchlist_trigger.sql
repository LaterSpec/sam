-- ─────────────────────────────────────────────────────────────
-- SAM · 0006 seed default watchlist on signup
-- Redefine handle_new_user() so every new account also starts with the
-- curated IBKR watchlist (market_symbols.curated = true). Holdings stay
-- empty on purpose ("no money yet"); the user fills them by buying.
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

  -- default invest watchlist (curated IBKR universe)
  insert into public.watchlist (user_id, symbol, name, sort)
  select new.id, ms.symbol, ms.name, ms.sort
    from public.market_symbols ms
   where ms.curated = true
  on conflict (user_id, symbol) do nothing;

  return new;
end;
$$;
