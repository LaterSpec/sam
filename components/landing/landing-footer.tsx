"use client";

import Link from "next/link";
import { SamBrandIcon } from "@/components/ui/sam-brand-icon";
import { ArrowUpRight } from "lucide-react";

export function LandingFooter() {
  return (
    <footer className="border-t border-[#24404b] bg-[#07131c] text-[#9cb0b8] text-xs">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-3">
            <Link href="/" className="inline-flex items-center gap-2 text-inherit no-underline">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#24404b] bg-[#0b1822]">
                <SamBrandIcon size={18} color="#a8e63b" />
              </div>
              <span className="text-sm font-bold tracking-wider text-[#e6f0f2]">SAM</span>
              <span className="font-mono text-[9px] tracking-widest text-[#707a8c] uppercase">Living Ledger</span>
            </Link>
            <p className="text-xs text-[#9cb0b8] max-w-md leading-relaxed">
              El terminal financiero personal para ti y tus agentes de IA. Audita saldos, sobres de gasto
              y flujo de caja en un cockpit continuo o por el protocolo MCP.
            </p>
            <div className="flex items-center gap-2 font-mono text-[11px] text-[#54d8e4]">
              <span className="h-2 w-2 rounded-full bg-[#a8e63b]" />
              <span>Producción en Cloudflare Workers · Neon Postgres</span>
            </div>
          </div>

          {/* Product Links */}
          <div className="space-y-2.5">
            <div className="font-mono text-[11px] uppercase tracking-wider text-[#e6f0f2]">Plataforma</div>
            <ul className="space-y-2">
              <li>
                <a href="#features" className="hover:text-[#e6f0f2]">
                  Capacidades del Ledger
                </a>
              </li>
              <li>
                <a href="#demo-samy" className="hover:text-[#54d8e4]">
                  Demo Interactiva Samy AI
                </a>
              </li>
              <li>
                <a href="#mcp" className="hover:text-[#a8e63b]">
                  Protocolo MCP (/api/mcp)
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-[#e6f0f2]">
                  Precios y Límites
                </a>
              </li>
            </ul>
          </div>

          {/* Developers & Access */}
          <div className="space-y-2.5">
            <div className="font-mono text-[11px] uppercase tracking-wider text-[#e6f0f2]">Acceso & Docs</div>
            <ul className="space-y-2">
              <li>
                <Link href="/developers" className="inline-flex items-center gap-1 hover:text-[#e6f0f2]">
                  <span>SAM for Developers</span>
                  <ArrowUpRight size={12} />
                </Link>
              </li>
              <li>
                <Link href="/onboarding?mode=login" className="hover:text-[#e6f0f2]">
                  Iniciar sesión
                </Link>
              </li>
              <li>
                <Link href="/onboarding?mode=signup" className="hover:text-[#e6f0f2]">
                  Crear cuenta (Trial 7 días)
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Terminal Status Bar & Disclaimer */}
        <div className="border-t border-[#24404b]/70 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="font-mono text-[11px] text-[#707a8c] flex flex-wrap items-center gap-2">
            <span>system: living-ledger</span>
            <span>·</span>
            <span>mcp: streamable-http</span>
            <span>·</span>
            <span>pwa: ready</span>
          </div>

          <p className="text-[11px] text-[#707a8c] text-center sm:text-right max-w-md">
            SAM es un proyecto de desarrollo y ledger personal. No es un banco, no mueve dinero hacia terceros y no constituye asesoramiento financiero.
          </p>
        </div>
      </div>
    </footer>
  );
}
