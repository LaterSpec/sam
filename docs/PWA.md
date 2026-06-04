# SAM PWA

## Install
- **Android (Chrome):** Menú → "Instalar app" o "Añadir a pantalla de inicio"
- **iOS (Safari):** Compartir → "Añadir a pantalla de inicio"

## Configuration
- `app/manifest.ts` — `display: standalone`, `start_url: /app`
- Serwist service worker — `app/sw.ts` → `public/sw.js`
- Icons: `public/icons/icon.svg`

## iOS limitations
- No App Store distribution; install only via Safari
- Push notifications limited compared to native apps
- Service worker caching more restrictive than Android
- Standalone mode hides Safari UI — feels like an installed app

## Offline
Network-first for API routes. Static assets precached. No full offline data sync.
