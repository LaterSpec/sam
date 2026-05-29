"""SAM · live market data connector.

Authenticates against IBKR Gateway (request-code → 2FA entered in terminal →
verify-code → token), opens the live-prices SSE stream, subscribes to the IBKR
symbol universe and upserts each tick into public.market_quotes (source='live')
so the SAM front can read real-time prices from Supabase.

Run it while the market is open to feed live data:

    cd backend && source venv/bin/activate
    python -m live_data.connect

Credentials come from backend/.env (IBG_USERNAME / IBG_PASSWORD); the 2FA code
is always prompted interactively because it changes every login.
If auth or the stream fails the script exits cleanly and the front simply
falls back to the last stored snapshot / Yahoo quotes.
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
import time
from getpass import getpass
from pathlib import Path

import aiohttp
from dotenv import load_dotenv

# allow running both as `python -m live_data.connect` and `python connect.py`
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import db  # noqa: E402
from symbols import ASSET_ID_TO_SYMBOL  # noqa: E402

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

API_BASE_URL = os.getenv("IBG_API_BASE", "https://localhost:5000/v1/api")
SSE_STREAM_ENDPOINT = f"{API_BASE_URL}/analytics/live-prices/stream"
SSE_SUBSCRIBE_ENDPOINT = f"{API_BASE_URL}/analytics/live-prices/subscribe"

# Persist at most one DB write per symbol every PERSIST_EVERY seconds so a busy
# stream doesn't hammer Postgres. The front polls on its own cadence anyway.
PERSIST_EVERY = 3.0


async def authenticate(session: aiohttp.ClientSession) -> str | None:
    print("\n" + "=" * 44)
    print("  SAM · IBKR live-data connection")
    print("=" * 44)
    username = os.getenv("IBG_USERNAME") or input("IBKR user: ").strip()
    password = os.getenv("IBG_PASSWORD") or getpass("IBKR password: ").strip()
    if not username or not password:
        print("[live] missing credentials (set IBG_USERNAME / IBG_PASSWORD in backend/.env)")
        return None

    try:
        async with session.post(
            f"{API_BASE_URL}/auth/login/request-code",
            json={"username": username, "password": password},
        ) as r:
            if r.status != 200:
                print(f"[live] login step 1 failed ({r.status}): {await r.text()}")
                return None
            d = await r.json()
            challenge_token = d.get("challenge_token")
            masked = d.get("masked_email", "your registered email")
            if not challenge_token:
                print("[live] no challenge_token returned")
                return None

        code = input(f"2FA code sent to {masked}: ").strip()
        if not code:
            print("[live] empty 2FA code")
            return None

        async with session.post(
            f"{API_BASE_URL}/auth/login/verify-code",
            json={"challenge_token": challenge_token, "code": code},
        ) as r:
            if r.status != 200:
                print(f"[live] 2FA failed ({r.status}): {await r.text()}")
                return None
            token = (await r.json()).get("access_token")
            if token:
                print("[live] 2FA OK — live data active. Press Ctrl+C to stop.\n")
            return token
    except (aiohttp.ClientError, asyncio.TimeoutError) as e:
        print(f"[live] auth error: {e}")
        return None


async def stream_prices(session: aiohttp.ClientSession, token: str, conn) -> None:
    url = f"{SSE_STREAM_ENDPOINT}?token={token}"
    headers = {"Authorization": f"Bearer {token}"}
    last_persist: dict[str, float] = {}
    asset_ids = list(ASSET_ID_TO_SYMBOL.keys())

    async with session.get(url, headers=headers) as resp:
        if resp.status != 200:
            print(f"[live] SSE HTTP {resp.status}: {await resp.text()}")
            return
        buf = ""
        async for chunk in resp.content:
            buf += chunk.decode(errors="ignore")
            while "\n\n" in buf:
                raw, buf = buf.split("\n\n", 1)
                event = data_line = ""
                for line in raw.splitlines():
                    if line.startswith("event:"):
                        event = line[6:].strip()
                    elif line.startswith("data:"):
                        data_line = line[5:].strip()
                if not data_line:
                    continue
                try:
                    data = json.loads(data_line)
                except json.JSONDecodeError:
                    continue

                if event == "connected":
                    cid = data.get("connection_id")
                    if not cid:
                        continue
                    await session.post(
                        f"{SSE_SUBSCRIBE_ENDPOINT}?connection_id={cid}",
                        json={"asset_ids": asset_ids},
                        headers=headers,
                    )
                    print(f"[live] subscribed to {len(asset_ids)} symbols (cid={cid})")

                elif event == "prices":
                    now = time.monotonic()
                    written = 0
                    for p in data.get("prices", []):
                        aid = p.get("asset_id")
                        lp = p.get("live_price")
                        sym = ASSET_ID_TO_SYMBOL.get(aid)
                        if not sym or lp is None:
                            continue
                        if now - last_persist.get(sym, 0) < PERSIST_EVERY:
                            continue
                        db.upsert_live_quote(conn, sym, lp, p.get("bid"), p.get("ask"))
                        last_persist[sym] = now
                        written += 1
                    if written:
                        ts = time.strftime("%H:%M:%S")
                        print(f"[live] {ts}  updated {written} symbols", end="\r", flush=True)


async def main() -> int:
    timeout = aiohttp.ClientTimeout(total=None, sock_read=None)
    async with aiohttp.ClientSession(timeout=timeout) as session:
        token = await authenticate(session)
        if not token:
            return 1
        with db.connect() as conn:
            while True:
                try:
                    await stream_prices(session, token, conn)
                    print("\n[live] stream ended, reconnecting in 10s...")
                except asyncio.CancelledError:
                    raise
                except aiohttp.ClientError as e:
                    print(f"\n[live] stream error: {e}; retrying in 10s...")
                await asyncio.sleep(10)


if __name__ == "__main__":
    try:
        raise SystemExit(asyncio.run(main()))
    except KeyboardInterrupt:
        print("\n[live] stopped.")
