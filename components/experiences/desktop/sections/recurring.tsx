import { CalendarClock, Pause, Play, Plus } from "lucide-react";
import { formatMoney } from "../desktop-data";
import type { DesktopCopy } from "../desktop-copy";
import type { DesktopSectionProps } from "../types";

export function RecurringSection({ state, currency, onSelect, onAction, copy, locale }: DesktopSectionProps & { copy: DesktopCopy; locale: string }) {
  const rules = state.recurringRules
    .filter((rule) => rule.accountCurrency === currency)
    .sort((a, b) => a.nextOccurrenceDate.localeCompare(b.nextOccurrenceDate));
  const active = rules.filter((rule) => rule.status === "active");
  const outgoing = active.filter((rule) => rule.kind === "expense").reduce((sum, rule) => sum + rule.amount, 0);
  const incoming = active.filter((rule) => rule.kind === "income").reduce((sum, rule) => sum + rule.amount, 0);
  return <div className="desk-section">
    <div className="desk-section-heading"><div><span className="desk-eyebrow">schedule / commitments</span><h1>{copy.recurring}</h1></div><button type="button" className="desk-primary-button" onClick={() => onAction("recurring")}><Plus size={15} /> {copy.addRecurring}</button></div>
    <dl className="desk-strip-metrics"><div><dt>Active rules</dt><dd>{active.length}</dd></div><div><dt>Expected inflow</dt><dd className="is-positive">+{formatMoney(incoming, currency, locale)}</dd></div><div><dt>Expected outflow</dt><dd className="is-negative">−{formatMoney(outgoing, currency, locale)}</dd></div><div><dt>Net schedule</dt><dd>{formatMoney(incoming - outgoing, currency, locale)}</dd></div></dl>
    <section className="desk-panel desk-ledger-panel">
      <div className="desk-panel-heading"><div className="desk-inline-title"><CalendarClock size={16} /><h2>Rules</h2></div><span className="desk-panel-note">next execution order</span></div>
      {rules.length ? <div className="desk-table-wrap"><table className="desk-ledger-table"><thead><tr><th>Next</th><th>Rule</th><th>Frequency</th><th>Account</th><th>Status</th><th>Amount</th></tr></thead><tbody>{rules.map((rule) => <tr key={rule.id}><td><time dateTime={rule.nextOccurrenceDate}>{new Date(`${rule.nextOccurrenceDate}T12:00:00`).toLocaleDateString(locale, { month: "short", day: "2-digit" })}</time></td><th scope="row"><button type="button" className="desk-table-link" onClick={() => onSelect({ kind: "recurring", id: rule.id })}>{rule.status === "paused" ? <Pause size={13} /> : <Play size={13} />}{rule.name}</button></th><td>every {rule.frequencyInterval > 1 ? rule.frequencyInterval : ""} {rule.frequencyUnit}{rule.frequencyInterval > 1 ? "s" : ""}</td><td>{rule.accountName}</td><td><span className={`desk-status desk-status--${rule.status}`}>{rule.status}</span></td><td className={rule.kind === "income" ? "is-positive desk-money" : "desk-money"}>{rule.kind === "income" ? "+" : "−"}{formatMoney(rule.amount, currency, locale)}</td></tr>)}</tbody></table></div> : <div className="desk-empty desk-empty--large"><span>$ _</span><div><strong>{copy.noRecurring}</strong><p>{copy.noRecurringHint}</p></div><button type="button" className="desk-secondary-button" onClick={() => onAction("recurring")}>{copy.addRecurring}</button></div>}
    </section>
    <section className="desk-panel"><div className="desk-panel-heading"><h2>Execution log</h2><span className="desk-panel-note">last {state.recurringOccurrences.length} events</span></div>{state.recurringOccurrences.length ? <ol className="desk-event-log">{state.recurringOccurrences.slice(0, 20).map((item) => <li key={item.id}><time>{new Date(item.lastAttemptAt).toLocaleString(locale, { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</time><span><i className={`desk-event-dot desk-event-dot--${item.status}`} />{item.ruleName}</span><b>{item.status}</b></li>)}</ol> : <p className="desk-empty-inline">No execution events yet.</p>}</section>
  </div>;
}
