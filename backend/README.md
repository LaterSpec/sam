# SAM · Backend de datos de mercado

Dos jobs Python escriben en Postgres local; el frontend **solo lee** vía Supabase REST.

| Módulo | Comando | Salida |
|--------|---------|--------|
| Yahoo | `python -m market.yahoo_sync` | `market_quotes` (`yahoo`) + `market_daily_bars` |
| Live | `python -m live_data.connect` | `market_quotes` (`live`) vía SSE Newroad |

## Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

## Uso

```bash
# Histórico + cotizaciones retrasadas (ejecutar primero):
python -m market.yahoo_sync

# Tiempo real (pide 2FA en terminal):
python -m live_data.connect
```

Documentación completa:

- [Live data (2FA, SSE, fallback)](../docs/LIVE-DATA.md)
- [Esquema `market_*`](../docs/DATABASE.md)
- [README principal](../README.md)
