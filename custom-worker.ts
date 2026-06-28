// @ts-ignore `.open-next/worker.js` is generated at build time.
import { default as handler } from "./.open-next/worker.js";
import { processDueRecurring } from "./lib/domain/recurring";
import { syncMarketData } from "./lib/market/yahoo-sync";

export default {
  fetch: handler.fetch,

  async scheduled(event, env, ctx) {
    if (event.cron === "0 * * * *") {
      if (env.RECURRING_CRON_ENABLED !== "true") {
        console.log(JSON.stringify({ message: "recurring cron disabled", cron: event.cron }));
        return;
      }
      ctx.waitUntil(
        processDueRecurring()
          .then((result) => {
            console.log(JSON.stringify({ message: "recurring cron complete", ...result }));
          })
          .catch((error) => {
            console.error(
              JSON.stringify({
                message: "recurring cron failed",
                error: error instanceof Error ? error.message : String(error),
              })
            );
          })
      );
      return;
    }

    if (event.cron === "15 6 * * *") {
      ctx.waitUntil(
        syncMarketData()
          .then((result) => {
            console.log(JSON.stringify({ message: "market cron complete", result }));
          })
          .catch((error) => {
            console.error(
              JSON.stringify({
                message: "market cron failed",
                error: error instanceof Error ? error.message : String(error),
              })
            );
          })
      );
    }
  },
} satisfies ExportedHandler<Cloudflare.Env>;

// Required by OpenNext when DO-based cache overrides are enabled.
// @ts-ignore `.open-next/worker.js` is generated at build time.
export { DOQueueHandler, DOShardedTagCache } from "./.open-next/worker.js";
