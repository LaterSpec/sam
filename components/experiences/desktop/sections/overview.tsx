import { ArrowUpRight, CalendarClock, CircleDollarSign } from "lucide-react";
import { CashFlowBraid } from "../charts/cash-flow-braid";
import { BudgetPressure } from "../charts/budget-pressure";
import { allTransactions, desktopSummary, formatMoney } from "../desktop-data";
import type { DesktopCopy } from "../desktop-copy";
import type { DesktopSectionProps } from "../types";

export function OverviewSection({
  state,
  currency,
  onSelect,
  onAction,
  copy,
  locale,
}: DesktopSectionProps & { copy: DesktopCopy; locale: string }) {
  const summary = desktopSummary(state, currency);
  const tx = allTransactions(state, currency).slice(0, 8);
  const obligations = state.recurringRules
    .filter((rule) => rule.kind === "expense" && rule.status === "active" && rule.accountCurrency === currency)
    .reduce((sum, rule) => sum + rule.amount, 0);
  const upcoming = state.recurringRules
    .filter((rule) => rule.status === "active" && rule.accountCurrency === currency)
    .sort((a, b) => a.nextOccurrenceDate.localeCompare(b.nextOccurrenceDate))
    .slice(0, 5);

  return (
    <div className="desk-section desk-overview">
      <section className="desk-position" aria-labelledby="position-heading">
        <div className="desk-section-heading">
          <div>
            <span className="desk-eyebrow">SAM / {currency} / {new Date().toLocaleDateString(locale, { month: "long" })}</span>
            <h1 id="position-heading">{copy.overview}</h1>
          </div>
        </div>

        <div className="desk-position-grid">
          <div className="desk-position-primary">
            <span>{copy.availableBalance}</span>
            <strong>{formatMoney(summary.balance, currency, locale)}</strong>
            <small>{copy.projectedClose}: <b>{formatMoney(summary.projected, currency, locale)}</b></small>
          </div>
          <dl className="desk-kpis">
            <div><dt>{copy.monthIncome}</dt><dd className="is-positive">+{formatMoney(summary.income, currency, locale)}</dd></div>
            <div><dt>{copy.monthExpenses}</dt><dd className="is-negative">−{formatMoney(summary.expenses, currency, locale)}</dd></div>
            <div><dt>{copy.monthSavings}</dt><dd>{formatMoney(summary.saved, currency, locale)}</dd></div>
          </dl>
        </div>
      </section>

      <section className="desk-panel desk-cash-panel" aria-labelledby="cash-heading">
        <div className="desk-panel-heading">
          <div><span className="desk-command">flow.inspect --month=current</span><h2 id="cash-heading">{copy.cashFlow}</h2></div>
          <span className="desk-panel-note">actual → projected</span>
        </div>
        <CashFlowBraid
          state={state}
          income={summary.income}
          obligations={obligations}
          expenses={summary.expenses}
          projected={summary.projected}
          balance={summary.balance}
          currency={currency}
          locale={locale}
          labels={{ income: copy.income, expenses: copy.expenses, projected: copy.projected, empty: copy.noMonthFlow, balance: copy.availableBalance }}
        />
      </section>

      <div className="desk-overview-columns">
        <section className="desk-panel" aria-labelledby="ledger-heading">
          <div className="desk-panel-heading">
            <div><span className="desk-command">ledger.tail --limit=8</span><h2 id="ledger-heading">{copy.transactions}</h2></div>
            <button type="button" className="desk-text-button" onClick={() => onAction("expense")}>{copy.addExpense} <ArrowUpRight size={13} /></button>
          </div>
          {tx.length ? (
            <div className="desk-ledger-list">
              {tx.map((item) => (
                <button key={item.id} type="button" className="desk-ledger-row" onClick={() => onSelect({ kind: "transaction", id: item.id })}>
                  <span className="desk-ledger-glyph" style={{ color: item.catColor }}>{item.icon}</span>
                  <span className="desk-ledger-copy"><strong>{item.name}</strong><small>{item.category} · {new Date(item.occurred_at).toLocaleDateString(locale, { month: "short", day: "numeric" })}</small></span>
                  <span className={item.kind === "income" ? "is-positive" : ""}>{item.kind === "income" ? "+" : "−"}{formatMoney(item.amount, currency, locale)}</span>
                </button>
              ))}
            </div>
          ) : <EmptyLine title={copy.noTransactions} hint={copy.noTransactionsHint} actionLabel={copy.newAction} onClick={() => onAction("expense")} />}
        </section>

        <section className="desk-panel" aria-labelledby="upcoming-heading">
          <div className="desk-panel-heading"><div><span className="desk-command">schedule.next --active</span><h2 id="upcoming-heading">{copy.upcoming}</h2></div><CalendarClock size={17} /></div>
          {upcoming.length ? (
            <ol className="desk-upcoming-list">
              {upcoming.map((rule) => (
                <li key={rule.id}>
                  <button type="button" onClick={() => onSelect({ kind: "recurring", id: rule.id })}>
                    <time dateTime={rule.nextOccurrenceDate}>{new Date(`${rule.nextOccurrenceDate}T12:00:00`).toLocaleDateString(locale, { day: "2-digit", month: "short" })}</time>
                    <span><strong>{rule.name}</strong><small>{rule.accountName}</small></span>
                    <b className={rule.kind === "income" ? "is-positive" : ""}>{rule.kind === "income" ? "+" : "−"}{formatMoney(rule.amount, currency, locale)}</b>
                  </button>
                </li>
              ))}
            </ol>
          ) : <EmptyLine title={copy.noRecurring} hint={copy.noRecurringHint} actionLabel={copy.newAction} onClick={() => onAction("recurring")} />}
        </section>
      </div>

      <section className="desk-panel" aria-labelledby="pressure-heading">
        <div className="desk-panel-heading"><div><span className="desk-command">budget.pressure --sort=desc</span><h2 id="pressure-heading">{copy.budgetPressure}</h2></div><CircleDollarSign size={17} /></div>
        <BudgetPressure state={state} currency={currency} locale={locale} onSelect={(id) => onSelect({ kind: "budget", id })} />
      </section>
    </div>
  );
}

function EmptyLine({ title, hint, actionLabel, onClick }: { title: string; hint: string; actionLabel: string; onClick: () => void }) {
  return (
    <div className="desk-empty">
      <span aria-hidden="true">$ _</span>
      <div><strong>{title}</strong><p>{hint}</p></div>
      <button type="button" className="desk-secondary-button" onClick={onClick}>{actionLabel}</button>
    </div>
  );
}
