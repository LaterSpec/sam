"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Terminal,
  Copy,
  Check,
  ShieldCheck,
  Cpu,
  Key,
  ExternalLink,
} from "lucide-react";
import {
  ClaudeIcon,
  CursorIcon,
  OpenClawIcon,
} from "./icons/agent-icons";

type ClientSnippet = {
  id: string;
  name: string;
  filename: string;
  icon: (props: { size?: number; className?: string }) => React.ReactNode;
  code: string;
};

const CLIENTS: ClientSnippet[] = [
  {
    id: "cursor",
    name: "Cursor",
    filename: ".cursor/mcp.json",
    icon: CursorIcon,
    code: `{
  "mcpServers": {
    "sam": {
      "url": "https://sam-app.its-manuel-caceres.workers.dev/api/mcp",
      "headers": {
        "Authorization": "Bearer sam_mcp_tu_token_personal"
      }
    }
  }
}`,
  },
  {
    id: "claude-desktop",
    name: "Claude Desktop",
    filename: "claude_desktop_config.json",
    icon: ClaudeIcon,
    code: `{
  "mcpServers": {
    "sam-ledger": {
      "url": "https://sam-app.its-manuel-caceres.workers.dev/api/mcp",
      "headers": {
        "Authorization": "Bearer sam_mcp_tu_token_personal"
      }
    }
  }
}`,
  },
  {
    id: "claude-code",
    name: "Claude Code CLI",
    filename: "Terminal / Bash",
    icon: ClaudeIcon,
    code: `# Agrega SAM a Claude Code en tu terminal:
claude mcp add sam https://sam-app.its-manuel-caceres.workers.dev/api/mcp \\
  --header "Authorization: Bearer sam_mcp_tu_token_personal"`,
  },
  {
    id: "openclaw",
    name: "Hermes / OpenClaw",
    filename: "agent.json / CLI",
    icon: OpenClawIcon,
    code: `{
  "tools": [
    {
      "type": "mcp_streamable_http",
      "endpoint": "https://sam-app.its-manuel-caceres.workers.dev/api/mcp",
      "token": "sam_mcp_tu_token_personal"
    }
  ]
}`,
  },
  {
    id: "curl",
    name: "cURL / JSON-RPC",
    filename: "Terminal / HTTP",
    icon: (props) => <Terminal size={props.size ?? 14} className={props.className} />,
    code: `# Consulta las 36 herramientas financieras de SAM directamente:
curl -X POST https://sam-app.its-manuel-caceres.workers.dev/api/mcp \\
  -H "Authorization: Bearer sam_mcp_tu_token_personal" \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`,
  },
];

const SCOPES_TABLE = [
  { scope: "sam:read", desc: "Consultar saldos, cuentas, transacciones y presupuestos", plan: "Free / Pro / Agent" },
  { scope: "sam:expenses.write", desc: "Registrar nuevos gastos y categorizaciones", plan: "Pro / Agent" },
  { scope: "sam:recurring.write", desc: "Crear y actualizar reglas de pagos fijos", plan: "Pro / Agent" },
  { scope: "sam:goals.write", desc: "Ajustar metas de ahorro y buckets de reserva", plan: "Pro / Agent" },
  { scope: "sam:accounts.transfer", desc: "Transferir fondos entre cuentas internas (con confirm: true)", plan: "Agent Plan" },
];

