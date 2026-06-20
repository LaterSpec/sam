import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    scope: "/",
    name: "SAM — Financial Terminal",
    short_name: "SAM",
    description: "Personal financial terminal PWA",
    start_url: "/app",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    background_color: "#0a0e14",
    theme_color: "#0a0e14",
    orientation: "portrait-primary",
    categories: ["finance", "productivity"],
    prefer_related_applications: false,
    icons: [
      {
        src: "/icons/sam-app.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/sam-icon.png",
        sizes: "1254x1254",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
