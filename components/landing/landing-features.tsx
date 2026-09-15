"use client";

import { useState } from "react";
import {
  Wallet,
  PieChart,
  Target,
  Repeat,
  Eye,
  EyeOff,
  TrendingUp,
  Calendar,
  Check,
} from "lucide-react";

type FeatureTab = "ledger" | "budgets" | "goals" | "recurring";

export function LandingFeatures() {
  const [activeTab, setActiveTab] = useState<FeatureTab>("ledger");
  const [privateMode, setPrivateMode] = useState(false);

  const formatAmount = (val: string) => (privateMode ? "••••••" : val);

  return (
    <section id="features" className="relative py-20 border-t border-[#24404b]/70 bg-[#07131c]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#24404b] bg-[#0b1822] px-3.5 py-1 text-xs text-[#a8e63b]">
            <span>Living Ledger Architecture</span>
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-[#e6f0f2] sm:text-4xl [text-wrap:balance]">
            Tu dinero como un sistema auditable, no una suposición
          </h2>
          <p className="mt-3 text-sm text-[#9cb0b8] sm:text-base [text-wrap:pretty]">
            SAM rechaza los dashboards decorativos tradicionales. Cada centavo tiene trazabilidad,
            los presupuestos actúan como envelopes físicos y tus monedas nunca se mezclan con tipos de cambio falsos.
          </p>
        </div>

        {/* Feature Selector Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
          <button
            type="button"
            onClick={() => setActiveTab("ledger")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${
              activeTab === "ledger"
                ? "bg-[#54d8e4] text-[#07131c] shadow-[0_0_16px_rgba(84,216,228,0.25)]"
                : "border border-[#24404b] bg-[#0b1822] text-[#9cb0b8] hover:text-[#e6f0f2] hover:bg-[#10212d]"
            }`}
          >
            <Wallet size={15} />
            <span>1. Cockpit & Cuentas Multi-moneda</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("budgets")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${
              activeTab === "budgets"
                ? "bg-[#54d8e4] text-[#07131c] shadow-[0_0_16px_rgba(84,216,228,0.25)]"
                : "border border-[#24404b] bg-[#0b1822] text-[#9cb0b8] hover:text-[#e6f0f2] hover:bg-[#10212d]"
            }`}
          >
            <PieChart size={15} />
            <span>2. Envelopes & Presupuestos</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("goals")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${
              activeTab === "goals"
                ? "bg-[#54d8e4] text-[#07131c] shadow-[0_0_16px_rgba(84,216,228,0.25)]"
                : "border border-[#24404b] bg-[#0b1822] text-[#9cb0b8] hover:text-[#e6f0f2] hover:bg-[#10212d]"
            }`}
          >
            <Target size={15} />
            <span>3. Metas & Buckets de Ahorro</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("recurring")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${
              activeTab === "recurring"
                ? "bg-[#54d8e4] text-[#07131c] shadow-[0_0_16px_rgba(84,216,228,0.25)]"
                : "border border-[#24404b] bg-[#0b1822] text-[#9cb0b8] hover:text-[#e6f0f2] hover:bg-[#10212d]"
            }`}
          >
            <Repeat size={15} />
            <span>4. Reglas Recurrentes & Flujo</span>
          </button>
        </div>

        {/* Tab Content Display */}
        <div className="rounded-2xl border border-[#24404b] bg-[#0b1822] p-6 lg:p-10 shadow-2xl">
          {activeTab === "ledger" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-5 space-y-4">
                <div className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-[#54d8e4]">
                  <span>Aislamiento de divisa & Auditoría</span>
                </div>
                <h3 className="text-2xl font-bold text-[#e6f0f2]">
                  Cuentas reales sin conversiones artificiales
                </h3>
                <p className="text-sm text-[#9cb0b8] leading-relaxed">
                  En SAM, tus dólares (USD) y soles (PEN) viven en registros separados. Nunca sumamos
                  dos monedas con un tipo de cambio ficticio que distorsiona tu liquidez real.
                </p>
                <div className="space-y-2 pt-2 text-xs text-[#c9d1d9]">
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-[#a8e63b]" />
                    <span>Cuentas de Efectivo, Débito, Ahorro y Tarjetas con límite de crédito</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-[#a8e63b]" />
                    <span>Transferencias internas pareadas e inmutables</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-[#a8e63b]" />
                    <span>Modo privacidad para usar el ledger en espacios públicos o compartir pantalla</span>
                  </div>
                </div>
              </div>

              {/* Interactive Cockpit Preview */}
              <div className="lg:col-span-7 rounded-xl border border-[#24404b] bg-[#07131c] p-5">
                <div className="flex items-center justify-between border-b border-[#24404b] pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-[#9cb0b8]">cockpit://accounts.overview</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPrivateMode(!privateMode)}
                    className="flex items-center gap-1.5 rounded border border-[#24404b] bg-[#0b1822] px-2.5 py-1 text-[11px] text-[#54d8e4] hover:bg-[#10212d]"
                  >
                    {privateMode ? <EyeOff size={13} /> : <Eye size={13} />}
                    <span>{privateMode ? "Oculto" : "Privacidad"}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-lg border border-[#24404b] bg-[#0b1822] p-4">
                    <div className="flex justify-between text-xs text-[#707a8c]">
                      <span>Cuenta Corriente (USD)</span>
                      <span className="font-mono text-[10px] text-[#54d8e4]">USD</span>
                    </div>
                    <div className="mt-2 font-mono text-xl font-bold text-[#e6f0f2]">
                      $ {formatAmount("2,840.00")}
                    </div>
                    <div className="mt-1 text-[11px] text-[#a8e63b] font-mono">+ $ 450.00 este mes</div>
                  </div>

                  <div className="rounded-lg border border-[#24404b] bg-[#0b1822] p-4">
                    <div className="flex justify-between text-xs text-[#707a8c]">
                      <span>Efectivo Diario (PEN)</span>
                      <span className="font-mono text-[10px] text-[#ffd580]">PEN</span>
                    </div>
                    <div className="mt-2 font-mono text-xl font-bold text-[#e6f0f2]">
                      S/ {formatAmount("385.50")}
                    </div>
                    <div className="mt-1 text-[11px] text-[#9cb0b8] font-mono">Billetera física</div>
                  </div>

                  <div className="rounded-lg border border-[#24404b] bg-[#0b1822] p-4">
                    <div className="flex justify-between text-xs text-[#707a8c]">
                      <span>Ahorros BCP (PEN)</span>
                      <span className="font-mono text-[10px] text-[#ffd580]">PEN</span>
                    </div>
                    <div className="mt-2 font-mono text-xl font-bold text-[#e6f0f2]">
                      S/ {formatAmount("14,200.00")}
                    </div>
                    <div className="mt-1 text-[11px] text-[#a8e63b] font-mono">Fondo de contingencia</div>
                  </div>

                  <div className="rounded-lg border border-[#24404b] bg-[#0b1822] p-4">
                    <div className="flex justify-between text-xs text-[#707a8c]">
                      <span>Tarjeta de Crédito (USD)</span>
                      <span className="font-mono text-[10px] text-[#ff6b5e]">Límite $3k</span>
                    </div>
                    <div className="mt-2 font-mono text-xl font-bold text-[#ff6b5e]">
                      -$ {formatAmount("412.30")}
                    </div>
                    <div className="mt-1 text-[11px] text-[#ffd580] font-mono">Cierre en 8 días</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "budgets" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-5 space-y-4">
                <div className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-[#a8e63b]">
                  <span>Envelopes Mensuales</span>
                </div>
                <h3 className="text-2xl font-bold text-[#e6f0f2]">
                  Control de presión antes de que ocurra el sobregiro
                </h3>
                <p className="text-sm text-[#9cb0b8] leading-relaxed">
                  Cada categoría de gasto funciona como un sobre mensual con un límite definido (<code>monthly_cap</code>).
                  Detectas inmediatamente dónde queda margen y qué rubros requieren contención.
                </p>
                <div className="space-y-2 pt-2 text-xs text-[#c9d1d9]">
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-[#a8e63b]" />
                    <span>Semáforo de presión: verde (óptimo), amarillo (atención), coral (límite alcanzado)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-[#a8e63b]" />
                    <span>Cálculo de ritmo de gasto diario restante hasta fin de mes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-[#a8e63b]" />
                    <span>Operable por Samy y tus agentes de IA para consultar antes de comprar</span>
                  </div>
                </div>
              </div>

              {/* Envelope Pressure Bars */}
              <div className="lg:col-span-7 rounded-xl border border-[#24404b] bg-[#07131c] p-5 space-y-4">
                <div className="flex justify-between items-center text-xs font-mono text-[#9cb0b8] border-b border-[#24404b] pb-2">
                  <span>CATEGORÍA</span>
                  <span>CONSUMIDO / TOPE</span>
                </div>

                {/* Category 1 */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-[#e6f0f2]">Alimentación & Supermercado</span>
                    <span className="font-mono text-[#9cb0b8]">S/ 860 / S/ 1,200 (71%)</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#10212d] overflow-hidden">
                    <div className="h-full bg-[#54d8e4] rounded-full" style={{ width: "71%" }} />
                  </div>
                  <div className="text-[11px] text-[#54d8e4] font-mono">Margen: S/ 340.00 disponibles</div>
                </div>

                {/* Category 2 */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-[#e6f0f2]">Restaurantes & Salidas</span>
                    <span className="font-mono text-[#ffd580]">S/ 420 / S/ 500 (84%)</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#10212d] overflow-hidden">
                    <div className="h-full bg-[#ffd580] rounded-full" style={{ width: "84%" }} />
                  </div>
                  <div className="text-[11px] text-[#ffd580] font-mono">Presión alta: S/ 80.00 restantes</div>
                </div>

                {/* Category 3 */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-[#e6f0f2]">Transporte & Combustible</span>
                    <span className="font-mono text-[#a8e63b]">S/ 115 / S/ 300 (38%)</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#10212d] overflow-hidden">
                    <div className="h-full bg-[#a8e63b] rounded-full" style={{ width: "38%" }} />
                  </div>
                  <div className="text-[11px] text-[#a8e63b] font-mono">Margen holgado: S/ 185.00 disponibles</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "goals" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-5 space-y-4">
                <div className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-[#ffd580]">
                  <span>Reservas & Metas</span>
                </div>
                <h3 className="text-2xl font-bold text-[#e6f0f2]">
                  Ahorra sobre capital real, sin proyecciones de riesgo
                </h3>
                <p className="text-sm text-[#9cb0b8] leading-relaxed">
                  SAM retiró intencionalmente el módulo de inversiones para enfocarse en certidumbre financiera:
                  asigna y protege dinero de tus saldos reales para metas concretas y fondos de emergencia.
                </p>
                <div className="space-y-2 pt-2 text-xs text-[#c9d1d9]">
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-[#a8e63b]" />
                    <span>Runways de avance con fecha estimada de cumplimiento</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-[#a8e63b]" />
                    <span>Buckets intocables que protegen tu reserva contra compras impulsivas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-[#a8e63b]" />
                    <span>Sincronizado con MCP para consultar desde Cursor o Claude</span>
                  </div>
                </div>
              </div>

              {/* Goal Runways Preview */}
              <div className="lg:col-span-7 rounded-xl border border-[#24404b] bg-[#07131c] p-5 space-y-4">
                <div className="rounded-lg border border-[#24404b] bg-[#0b1822] p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-sm font-bold text-[#e6f0f2]">Fondo de Emergencia (3 meses)</div>
                      <div className="text-[11px] text-[#9cb0b8]">Respaldo para imprevistos en cuenta BCP</div>
                    </div>
                    <span className="rounded bg-[#a8e63b]/10 px-2 py-0.5 font-mono text-xs text-[#a8e63b]">
                      70.0%
                    </span>
                  </div>
                  <div className="mt-3 font-mono text-lg font-bold text-[#e6f0f2]">
                    S/ 4,200.00 <span className="text-xs font-normal text-[#707a8c]">/ S/ 6,000.00</span>
                  </div>
                  <div className="mt-2 h-2 w-full rounded-full bg-[#10212d] overflow-hidden">
                    <div className="h-full bg-[#a8e63b] rounded-full" style={{ width: "70%" }} />
                  </div>
                  <div className="mt-2 flex justify-between text-[11px] font-mono text-[#707a8c]">
                    <span>Ritmo: S/ 450/mes</span>
                    <span className="text-[#54d8e4]">ETA: Noviembre 2026</span>
                  </div>
                </div>

                <div className="rounded-lg border border-[#24404b] bg-[#0b1822] p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-sm font-bold text-[#e6f0f2]">Viaje Aniversario (USD)</div>
                      <div className="text-[11px] text-[#9cb0b8]">Pasajes y hospedaje</div>
                    </div>
                    <span className="rounded bg-[#54d8e4]/10 px-2 py-0.5 font-mono text-xs text-[#54d8e4]">
                      75.0%
                    </span>
                  </div>
                  <div className="mt-3 font-mono text-lg font-bold text-[#e6f0f2]">
                    $ 900.00 <span className="text-xs font-normal text-[#707a8c]">/ $ 1,200.00</span>
                  </div>
                  <div className="mt-2 h-2 w-full rounded-full bg-[#10212d] overflow-hidden">
                    <div className="h-full bg-[#54d8e4] rounded-full" style={{ width: "75%" }} />
                  </div>
                  <div className="mt-2 flex justify-between text-[11px] font-mono text-[#707a8c]">
                    <span>Ritmo: $ 150/mes</span>
                    <span className="text-[#54d8e4]">ETA: Diciembre 2026</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "recurring" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-5 space-y-4">
                <div className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-[#54d8e4]">
                  <span>Automatización & Previsión</span>
                </div>
                <h3 className="text-2xl font-bold text-[#e6f0f2]">
                  Mira lo que viene antes de que impacte tu cuenta
                </h3>
                <p className="text-sm text-[#9cb0b8] leading-relaxed">
                  Configura reglas recurrentes para alquileres, suscripciones e ingresos con soporte para
                  tu zona horaria IANA. SAM te anticipa el saldo proyectado al cierre de mes.
                </p>
                <div className="space-y-2 pt-2 text-xs text-[#c9d1d9]">
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-[#a8e63b]" />
                    <span>Historial detallado de ocurrencias (posted, pending, skipped)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-[#a8e63b]" />
                    <span>Idempotencia para evitar registros duplicados</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-[#a8e63b]" />
                    <span>Soporte para reintentos manuales de ocurrencias</span>
                  </div>
                </div>
              </div>

              {/* Recurring Rules Preview */}
              <div className="lg:col-span-7 rounded-xl border border-[#24404b] bg-[#07131c] p-5 space-y-3">
                <div className="flex justify-between items-center text-xs font-mono text-[#9cb0b8] border-b border-[#24404b] pb-2">
                  <span>OBLIGACIÓN / REGLA</span>
                  <span>CALENDARIO / MONTO</span>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-[#24404b] bg-[#0b1822] p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-[#10212d] text-[#ff6b5e]">
                      <Calendar size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#e6f0f2]">Alquiler Departamento</div>
                      <div className="text-[10px] text-[#707a8c] font-mono">Día 01 de cada mes · America/Lima</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-xs font-bold text-[#e6f0f2]">-S/ 1,600.00</div>
                    <div className="text-[10px] text-[#ffd580] font-mono">Programado en 16 días</div>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-[#24404b] bg-[#0b1822] p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-[#10212d] text-[#ff6b5e]">
                      <Calendar size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#e6f0f2]">Suscripción GitHub + Cursor</div>
                      <div className="text-[10px] text-[#707a8c] font-mono">Día 20 de cada mes</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-xs font-bold text-[#e6f0f2]">-$ 30.00</div>
                    <div className="text-[10px] text-[#ffd580] font-mono">Programado en 5 días</div>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-[#24404b] bg-[#0b1822] p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-[#10212d] text-[#a8e63b]">
                      <TrendingUp size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#e6f0f2]">Ingreso Nómina / Sueldo</div>
                      <div className="text-[10px] text-[#707a8c] font-mono">Día 30 de cada mes</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-xs font-bold text-[#a8e63b]">+$ 2,500.00</div>
                    <div className="text-[10px] text-[#a8e63b] font-mono">Próxima acreditación</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
