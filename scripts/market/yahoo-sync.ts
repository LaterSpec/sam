import { config } from "dotenv";

// Next.js carga .env.local solo en `next dev`; los scripts CLI deben cargarlo explícitamente.
config({ path: ".env.local" });
config({ path: ".env" });

import { syncMarketData } from "@/lib/market/yahoo-sync";

const limit = process.env.MARKET_SYNC_LIMIT
  ? parseInt(process.env.MARKET_SYNC_LIMIT, 10)
  : undefined;

syncMarketData({ limit })
  .then((r) => {
    console.log("Market sync done:", r);
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
