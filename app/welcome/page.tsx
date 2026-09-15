import type { Metadata } from "next";
import { LandingPageClient } from "@/components/landing/landing-page-client";

export const metadata: Metadata = {
  title: "SAM — El Living Ledger para Ti y tus Agentes de IA",
  description:
    "Audita tus saldos, presupuestos envelope y flujo de caja con precisión terminal. Conecta Claude, Cursor, ChatGPT o Samy directamente a tu libro contable vía MCP.",
};

export default function WelcomePage() {
  return <LandingPageClient />;
}
