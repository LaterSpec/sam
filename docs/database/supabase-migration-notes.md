# Supabase To Neon Migration Notes

Supabase was used during the legacy and migration phases. It is now archived only; the active runtime stack is Cloudflare Workers + Neon Postgres + Better Auth + Drizzle ORM.

## What Changed

| Supabase-era concept | Current SAM implementation |
| --- | --- |
| `auth.users` | Better Auth `user` table |
| Supabase Auth sessions/JWTs | Better Auth sessions |
| `auth.uid()` RLS policies | Explicit `userId` filters in Server Actions and query helpers |
| `handle_new_user()` trigger | `lib/auth/onboarding-bootstrap.ts` |
| `delete_user()` RPC | `deleteAccountAction` plus FK cascades |
| Supabase migrations | Drizzle schema in `lib/db/schema.ts` |
| Supabase seed SQL | TypeScript seed scripts in `drizzle/` |
| Supabase REST/PostgREST | Next.js Server Actions and Route Handlers |

## Not Ported

These Supabase features are intentionally not active runtime dependencies:

- Supabase Auth / GoTrue
- Supabase JWT helpers
- Supabase PostgREST roles: `anon`, `authenticated`, `service_role`
- Supabase Realtime
- Supabase Storage
- Supabase Edge Functions
- Supabase client in browser runtime

## Archived SQL

Original SQL remains under:

```text
docs/database/supabase-archive/
```

Keep this archive until migration notes are complete. Do not delete the archive casually; it remains useful for understanding old schema intent and seed data.

## Current Seeds

Run:

```bash
npm run db:seed:demo
```

`npm run db:seed:demo` creates/enriches the demo user:

```text
alex@sam.app / sam12345
```

The historical investment and pricing schema is preserved in the Supabase SQL archive only. Its active Neon/runtime removal is documented in `docs/migrations/investments-removal.md`.

## Security Reminder

The old RLS safety net no longer exists. Any new API, MCP tool, route handler, or background task that touches user data must receive or derive an authenticated `userId` and apply it to every user-scoped query.
