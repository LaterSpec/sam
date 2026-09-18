"use client";

import { useMemo, useState } from "react";
import type { AppState } from "@/lib/db/queries/load-user-data";
import { selectFreeResourcesAction } from "@/lib/actions/plan-actions";
import { normalizeCurrency, type Currency } from "@/lib/finance/currency";
import { buildPlanContactHref } from "@/lib/plans/contact";

function formatLimit(used: number, limit: number | null) {
  return limit == null ? `${used} / unlimited` : `${used} / ${limit}`;
}

function formatDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function PlanOverview({ state }: { state: AppState }) {
  const plan = state.plan;
  const currencies = useMemo(
    () => Array.from(new Set(state.accounts.map((account) => account.currency))),
    [state.accounts]
  );
  const initialCurrency = normalizeCurrency(plan.freeSelection?.activeCurrency ?? currencies[0] ?? "USD");
  const [currency, setCurrency] = useState<Currency>(initialCurrency);
  const eligibleAccounts = state.accounts.filter((account) => account.currency === currency);
  const initialIds = plan.freeSelection?.activeAccountIds ?? eligibleAccounts.slice(0, 2).map((a) => a.id);
  const [accountIds, setAccountIds] = useState<string[]>(initialIds);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const endLabel = formatDate(plan.endsAt);
  const contactHref = buildPlanContactHref({
    plan: plan.effectivePlan === "agent" ? "agent" : "pro",
    email: state.user.email,
    userId: state.user.id,
  });

  const toggleAccount = (id: string) => {
    setMessage("");
    setAccountIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : current.length < 2 ? [...current, id] : current
    );
  };

  const changeCurrency = (next: Currency) => {
    setCurrency(next);
    setAccountIds(state.accounts.filter((account) => account.currency === next).slice(0, 2).map((a) => a.id));
    setMessage("");
  };

  const saveSelection = async () => {
    setSaving(true);
    setMessage("");
    try {
      await selectFreeResourcesAction({ activeCurrency: currency, activeAccountIds: accountIds });
      setMessage("Selection saved. Reloading…");
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save the selection.");
    } finally {
      setSaving(false);
    }
  };

  const meters = [
    ["Transactions", plan.usage.transactions],
    ["Samy", plan.usage.samy],
    ["MCP calls", plan.usage.mcpCalls],
    ["Accounts", plan.usage.accounts],
    ["MCP tokens", plan.usage.mcpTokens],
    ["Integrations", plan.usage.integrations],
  ] as const;

  return (
    <section className="sam-plan-overview" aria-labelledby="sam-plan-title">
      <div className="sam-plan-heading">
        <div>
          <span className="sam-plan-kicker">CURRENT ACCESS · SERVER VERIFIED</span>
          <h2 id="sam-plan-title">{plan.label}</h2>
          <p>
            {plan.accessMode === "trial"
              ? `7-day trial${endLabel ? ` · ends ${endLabel}` : ""}`
              : plan.accessMode === "paid"
                ? `Manually activated${endLabel ? ` · renews/expires ${endLabel}` : ""}`
                : "Free plan · no payment method required"}
          </p>
        </div>
        <span className={`sam-plan-status is-${plan.accessMode}`}>{plan.accessMode}</span>
      </div>

      <div className="sam-plan-meters">
        {meters.map(([label, usage]) => {
          const ratio = usage.limit ? Math.min(100, (usage.used / usage.limit) * 100) : 0;
          return (
            <div key={label} className="sam-plan-meter">
              <span>{label}</span>
              <strong>{formatLimit(usage.used, usage.limit)}</strong>
              {usage.limit != null && (
                <i aria-hidden="true"><b style={{ width: `${ratio}%` }} /></i>
              )}
            </div>
          );
        })}
      </div>

      {plan.usage.samyToday && (
        <p className="sam-plan-note">
          Trial safety limit today: {formatLimit(plan.usage.samyToday.used, plan.usage.samyToday.limit)} Samy messages.
        </p>
      )}

      {plan.needsFreeResourceSelection && (
        <div className="sam-plan-selection">
          <h3>Choose what remains editable on Free</h3>
          <p>Your other data is preserved as read-only. Select one currency and up to two accounts.</p>
          <label>
            Active currency
            <select value={currency} onChange={(event) => changeCurrency(event.target.value as Currency)}>
              {currencies.map((value) => <option key={value}>{value}</option>)}
            </select>
          </label>
          <div className="sam-plan-account-list">
            {eligibleAccounts.map((account) => (
              <label key={account.id}>
                <input
                  type="checkbox"
                  checked={accountIds.includes(account.id)}
                  onChange={() => toggleAccount(account.id)}
                />
                <span>{account.name}</span>
                <small>{account.currency}</small>
              </label>
            ))}
          </div>
          <button type="button" onClick={() => void saveSelection()} disabled={saving || accountIds.length === 0}>
            {saving ? "Saving…" : "Save Free selection"}
          </button>
          {message && <p role="status" className="sam-plan-note">{message}</p>}
        </div>
      )}

      <div className="sam-plan-footer">
        <p>Paid upgrades are activated manually. No card or wallet is requested in SAM.</p>
        <a href={contactHref}>Contact {plan.contactEmail}</a>
      </div>
    </section>
  );
}
