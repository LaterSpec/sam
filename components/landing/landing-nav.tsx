"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, ArrowRight, Sparkles, Terminal } from "lucide-react";
import { SamBrandIcon } from "@/components/ui/sam-brand-icon";

export function LandingNav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#24404b] bg-[#07131c]/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link href="/" className="group flex items-center gap-2.5 text-inherit no-underline">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#24404b] bg-[#0b1822] transition-colors group-hover:border-[#54d8e4]">
            <SamBrandIcon size={20} color="#a8e63b" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-wider text-[#e6f0f2]">SAM</span>
            <span className="font-mono text-[9px] tracking-widest text-[#9cb0b8] uppercase">Living Ledger</span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden items-center gap-7 md:flex">
          <a
            href="#features"
            className="text-xs font-medium text-[#9cb0b8] transition-colors hover:text-[#e6f0f2]"
          >
            Capacidades
          </a>
          <a
            href="#demo-samy"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#9cb0b8] transition-colors hover:text-[#54d8e4]"
          >
            <Sparkles size={13} className="text-[#54d8e4]" />
            Samy AI Demo
          </a>
          <a
            href="#mcp"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#9cb0b8] transition-colors hover:text-[#a8e63b]"
          >
            <Terminal size={13} className="text-[#a8e63b]" />
            Conexión MCP
          </a>
          <a
            href="#pricing"
            className="text-xs font-medium text-[#9cb0b8] transition-colors hover:text-[#e6f0f2]"
          >
            Planes
          </a>
          <Link
            href="/developers"
            className="text-xs font-medium text-[#9cb0b8] transition-colors hover:text-[#e6f0f2]"
          >
            Developers
          </Link>
        </nav>

        {/* CTA Buttons */}
        <div className="hidden items-center gap-3 sm:flex">
          <Link
            href="/onboarding?mode=login"
            className="px-3 py-1.5 text-xs font-medium text-[#c9d1d9] transition-colors hover:text-white"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/onboarding?mode=signup"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#a8e63b]/40 bg-[#a8e63b] px-3.5 py-1.5 text-xs font-semibold text-[#07131c] shadow-sm transition-all hover:bg-[#bcf255] hover:shadow-[0_0_16px_rgba(168,230,59,0.35)]"
          >
            <span>Comenzar gratis</span>
            <ArrowRight size={12} />
          </Link>
        </div>

        {/* Mobile menu trigger */}
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#24404b] bg-[#0b1822] text-[#9cb0b8] transition-colors hover:text-white md:hidden"
          aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="border-b border-[#24404b] bg-[#0b1822] px-4 py-5 md:hidden">
          <nav className="flex flex-col gap-4">
            <a
              href="#features"
              onClick={() => setMobileOpen(false)}
              className="text-sm font-medium text-[#c9d1d9] hover:text-white"
            >
              Capacidades
            </a>
            <a
              href="#demo-samy"
              onClick={() => setMobileOpen(false)}
              className="inline-flex items-center gap-2 text-sm font-medium text-[#54d8e4]"
            >
              <Sparkles size={14} />
              Samy AI Demo
            </a>
            <a
              href="#mcp"
              onClick={() => setMobileOpen(false)}
              className="inline-flex items-center gap-2 text-sm font-medium text-[#a8e63b]"
            >
              <Terminal size={14} />
              Conexión MCP
            </a>
            <a
              href="#pricing"
              onClick={() => setMobileOpen(false)}
              className="text-sm font-medium text-[#c9d1d9] hover:text-white"
            >
              Planes y Precios
            </a>
            <Link
              href="/developers"
              onClick={() => setMobileOpen(false)}
              className="text-sm font-medium text-[#9cb0b8] hover:text-white"
            >
              SAM for Developers
            </Link>
            <div className="mt-2 flex flex-col gap-2 pt-3 border-t border-[#24404b]">
              <Link
                href="/onboarding?mode=login"
                className="flex h-10 items-center justify-center rounded-lg border border-[#24404b] bg-[#07131c] text-xs font-medium text-[#c9d1d9]"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/onboarding?mode=signup"
                className="flex h-10 items-center justify-center gap-2 rounded-lg bg-[#a8e63b] text-xs font-semibold text-[#07131c]"
              >
                <span>Comenzar gratis (Trial 7 días)</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
