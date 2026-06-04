/**
 * Seed market symbols. Demo user seed requires Better Auth signup or manual insert.
 * Run: npm run db:seed (requires DATABASE_URL)
 */
import { db, getDb } from "@/lib/db";
import { marketSymbols } from "@/lib/db/schema";

const SYMBOLS: Array<[string, string, boolean, number]> = [
  ["AAPL", "Apple", true, 0],
  ["MSFT", "Microsoft", true, 1],
  ["NVDA", "NVIDIA", true, 2],
  ["AMZN", "Amazon", true, 3],
  ["META", "Meta Platforms", true, 4],
  ["TSLA", "Tesla", true, 5],
  ["AVGO", "Broadcom", true, 6],
  ["AMD", "AMD", true, 7],
  ["NFLX", "Netflix", true, 8],
  ["V", "Visa", true, 9],
  ["SPY", "SPDR S&P 500", true, 10],
  ["QQQ", "Invesco QQQ", true, 11],
];

async function seed() {
  getDb();
  for (const [symbol, name, curated, sort] of SYMBOLS) {
    await db
      .insert(marketSymbols)
      .values({ symbol, name, curated, sort, active: true })
      .onConflictDoNothing();
  }
  console.log(`Seeded ${SYMBOLS.length} market symbols`);
}

seed()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
