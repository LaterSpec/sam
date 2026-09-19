"use client";

import { useEffect, useId, useRef, useState } from "react";
import { getPlanSnapshotAction } from "@/lib/actions/plan-actions";
import type { PlanSnapshot } from "@/lib/plans/resolve";

export function PlanBadge({ plan, locale }: { plan: PlanSnapshot; locale: string }) {
  const [current, setCurrent] = useState(plan);
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const id = useId();
  const es = locale.startsWith("es");
  useEffect(() => setCurrent(plan), [plan]);
  useEffect(() => {
    let active = true;
    const refresh = () => { void getPlanSnapshotAction().then(value => {
      if (active) { setCurrent(value); setFailed(false); }
    }).catch(() => { if (active) setFailed(true); }); };
    const remaining = current.endsAt ? Date.parse(current.endsAt) - Date.now() : null;
    const timer = remaining !== null && remaining > 0 && remaining < 2_147_483_000
      ? window.setTimeout(refresh, remaining + 250) : undefined;
    window.addEventListener("focus", refresh);
    return () => { active = false; clearTimeout(timer); window.removeEventListener("focus", refresh); };
  }, [current.endsAt]);
  useEffect(() => {
    if (!open) return;
    let active = true;
    const refresh = () => { void getPlanSnapshotAction().then(value => {
      if (active) { setCurrent(value); setFailed(false); }
    }).catch(() => { if (active) setFailed(true); }); };
    refresh();
    const timer = window.setInterval(refresh, 30_000);
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => { active = false; clearInterval(timer); document.removeEventListener("pointerdown", close); };
  }, [open]);
  const date = (value: string) => new Date(value).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
  const period = current.accessMode === "trial" ? (es ? "prueba completa" : "entire trial") : (es ? "mes" : "month");
  const rows = [
    [`Samy · ${period}`, current.usage.samy],
    ...(current.usage.samyToday ? [[es ? "Samy · hoy" : "Samy · today", current.usage.samyToday] as const] : []),
    [`MCP · ${period}`, current.usage.mcpCalls],
    [es ? "Movimientos · mes" : "Transactions · month", current.usage.transactions],
    [es ? "Cuentas" : "Accounts", current.usage.accounts],
    ["Tokens MCP", current.usage.mcpTokens],
    [es ? "Integraciones" : "Integrations", current.usage.integrations],
  ] as const;
  return <div ref={root} className="desk-plan" onMouseEnter={() => setOpen(true)} onMouseLeave={() => {
    if (!root.current?.contains(document.activeElement)) setOpen(false);
  }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }} onKeyDown={event => {
    if (event.key === "Escape") { setOpen(false); event.stopPropagation(); }
  }}>
    <button type="button" className="desk-plan-trigger" aria-expanded={open} aria-controls={id} onFocus={() => setOpen(true)} onClick={() => setOpen(true)}>
      {current.accessMode === "trial" ? "Pro · Free trial" : current.label}
    </button>
    {open && <section id={id} className="desk-plan-details" aria-label={es ? "Detalles del plan" : "Plan details"}>
      <strong>{current.accessMode === "trial" ? (es ? "Prueba gratuita de Pro" : "Pro free trial") : current.label}</strong>
      <p>{current.endsAt ? `${es ? "Vigente hasta" : "Active until"} ${date(current.endsAt)}` : (es ? "Sin fecha de vencimiento" : "No expiry date")}</p>
      <dl>{rows.map(([label, usage]) => <div key={label}><dt>{label}</dt><dd>{usage.used} / {usage.limit ?? "∞"}</dd></div>)}
        <div><dt>{es ? "Monedas" : "Currencies"}</dt><dd>{current.limits.currencies}</dd></div>
      </dl>
      <p>{es ? "Uso / límite. ∞ = sin límite." : "Used / limit. ∞ = unlimited."}</p>
      {current.usage.transactions.resetAt && <p>{es ? "Cuota mensual: próximo reinicio " : "Monthly quota resets "}{date(current.usage.transactions.resetAt)}</p>}
      {failed && <p role="status">{es ? "No se pudo actualizar. Mostrando el último estado disponible." : "Could not refresh. Showing the last available state."}</p>}
      <a href={`mailto:${current.contactEmail}`}>{es ? "Cambiar plan · Contactar" : "Change plan · Contact"}</a>
    </section>}
  </div>;
}
