# Datos de mercado en vivo (Live data)

SAM puede mostrar precios en tiempo casi real cuando el conector **live** está activo. Si no, la app sigue funcionando con datos **Yahoo** (retrasados) almacenados en Supabase.

## Dos fuentes, una tabla

Todo termina en `public.market_quotes` con columna `source`:

```
                    ┌─────────────────────┐
  Yahoo Finance ──► │  market_quotes      │ ◄── IBKR Gateway (live)
  (yahoo_sync.py)   │  source: yahoo|live │
                    └──────────┬──────────┘
                               │ poll ~8s
                               ▼
                    Frontend buildMarket()
                    live > yahoo > último close
```

| Job | Comando | Escribe | Cuándo usarlo |
|-----|---------|---------|----------------|
| Yahoo sync | `python -m market.yahoo_sync` | `yahoo` + `market_daily_bars` | Siempre al inicio; re-ejecutar 1–2×/día |
| Live connect | `python -m live_data.connect` | `live` | Mientras el mercado está abierto y quieres badge LIVE |

## Requisitos live

1. **IBKR Gateway** instalado y corriendo localmente (disponible en [Interactive Brokers](https://www.interactivebrokers.com/en/trading/ibgateway.php)).
2. Cuenta IBKR activa (Paper Trading o real).
3. Archivo `backend/.env` con credenciales (ver `.env.example`).
4. **2FA** en cada arranque: el script pide el código en terminal.
5. Supabase local en marcha (`supabase start`).

## Configuración

```bash
cd backend
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Editar .env:
#   IBG_USERNAME=tu_usuario_ibkr
#   IBG_PASSWORD=tu_contraseña_ibkr
```

Variables opcionales:

| Variable | Default | Descripción |
|----------|---------|-------------|
| `IBG_API_BASE` | `https://localhost:5000/v1/api` | URL base del IBKR Gateway |
| `SUPABASE_DB_URL` | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` | Postgres local |

## Arrancar el feed en vivo

```bash
cd backend
source venv/bin/activate
python -m live_data.connect
```

Flujo en terminal:

1. Banner `SAM · IBKR live-data connection`
2. Email enmascarado donde llegó el 2FA
3. Prompt: `2FA code sent to …:`
4. Tras éxito: `[live] 2FA OK – live data active. Press Ctrl+C to stop.`
5. `[live] subscribed to 85 symbols` y ticks periódicos `updated N symbols`

**Detener:** `Ctrl+C`. El front vuelve a mostrar Yahoo / último snapshot live guardado.

## Qué hace el conector por dentro

1. `POST /auth/login/request-code` → `challenge_token`
2. `POST /auth/login/verify-code` con código 2FA → JWT
3. `POST /analytics/live-prices/subscribe` con los `asset_id` del universo de símbolos
4. `GET /analytics/live-prices/stream` (SSE)
5. Por cada tick: `upsert_live_quote()` en Postgres (`source='live'`, `session_date=today`)

Throttling: máximo un upsert por símbolo cada **3 s** (`PERSIST_EVERY`) para no saturar la BD.

## Cómo lo consume el frontend

- Poller global en `App` (~8 s): `SamDB.getMarketQuotes()`.
- `buildMarket()` marca `__liveActive = true` si hay quotes `live` recientes (ventana ~2 min).
- Market muestra `● LIVE` y `// source: IBKR live feed · real-time`.
- Portfolio recalcula valor y puede añadir `portfolio_snapshots` cada ~10 min.

**Importante:** el live solo entrega precio actual (bid/ask/last). **No** sustituye el histórico diario: eso sigue siendo Yahoo → `market_daily_bars`.

## Yahoo sync (histórico + fallback)

```bash
cd backend
source venv/bin/activate
python -m market.yahoo_sync
```

Opciones útiles (ver `--help` en el script):

- Sincroniza cotización retrasada + ~90 cierres diarios por símbolo activo.
- Si un símbolo falla (ej. delisted), el job continúa con el resto.

Ejecuta esto **antes** de usar Invest sin live, o como respaldo nocturno.

## Preguntas frecuentes

### ¿Por qué veo precios sin tener `connect.py` corriendo?

Porque `yahoo_sync` ya guardó filas en `market_quotes` (`source='yahoo'`). El front siempre intenta mostrar el mejor dato disponible.

### ¿NVO tiene precio pero antes decía "no data" en el sparkline?

El precio venía de Yahoo; el sparkline usa `market_daily_bars`. Un bug de límite 1000 filas en la API truncaba barras — corregido cargando solo símbolos del usuario.

### ¿Los charts 1M / 3M / 1Y son de Yahoo?

**Sí**, desde `market_daily_bars`. Los rangos 1D / 1W en el detalle del ticker son **sintéticos** (no hay intradía en BD — ver roadmap).

### ¿Las compras son reales?

**No.** `buyHolding` / `sellHolding` actualizan `holdings` y `trades` en Supabase; no hay órdenes reales enviadas al broker.

### ¿El gráfico de performance muestra 30 días de Apple si acabo de comprar?

**Ya no.** Usa `portfolio_snapshots`: empieza en tu primera compra (día 0) y crece hacia adelante. Con pocos datos usa puntos ~10 min; con más de ~2 días pasa a un punto por día.
