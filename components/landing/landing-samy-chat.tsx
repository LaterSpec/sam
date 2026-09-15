"use client";

import { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  ArrowUp,
  RotateCcw,
  Terminal,
  Wallet,
  PieChart,
  Target,
  Coffee,
} from "lucide-react";
import { SamBrandIcon } from "@/components/ui/sam-brand-icon";
import { SamyMarkdown } from "@/components/experiences/desktop/samy/samy-markdown";

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  toolUsed?: {
    name: string;
    args: Record<string, unknown>;
    resultSummary: string;
  };
};

const SUGGESTED_PROMPTS = [
  {
    icon: PieChart,
    label: "¿Cómo va mi flujo de caja este mes?",
    category: "Cashflow",
    tool: "sam_get_cashflow",
    toolArgs: { month: "2026-09" },
    toolSummary: "Consultó ingresos, gastos y margen de Septiembre",
    response: `### Resumen de Flujo de Caja · Septiembre 2026

| Concepto | Monto | Estado |
|---|---|---|
| **Ingresos confirmados** | +$ 3,200.00 | Sueldo + Freelance |
| **Gastos del periodo** | -$ 1,840.50 | 57.5% de ingresos |
| **Flujo Neto Disponible** | **+$ 1,359.50** | Superávit activo |

\`\`\`sam-chart
{
  "type": "bar",
  "title": "Flujo Mensual Septiembre (USD)",
  "unit": "$",
  "items": [
    { "label": "Ingresos", "value": 3200 },
    { "label": "Gastos", "value": 1840 },
    { "label": "Superávit", "value": 1360 }
  ]
}
\`\`\`

*Diagnóstico:* Tu ritmo diario de gasto es de **$ 61.35/día**, manteniéndote **$ 320.00** por debajo del techo proyectado para fin de mes.`,
  },
  {
    icon: Coffee,
    label: "Registra café de S/ 14.50 en Efectivo",
    category: "Nuevo gasto",
    tool: "sam_add_expense",
    toolArgs: { amount: 14.5, currency: "PEN", category: "Cafeterías", account: "Cash" },
    toolSummary: "Transacción confirmada en el ledger local",
    response: `✓ **Gasto registrado en el Ledger**

\`\`\`receipt
ID:          tx_9482_cf
Fecha:       15 Sep 2026 · 13:20
Monto:       S/ 14.50 PEN
Categoría:   Cafeterías & Snacks
Cuenta:      Efectivo (Saldo restante: S/ 185.50)
Envelope:    S/ 82.50 / S/ 150.00 gastado (55%)
\`\`\`

El registro está guardado y accesible tanto en tu app de escritorio como para tus agentes de IA por MCP.`,
  },
  {
    icon: Wallet,
    label: "¿Tengo margen para cenar fuera hoy?",
    category: "Presupuesto",
    tool: "sam_get_budget_status",
    toolArgs: { category: "Restaurantes", month: "2026-09" },
    toolSummary: "Cálculo de envelope de categoría",
    response: `### Envelope: Restaurantes & Salidas

- **Tope mensual:** S/ 500.00 PEN
- **Gastado a la fecha:** S/ 380.00 PEN (76%)
- **Margen disponible:** **S/ 120.00 PEN**
- **Días restantes de mes:** 15 días

\`\`\`sam-chart
{
  "type": "donut",
  "title": "Presión de Envelope Restaurantes",
  "unit": "%",
  "items": [
    { "label": "Consumido", "value": 76 },
    { "label": "Disponible", "value": 24 }
  ]
}
\`\`\`

**Diagnóstico:** Tienes margen para una cena hoy. Si gastas **S/ 80**, te quedarán **S/ 40** para la segunda quincena.`,
  },
  {
    icon: Target,
    label: "¿Cuánto falta para mi meta de Emergencia?",
    category: "Metas",
    tool: "sam_list_goals",
    toolArgs: { status: "active", goalId: "emergency_fund" },
    toolSummary: "Auditoría de asignación en buckets de reserva",
    response: `### Meta: Fondo de Emergencia (3 meses)

- **Objetivo total:** S/ 6,000.00 PEN
- **Saldo asignado:** S/ 4,200.00 PEN (**70.0%**)
- **Faltante:** **S/ 1,800.00 PEN**
- **Aporte mensual promedio:** S/ 450.00 PEN
- **Fecha estimada:** Noviembre 2026 (~2.5 meses)

\`\`\`sam-chart
{
  "type": "bar",
  "title": "Avance Meta Reserva (PEN)",
  "unit": "S/",
  "items": [
    { "label": "Asignado", "value": 4200 },
    { "label": "Meta", "value": 6000 }
  ]
}
\`\`\`

*Nota:* Este dinero está respaldado en tu cuenta de Ahorros y aislado de tu saldo corriente para gastos.`,
  },
];

