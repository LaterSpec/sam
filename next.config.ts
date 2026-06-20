import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  register: false,
  cacheOnNavigation: true,
  reloadOnOnline: true,
  additionalPrecacheEntries: [{ url: "/~offline", revision: "2" }],
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // @better-auth/core ships workerd-specific instrumentation (pure.index.mjs).
  // OpenNext copies those files only for packages listed here — see:
  // https://opennext.js.org/cloudflare/howtos/workerd
  serverExternalPackages: [
    "@better-auth/core",
    "drizzle-orm",
    "@neondatabase/serverless",
  ],
  outputFileTracingIncludes: {
    "*": [
      "./node_modules/@better-auth/core/dist/instrumentation/**",
      "./node_modules/better-auth/node_modules/@better-auth/core/dist/instrumentation/**",
    ],
  },
};

export default withSerwist(nextConfig);

initOpenNextCloudflareForDev();
