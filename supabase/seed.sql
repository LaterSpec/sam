-- ─────────────────────────────────────────────────────────────
-- SAM · seed
-- One rich base demo user. Login:  alex@sam.app  /  sam12345
--
-- Inserting into auth.users fires public.handle_new_user(), which
-- creates the profile, the 6 base categories and 2 starter accounts.
-- Everything below ENRICHES that baseline into a full demo dataset.
--
-- Note: the CLI seeder does not run psql meta-commands, so the demo
-- user id is inlined as the literal 11111111-1111-1111-1111-111111111111.
-- ─────────────────────────────────────────────────────────────

-- ── auth user + identity ─────────────────────────────────────
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, last_sign_in_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
) values (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated', 'authenticated',
  'alex@sam.app',
  extensions.crypt('sam12345', extensions.gen_salt('bf')),
  now(), now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Alex Morris"}',
  '2026-01-15 09:00:00+00', now(),
  '', '', '', ''
);

insert into auth.identities (
  provider_id, user_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
) values (
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  '{"sub":"11111111-1111-1111-1111-111111111111","email":"alex@sam.app","email_verified":true,"phone_verified":false}',
  'email',
  now(), '2026-01-15 09:00:00+00', now()
);

-- ── profile tweaks ───────────────────────────────────────────
update public.profiles
   set full_name    = 'Alex Morris',
       username     = 'alex_morris',
       streak       = 17,
       member_since = '2026-01-15'
 where id = '11111111-1111-1111-1111-111111111111';

-- ── accounts ─────────────────────────────────────────────────
-- The trigger already created 'Cash' and 'Card'. Update those and
-- add a checking + savings account. Balances sum to $8,420.50.
update public.accounts
   set balance = 320.00, icon = '◉', color = '#56d364'
 where user_id = '11111111-1111-1111-1111-111111111111' and name = 'Cash';

update public.accounts
   set balance = 0.00, credit_limit = 2000, last4 = '7741', icon = '▭', color = '#e3b341'
 where user_id = '11111111-1111-1111-1111-111111111111' and name = 'Card';

insert into public.accounts (user_id, name, type, balance, last4, icon, color, sort) values
  ('11111111-1111-1111-1111-111111111111', 'Checking', 'checking', 5240.30, '4281', '▤', '#58a6ff', 2),
  ('11111111-1111-1111-1111-111111111111', 'Savings',  'savings',  2860.20, '9920', '⬢', '#bc8cff', 3);

-- ── transactions ─────────────────────────────────────────────
-- Reference categories by (user_id, key) and the Checking account.
with cat as (
  select key, id from public.categories
   where user_id = '11111111-1111-1111-1111-111111111111'
), acc as (
  select id from public.accounts
   where user_id = '11111111-1111-1111-1111-111111111111' and name = 'Checking' limit 1
)
insert into public.transactions (user_id, account_id, category_id, name, amount, kind, icon, occurred_at)
select '11111111-1111-1111-1111-111111111111', a.id, c.id, t.name, t.amount, 'expense', t.icon, t.occurred_at
from (values
  ('Starbucks',     6.50,  'food',      '☕', timestamptz '2026-05-28 08:12'),
  ('Uber',          14.20, 'transport', '▶',  timestamptz '2026-05-27 18:40'),
  ('Whole Foods',   87.40, 'food',      '🛒', timestamptz '2026-05-26 19:05'),
  ('Netflix',       15.99, 'subs',      '⬡',  timestamptz '2026-05-25 06:00'),
  ('Spotify',       11.99, 'subs',      '⬡',  timestamptz '2026-05-24 06:00'),
  ('Chipotle',      14.50, 'food',      '🌯', timestamptz '2026-05-23 13:20'),
  ('Movie night',   28.00, 'ent',       '✦',  timestamptz '2026-05-22 21:00'),
  ('Gas',           42.00, 'transport', '▶',  timestamptz '2026-05-21 17:30'),
  ('Trader Joe''s', 56.20, 'food',      '🛒', timestamptz '2026-05-19 18:10'),
  ('Electric bill', 64.30, 'housing',   '⚡', timestamptz '2026-05-15 09:00'),
  ('Gym',           39.00, 'ent',       '🏋', timestamptz '2026-05-12 07:30'),
  ('Amazon',        23.99, 'misc',      '📦', timestamptz '2026-05-10 14:45'),
  ('Lyft',          9.80,  'transport', '▶',  timestamptz '2026-05-08 22:15'),
  ('Coffee beans',  18.40, 'food',      '☕', timestamptz '2026-05-05 10:30'),
  ('Rent',          850.00,'housing',   '🏠', timestamptz '2026-05-01 08:00')
) as t(name, amount, key, icon, occurred_at)
join cat c on c.key = t.key
cross join acc a;

-- payroll income line
insert into public.transactions (user_id, account_id, category_id, name, amount, kind, icon, occurred_at)
select '11111111-1111-1111-1111-111111111111',
       (select id from public.accounts
         where user_id = '11111111-1111-1111-1111-111111111111' and name = 'Checking' limit 1),
       null, 'Acme Corp · payroll', 3200.00, 'income', '⬢', timestamptz '2026-05-01 09:00';

-- ── goals ────────────────────────────────────────────────────
insert into public.goals (user_id, name, icon, color, target, saved, eta, done, sort) values
  ('11111111-1111-1111-1111-111111111111', 'Emergency fund',     '🛡', '#e3b341', 10000, 6400, 'Sep 2026', false, 0),
  ('11111111-1111-1111-1111-111111111111', 'Trip to Japan',      '✈', '#58a6ff', 4500,  1230, 'Mar 2027', false, 1),
  ('11111111-1111-1111-1111-111111111111', 'New MacBook',        '◼', '#56d364', 2400,  2400, 'done',     true,  2),
  ('11111111-1111-1111-1111-111111111111', 'House down payment', '⌂', '#bc8cff', 30000, 4100, '2028',     false, 3);

-- ── income sources ───────────────────────────────────────────
insert into public.income_sources (user_id, name, amount, icon, color, freq, next_date, sort) values
  ('11111111-1111-1111-1111-111111111111', 'Acme Corp · salary', 3200, '⬢', '#56d364', 'monthly',    'Jun 1',  0),
  ('11111111-1111-1111-1111-111111111111', 'Freelance · design', 450,  '◆', '#58a6ff', 'this month', '—',      1),
  ('11111111-1111-1111-1111-111111111111', 'Dividends · VTI',    28,   '◉', '#e3b341', 'quarterly',  'Jun 15', 2);

-- ── savings buckets ──────────────────────────────────────────
insert into public.savings_buckets (user_id, name, icon, color, balance, target, apy, sort) values
  ('11111111-1111-1111-1111-111111111111', 'Rainy day', '☂', '#58a6ff', 1850, 3000, 4.2, 0),
  ('11111111-1111-1111-1111-111111111111', 'Vacation',  '✈', '#bc8cff', 620,  2000, 4.2, 1),
  ('11111111-1111-1111-1111-111111111111', 'Gadgets',   '◼', '#e3b341', 280,  800,  4.2, 2);
