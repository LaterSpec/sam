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
  // SAM currently serves static assets without next/image. Do not enable a
  // server-side image decoder unless an explicit product use case requires it.
  images: { unoptimized: true },
  // @better-auth/core ships workerd-specific instrumentation (pure.index.mjs).
  // OpenNext copies those files only for packages listed here — see:
  // https://opennext.js.org/cloudflare/howtos/workerd
  serverExternalPackages: [
    "@better-auth/core",
    "drizzle-orm",
    "@neondatabase/serverless",
    "ai",
    "@ai-sdk/openai",
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
