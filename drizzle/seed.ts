/**
 * Seed global market catalog (85 symbols from Supabase migration 0004).
 *
 * Original SQL: docs/database/supabase-archive/seed.sql (demo user)
 *               docs/database/supabase-archive/20260529100004_market_schema.sql (symbols)
 *
 * Demo user alex@sam.app: npm run db:seed:demo
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { getDb, db } from "@/lib/db";
import { marketSymbols } from "@/lib/db/schema";
import { MARKET_SYMBOLS_SEED } from "@/lib/db/seed/market-symbols";

async function seed() {
  getDb();

  for (const row of MARKET_SYMBOLS_SEED) {
    await db
      .insert(marketSymbols)
      .values({
        symbol: row.symbol,
        name: row.name,
        assetId: row.assetId,
        curated: row.curated,
        sort: row.sort,
        active: true,
      })
      .onConflictDoUpdate({
        target: marketSymbols.symbol,
        set: {
          name: row.name,
          assetId: row.assetId,
          curated: row.curated,
          sort: row.sort,
          active: true,
        },
      });
  }

  console.log(`✓ Seeded ${MARKET_SYMBOLS_SEED.length} market_symbols`);
  console.log("  Demo user: npm run db:seed:demo  (alex@sam.app / sam12345)");
}

seed()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
