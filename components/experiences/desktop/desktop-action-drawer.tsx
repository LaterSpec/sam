"use client";

import { useState, type ReactNode } from "react";
import { ArrowLeftRight, CalendarPlus, CircleDollarSign, Flag, Landmark, LoaderCircle, Plus, ReceiptText, X } from "lucide-react";
import type { AppState } from "@/lib/db/queries/load-user-data";
import type { Currency } from "@/lib/finance/currency";
import { addAccountAction, addBudgetAction, addExpenseAction, addGoalAction, addIncomeAction, transferAction } from "@/lib/actions/data-actions";
import { createRecurringRuleAction } from "@/lib/actions/recurring-actions";
import type { DesktopCopy } from "./desktop-copy";
import type { DesktopAction } from "./types";
import { McpPanel } from "./mcp-panel";

export function DesktopActionDrawer({ action, state, currency, copy, onClose, onDone }: { action: DesktopAction; state: AppState; currency: Currency; copy: DesktopCopy; onClose: () => void; onDone: () => Promise<void> }) {
  return <div className={`desk-action-layer ${action ? "is-open" : ""}`} aria-hidden={!action}>
    <button type="button" className="desk-action-backdrop" onClick={onClose} aria-label={copy.close}/>
    <aside className="desk-action-drawer" role="dialog" aria-modal="true" aria-label={copy.actionTray}>
      <div className="desk-action-top"><span>{copy.actionTray}</span><button type="button" onClick={onClose} aria-label={copy.close}><X size={17}/></button></div>
      <div className="desk-action-scroll">{action === "mcp" ? <McpPanel/> : action ? <ActionForm key={action} action={action} state={state} currency={currency} copy={copy} onDone={onDone} onClose={onClose}/> : null}</div>
    </aside>
  </div>;
}

