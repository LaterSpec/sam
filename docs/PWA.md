# SAM PWA

## Instalar

- **Android (Chrome):** Menú → "Instalar app" o banner nativo / botón "Instalar app" en la app
- **iOS (Safari):** Compartir → "Añadir a pantalla de inicio" (banner con instrucciones tras unos segundos)

## Requisitos cumplidos

- HTTPS en Cloudflare Workers
- `manifest.webmanifest` con `display: standalone`, `scope: /`, iconos PNG 192/512 + maskable
- Service worker (`public/sw.js`) con precache, navegación y fallback offline
- Meta tags iOS: `apple-mobile-web-app-capable`, `apple-touch-icon` 180×180, `viewport-fit: cover`
- Safe areas (`env(safe-area-inset-*)`) en shell, onboarding y navegación inferior

## Archivos

| Archivo | Rol |
|---------|-----|
| `app/manifest.ts` | Web App Manifest |
| `app/sw.ts` | Service worker (Serwist) |
| `app/~offline/page.tsx` | Pantalla offline |
| `components/pwa/pwa-provider.tsx` | Prompt de instalación Android + hint iOS |
| `components/pwa/service-worker-registration.tsx` | Registro del SW en producción |
| `public/icons/sam-app.svg` | Icono vectorial principal |
| `public/icons/sam-icon.png` | Icono raster principal (1254×1254) |
| `public/icons/icon-*.png` | Tamaños PWA derivados de `sam-icon.png` |
| `scripts/generate-pwa-icons.mjs` | Regenerar PNG PWA desde `sam-icon.png` |

## Regenerar iconos

```bash
npm run icons:generate
```

## Limitaciones iOS

- No hay distribución en App Store; solo instalación vía Safari
- Notificaciones push más limitadas que en apps nativas
- Caché del service worker más restrictiva que en Android
- El modo standalone oculta la UI de Safari

## Offline

Network-first en rutas API. Assets estáticos en precache. Página `/~offline` como fallback de documentos sin red.

## Deploy

Tras cambios PWA, redeploy a Cloudflare:

```bash
npm run deploy:cloudflare
```
