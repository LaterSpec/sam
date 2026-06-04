-- ─────────────────────────────────────────────────────────────
-- SAM · 0004 invest / market schema
--  • market_symbols   — global ticker catalog (IBKR universe via cuantito)
--  • market_quotes    — global price snapshots (live + yahoo), today + prev day
--  • market_daily_bars— global daily closes for the performance chart
--  • holdings         — per-user simulated positions (buy/sell is a mock order)
--  • watchlist        — per-user tracked tickers
--  • trades           — per-user log of simulated orders
-- The market_* tables are written only by the Python backend (postgres role /
-- service_role) and read by everyone. Per-user tables follow the owner model.
-- ─────────────────────────────────────────────────────────────

-- ── global: ticker catalog ───────────────────────────────────
create table public.market_symbols (
  symbol     text        primary key,
  name       text        not null default '',
  asset_id   integer,                       -- cuantito / IBKR asset id (null = yahoo-only)
  source     text        not null default 'ibkr',
  curated    boolean     not null default false,   -- seeds the default watchlist
  active     boolean     not null default true,
  sort       integer     not null default 0,
  created_at timestamptz not null default now()
);

-- ── global: price snapshots (one row per symbol/source/day) ───
create table public.market_quotes (
  id          bigint generated always as identity primary key,
  symbol      text        not null references public.market_symbols (symbol) on delete cascade,
  source      text        not null default 'live' check (source in ('live','yahoo')),
  session_date date       not null default current_date,
  price       numeric(18,4),
  bid         numeric(18,4),
  ask         numeric(18,4),
  prev_close  numeric(18,4),
  day_open    numeric(18,4),
  change_pct  numeric(10,4),
  captured_at timestamptz not null default now(),
  unique (symbol, source, session_date)
);
create index market_quotes_symbol_idx  on public.market_quotes (symbol);
create index market_quotes_session_idx on public.market_quotes (session_date desc);

-- ── global: daily closes (powers the 30d portfolio chart) ─────
create table public.market_daily_bars (
  symbol   text not null references public.market_symbols (symbol) on delete cascade,
  bar_date date not null,
  close    numeric(18,4) not null,
  primary key (symbol, bar_date)
);
create index market_daily_bars_symbol_idx on public.market_daily_bars (symbol);

-- ── per-user: simulated positions ────────────────────────────
create table public.holdings (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users (id) on delete cascade,
  symbol     text        not null,
  name       text        not null default '',
  qty        numeric(18,6) not null default 0,
  avg_cost   numeric(18,4) not null default 0,
  opened_at  timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, symbol)
);
create index holdings_user_id_idx on public.holdings (user_id);

-- ── per-user: watchlist ──────────────────────────────────────
create table public.watchlist (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users (id) on delete cascade,
  symbol     text        not null,
  name       text        not null default '',
  sort       integer     not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, symbol)
);
create index watchlist_user_id_idx on public.watchlist (user_id);

-- ── per-user: order log (simulated) ──────────────────────────
create table public.trades (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users (id) on delete cascade,
  symbol     text        not null,
  side       text        not null check (side in ('buy','sell')),
  qty        numeric(18,6) not null,
  price      numeric(18,4) not null,
  amount     numeric(18,2) not null,
  created_at timestamptz not null default now()
);
create index trades_user_id_idx on public.trades (user_id);