const INITIAL_MESSAGES: Message[] = [
  {
    id: "m-welcome",
    role: "assistant",
    text: `Hola, soy **Samy**, tu asistente financiero integrado en SAM. Puedo consultar tu libro contable, registrar movimientos, revisar presupuestos o proyectar tu flujo de caja en tiempo real usando herramientas de dominio.

Prueba uno de los comandos sugeridos abajo o escribe tu propia consulta:`,
  },
];

export function LandingSamyChat() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [draft, setDraft] = useState("");
  const [executingTool, setExecutingTool] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, executingTool]);

  const handlePromptClick = (prompt: typeof SUGGESTED_PROMPTS[0]) => {
    if (busy) return;
    setBusy(true);

    const userMsgId = `u-${Date.now()}`;
    const userMsg: Message = {
      id: userMsgId,
      role: "user",
      text: prompt.label,
    };

    setMessages((prev) => [...prev, userMsg]);
    setExecutingTool(`${prompt.tool}(${JSON.stringify(prompt.toolArgs)})`);

    setTimeout(() => {
      setExecutingTool(null);
      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        role: "assistant",
        text: prompt.response,
        toolUsed: {
          name: prompt.tool,
          args: prompt.toolArgs,
          resultSummary: prompt.toolSummary,
        },
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setBusy(false);
    }, 700);
  };

  const handleCustomSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = draft.trim();
    if (!query || busy) return;

    setDraft("");
    setBusy(true);

    const userMsgId = `u-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: "user", text: query },
    ]);

    // Intelligent mock response matching the query intent
    const lower = query.toLowerCase();
    let toolName = "sam_get_spending_summary";
    let toolArgs: Record<string, unknown> = { period: "month" };
    let summary = "Analizando transacciones en el ledger";
    let responseText = "";

    if (lower.includes("café") || lower.includes("gasto") || lower.includes("compré") || lower.includes("almuerzo") || /\d+/.test(lower)) {
      toolName = "sam_add_expense";
      toolArgs = { query, autoClassify: true };
      summary = "Gasto verificado e indexado en categoría";
      responseText = `✓ **Transacción confirmada en tu ledger:**

- **Detalle:** ${query}
- **Estado:** Confirmado
- **Cuenta origen:** Efectivo / Billetera Principal
- **Envelope:** Presupuesto mensual recalculado al instante.

Tanto tú en la app web/PWA como tus agentes de Claude o Cursor pueden ver esta transacción al instante vía MCP.`;
    } else if (lower.includes("presupuesto") || lower.includes("margen") || lower.includes("cenar") || lower.includes("alcanza")) {
      toolName = "sam_get_budget_status";
      toolArgs = { month: "current" };
      summary = "Verificando límites mensuales por categoría";
      responseText = `### Estado de Presupuesto del Mes
- Has consumido **62%** de tu presupuesto global.
- Categorías con mayor presión: **Restaurantes** (76%) y **Transporte** (65%).
- Categorías con amplio margen: **Alimentación** (42%) y **Servicios** (50%).

Tu margen seguro para gastos flexibles hasta fin de mes es de **$ 280.00**.`;
    } else if (lower.includes("mcp") || lower.includes("agente") || lower.includes("cursor") || lower.includes("claude")) {
      toolName = "sam_get_profile";
      toolArgs = { scope: "mcp_capabilities" };
      summary = "Servidor MCP activo en /api/mcp";
      responseText = `SAM opera como un host MCP remoto con **36 tools especializadas** en finanzas personales.

Puedes generar tokens en Ajustes con permisos granulares (por ejemplo, permitir solo lectura de saldos o autorizar registro de gastos) y utilizarlos desde **Cursor**, **Claude Code** u **OpenClaw** sin exponer tus claves de banco.`;
    } else {
      toolName = "sam_get_cashflow";
      toolArgs = { mode: "overview" };
      summary = "Lectura general del Living Ledger";
      responseText = `He consultado el estado general de tu libro:
- **Cuentas activas:** Efectivo PEN, Ahorros PEN, Débito USD (saldos separados sin conversiones artificiales).
- **Flujo neto del mes:** +$ 1,359.50 USD y +S/ 640.00 PEN.
- **Próximas obligaciones:** Alquiler dentro de 5 días.

