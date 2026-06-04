# Supabase → Neon Migration Notes

## What changed
- `auth.users` → Better Auth `user` table
- `auth.uid()` RLS → Server Actions filter by session user id
- `handle_new_user()` trigger → `lib/auth/onboarding-bootstrap.ts`
- `delete_user()` RPC → `deleteAccountAction` cascade delete

## Not ported to Neon
- Supabase PostgREST roles (`anon`, `authenticated`, `service_role`)
- Supabase Auth JWT / GoTrue
- Realtime, Storage, Edge Functions (unused in app)

## Seed
Demo user `alex@sam.app` — run `npm run db:seed` after migrations.

## Market data
Written via `npm run market:sync` or Vercel Cron `/api/cron/market-sync`.
