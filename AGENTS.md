# SAM Project Rules

- This project is being migrated from legacy HTML/JSX to Next.js App Router.
- Final deployment target is Cloudflare Workers via OpenNext.
- Final database target is Neon Postgres.
- Supabase was only used for testing and must not remain as an active dependency.
- Before removing Supabase files, extract and document DB schema, migrations and seed data.
- Ignore `sam-demo/` completely.
- Prefer TypeScript, Tailwind CSS, shadcn/ui, Drizzle ORM and Zod.
- Prefer Next.js Server Actions or Route Handlers over a separate backend.
- Do not use React Native.
- The app must be PWA-ready and installable on iOS/Android.
- No iOS device frames — full viewport native-like layout.
- Make small, reviewable changes.
- Do not delete legacy files until migration notes are created.
- For SAM finance data via MCP (expenses, budgets, accounts, etc.), use the project skill at `.agents/skills/sam-mcp/SKILL.md` and [docs/MCP.md](docs/MCP.md). Do not query the database directly when the user asked for MCP-only access.
