// @ts-ignore `.open-next/worker.js` is generated at build time.
import { default as handler } from "./.open-next/worker.js";

export default {
  fetch(request, env, ctx) {
    // No current SAM surface uses image optimization. Close the unused public
    // entry point as well as disabling it in Next's client configuration.
    const pathname = new URL(request.url).pathname;
    if (pathname === "/_next/image" || pathname === "/_next/image/") {
      return new Response(null, { status: 404 });
    }
    return handler.fetch(request, env, ctx);
  },
} satisfies ExportedHandler<Cloudflare.Env>;

// Required by OpenNext when DO-based cache overrides are enabled.
// @ts-ignore `.open-next/worker.js` is generated at build time.
export { DOQueueHandler, DOShardedTagCache } from "./.open-next/worker.js";
