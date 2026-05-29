"""SAM · Yahoo Finance sync.

For every symbol in public.market_symbols this:
  • upserts a delayed quote into market_quotes (source='yahoo') with the latest
    price, previous close, day open and computed day-change %, and
  • upserts the last ~90 daily closes into market_daily_bars (powers the
    portfolio performance chart).

This is the fallback the front uses when the live connector isn't running, and
the historical source the live feed can't provide. Run it on demand (e.g. once
before/after market hours):

    cd backend && source venv/bin/activate
    python -m market.yahoo_sync                # all catalog symbols
    python -m market.yahoo_sync --symbols AAPL,MSFT --days 120
"""

from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path

import yfinance as yf

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import db  # noqa: E402


def _clean(x):
    if x is None:
        return None
    try:
        f = float(x)
    except (TypeError, ValueError):
        return None
    return None if math.isnan(f) else f


def _frame_for(data, symbol, multi):
    """Extract a single symbol's OHLC frame from a yf.download result."""
    if multi:
        if symbol not in getattr(data, "columns", []).get_level_values(0):
            return None
        return data[symbol]
    return data


def sync(symbols: list[str], days: int = 90) -> None:
    if not symbols:
        print("[yahoo] no symbols to sync")
        return

    period = f"{max(days + 10, 30)}d"
    print(f"[yahoo] downloading {len(symbols)} symbols ({period} daily)...")
    data = yf.download(
        symbols,
        period=period,
        interval="1d",
        auto_adjust=False,
        group_by="ticker",
        threads=True,
        progress=False,
    )
    multi = len(symbols) > 1

    ok = 0
    with db.connect() as conn:
        for sym in symbols:
            try:
                frame = _frame_for(data, sym, multi)
                if frame is None or "Close" not in frame.columns:
                    continue
                closes = frame["Close"].dropna()
                if closes.empty:
                    continue

                last_close = _clean(closes.iloc[-1])
                prev_close = _clean(closes.iloc[-2]) if len(closes) >= 2 else None
                day_open = None
                if "Open" in frame.columns:
                    opens = frame["Open"].dropna()
                    if not opens.empty:
                        day_open = _clean(opens.iloc[-1])

                db.upsert_yahoo_quote(
                    conn, sym,
                    price=last_close,
                    prev_close=prev_close,
                    day_open=day_open,
                )

                bars = [
                    (idx.date(), c)
                    for idx, c in (
                        (i, _clean(v)) for i, v in closes.items()
                    )
                    if c is not None
                ][-days:]
                db.upsert_daily_bars(conn, sym, bars)
                ok += 1
            except Exception as e:  # one bad ticker shouldn't abort the run
                print(f"[yahoo] {sym}: {e}")

        pruned_q = db.prune_old_quotes(conn)
        pruned_b = db.prune_old_bars(conn)

    print(f"[yahoo] synced {ok}/{len(symbols)} symbols; "
          f"pruned {pruned_q} stale quotes, {pruned_b} old bars")


def main() -> None:
    ap = argparse.ArgumentParser(description="Sync Yahoo Finance quotes + daily bars into Supabase")
    ap.add_argument("--symbols", help="comma-separated list; default = all catalog symbols")
    ap.add_argument("--days", type=int, default=90, help="daily bars to retain per symbol")
    args = ap.parse_args()

    if args.symbols:
        symbols = [s.strip().upper() for s in args.symbols.split(",") if s.strip()]
    else:
        with db.connect() as conn:
            symbols = [r["symbol"] for r in db.list_symbols(conn)]

    sync(symbols, days=args.days)


if __name__ == "__main__":
    main()