¿Deseas registrar un movimiento o auditar una categoría específica?`;
    }

    setExecutingTool(`${toolName}(${JSON.stringify(toolArgs)})`);

    setTimeout(() => {
      setExecutingTool(null);
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          text: responseText,
          toolUsed: {
            name: toolName,
            args: toolArgs,
            resultSummary: summary,
          },
        },
      ]);
      setBusy(false);
    }, 750);
  };

  const handleReset = () => {
    setMessages(INITIAL_MESSAGES);
    setExecutingTool(null);
    setDraft("");
    setBusy(false);
  };

  return (
    <section id="demo-samy" className="relative py-16 sm:py-24 border-t border-[#24404b]/70 bg-[#07131c]">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#24404b] bg-[#0b1822] px-3.5 py-1 text-xs text-[#54d8e4]">
            <Sparkles size={13} />
            <span>Interactive Demo</span>
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-[#e6f0f2] sm:text-4xl [text-wrap:balance]">
            Experimenta el flujo de Samy en tiempo real
          </h2>
          <p className="mt-3 text-sm text-[#9cb0b8] sm:text-base [text-wrap:pretty]">
            Samy no adivina ni inventa números: invoca herramientas de dominio directamente sobre tu libro
            financiero con auditoría estricta. Pruébalo ahora mismo:
          </p>
        </div>

        {/* Mock Minichat Card */}
        <div className="rounded-2xl border border-[#24404b] bg-[#0b1822] shadow-2xl overflow-hidden">
          {/* Chat Window Top Bar */}
          <div className="flex items-center justify-between border-b border-[#24404b] bg-[#10212d]/90 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-[#24404b] bg-[#07131c]">
                <SamBrandIcon size={18} color="#a8e63b" />
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#10212d] bg-[#a8e63b]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <strong className="text-xs font-semibold text-[#e6f0f2]">Samy AI</strong>
                  <span className="rounded bg-[#24404b] px-1.5 py-0.5 font-mono text-[10px] text-[#54d8e4]">
                    gpt-5.6-luna
                  </span>
                </div>
                <p className="text-[11px] text-[#9cb0b8]">Asistente Living Ledger con ejecución de MCP tools</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 rounded-md border border-[#24404b] px-2.5 py-1 text-xs text-[#9cb0b8] transition-colors hover:bg-[#07131c] hover:text-[#e6f0f2]"
              title="Reiniciar conversación"
            >
              <RotateCcw size={12} />
              <span className="hidden sm:inline">Reiniciar</span>
            </button>
          </div>

          {/* Quick Action Suggestion Chips */}
          <div className="border-b border-[#24404b] bg-[#07131c]/60 p-3 sm:px-6">
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#707a8c] mb-2">
              Consultas frecuentes (clic para ejecutar):
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SUGGESTED_PROMPTS.map((prompt, idx) => {
                const Icon = prompt.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handlePromptClick(prompt)}
                    disabled={busy}
                    className="flex items-center gap-2.5 rounded-lg border border-[#24404b] bg-[#0b1822] p-2.5 text-left text-xs transition-all hover:border-[#54d8e4]/60 hover:bg-[#10212d] disabled:opacity-50"
                  >
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-[#10212d] text-[#54d8e4]">
                      <Icon size={14} />
                    </div>
                    <span className="text-[#c9d1d9] truncate font-medium">{prompt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Message Thread */}
          <div
            ref={scrollRef}
            className="h-[380px] overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#07131c]/40 font-sans"
          >
            {messages.map((m) => (
              <div key={m.id} className="space-y-2">
                <div
                  className={`mock-chat-bubble ${
                    m.role === "user" ? "is-user" : "is-assistant"
                  }`}
                >
                  {/* Tool used note if present */}
                  {m.role === "assistant" && m.toolUsed && (
                    <div className="mb-2.5 flex items-center gap-2 border-b border-[#24404b] pb-2 font-mono text-[11px] text-[#54d8e4]">
                      <Terminal size={12} className="shrink-0" />
                      <span className="font-semibold">{m.toolUsed.name}</span>
                      <span className="text-[#707a8c]">·</span>
                      <span className="text-[#9cb0b8]">{m.toolUsed.resultSummary}</span>
                    </div>
                  )}

                  {/* Render content via SamyMarkdown */}
                  {m.role === "assistant" ? (
                    <SamyMarkdown text={m.text} />
                  ) : (
                    <div className="whitespace-pre-line text-xs sm:text-[13.5px]">
                      {m.text}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Live tool execution status indicator */}
            {executingTool && (
              <div className="mock-chat-bubble is-assistant">
                <div className="tool-execution-bar">
                  <span className="inline-block h-2 w-2 rounded-full bg-[#54d8e4] animate-ping" />
                  <span className="font-mono">Ejecutando herramienta: {executingTool}...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input Form */}
          <form
            onSubmit={handleCustomSubmit}
            className="flex items-center gap-2 border-t border-[#24404b] bg-[#0b1822] p-3 sm:px-6"
          >
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Escribe una pregunta financiera o 'registra almuerzo 25 soles'..."
              disabled={busy}
              className="flex-1 rounded-lg border border-[#24404b] bg-[#07131c] px-3.5 py-2.5 text-xs text-[#e6f0f2] placeholder-[#707a8c] focus:border-[#54d8e4] focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={busy || !draft.trim()}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#a8e63b] text-[#07131c] transition-all hover:bg-[#bcf255] disabled:opacity-40"
              aria-label="Enviar mensaje a Samy"
            >
              <ArrowUp size={16} />
            </button>
          </form>
        </div>

        {/* Footnote reassurance */}
        <div className="mt-4 text-center text-xs text-[#707a8c]">
          <span>💡 En el app autenticado, Samy opera sobre tus cuentas reales con aislamiento multi-moneda USD/PEN.</span>
        </div>
      </div>
    </section>
  );
}
