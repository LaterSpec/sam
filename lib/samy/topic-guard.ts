const FINANCE_HINT =
  /\b(gasto|gastos|spend|spending|budget|presupuesto|cuenta|cuentas|account|ingreso|ingresos|income|meta|metas|goal|ahorro|ahorros|saving|transfer|categor[ií]a|cashflow|flujo|balance|saldo|ledger|samy|finanza|expense|transaction|movimiento|recurrente|tarjeta|net worth|patrimonio)\b/i;

const BLATANT_OFF_TOPIC =
  /\b(poema|poem|receta|recipe|chiste|joke|codigo fuente|source code|politica|politics|traduce este|write (me )?(a |an )?(poem|story|essay)|python script|javascript function)\b/i;

/**
 * Cheap pre-filter so clearly unrelated first messages never hit the model.
 * Follow-ups stay with Samy; the system prompt still refuses off-topic turns.
 */
export function isBlatantlyOffTopic(text: string, isFollowUp: boolean): boolean {
  if (isFollowUp) return false;
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (FINANCE_HINT.test(trimmed)) return false;
  if (trimmed.length < 12 && !BLATANT_OFF_TOPIC.test(trimmed)) return false;
  return BLATANT_OFF_TOPIC.test(trimmed);
}

export function offTopicRefusal(language: "en" | "es"): string {
  return language === "es"
    ? "Solo puedo ayudarte con tu ledger en SAM: gastos, presupuestos, cuentas, metas y flujo. Dime que quieres analizar."
    : "I can only help with your SAM ledger: spending, budgets, accounts, goals and cash flow. Tell me what to analyze.";
}
