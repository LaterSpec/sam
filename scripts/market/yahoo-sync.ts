import { syncMarketData } from "@/lib/market/yahoo-sync";

syncMarketData()
  .then((r) => {
    console.log("Market sync done:", r);
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
