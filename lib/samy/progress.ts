export type ToolProgress = { id: string; name: string; status: "running" | "done" | "error" | "confirmation" | "interrupted" };

const labels: Record<string, [string, string]> = {
  sam_get_latest_transaction: ["Consultando el último movimiento", "Checking the latest transaction"],
  sam_list_transactions: ["Consultando movimientos y fechas", "Checking transactions and dates"],
  sam_get_spending_summary: ["Consultando totales de gastos", "Checking spending totals"],
  sam_get_cashflow: ["Consultando ingresos y gastos", "Checking income and expenses"],
  sam_list_accounts: ["Consultando cuentas", "Checking accounts"],
  sam_get_net_worth: ["Consultando patrimonio", "Checking net worth"],
  sam_list_categories: ["Consultando categorías", "Checking categories"],
  sam_get_budget_status: ["Consultando presupuestos", "Checking budgets"],
  sam_list_goals: ["Consultando metas", "Checking goals"],
  sam_list_savings_buckets: ["Consultando ahorros", "Checking savings"],
  sam_list_income_sources: ["Consultando fuentes de ingreso", "Checking income sources"],
  sam_list_recurring_rules: ["Consultando pagos recurrentes", "Checking recurring payments"],
  sam_list_recurring_occurrences: ["Consultando vencimientos", "Checking scheduled payments"],
  sam_get_profile: ["Consultando preferencias", "Checking preferences"],
  samy_recall: ["Consultando preferencias guardadas", "Checking saved preferences"],
  samy_remember: ["Guardando preferencia", "Saving preference"],
  samy_forget: ["Eliminando preferencia", "Removing preference"],
};

export function toolProgressLabel(name: string, language: "es" | "en") {
  const label = labels[name];
  if (label) return label[language === "es" ? 0 : 1];
  return language === "es" ? "Procesando acción en SAM" : "Processing action in SAM";
}

export function toolOutputStatus(output: unknown): ToolProgress["status"] {
  if (output && typeof output === "object" && "error" in output && output.error) {
    return output.error === "confirmation_required" ? "confirmation" : "error";
  }
  return "done";
}

export function updateToolProgress(steps: ToolProgress[], step: ToolProgress): ToolProgress[] {
  const exists = steps.some(item => item.id === step.id);
  return exists ? steps.map(item => item.id === step.id ? step : item) : [...steps, step];
}
