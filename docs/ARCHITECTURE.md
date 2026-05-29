# Arquitectura del proyecto

SAM (Financial Terminal) es una aplicación **estática** (React vía CDN + Babel en el navegador) con persistencia en **Supabase local** y dos jobs Python opcionales que alimentan datos de mercado.

## Diagrama general

```
┌─────────────────────────────────────────────────────────────────┐
│  Navegador                                                       │
│  SAM-Onboarding.html  →  registro / login                        │
│  SAM-Interactive.html →  app principal (tabs, sheets, charts)      │
│       │                                                          │
│       └── src/shared/supabase-client.js (window.SamDB)           │
└───────────────────────────────┬─────────────────────────────────┘
                                │ HTTPS REST (anon + JWT usuario)
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Supabase local (Docker)                                         │
│  API :54321  ·  Postgres :54322  ·  Studio :54323                │
│  auth.*  +  public.* (RLS por user_id)                           │
└───────────────────────────────▲─────────────────────────────────┘
                                │ psycopg (superuser, sin RLS)
┌───────────────────────────────┴─────────────────────────────────┐
│  backend/ (Python venv)                                          │
│  market/yahoo_sync.py   → market_quotes + market_daily_bars      │
│  live_data/connect.py   → market_quotes (source=live, SSE)       │
└─────────────────────────────────────────────────────────────────┘
                                ▲
                                │ IBKR Gateway (live SSE) + Yahoo Finance (histórico)
```

## Entradas de la aplicación

| Archivo | Propósito |
|---------|-----------|
| `SAM-Onboarding.html` | Landing, registro, login por email/contraseña |
| `SAM-Interactive.html` | App autenticada: home, gastos, invest, metas, perfil |
| `SAM.html` | Prototipo / canvas de diseño (no es el flujo MVP) |
| `serve.py` | Servidor HTTP local con `Cache-Control: no-store` (puerto **3000**) |

## Estructura de carpetas

```
FinancialTerminal/
├── SAM-Onboarding.html          # Onboarding + auth
├── SAM-Interactive.html         # App principal
├── serve.py                     # Dev server (puerto 3000)
├── README.md
├── docs/
│   ├── ARCHITECTURE.md          # Este archivo
│   ├── DATABASE.md              # Esquema y RLS
│   └── LIVE-DATA.md             # IBKR Gateway + Yahoo
├── src/
│   ├── shared/
│   │   ├── supabase-client.js   # Cliente Supabase + SamDB API
│   │   ├── ios-frame.jsx        # Marco tipo iPhone
│   │   └── design-canvas.jsx    # Utilidades canvas
│   ├── interactive/
│   │   ├── sam-interactive.jsx  # App, tema SAM, PerfChart, poller global
│   │   ├── sheets.jsx           # Modales: trade, ticker-detail, add-ticker
│   │   └── screens/             # Una pantalla por tab/sub-tab
│   │       ├── home.jsx
│   │       ├── expenses.jsx
│   │       ├── invest.jsx       # Portfolio + performance chart
│   │       ├── market.jsx       # Watchlist + holdings + movers
│   │       ├── analysis.jsx     # Métricas de riesgo
│   │       ├── goals.jsx
│   │       ├── profile.jsx
│   │       └── …
│   ├── onboarding/
│   │   └── sam-onboarding.jsx
│   └── canvas/                  # Pantallas de diseño (referencia)
├── supabase/
│   ├── config.toml              # Puertos y seed
│   ├── seed.sql                 # Usuario demo Alex
│   └── migrations/              # 0001–0007 esquema + RLS + market
└── backend/
    ├── requirements.txt
    ├── db.py                    # Acceso Postgres
    ├── symbols.py               # Universo de símbolos IBKR
    ├── market/yahoo_sync.py
    └── live_data/connect.py
```

## Flujo de datos en el frontend

1. **Boot** — `App` comprueba sesión con `SamDB.getSession()`.
2. **Hydrate** — `SamDB.loadUserData()` trae perfil, cuentas, transacciones, metas, holdings, watchlist, quotes, barras diarias (solo símbolos relevantes) y `portfolio_snapshots`.
3. **Poller global** (cada ~8 s) — `getMarketQuotes()` actualiza `state.market`; si hay holdings, puede grabar un snapshot cada ~10 min en `portfolio_snapshots`.
4. **Mutaciones** — compra/venta simulada vía `buyHolding` / `sellHolding`; watchlist vía `addWatch` / `removeWatch`.

## Resolución de precios (Invest)

Orden de prioridad en `buildMarket()` (`supabase-client.js`):

1. **live** — `market_quotes` con `source='live'` y timestamp reciente → badge `● LIVE`.
2. **yahoo** — cotización retrasada de Yahoo (`yahoo_sync.py`).
3. **Fallback** — último cierre en `market_daily_bars` o costo promedio del holding.

## Gráficos

| Vista | Fuente |
|-------|--------|
| Performance portfolio | `portfolio_snapshots` (día 0 → adelante) + punto live |
| Sparklines watchlist/holdings | `market_daily_bars` (Yahoo) |
| Ticker detail 1M / 3M / 1Y | `market_daily_bars` |
| Ticker detail 1D / 1W | Serie sintética intradía (pendiente: barras reales intraday) |

## Seguridad (MVP local)

- RLS en todas las tablas `user_id`.
- Tablas `market_*` son **globales**: lectura para `authenticated`, escritura solo vía backend (`postgres`) o `service_role`.
- La anon key en `supabase-client.js` es la **clave demo de Supabase local** — no subir una clave de producción al repo.
- OAuth Apple/Google en onboarding está **deshabilitado** (botones visibles, pendiente de conectar).

## Convenciones

- Sin bundler: cada `.jsx` se carga con `<script type="text/babel" src="…">`.
- Tema: objeto global `SAM` / `SAM_PALETTES` (dark/light).
- Usuario en prompt: `window.SAM_USER` (primer segmento del email o `username`).
