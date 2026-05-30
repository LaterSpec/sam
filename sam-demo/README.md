# SAM Demo

Standalone landing demo of the SAM financial terminal: onboarding, full interactive app with iOS device frame, **100% mock data** (localStorage + simulated market). Built with Vite + React for static deploy on **Cloudflare Pages**.

## Quick start

```bash
cd sam-demo
npm install
npm run dev
```

Open http://localhost:5173 — click **[try demo ▸]** on the landing carousel or auth picker.

## Build for production

```bash
npm run build
npm run preview
```

Output: `dist/` (includes `_headers` and `_redirects` for Cloudflare).

## Cloudflare Pages

| Setting | Value |
|---------|--------|
| Build command | `npm ci && npm run build` |
| Build output directory | `dist` |
| Node version | 20+ |

SPA routing uses `_redirects` (`/* → /index.html`). Asset caching uses `_headers` (long cache for hashed `/assets/*`, no cache for `index.html`).

## What is mocked

- No Supabase, no backend
- User data: Alex Morris seed + edits in `localStorage` (`sam-demo-state`, `sam-demo-session`)
- Market: random-walk prices every ~8s, badge `● LIVE` always on
- Trades, expenses, goals: persisted locally only

## Reset demo data

Clear site data in the browser, or run in devtools:

```js
['sam-demo-session','sam-demo-state','sam-demo-market'].forEach(k => localStorage.removeItem(k));
```

## Structure

```
sam-demo/
├── src/demo-db.js       # SamDB-compatible API
├── src/market-engine.js # Simulated quotes & bars
├── src/data/seed.json   # Alex demo dataset
├── src/onboarding/      # Landing + auth UI
└── src/interactive/     # App shell, screens, sheets
```

Parent MVP (Supabase + real market sync): see [../README.md](../README.md).
