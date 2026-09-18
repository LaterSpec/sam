import { PLAN_CONTACT_EMAIL, type PlanId } from "./catalog";

export function buildPlanContactHref(input: {
  plan: Exclude<PlanId, "free">;
  email?: string | null;
  userId?: string | null;
}) {
  const subject = `Activar SAM ${input.plan === "agent" ? "Agent" : "Pro"}`;
  const lines = [
    `Hola Manuel, quiero activar el plan ${input.plan === "agent" ? "Agent" : "Pro"} de SAM.`,
    input.email ? `Email de mi cuenta: ${input.email}` : null,
    input.userId ? `ID de usuario: ${input.userId}` : null,
    "Por favor, indícame los pasos de pago y la fecha de activación.",
  ].filter(Boolean);
  return `mailto:${PLAN_CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
}
