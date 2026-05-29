# Base de datos — esquema y datos por cliente

Supabase local ejecuta PostgreSQL 17. El esquema vive en `supabase/migrations/` y se aplica con `supabase db reset` o `supabase migration up`.

## Puertos locales

| Servicio | URL / puerto |
|----------|----------------|
| REST / Auth API | `http://127.0.0.1:54321` |
| Postgres directo | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| Studio (UI) | `http://127.0.0.1:54323` |

## Migraciones (orden)

| Archivo | Contenido |
|---------|-----------|
| `20260529100001_init_schema.sql` | Perfil, cuentas, categorías, transacciones, metas, ingresos, buckets |
| `20260529100002_rls_policies.sql` | RLS: cada fila pertenece al `auth.uid()` |
| `20260529100003_functions_triggers.sql` | `handle_new_user()`, `delete_user()` |
| `20260529100004_market_schema.sql` | Mercado global + holdings/watchlist/trades + seed 85 símbolos |
| `20260529100005_market_rls.sql` | RLS market + grants |
| `20260529100006_user_watchlist_trigger.sql` | Watchlist curated al registrarse |
| `20260529100007_portfolio_snapshots.sql` | Serie temporal del valor del portafolio |

---

## Tablas por cliente (`user_id` → `auth.users`)

Estas tablas tienen **Row Level Security**: un usuario solo ve y modifica sus filas.

### `profiles`

| Columna | Tipo | Notas |
|---------|------|--------|
| `id` | uuid PK | = `auth.users.id` |
| `full_name` | text | Nombre mostrado |
| `username` | text | Opcional |
| `prefs` | jsonb | `{ theme, notifications, biometric, rollover }` |
| `streak` | int | Días de racha |
| `currency` | text | Default `USD` |
| `member_since` | date | |

### `accounts`

Cuentas simuladas: cash, card, checking, savings.

| Columna | Tipo | Notas |
|---------|------|--------|
| `type` | text | `cash` \| `card` \| `checking` \| `savings` |
| `balance` | numeric | Saldo actual |
| `credit_limit` | numeric | Solo tarjeta |
| `last4` | text | Últimos 4 dígitos |

**Al registrarse:** se crean `Cash` y `Card` (trigger).

### `categories`

Categorías de gasto con tope mensual (`monthly_cap`). Claves: `food`, `housing`, `transport`, `subs`, `ent`, `misc`.

### `transactions`

Gastos e ingresos ligados a `account_id` y opcionalmente `category_id`.

### `goals` / `income_sources` / `savings_buckets`

Metas de ahorro, fuentes de ingreso y “buckets” con APY simulado.

### `holdings` (Invest — simulado)

Posiciones abiertas por compras en la app.

| Columna | Tipo | Notas |
|---------|------|--------|
| `symbol` | text | Ej. `AAPL` |
| `qty` | numeric(18,6) | Cantidad de acciones |
| `avg_cost` | numeric(18,4) | Precio medio de compra |
| `opened_at` | timestamptz | Primera compra |

Unique: `(user_id, symbol)`.

### `watchlist`

Tickers seguidos en Market. Unique: `(user_id, symbol)`.

**Al registrarse:** se insertan los símbolos con `market_symbols.curated = true` (12 tickers por defecto).

### `trades`

Log de órdenes simuladas (`side`: `buy` \| `sell`).

### `portfolio_snapshots`

Valor total del portafolio en el tiempo (para el gráfico “desde día 0”).

| Columna | Tipo | Notas |
|---------|------|--------|
| `value` | numeric(18,2) | Mark-to-market en ese instante |
| `captured_at` | timestamptz | |

La app inserta snapshots mientras está abierta (~cada 10 min si hay holdings). No hay UPDATE: serie append-only.

---

## Tablas globales de mercado (sin `user_id`)

Lectura para cualquier usuario autenticado. Escritura solo desde el **backend Python** (rol `postgres`) o `service_role`.

### `market_symbols`

Catálogo de ~85 tickers IBKR (mapeo `asset_id` de cuantito). `curated = true` define el watchlist inicial.

### `market_quotes`

Última cotización por símbolo, fuente y día de sesión.

| `source` | Origen |
|----------|--------|
| `live` | `live_data/connect.py` (SSE Newroad) |
| `yahoo` | `market/yahoo_sync.py` |

Columnas útiles: `price`, `bid`, `ask`, `prev_close`, `day_open`, `change_pct`, `captured_at`.

Unique: `(symbol, source, session_date)`.

### `market_daily_bars`

Cierres diarios (~90 días) para sparklines y rangos 1M/3M/1Y.

| Columna | Tipo |
|---------|------|
| `symbol` | text |
| `bar_date` | date |
| `close` | numeric |

PK: `(symbol, bar_date)`.

---

## Trigger `handle_new_user()`

Al insertar en `auth.users`:

1. Crea fila en `profiles`.
2. Inserta 6 categorías base.
3. Crea cuentas `Cash` y `Card`.
4. Copia watchlist desde símbolos `curated`.

No crea holdings ni dinero en Invest: el usuario compra desde Market.

---

## Usuario de prueba (seed)

Tras `supabase db reset`, existe un usuario demo precargado:

| Campo | Valor |
|-------|--------|
| **Email** | `alex@sam.app` |
| **Contraseña** | `sam12345` |
| **UUID** | `11111111-1111-1111-1111-111111111111` |
| **Nombre** | Alex Morris |
| **Username** | `alex_morris` |

**Datos incluidos en seed:**

- 4 cuentas (Cash, Card, Checking, Savings) con balances de demo.
- ~15 transacciones de gasto + 1 ingreso de nómina.
- 4 metas, 3 fuentes de ingreso, 3 savings buckets.
- **No** incluye holdings de Invest (portafolio vacío hasta que compres).

Puedes crear cuentas nuevas desde `SAM-Onboarding.html`; cada una recibe categorías, cuentas y watchlist automáticos.

---

## Consultas útiles (psql / Studio)

```sql
-- Holdings de un usuario
select symbol, qty, avg_cost from public.holdings
 where user_id = auth.uid();

-- Última quote live vs yahoo para un símbolo
select source, price, change_pct, captured_at
  from public.market_quotes
 where symbol = 'AAPL'
 order by captured_at desc
 limit 5;

-- Snapshots del portafolio
select value, captured_at from public.portfolio_snapshots
 where user_id = auth.uid()
 order by captured_at;
```

---

## Límite PostgREST (`max_rows = 1000`)

En `supabase/config.toml`, la API devuelve como máximo **1000 filas** por request. Por eso `loadUserData()` pide `market_daily_bars` solo para símbolos del usuario (holdings + watchlist + `SPY`), no para los 85 del catálogo.
