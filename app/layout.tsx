import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";
import { PwaProvider } from "@/components/pwa/pwa-provider";
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";
import "./globals.css";

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SAM — Financial Terminal",
  description: "Personal financial terminal PWA",
  applicationName: "SAM",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SAM",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icons/sam-app.svg", type: "image/svg+xml" },
      { url: "/icons/sam-icon.png", sizes: "1254x1254", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0e14",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${jetbrains.variable} h-full`}>
      <body className="min-h-full antialiased">
        {children}
        <ServiceWorkerRegistration />
        <PwaProvider />
      </body>
    </html>
  );
}
