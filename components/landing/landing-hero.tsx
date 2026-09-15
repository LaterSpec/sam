"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  Code2,
} from "lucide-react";
import {
  ClaudeIcon,
  CursorIcon,
  OpenAIIcon,
  AntigravityIcon,
  GrokIcon,
  OpenClawIcon,
} from "./icons/agent-icons";

export type AgentInfo = {
  id: string;
  name: string;
  provider: string;
  toolCall: string;
  toolResult: string;
  icon: (props: { size?: number; className?: string }) => React.ReactNode;
  accent: string;
  glow: string;
  baseRot: string;
  floatClass: string;
};

export const AGENTS: AgentInfo[] = [
  {
    id: "claude",
    name: "Claude Code",
    provider: "Anthropic Claude Desktop & CLI",
    toolCall: `sam_get_cashflow({ month: "2026-09" })`,
    toolResult: `Ingresos: $3,200.00 | Gastos: $1,840.50 | Margen: +$1,359.50`,
    icon: ClaudeIcon,
    accent: "#d97757",
    glow: "rgba(217, 119, 87, 0.45)",
    baseRot: "-3.5deg",
    floatClass: "animate-float-1",
  },
  {
    id: "openclaw",
    name: "OpenCode",
    provider: "OpenCode / Hermes Daemon",
    toolCall: `sam_list_recurring_occurrences({ limit: 3 })`,
    toolResult: `Próximo: Alquiler (en 2 días) · Internet (en 5 días)`,
    icon: OpenClawIcon,
    accent: "#e6f0f2",
    glow: "rgba(230, 240, 242, 0.4)",
    baseRot: "2deg",
    floatClass: "animate-float-2",
  },
  {
    id: "antigravity",
    name: "Antigravity",
    provider: "Google DeepMind Coding Agent",
    toolCall: `sam_get_budget_status({ month: "current" })`,
    toolResult: `Alimentación: 71% gastado. Margen: S/ 340.00`,
    icon: AntigravityIcon,
    accent: "#3186ff",
    glow: "rgba(49, 134, 255, 0.45)",
    baseRot: "-1.5deg",
    floatClass: "animate-float-3",
  },
  {
    id: "openai",
    name: "ChatGPT",
    provider: "OpenAI GPT-5 & Codex",
    toolCall: `sam_list_goals({ status: "active" })`,
    toolResult: `Meta 'Fondo Emergencia': S/ 4,200 / S/ 6,000 (70%)`,
    icon: OpenAIIcon,
    accent: "#10b981",
    glow: "rgba(16, 185, 129, 0.45)",
    baseRot: "3.5deg",
    floatClass: "animate-float-1",
  },
  {
    id: "grok",
    name: "Grok",
    provider: "xAI Autonomous Agent",
    toolCall: `sam_get_net_worth({})`,
    toolResult: `Patrimonio auditable: $14,250 USD + S/ 8,400 PEN`,
    icon: GrokIcon,
    accent: "#e6f0f2",
    glow: "rgba(230, 240, 242, 0.35)",
    baseRot: "-4deg",
    floatClass: "animate-float-2",
  },
  {
    id: "cursor",
    name: "Cursor",
    provider: "Cursor Editor & Composer Agent",
    toolCall: `sam_add_expense({ amount: 14.50, category: "Café", currency: "PEN" })`,
    toolResult: `✓ TX-9482 guardada en cuenta Efectivo PEN`,
    icon: CursorIcon,
    accent: "#54d8e4",
    glow: "rgba(84, 216, 228, 0.45)",
    baseRot: "3deg",
    floatClass: "animate-float-3",
  },
];