export function LandingMcp() {
  const [activeClient, setActiveClient] = useState<ClientSnippet>(CLIENTS[0]);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeClient.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section id="mcp" className="relative py-20 border-t border-[#24404b]/70 bg-[#0b1822]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#24404b] bg-[#07131c] px-3.5 py-1 text-xs text-[#54d8e4]">
            <Terminal size={13} />
            <span>Model Context Protocol (MCP) Host</span>
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-[#e6f0f2] sm:text-4xl [text-wrap:balance]">
            Tus agentes favoritos operan tu ledger en segundos
          </h2>
          <p className="mt-3 text-sm text-[#9cb0b8] sm:text-base [text-wrap:pretty]">
            No necesitas usar chatbots genéricos ni pegar tus estados de cuenta. SAM actúa como servidor MCP
            remoto sobre Streamable HTTP: tus agentes en Cursor, Claude o scripts locales consultan y registran
            movimientos financieros de forma nativa.
          </p>
        </div>

        {/* 2-Column Showcase */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Code Config Snippet */}
          <div className="lg:col-span-7 rounded-2xl border border-[#24404b] bg-[#07131c] shadow-2xl overflow-hidden">
            {/* Snippet Client Tabs */}
            <div className="flex items-center justify-between border-b border-[#24404b] bg-[#10212d] px-3 pt-2">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2">
                {CLIENTS.map((client) => {
                  const Icon = client.icon;
                  const isSelected = activeClient.id === client.id;
                  return (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => setActiveClient(client)}
                      className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        isSelected
                          ? "bg-[#07131c] text-[#54d8e4] border border-[#24404b] border-b-transparent"
                          : "text-[#9cb0b8] hover:text-[#e6f0f2]"
                      }`}
                    >
                      <Icon size={14} />
                      <span>{client.name}</span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 rounded border border-[#24404b] bg-[#07131c] px-2.5 py-1 text-xs text-[#c9d1d9] transition-colors hover:border-[#54d8e4] hover:text-[#54d8e4]"
                aria-label="Copiar configuración"
              >
                {copied ? <Check size={12} className="text-[#a8e63b]" /> : <Copy size={12} />}
                <span className="font-mono text-[11px]">{copied ? "¡Copiado!" : "Copiar"}</span>
              </button>
            </div>

            {/* Snippet file label */}
            <div className="flex items-center justify-between border-b border-[#24404b] bg-[#0b1822] px-4 py-2 font-mono text-[11px] text-[#707a8c]">
              <span>{activeClient.filename}</span>
              <span className="text-[#54d8e4]">HTTP JSON-RPC 2.0</span>
            </div>

            {/* Code Block */}
            <pre className="overflow-x-auto p-4 sm:p-5 font-mono text-xs sm:text-[13px] text-[#e6f0f2] leading-relaxed">
              <code>{activeClient.code}</code>
            </pre>

            {/* Quick explanation footer */}
            <div className="border-t border-[#24404b] bg-[#0b1822] p-3 sm:px-5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-[#9cb0b8]">
                <Key size={14} className="text-[#ffd580]" />
                <span>Genera tu token personal desde Ajustes en la app</span>
              </div>
              <Link
                href="/developers"
                className="text-[#54d8e4] hover:underline flex items-center gap-1"
              >
                <span>Docs completas</span>
                <ExternalLink size={12} />
              </Link>
            </div>
          </div>

          {/* Right: Security, Scopes & Architecture Info */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-xl border border-[#24404b] bg-[#07131c] p-5">
              <div className="flex items-center gap-2 font-mono text-xs text-[#a8e63b]">
                <ShieldCheck size={16} />
                <span>SEGURIDAD & ZERO-TRUST</span>
              </div>
              <h4 className="mt-2 text-base font-bold text-[#e6f0f2]">
                Control granular de permisos por token
              </h4>
              <p className="mt-1 text-xs text-[#9cb0b8] leading-relaxed">
                Tus agentes solo ven y ejecutan aquello que tú autorices. Puedes crear un token que solo lea
                saldos sin poder alterar tu historial de gastos.
              </p>

              <div className="mt-4 divide-y divide-[#24404b]/60 border-t border-[#24404b]/60">
                {SCOPES_TABLE.map((s) => (
                  <div key={s.scope} className="py-2.5 flex items-start justify-between gap-2 text-xs">
                    <div>
                      <code className="font-mono text-[11px] text-[#54d8e4]">{s.scope}</code>
                      <p className="text-[11px] text-[#9cb0b8]">{s.desc}</p>
                    </div>
                    <span className="shrink-0 font-mono text-[10px] text-[#707a8c]">{s.plan}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Architecture note */}
            <div className="rounded-xl border border-[#24404b] bg-[#07131c] p-4 text-xs text-[#9cb0b8] space-y-2">
              <div className="flex items-center gap-2 text-[#e6f0f2] font-semibold">
                <Cpu size={14} className="text-[#54d8e4]" />
                <span>36 Tools financieras nativas</span>
              </div>
              <p className="text-[11.5px] leading-relaxed">
                Diseñadas para que modelos de lenguaje razonen sobre flujo de caja, sobregiros, compromisos fijos
                y metas sin sobrecargar tokens de contexto.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
