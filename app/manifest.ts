import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    scope: "/",
    name: "SAM",
    short_name: "SAM",
    description: "Personal financial terminal PWA",
    start_url: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    background_color: "#0a0e14",
    theme_color: "#0a0e14",
    orientation: "portrait-primary",
    categories: ["finance", "productivity"],
    prefer_related_applications: false,
    icons: [
      {
        src: "/icons/sam_iconv2-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/sam_iconv2-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/sam_iconv2-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
