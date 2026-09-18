"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Check,
  X,
  ArrowRight,
  Zap,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

type Plan = {
  id: "free" | "pro" | "agent";
  name: string;
  badge?: string;
  price: string;
  period: string;
  description: string;
  highlight?: boolean;
  ctaText: string;
  ctaHref: string;
  features: string[];
};

const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    badge: "7 días Pro Trial",
    price: "$0",
    period: "para siempre",
    description: "Para comenzar a ordenar tus finanzas con registro manual y un token MCP de consulta.",
    ctaText: "Comenzar gratis",
    ctaHref: "/onboarding?mode=signup",
    features: [
      "100 transacciones nuevas / mes",
      "2 cuentas (Efectivo y Tarjeta)",
      "1 moneda activa (USD o PEN)",
      "1 token MCP (solo lectura)",
      "100 llamadas a tools MCP / mes",
      "7 días de prueba Pro al registrarte (50 consultas Samy AI, máx. 10/día)",
      "Acceso web desde cualquier navegador",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    badge: "Más popular",
    price: "$5",
    period: "al mes",
    description: "Tu cockpit financiero diario con PWA instalable, Samy AI y MCP de lectura y escritura.",
    highlight: true,
    ctaText: "Probar Pro 7 días gratis",
    ctaHref: "mailto:manuel@devnyro.com?subject=Activar%20SAM%20Pro",
    features: [
      "500 transacciones nuevas / mes",
      "8 cuentas con soporte USD + PEN sin mezclar",
      "Samy AI asistente: 150 mensajes / mes (gpt-5.6-luna con multi-tool execution)",
      "PWA instalable en iOS y Android con soporte offline",
      "Reglas y pagos recurrentes programados",
      "Colección completa de temas (Ayu, Catppuccin, Solarized, ANSI)",
      "3 tokens MCP personales (lectura y escritura)",
      "5,000 llamadas a tools MCP / mes",
      "Hasta 3 conectores del marketplace",
    ],
  },
  {
    id: "agent",
    name: "Agent",
    badge: "Para devs & power users",
    price: "$10",
    period: "al mes",
    description: "Control plane completo para quienes operan desde Cursor, Claude Code u OpenClaw.",
    ctaText: "Activar Plan Agent",
    ctaHref: "mailto:manuel@devnyro.com?subject=Activar%20SAM%20Agent",
    features: [
      "Transacciones ilimitadas (fair use)",
      "Cuentas ilimitadas",
      "Soporte total USD + PEN",
      "Samy AI asistente: 500 mensajes / mes (todas las herramientas)",
      "Tokens MCP ilimitados",
      "25,000 llamadas a tools MCP / mes",
      "Transferencias internas vía MCP (sam:accounts.transfer con confirmación)",
      "Conectores e integraciones ilimitadas (Fase 1)",
      "Auditoría prioritaria de llamadas JSON-RPC",
    ],
  },
];

const COMPARISON_ROWS = [
  { feature: "Consultas Samy AI", free: "50 en trial (10/día)", pro: "150 / mes", agent: "500 / mes" },
  { feature: "Transacciones / mes", free: "100", pro: "500", agent: "Ilimitadas" },
  { feature: "Cuentas gestionadas", free: "2", pro: "8", agent: "Ilimitadas" },
  { feature: "Divisas simultáneas", free: "1 (USD o PEN)", freeNote: true, pro: "USD + PEN", agent: "USD + PEN" },
  { feature: "PWA instalable (iOS/Android)", free: false, pro: true, agent: true },
  { feature: "Pagos recurrentes", free: false, pro: true, agent: true },
  { feature: "Colección de temas", free: "1 (Default)", pro: "Todos los temas", agent: "Todos los temas" },
  { feature: "Permisos MCP", free: "Solo lectura", pro: "Lectura + Escritura", agent: "Lectura + Escritura + Transfer" },
  { feature: "Tokens MCP", free: "1 token", pro: "3 tokens", agent: "Ilimitados" },
  { feature: "Tool calls / mes", free: "100", pro: "5,000", agent: "25,000" },
  { feature: "Transferencias por MCP", free: false, pro: false, agent: "Sí (confirm: true)" },
  { feature: "Conectores e integraciones", free: "0", pro: "3", agent: "Ilimitadas" },
];