-- ── seed the ticker catalog (cuantito ACTIVOS_DB → IBKR symbols) ──
-- curated = true marks the ~12 names used as a new user's default watchlist.
insert into public.market_symbols (symbol, name, asset_id, curated, sort) values
  ('AAPL', 'Apple',                       174,  true,  0),
  ('MSFT', 'Microsoft',                   354,  true,  1),
  ('NVDA', 'NVIDIA',                       366,  true,  2),
  ('AMZN', 'Amazon',                       192,  true,  3),
  ('META', 'Meta Platforms',              289,  true,  4),
  ('TSLA', 'Tesla',                       1984,  true,  5),
  ('AVGO', 'Broadcom',                     606,  true,  6),
  ('AMD',  'AMD',                          555,  true,  7),
  ('NFLX', 'Netflix',                      360,  true,  8),
  ('V',    'Visa',                        1964,  true,  9),
  ('SPY',  'S&P 500 ETF',                  425,  true, 10),
  ('QQQ',  'Nasdaq 100 ETF',               406,  true, 11),
  ('ORCL', 'Oracle',                       100, false, 20),
  ('ADBE', 'Adobe',                        182, false, 21),
  ('APLD', 'Applied Digital',              607, false, 22),
  ('MRVL', 'Marvell Technology',          1249, false, 23),
  ('NOW',  'ServiceNow',                    95, false, 24),
  ('ACN',  'Accenture',                     52, false, 25),
  ('AI',   'C3.ai',                        183, false, 26),
  ('QCOM', 'Qualcomm',                     101, false, 27),
  ('EPAM', 'EPAM Systems',                 876, false, 28),
  ('PANW', 'Palo Alto Networks',          2098, false, 29),
  ('VRNS', 'Varonis Systems',              123, false, 30),
  ('ASML', 'ASML Holding',                 588, false, 31),
  ('SAP',  'SAP SE',                       420, false, 32),
  ('ZBRA', 'Zebra Technologies',          1986, false, 33),
  ('IGV',  'iShares Software ETF',        2142, false, 34),
  ('NKE',  'Nike',                         361, false, 35),
  ('STLA', 'Stellantis',                    38, false, 36),
  ('JD',   'JD.com',                       327, false, 37),
  ('LULU', 'Lululemon',                   1195, false, 38),
  ('LCID', 'Lucid Group',                 1144, false, 39),
  ('DKNG', 'DraftKings',                   875, false, 40),
  ('RACE', 'Ferrari',                     1517, false, 41),
  ('BABA', 'Alibaba',                      200, false, 42),
  ('DEO',  'Diageo',                       253, false, 43),
  ('NIO',  'NIO Inc',                      359, false, 44),
  ('DPZ',  'Domino''s Pizza',              265, false, 45),
  ('HOG',  'Harley-Davidson',              303, false, 46),
  ('CPNG', 'Coupang',                      802, false, 47),
  ('MELI', 'MercadoLibre',                1168, false, 48),
  ('HRL',  'Hormel Foods',                  58, false, 49),
  ('PYPL', 'PayPal',                       394, false, 50),
  ('QIWI', 'Qiwi',                         403, false, 51),
  ('WDI',  'WisdomTree Intl Hedged',      1987, false, 52),
  ('BX',   'Blackstone',                  2030, false, 53),
  ('FOUR', 'Shift4 Payments',              931, false, 54),
  ('IBIT', 'iShares Bitcoin Trust',        302, false, 55),
  ('AMT',  'American Tower',               554, false, 56),
  ('HUN',  'Huntsman',                    1038, false, 57),
  ('VST',  'Vistra',                        76, false, 58),
  ('NU',   'Nu Holdings',                  371, false, 59),
  ('NVO',  'Novo Nordisk',                1351, false, 60),
  ('UNH',  'UnitedHealth',                  40, false, 61),
  ('AUNA', 'Auna SA',                      610, false, 62),
  ('SNY',  'Sanofi',                      1570, false, 63),
  ('RYLD', 'Global X Russell 2000 CC',     412, false, 64),
  ('BCAT', 'BlackRock Cap Allocation',     202, false, 65),
  ('TLTW', 'iShares 20+ Treasury BW',       39, false, 66),
  ('FAX',  'abrdn Asia-Pacific Income',     37, false, 67),
  ('QYLD', 'Global X Nasdaq 100 CC',       408, false, 68),
  ('ECAT', 'BlackRock ESG Cap Alloc',      264, false, 69),
  ('TLT',  'iShares 20+ Treasury ETF',    1985, false, 70),
  ('GBAB', 'Guggenheim Taxable Muni',      293, false, 71),
  ('BWG',  'BrandywineGLOBAL Income',      230, false, 72),
  ('DSU',  'BlackRock Debt Strategies',    874, false, 73),
  ('BHK',  'BlackRock Core Bond',           31, false, 74),
  ('GHY',  'PGIM Global High Yield',        33, false, 75),
  ('BKT',  'BlackRock Income Trust',        43, false, 76),
  ('BINC', 'BlackRock Flexible Income',    769, false, 77),
  ('USIG', 'iShares USD IG Corp ETF',     1889, false, 78),
  ('PCEF', 'Invesco CEF Income ETF',       376, false, 79),
  ('IGLB', 'iShares 10+ IG Corp ETF',       63, false, 80),
  ('KBWD', 'Invesco KBW High Dividend',    333, false, 81),
  ('LQDW', 'iShares IG Buywrite',           41, false, 82),
  ('BMEZ', 'BlackRock Health Sciences II',  64, false, 83),
  ('AVK',  'Advent Convertible & Income',   42, false, 84),
  ('AGGH', 'Simplify Aggregate Bond ETF',  609, false, 85),
  ('BTZ',  'BlackRock Credit Allocation',  770, false, 86),
  ('XYLD', 'Global X S&P 500 CC',          134, false, 87),
  ('SHV',  'iShares Short Treasury ETF',   413, false, 88),
  ('GDO',  'Western Asset Global Corp',    294, false, 89),
  ('SPHY', 'SPDR High Yield Bond ETF',      61, false, 90),
  ('DMO',  'Western Asset Mortgage Opp',   877, false, 91),
  ('EAD',  'Allspring Income Opps',        263, false, 92)
on conflict (symbol) do nothing;