export function LandingHero() {
  const [activeAgent, setActiveAgent] = useState<AgentInfo>(AGENTS[0]);

  return (
    <section className="relative overflow-hidden pt-10 pb-20 md:pt-16 md:pb-28">
      {/* Background radial gradient bloom */}
      <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
        <div className="h-[540px] w-[920px] max-w-full rounded-full bg-gradient-to-tr from-[#54d8e4]/10 via-[#a8e63b]/5 to-transparent blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Release Pill Badge */}
        <div className="flex justify-center">
          <a
            href="#mcp"
            className="group inline-flex items-center gap-2 rounded-full border border-[#24404b] bg-[#0b1822]/90 px-4 py-1.5 text-xs text-[#9cb0b8] transition-all hover:border-[#54d8e4]/60 hover:bg-[#10212d]"
          >
            <span className="flex h-2 w-2 rounded-full bg-[#a8e63b] animate-pulse" />
            <span className="font-mono text-[11px] text-[#e6f0f2]">MCP Server v1.0 disponible</span>
            <span className="text-[#24404b]">|</span>
            <span className="inline-flex items-center text-[#54d8e4] group-hover:underline">
              Conectar tus agentes <ChevronRight size={12} className="ml-0.5" />
            </span>
          </a>
        </div>

        {/* Floating Agent Squircles: Spatial composition matching the reference image */}
        {/* Top Arc (Desktop: 4 cards floating above headline; Mobile: responsive flex-wrap dock) */}
        <div className="mt-8 mb-4 flex items-center justify-center gap-3 sm:gap-6 lg:gap-10">
          {AGENTS.slice(0, 4).map((agent) => {
            const isSelected = activeAgent.id === agent.id;
            const Icon = agent.icon;
            return (
              <button
                key={agent.id}
                type="button"
                onClick={() => setActiveAgent(agent)}
                className={`agent-squircle ${agent.floatClass} ${isSelected ? "is-active" : ""}`}
                style={{
                  ["--agent-accent" as string]: agent.accent,
                  ["--agent-glow" as string]: agent.glow,
                  ["--base-rot" as string]: agent.baseRot,
                }}
                aria-label={`Seleccionar ${agent.name}`}
              >
                <Icon size={34} />
                <span className="agent-pill-label">{agent.name}</span>
              </button>
            );
          })}
        </div>

        {/* Central Bold Headline */}
        <div className="relative mx-auto max-w-4xl text-center pt-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-[#e6f0f2] sm:text-6xl sm:leading-[1.12] [text-wrap:balance]">
            El control plane financiero para ti y tus agentes de IA.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-[#9cb0b8] sm:text-lg sm:leading-relaxed [text-wrap:pretty]">
            Audita tus saldos, presupuestos envelope y flujo de caja con precisión terminal.
            Y delega consultas y registros contables directamente a{" "}
            <span className="text-[#e6f0f2] font-semibold">Claude</span>,{" "}
            <span className="text-[#e6f0f2] font-semibold">Cursor</span>,{" "}
            <span className="text-[#e6f0f2] font-semibold">ChatGPT</span> o{" "}
            <span className="text-[#e6f0f2] font-semibold">Samy</span> mediante el protocolo MCP.
          </p>
        </div>

        {/* CTAs and Flanking Badges Area */}
        <div className="relative mt-10 flex items-center justify-center">
          {/* Desktop Left Flank: Grok squircle */}
          <div className="hidden lg:block absolute left-8 top-1/2 -translate-y-1/2">
            <button
              type="button"
              onClick={() => setActiveAgent(AGENTS[4])}
              className={`agent-squircle ${AGENTS[4].floatClass} ${activeAgent.id === AGENTS[4].id ? "is-active" : ""}`}
              style={{
                ["--agent-accent" as string]: AGENTS[4].accent,
                ["--agent-glow" as string]: AGENTS[4].glow,
                ["--base-rot" as string]: AGENTS[4].baseRot,
              }}
              aria-label={`Seleccionar ${AGENTS[4].name}`}
            >
              <GrokIcon size={34} />
              <span className="agent-pill-label">{AGENTS[4].name}</span>
            </button>
          </div>

          {/* Desktop Right Flank: Hermes/OpenClaw squircle */}
          <div className="hidden lg:block absolute right-8 top-1/2 -translate-y-1/2">
            <button
              type="button"
              onClick={() => setActiveAgent(AGENTS[5])}
              className={`agent-squircle ${AGENTS[5].floatClass} ${activeAgent.id === AGENTS[5].id ? "is-active" : ""}`}
              style={{
                ["--agent-accent" as string]: AGENTS[5].accent,
                ["--agent-glow" as string]: AGENTS[5].glow,
                ["--base-rot" as string]: AGENTS[5].baseRot,
              }}
              aria-label={`Seleccionar ${AGENTS[5].name}`}
            >
              <OpenClawIcon size={34} />
              <span className="agent-pill-label">{AGENTS[5].name}</span>
            </button>
          </div>

          {/* Center Action Buttons */}
          <div className="flex flex-col items-center justify-center gap-3.5 sm:flex-row w-full sm:w-auto">
            <Link
              href="/onboarding?mode=signup"
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#a8e63b] px-7 text-sm font-bold text-[#07131c] shadow-[0_0_24px_rgba(168,230,59,0.3)] transition-all hover:bg-[#bcf255] hover:scale-[1.02] sm:w-auto"
            >
              <span>Comenzar gratis (7 días Pro Trial)</span>
              <ArrowRight size={16} />
            </Link>

            <a
              href="#demo-samy"
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#24404b] bg-[#0b1822] px-6 text-sm font-semibold text-[#e6f0f2] transition-colors hover:border-[#54d8e4] hover:bg-[#10212d] sm:w-auto"
            >
              <Sparkles size={16} className="text-[#54d8e4]" />
              <span>Probar Samy interactivo</span>
            </a>

            <Link
              href="/developers"
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-transparent px-4 text-xs font-medium text-[#9cb0b8] transition-colors hover:text-[#e6f0f2] sm:w-auto"
            >
              <Code2 size={15} />
              <span>Docs Developers & MCP</span>
            </Link>
          </div>
        </div>

        {/* Mobile-only flank badges row so they are always accessible on small screens */}
        <div className="mt-4 flex lg:hidden items-center justify-center gap-4">
          {[AGENTS[4], AGENTS[5]].map((agent) => {
            const isSelected = activeAgent.id === agent.id;
            const Icon = agent.icon;
            return (
              <button
                key={agent.id}
                type="button"
                onClick={() => setActiveAgent(agent)}
                className={`agent-squircle ${agent.floatClass} ${isSelected ? "is-active" : ""}`}
                style={{
                  ["--agent-accent" as string]: agent.accent,
                  ["--agent-glow" as string]: agent.glow,
                  ["--base-rot" as string]: agent.baseRot,
                }}
                aria-label={`Seleccionar ${agent.name}`}
              >
                <Icon size={28} />
                <span className="agent-pill-label">{agent.name}</span>
              </button>
            );
          })}
        </div>

        {/* Active Agent Interactive MCP Tool Call terminal preview */}
        <div className="mx-auto mt-10 max-w-2xl">
          <div className="rounded-xl border border-[#24404b] bg-[#0b1822]/95 shadow-xl backdrop-blur-md overflow-hidden">
            {/* Terminal bar */}
            <div className="flex items-center justify-between border-b border-[#24404b] bg-[#10212d] px-4 py-2 text-xs font-mono">
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex h-2 w-2 rounded-full bg-[#54d8e4]" />
                <span className="text-[#54d8e4] font-semibold truncate">
                  mcp://{activeAgent.id}.agent &gt; {activeAgent.toolCall}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 text-[11px] text-[#9cb0b8]">
                <span>JSON-RPC 2.0</span>
              </div>
            </div>

            {/* Terminal result */}
            <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#07131c] border border-[#24404b]">
                  <activeAgent.icon size={16} />
                </span>
                <span className="text-[#9cb0b8] text-[11px]">{activeAgent.provider}:</span>
              </div>
              <div className="flex items-center gap-2 text-[#a8e63b] text-xs">
                <CheckCircle2 size={14} className="text-[#a8e63b] shrink-0" />
                <span className="font-semibold">{activeAgent.toolResult}</span>
              </div>
            </div>

            {/* Quick agent selector pills */}
            <div className="border-t border-[#24404b]/60 bg-[#07131c]/60 px-3 py-2 flex flex-wrap items-center justify-center gap-1.5">
              <span className="text-[10px] font-mono text-[#707a8c] mr-1">Probar agente:</span>
              {AGENTS.map((agent) => (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => setActiveAgent(agent)}
                  className={`rounded px-2 py-0.5 font-mono text-[10px] transition-colors ${
                    activeAgent.id === agent.id
                      ? "bg-[#10212d] text-[#54d8e4] border border-[#24404b]"
                      : "text-[#707a8c] hover:text-[#c9d1d9]"
                  }`}
                >
                  {agent.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Platform support badges */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-5 text-xs text-[#707a8c]">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#54d8e4]" />
            <span>PWA instalable en iOS y Android</span>
          </div>
          <span className="text-[#24404b]">·</span>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#a8e63b]" />
            <span>Cockpit Living Ledger para escritorio</span>
          </div>
          <span className="text-[#24404b]">·</span>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#ffd580]" />
            <span>Servidor MCP remoto en <code className="text-[#9cb0b8]">/api/mcp</code></span>
          </div>
          <span className="text-[#24404b]">·</span>
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-[#54d8e4]" />
            <span>Sin custodia bancaria · Tus datos son tuyos</span>
          </div>
        </div>
      </div>
    </section>
  );
}
