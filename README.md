# SAM — Financial Terminal

Terminal financiero personal estilo consola: onboarding, presupuesto, metas e **Invest** con cotizaciones reales (Yahoo + feed live opcional IBKR vía Newroad), compra/venta **simulada** y portafolio persistido en Supabase local.

> MVP local de punta a punta. No hay broker real ni órdenes reales.

## Requisitos

| Herramienta | Versión / notas |
|-------------|-----------------|
| **macOS / Linux** | Desarrollo probado en macOS con Docker |
| **Docker Desktop** | Para Supabase local |
| **Supabase CLI** | `supabase --version` |
| **Python 3.10+** | Backend de mercado (`backend/venv`) |
| **Navegador moderno** | Chrome / Safari / Firefox |

Opcional para live data:

- Cuenta **Newroad** + credenciales en `backend/.env`
- Acceso al proyecto **cuantito** (referencia de API; no es dependencia en runtime)

## Inicio rápido (5 terminales o menos)

### 1. Supabase

```bash
cd FinancialTerminal
supabase start
```

Anota la salida de `supabase status` (API URL, anon key, Studio). Tras el primer clone:

```bash
supabase db reset    # aplica migraciones + seed (usuario demo)
```

Solo migraciones nuevas sin borrar datos:

```bash
supabase migration up
```

### 2. Frontend

```bash
python3 serve.py
# → http://localhost:3000
```

| Página | URL |
|--------|-----|
| Onboarding (registro / login) | http://localhost:3000/SAM-Onboarding.html |
| App principal | http://localhost:3000/SAM-Interactive.html |

> El servidor usa puerto **3000** a propósito (evita conflicto con Docker en 8080).  
> Si cambias de puerto, tendrás que volver a iniciar sesión (`localStorage` por origen).

### 3. Datos de mercado (Yahoo)

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m market.yahoo_sync
```

Sin este paso, Invest puede mostrar pocos precios o sparklines vacíos hasta que corra el sync.

### 4. Live data (opcional)

```bash
cd backend
source venv/bin/activate
cp .env.example .env   # rellena NEWROAD_USERNAME / NEWROAD_PASSWORD
python -m live_data.connect
# Introduce el código 2FA cuando lo pida
```

Mientras corre, Market y Portfolio muestran `● LIVE`. Al cerrar el script, vuelve el fallback Yahoo.

---

## Usuario de prueba

Tras `supabase db reset`:

| | |
|--|--|
| **Email** | `alex@sam.app` |
| **Contraseña** | `sam12345` |

Incluye transacciones, metas, cuentas y categorías de demo. **Invest** empieza sin posiciones; el watchlist curated se crea al registrarse.

También puedes **crear una cuenta nueva** en onboarding (mismo flujo MVP con email/contraseña). OAuth Apple/Google está visible pero **no conectado**.

---

## Puertos y URLs

| Servicio | Puerto | URL |
|----------|--------|-----|
| App estática | 3000 | http://localhost:3000 |
| Supabase API | 54321 | http://127.0.0.1:54321 |
| Postgres | 54322 | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| Supabase Studio | 54323 | http://127.0.0.1:54323 |

---

## Estructura del repositorio

```
FinancialTerminal/
├── SAM-Onboarding.html      # Auth + landing invest
├── SAM-Interactive.html     # App React (CDN)
├── serve.py                 # HTTP sin caché
├── src/shared/              # supabase-client.js, ios-frame
├── src/interactive/         # App, pantallas, sheets
├── supabase/migrations/     # Esquema SQL versionado
├── supabase/seed.sql        # Usuario Alex + datos demo
├── backend/                 # Yahoo sync + live SSE
└── docs/                    # Documentación detallada
```

Documentación ampliada:

- [Arquitectura y flujos](docs/ARCHITECTURE.md)
- [Esquema de BD y datos por cliente](docs/DATABASE.md)
- [Live data y Yahoo](docs/LIVE-DATA.md)
- [Backend Python](backend/README.md)

---

## Funcionalidades principales

### Finanzas personales

- Cuentas (cash, tarjeta, checking, savings) con saldos en Supabase.
- Gastos / ingresos por categoría con topes mensuales.
- Metas, buckets de ahorro, fuentes de ingreso.
- Perfil: tema claro/oscuro, sign out, borrar cuenta (`delete_user()`).

### Invest (simulado)

- **Market:** watchlist, holdings, top movers, badge LIVE/delayed.
- **Portfolio:** valor mark-to-market, P&L, gráfico de performance desde **día 0** (`portfolio_snapshots`).
- **Analysis:** volatilidad, drawdown, Sharpe, beta vs SPY (datos reales de barras).
- Compra/venta desde sheets → persiste `holdings` + `trades`.

---

## Comandos de referencia

```bash
# Supabase
supabase start
supabase stop
supabase status
supabase db reset          # migraciones + seed
supabase migration up      # solo migraciones pendientes

# Frontend
python3 serve.py
python3 serve.py 3001      # otro puerto

# Backend
cd backend && source venv/bin/activate
python -m market.yahoo_sync
python -m market.yahoo_sync --help
python -m live_data.connect
```

---

## Qué no subir a Git

Ver [.gitignore](.gitignore). Resumen:

- `backend/venv/`, `backend/.env` (credenciales Newroad)
- Cualquier `.env` con secretos
- Cachés Python, `.DS_Store`, logs
- Artefactos locales de Supabase (`.branches`, `.temp`)

La **anon key** en `src/shared/supabase-client.js` es la clave **demo local** de Supabase; está pensada solo para desarrollo en `127.0.0.1`. En producción usa variables de entorno y RLS revisado.

---

## Solución de problemas

| Síntoma | Qué hacer |
|---------|-----------|
| Pantalla negra / error en consola | Hard refresh; revisar `serve.py` (no uses `python -m http.server` sin no-cache). |
| “backend offline” al abrir la app | `supabase start` y recarga. |
| Invest sin precios | `python -m market.yahoo_sync` |
| Badge LIVE pero precios quietos | Comprueba que `connect.py` sigue corriendo; revisa `market_quotes` en Studio. |
| Sparkline “no data” en un ticker | Re-login o añade el ticker de nuevo; barras se cargan por símbolo. |
| Puerto 3000 ocupado | `lsof -i :3000` y mata el proceso, o `python3 serve.py 3001`. |
| Sesión perdida al cambiar puerto | Normal: vuelve a login en el nuevo origen. |

---

## Stack técnico

- **Frontend:** React 18 (UMD), Babel standalone, sin build step.
- **Auth / DB:** Supabase (GoTrue + PostgREST + Postgres 17).
- **Mercado:** `yfinance` + Newroad SSE (`aiohttp`).
- **Estilo:** JetBrains Mono, paleta terminal `SAM` (dark/light).

---

## Licencia y disclaimer

Proyecto de demostración / desarrollo local. Los precios y métricas **no son asesoría financiera**. Las órdenes en la UI son simuladas.