function ActionForm({ action, state, currency, copy, onDone, onClose }: { action: Exclude<DesktopAction, "mcp" | null>; state: AppState; currency: Currency; copy: DesktopCopy; onDone: () => Promise<void>; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [kind, setKind] = useState<"expense" | "income">("expense");
  const [accountType, setAccountType] = useState("checking");
  const tomorrow = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
  const accounts = state.accounts.filter((item) => item.currency === currency);
  const budgets = state.budgets.filter((item) => item.currency === currency);
  const meta = ACTION_META[action];
  const submit = async (form: FormData) => {
    setBusy(true); setError("");
    try {
      if (action === "expense") await addExpenseAction({ name: textValue(form, "name"), amount: numberValue(form, "amount"), catKey: textValue(form, "category"), accountId: textValue(form, "account"), budgets: state.budgets, accounts: state.accounts });
      if (action === "income") await addIncomeAction({ name: textValue(form, "name"), amt: numberValue(form, "amount"), accountId: textValue(form, "account"), occurredAt: textValue(form, "date") });
      if (action === "account") await addAccountAction({ name: textValue(form, "name"), type: textValue(form, "type"), currency, icon: textValue(form, "type") === "card" ? "▣" : "◉", color: textValue(form, "color"), last4: nullableText(form, "last4"), creditLimit: nullableNumber(form, "limit") });
      if (action === "transfer") await transferAction({ fromId: textValue(form, "from"), toId: textValue(form, "to"), amount: numberValue(form, "amount") });
      if (action === "goal") await addGoalAction({ name: textValue(form, "name"), target: numberValue(form, "amount"), icon: "◆", color: textValue(form, "color") });
      if (action === "budget") await addBudgetAction({ name: textValue(form, "name"), amount: numberValue(form, "amount"), icon: "●", color: textValue(form, "color"), currency });
      if (action === "recurring") await createRecurringRuleAction({ kind, name: textValue(form, "name"), amount: numberValue(form, "amount"), accountId: textValue(form, "account"), categoryId: kind === "expense" ? textValue(form, "category") : null, frequencyUnit: textValue(form, "frequency") as "day" | "week" | "month" | "year", frequencyInterval: numberValue(form, "interval"), startDate: textValue(form, "date"), endDate: null, timezone: state.prefs.timezone ?? "America/Lima", confirmCatchUp: false });
      await onDone();
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The action could not be completed.");
    } finally { setBusy(false); }
  };

  return <><div className="desk-action-intro">{meta.icon}<div><span>sam://create/{action}</span><h2>{meta.title(copy)}</h2><p>{meta.description}</p></div></div><form action={submit} className="desk-action-form">
    {action === "recurring" && <label className="desk-field"><span>Flow</span><select name="kind" value={kind} onChange={(event) => setKind(event.target.value as "expense" | "income")}><option value="expense">Expense</option><option value="income">Income</option></select></label>}
    {action !== "transfer" && <Field label={copy.description}><input name="name" required maxLength={120} placeholder={action === "account" ? "Everyday checking" : action === "goal" ? "Emergency runway" : "What is this?"}/></Field>}
    {action === "account" && <><Field label="Account type"><select name="type" value={accountType} onChange={(event) => setAccountType(event.target.value)}><option value="checking">Checking</option><option value="savings">Savings</option><option value="cash">Cash</option><option value="card">Credit card</option></select></Field>{accountType === "card" && <div className="desk-form-row"><Field label="Last four"><input name="last4" inputMode="numeric" pattern="[0-9]{4}" placeholder="1234"/></Field><Field label="Credit limit"><input name="limit" type="number" min="0" step="0.01" placeholder="0.00"/></Field></div>}</>}
    {!["account"].includes(action) && <Field label={copy.amount}><div className="desk-money-input"><span>{currency}</span><input name="amount" type="number" min="0.01" step="0.01" required placeholder="0.00" inputMode="decimal"/></div></Field>}
    {action === "expense" && <><Field label={copy.account}><AccountSelect name="account" accounts={accounts}/></Field><Field label={copy.category}><select name="category" required defaultValue={budgets[0]?.key}>{budgets.map((budget) => <option key={budget.id} value={budget.key}>{budget.icon} {budget.name}</option>)}</select></Field></>}
    {action === "income" && <><Field label={copy.account}><AccountSelect name="account" accounts={accounts}/></Field><Field label={copy.date}><input name="date" type="datetime-local" defaultValue={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}/></Field></>}
    {action === "transfer" && <><Field label="From"><AccountSelect name="from" accounts={accounts}/></Field><Field label="To"><AccountSelect name="to" accounts={accounts} defaultIndex={1}/></Field></>}
    {["account", "goal", "budget"].includes(action) && <Field label="Signal color"><input name="color" type="color" defaultValue={action === "account" ? "#54d8e4" : action === "goal" ? "#a8e63b" : "#f3b63f"}/></Field>}
    {action === "recurring" && <><Field label={copy.account}><AccountSelect name="account" accounts={accounts}/></Field>{kind === "expense" && <Field label={copy.category}><select name="category" required defaultValue={budgets[0]?.id}>{budgets.map((budget) => <option key={budget.id} value={budget.id}>{budget.icon} {budget.name}</option>)}</select></Field>}<div className="desk-form-row"><Field label="Every"><input name="interval" type="number" min="1" max="365" defaultValue="1" required/></Field><Field label="Period"><select name="frequency" defaultValue="month"><option value="day">Day</option><option value="week">Week</option><option value="month">Month</option><option value="year">Year</option></select></Field></div><Field label="Starts"><input name="date" type="date" min={tomorrow} defaultValue={tomorrow} required/></Field></>}
    {accounts.length === 0 && ["expense", "income", "transfer", "recurring"].includes(action) && <p className="desk-form-error">Create a {currency} account before using this action.</p>}
    {action === "transfer" && accounts.length === 1 && <p className="desk-form-error">A transfer needs two {currency} accounts.</p>}
    {action === "expense" && budgets.length === 0 && <p className="desk-form-error">Create a {currency} budget category first.</p>}
    {error && <p className="desk-form-error" role="alert">{error}</p>}
    <div className="desk-form-footer"><button type="button" className="desk-secondary-button" onClick={onClose}>{copy.cancel}</button><button type="submit" className="desk-primary-button" disabled={busy || (!["account", "goal", "budget"].includes(action) && accounts.length === 0) || (action === "transfer" && accounts.length < 2) || (action === "expense" && budgets.length === 0)}>{busy ? <LoaderCircle className="desk-spin" size={15}/> : <Plus size={15}/>} {busy ? copy.saving : copy.save}</button></div>
  </form></>;
}

function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="desk-field"><span>{label}</span>{children}</label>; }
function AccountSelect({ name, accounts, defaultIndex = 0 }: { name: string; accounts: AppState["accounts"]; defaultIndex?: number }) { return <select name={name} required defaultValue={accounts[defaultIndex]?.id}>{accounts.map((account) => <option key={account.id} value={account.id}>{account.icon} {account.name}</option>)}</select>; }
function textValue(form: FormData, key: string) { return String(form.get(key) ?? ""); }
function numberValue(form: FormData, key: string) { return Number(form.get(key)); }
function nullableText(form: FormData, key: string) { const value = textValue(form, key).trim(); return value || null; }
function nullableNumber(form: FormData, key: string) { const value = textValue(form, key); return value ? Number(value) : null; }

const ACTION_META = {
  expense: { icon: <ReceiptText size={20}/>, title: (copy: DesktopCopy) => copy.addExpense, description: "Write a confirmed expense into the ledger." },
  income: { icon: <CircleDollarSign size={20}/>, title: (copy: DesktopCopy) => copy.addIncome, description: "Add income and update its destination account." },
  account: { icon: <Landmark size={20}/>, title: (copy: DesktopCopy) => copy.addAccount, description: "Register a bank account, cash reserve or card." },
  transfer: { icon: <ArrowLeftRight size={20}/>, title: (copy: DesktopCopy) => copy.transfer, description: "Move value safely between accounts in one operation." },
  goal: { icon: <Flag size={20}/>, title: (copy: DesktopCopy) => copy.addGoal, description: "Create a visible runway for a future target." },
  budget: { icon: <CircleDollarSign size={20}/>, title: (copy: DesktopCopy) => copy.addBudget, description: "Set a monthly guardrail for a category." },
  recurring: { icon: <CalendarPlus size={20}/>, title: (copy: DesktopCopy) => copy.addRecurring, description: "Schedule a realistic future commitment." },
} as const;