export function LandingPricing() {
  const [showComparison, setShowComparison] = useState(false);

  return (
    <section id="pricing" className="relative py-20 border-t border-[#24404b]/70 bg-[#07131c]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#24404b] bg-[#0b1822] px-3.5 py-1 text-xs text-[#ffd580]">
            <Zap size={13} />
            <span>Precios transparentes y sin sorpresas</span>
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-[#e6f0f2] sm:text-4xl [text-wrap:balance]">
            Planes diseñados para personas y agentes
          </h2>
          <p className="mt-3 text-sm text-[#9cb0b8] sm:text-base [text-wrap:pretty]">
            Comienza gratis con 7 días de prueba Pro y límites de seguridad. Las activaciones pagadas son
            manuales: escríbenos a manuel@devnyro.com y nunca ingreses una tarjeta en SAM.
          </p>
        </div>

        {/* 3 Pricing Cards Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 items-stretch">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col justify-between rounded-2xl p-6 sm:p-8 transition-all ${
                plan.highlight
                  ? "border-2 border-[#a8e63b] bg-[#0b1822] shadow-[0_0_32px_rgba(168,230,59,0.18)]"
                  : "border border-[#24404b] bg-[#0b1822]/80 hover:border-[#54d8e4]/50"
              }`}
            >
              {/* Badge if present */}
              {plan.badge && (
                <div className="absolute -top-3 left-6">
                  <span
                    className={`rounded-full px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider ${
                      plan.highlight
                        ? "bg-[#a8e63b] text-[#07131c]"
                        : "border border-[#24404b] bg-[#10212d] text-[#54d8e4]"
                    }`}
                  >
                    {plan.badge}
                  </span>
                </div>
              )}

              {/* Card Header */}
              <div>
                <h3 className="text-xl font-bold text-[#e6f0f2]">{plan.name}</h3>
                <p className="mt-2 text-xs text-[#9cb0b8] leading-relaxed min-h-[36px]">
                  {plan.description}
                </p>

                {/* Price block */}
                <div className="mt-5 mb-6 flex items-baseline gap-1.5 border-b border-[#24404b] pb-6">
                  <span className="font-mono text-4xl font-extrabold text-[#e6f0f2]">
                    {plan.price}
                  </span>
                  <span className="text-xs text-[#9cb0b8]">{plan.period}</span>
                </div>

                {/* Features List */}
                <ul className="space-y-3 text-xs text-[#c9d1d9]">
                  {plan.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <Check
                        size={15}
                        className={`shrink-0 mt-0.5 ${
                          plan.highlight ? "text-[#a8e63b]" : "text-[#54d8e4]"
                        }`}
                      />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Card CTA */}
              <div className="mt-8 pt-4">
                <Link
                  href={plan.ctaHref}
                  className={`flex h-11 w-full items-center justify-center gap-2 rounded-xl text-xs font-semibold transition-all ${
                    plan.highlight
                      ? "bg-[#a8e63b] text-[#07131c] shadow-[0_0_16px_rgba(168,230,59,0.25)] hover:bg-[#bcf255]"
                      : "border border-[#24404b] bg-[#07131c] text-[#e6f0f2] hover:border-[#54d8e4] hover:bg-[#10212d]"
                  }`}
                >
                  <span>{plan.ctaText}</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Detailed Comparison Toggle Button */}
        <div className="mt-12 text-center">
          <button
            type="button"
            onClick={() => setShowComparison(!showComparison)}
            className="inline-flex items-center gap-2 rounded-lg border border-[#24404b] bg-[#0b1822] px-4 py-2 text-xs font-semibold text-[#54d8e4] hover:bg-[#10212d]"
          >
            <span>{showComparison ? "Ocultar tabla de límites detallada" : "Ver comparación completa de límites y herramientas"}</span>
            {showComparison ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {/* Comparison Table */}
        {showComparison && (
          <div className="mt-8 overflow-x-auto rounded-xl border border-[#24404b] bg-[#0b1822] p-4 sm:p-6 shadow-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#24404b] text-[#9cb0b8] font-mono">
                  <th className="py-3 px-3">CAPACIDAD / LÍMITE</th>
                  <th className="py-3 px-3">FREE ($0)</th>
                  <th className="py-3 px-3 text-[#a8e63b]">PRO ($5 / MES)</th>
                  <th className="py-3 px-3 text-[#54d8e4]">AGENT ($10 / MES)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#24404b]/60 text-[#c9d1d9]">
                {COMPARISON_ROWS.map((row, idx) => (
                  <tr key={idx} className="hover:bg-[#07131c]/50">
                    <td className="py-3 px-3 font-medium text-[#e6f0f2]">{row.feature}</td>

                    {/* Free column */}
                    <td className="py-3 px-3 font-mono">
                      {typeof row.free === "boolean" ? (
                        row.free ? (
                          <Check size={15} className="text-[#a8e63b]" />
                        ) : (
                          <X size={15} className="text-[#707a8c]" />
                        )
                      ) : (
                        row.free
                      )}
                    </td>

                    {/* Pro column */}
                    <td className="py-3 px-3 font-mono text-[#e6f0f2]">
                      {typeof row.pro === "boolean" ? (
                        row.pro ? (
                          <Check size={15} className="text-[#a8e63b]" />
                        ) : (
                          <X size={15} className="text-[#707a8c]" />
                        )
                      ) : (
                        row.pro
                      )}
                    </td>

                    {/* Agent column */}
                    <td className="py-3 px-3 font-mono text-[#54d8e4] font-semibold">
                      {typeof row.agent === "boolean" ? (
                        row.agent ? (
                          <Check size={15} className="text-[#54d8e4]" />
                        ) : (
                          <X size={15} className="text-[#707a8c]" />
                        )
                      ) : (
                        row.agent
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
