"""Thin psycopg layer over the project Postgres database.

Both backend jobs write GLOBAL market reference data (market_quotes,
market_daily_bars). Override the connection string with DATABASE_URL in
backend/.env if your setup differs.
"""

from __future__ import annotations

import os
from contextlib import contextmanager
from datetime import date

import psycopg

DEFAULT_DB_URL = "postgresql://postgres:postgres@127.0.0.1:5432/postgres"


def db_url() -> str:
    return os.getenv("DATABASE_URL", DEFAULT_DB_URL)


@contextmanager
def connect():
    conn = psycopg.connect(db_url(), autocommit=True)
    try:
        yield conn
    finally:
        conn.close()


def list_symbols(conn) -> list[dict]:
    """All active catalog symbols with their IBKR asset id."""
    with conn.cursor() as cur:
        cur.execute(
            "select symbol, asset_id from public.market_symbols "
            "where active = true order by sort"
        )
        return [{"symbol": r[0], "asset_id": r[1]} for r in cur.fetchall()]


def upsert_live_quote(conn, symbol: str, price, bid=None, ask=None,
                      session: date | None = None) -> None:
    """Upsert today's live snapshot for one symbol (source='live').

    prev_close / day_open are left untouched so a prior Yahoo sync can supply
    them for the day-change calculation; coalesce keeps any existing values.
    """
    with conn.cursor() as cur:
        cur.execute(
            """
            insert into public.market_quotes
              (symbol, source, session_date, price, bid, ask, captured_at)
            values (%s, 'live', coalesce(%s, current_date), %s, %s, %s, now())
            on conflict (symbol, source, session_date) do update set
              price       = excluded.price,
              bid         = coalesce(excluded.bid, public.market_quotes.bid),
              ask         = coalesce(excluded.ask, public.market_quotes.ask),
              captured_at = now()
            """,
            (symbol, session, price, bid, ask),
        )


def upsert_live_quotes(conn, rows: list[dict]) -> int:
    """rows: [{symbol, price, bid, ask}]. Returns count written."""
    n = 0
    for r in rows:
        if r.get("price") is None:
            continue
        upsert_live_quote(conn, r["symbol"], r["price"], r.get("bid"), r.get("ask"))
        n += 1
    return n


def upsert_yahoo_quote(conn, symbol: str, price, prev_close=None, day_open=None,
                       bid=None, ask=None) -> None:
    change_pct = None
    if price is not None and prev_close not in (None, 0):
        change_pct = (float(price) - float(prev_close)) / float(prev_close) * 100.0
    with conn.cursor() as cur:
        cur.execute(
            """
            insert into public.market_quotes
              (symbol, source, session_date, price, bid, ask,
               prev_close, day_open, change_pct, captured_at)
            values (%s, 'yahoo', current_date, %s, %s, %s, %s, %s, %s, now())
            on conflict (symbol, source, session_date) do update set
              price       = excluded.price,
              bid         = excluded.bid,
              ask         = excluded.ask,
              prev_close  = excluded.prev_close,
              day_open    = excluded.day_open,
              change_pct  = excluded.change_pct,
              captured_at = now()
            """,
            (symbol, price, bid, ask, prev_close, day_open, change_pct),
        )


def upsert_daily_bars(conn, symbol: str, bars: list[tuple]) -> int:
    """bars: [(date, close)]. Upserts into market_daily_bars."""
    if not bars:
        return 0
    with conn.cursor() as cur:
        cur.executemany(
            """
            insert into public.market_daily_bars (symbol, bar_date, close)
            values (%s, %s, %s)
            on conflict (symbol, bar_date) do update set close = excluded.close
            """,
            [(symbol, d, c) for (d, c) in bars],
        )
    return len(bars)


def prune_old_quotes(conn) -> int:
    """Keep only today + the previous day, per the spec."""
    with conn.cursor() as cur:
        cur.execute(
            "delete from public.market_quotes "
            "where session_date < current_date - interval '1 day'"
        )
        return cur.rowcount


def prune_old_bars(conn, keep_days: int = 200) -> int:
    with conn.cursor() as cur:
        cur.execute(
            "delete from public.market_daily_bars "
            "where bar_date < current_date - %s",
            (keep_days,),
        )
        return cur.rowcount
