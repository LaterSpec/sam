"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

type FaqItem = {
  q: string;
  a: string;
};

const FAQS: FaqItem[] = [
  {
    q: "¿SAM tiene acceso o custodia sobre mi dinero real en los bancos?",
    a: "No. SAM es un ledger personal y un host de herramientas para agentes de IA. No es un banco ni un intermediario financiero. No custodia tu dinero, no realiza transferencias bancarias externas ni almacena credenciales de acceso a tus cuentas bancarias. Es tu propio libro contable privado.",
  },
  {
    q: "¿Qué es el protocolo MCP y cómo se conecta a Cursor o Claude?",
    a: "El Model Context Protocol (MCP) es el estándar de la industria que permite a modelos de IA conectarse de forma segura a datos y herramientas. SAM expone un servidor MCP remoto sobre Streamable HTTP en `/api/mcp`. Desde tu perfil en SAM generas un token con permisos específicos (por ejemplo, 'solo lectura') y lo configuras en Cursor, Claude Desktop o scripts en cuestión de segundos.",
  },
  {
    q: "¿Puedo instalar SAM en mi teléfono y usarlo sin conexión?",
    a: "Sí. SAM está diseñado como una Progressive Web App (PWA) de viewport nativo, instalable directamente en iOS (Añadir a pantalla de inicio en Safari) y Android (Instalar app en Chrome). Cuenta con Service Worker y soporte offline para consultar tus datos recientes sin conexión.",
  },
  {
    q: "¿Cómo funciona la prueba gratuita de 7 días?",
    a: "Todos los usuarios que crean una cuenta en el Plan Free reciben de inmediato 7 días de acceso Pro con 50 consultas a Samy AI (hasta 10 al día). No requieres ingresar tarjeta de crédito para registrarte.",
  },
  {
    q: "¿Por qué SAM no suma USD y PEN con un tipo de cambio ficticio?",
    a: "Los dashboards financieros tradicionales calculan un 'patrimonio total' ficticio convirtiendo divisas con tipos de cambio de mercado que no reflejan tu poder de gasto real. SAM mantiene un aislamiento estricto: tus cuentas en dólares y soles se auditan por separado.",
  },
  {
    q: "¿Quién tiene acceso a las transacciones que registro?",
    a: "Únicamente tú. Todos los datos se aíslan por usuario a nivel de base de datos. Ningún tercero ni agente de IA puede interactuar con tu libro a menos que uses un token MCP emitido explícitamente por ti.",
  },
];

export function LandingFaq() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIdx(openIdx === idx ? null : idx);
  };

  return (
    <section className="relative py-20 border-t border-[#24404b]/70 bg-[#0b1822]">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-1.5 font-mono text-xs text-[#54d8e4]">
            <HelpCircle size={14} />
            <span>PREGUNTAS FRECUENTES</span>
          </div>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#e6f0f2]">
            Claridad sobre el producto y tus datos
          </h2>
        </div>

        {/* Accordion list */}
        <div className="space-y-3">
          {FAQS.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={idx}
                className="rounded-xl border border-[#24404b] bg-[#07131c] transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  className="flex w-full items-center justify-between p-4 sm:p-5 text-left text-sm font-semibold text-[#e6f0f2] hover:text-[#54d8e4]"
                  aria-expanded={isOpen}
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    size={16}
                    className={`shrink-0 text-[#9cb0b8] transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-[#54d8e4]" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="border-t border-[#24404b]/60 px-4 pb-5 pt-3 sm:px-5 text-xs text-[#9cb0b8] leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
