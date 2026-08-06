import { Calendar, CircleCheck, Landmark, Pencil, Target, WalletCards, X } from "lucide-react";
import type { AppState } from "@/lib/db/queries/load-user-data";
import type { Currency } from "@/lib/finance/currency";
import { accountName, allTransactions, budgetRows, formatMoney } from "./desktop-data";
import type { DesktopCopy } from "./desktop-copy";
import type { DesktopAction, DesktopSelection } from "./types";

export function DesktopInspector({
  state,
  selection,
  currency,
  locale,
  copy,
  onClose,
  onAction,
}: {
  state: AppState;
  selection: DesktopSelection;
  currency: Currency;
  locale: string;
  copy: DesktopCopy;
  onClose: () => void;
  onAction: (action: DesktopAction) => void;
}) {
  let content: React.ReactNode = null;
  let editAction: DesktopAction = null;

  if (selection?.kind === "transaction") {
    const tx = allTransactions(state).find((item) => item.id === selection.id);
    if (tx) {
      content = (
        <>
          <InspectorHead icon={<span style={{ color: tx.catColor }}>{tx.icon}</span>} eyebrow="ledger entry" title={tx.name} />
          <InspectorMoney value={`${tx.kind === "income" ? "+" : "−"}${formatMoney(tx.amount, currency, locale)}`} positive={tx.kind === "income"} />
          <InspectorList rows={[[copy.category, tx.category], [copy.account, accountName(state, tx.accountId)], [copy.date, new Date(tx.occurred_at).toLocaleString(locale)], [copy.status, tx.status ?? "confirmed"], ["Source", tx.source ?? "manual"]]} />
        </>
      );
    }
  }
  if (selection?.kind === "account") {
    const account = state.accounts.find((item) => item.id === selection.id);
    if (account) {
      editAction = { edit: "account", id: account.id };
      content = (
        <>
          <InspectorHead icon={<Landmark size={19} />} eyebrow="account" title={account.name} />
          <InspectorMoney value={formatMoney(account.balance, account.currency, locale)} />
          <InspectorList rows={[["Type", account.type], [copy.currency, account.currency], ["Card", account.last4 ? `•••• ${account.last4}` : "—"], ["Credit limit", account.creditLimit ? formatMoney(account.creditLimit, account.currency, locale) : "—"]]} />
        </>
      );
    }
  }
  if (selection?.kind === "budget") {
    const budget = budgetRows(state, currency).find((item) => item.id === selection.id);
    if (budget) {
      editAction = { edit: "budget", id: budget.id };
      content = (
        <>
          <InspectorHead icon={<span style={{ color: budget.c }}>{budget.icon}</span>} eyebrow="budget envelope" title={budget.name} />
          <InspectorMoney value={`${Math.round(budget.ratio * 100)}% used`} positive={budget.ratio < 0.8} />
          <div className="desk-inspector-track"><i style={{ width: `${Math.min(100, budget.ratio * 100)}%`, background: budget.ratio >= 1 ? "var(--desk-risk)" : budget.c }} /></div>
          <InspectorList rows={[["Spent", formatMoney(budget.spent, currency, locale)], ["Cap", formatMoney(budget.cap, currency, locale)], ["Remaining", formatMoney(budget.remaining, currency, locale)], [copy.currency, budget.currency]]} />
        </>
      );
    }
  }
  if (selection?.kind === "goal") {
    const goal = state.goals.find((item) => item.id === selection.id);
    if (goal) {
      const pct = goal.target ? Math.round((goal.saved / goal.target) * 100) : 0;
      editAction = { edit: "goal", id: goal.id };
      content = (
        <>
          <InspectorHead icon={<Target size={19} />} eyebrow="goal runway" title={goal.name} />
          <InspectorMoney value={`${pct}% complete`} positive />
          <div className="desk-inspector-track"><i style={{ width: `${Math.min(100, pct)}%`, background: goal.c }} /></div>
          <InspectorList rows={[["Saved", formatMoney(goal.saved, currency, locale)], ["Target", formatMoney(goal.target, currency, locale)], ["ETA", goal.eta ?? "—"], [copy.status, goal.done ? "complete" : "active"]]} />
        </>
      );
    }
  }
  if (selection?.kind === "recurring") {
    const rule = state.recurringRules.find((item) => item.id === selection.id);
    if (rule) {
      editAction = { edit: "recurring", id: rule.id };
      content = (
        <>
          <InspectorHead icon={<Calendar size={19} />} eyebrow="recurring rule" title={rule.name} />
          <InspectorMoney value={`${rule.kind === "income" ? "+" : "−"}${formatMoney(rule.amount, currency, locale)}`} positive={rule.kind === "income"} />
          <InspectorList rows={[["Next", new Date(`${rule.nextOccurrenceDate}T12:00:00`).toLocaleDateString(locale)], ["Frequency", `${rule.frequencyInterval} ${rule.frequencyUnit}`], [copy.account, rule.accountName], [copy.category, rule.categoryName ?? "Income"], [copy.status, rule.status]]} />
        </>
      );
    }
  }

  return (
    <aside className={`desk-inspector ${selection ? "is-open" : ""}`} aria-label={copy.context} aria-hidden={!selection}>
      <div className="desk-inspector-top">
        <span><WalletCards size={15} /> {copy.context}</span>
        <button type="button" onClick={onClose} aria-label={copy.close}><X size={17} /></button>
      </div>
      {content ? (
        <>
          {content}
          {editAction && (
            <div className="desk-inspector-actions">
              <button type="button" className="desk-primary-button" onClick={() => onAction(editAction)}>
                <Pencil size={14} /> {copy.edit}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="desk-inspector-empty">
          <CircleCheck size={24} />
          <p>{copy.inspectorEmpty}</p>
          <span>select → inspect → act</span>
        </div>
      )}
    </aside>
  );
}

function InspectorHead({ icon, eyebrow, title }: { icon: React.ReactNode; eyebrow: string; title: string }) {
  return (
    <div className="desk-inspector-head">
      <span>{icon}</span>
      <div><small>{eyebrow}</small><h2>{title}</h2></div>
    </div>
  );
}
function InspectorMoney({ value, positive }: { value: string; positive?: boolean }) {
  return <strong className={`desk-inspector-money ${positive ? "is-positive" : ""}`}>{value}</strong>;
}
function InspectorList({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="desk-inspector-list">
      {rows.map(([label, value]) => (
        <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
      ))}
    </dl>
  );
}
