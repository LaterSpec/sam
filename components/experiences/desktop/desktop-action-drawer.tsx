"use client";

import { useState, type ReactNode } from "react";
import { useMutationLock } from "@/lib/hooks/use-mutation-lock";
import { AlertTriangle, ArrowLeftRight, CalendarPlus, CircleDollarSign, Flag, Landmark, LoaderCircle, Pencil, Plus, ReceiptText, Trash2, X } from "lucide-react";
import type { AppState } from "@/lib/db/queries/load-user-data";
import type { Currency } from "@/lib/finance/currency";
import {
  addAccountAction,
  addBudgetAction,
  addExpenseAction,
  addGoalAction,
  addIncomeAction,
  deleteExpenseAction,
  setGoalSavedAction,
  transferAction,
  updateAccountAction,
  updateBudgetAction,
  updateExpenseAction,
  updateGoalAction,
} from "@/lib/actions/data-actions";
import {
  createRecurringRuleAction,
  pauseRecurringRuleAction,
  resumeRecurringRuleAction,
  updateRecurringRuleAction,
} from "@/lib/actions/recurring-actions";
import { expenseCategoryOptions } from "./desktop-data";
import type { DesktopCopy } from "./desktop-copy";
import type { DesktopAction, DesktopCreateAction, DesktopEditAction } from "./types";
import { McpPanel } from "./mcp-panel";
import { IntegrationsPanel } from "./integrations-panel";

function actionKey(action: Exclude<DesktopAction, null>) {
  return typeof action === "string" ? action : `${action.edit}:${action.id}`;
}

function isEdit(action: Exclude<DesktopAction, "mcp" | "integrations" | null>): action is DesktopEditAction {
  return typeof action === "object" && "edit" in action;
}

function createKind(
  action: Exclude<DesktopAction, "mcp" | "integrations" | null>
): Exclude<DesktopCreateAction, "mcp" | "integrations"> | DesktopEditAction["edit"] {
  return isEdit(action) ? action.edit : action;
}

export function DesktopActionDrawer({
  action,
  state,
  currency,
  copy,
  onClose,
  onDone,
  onDeleted,
}: {
  action: DesktopAction;
  state: AppState;
  currency: Currency;
  copy: DesktopCopy;
  onClose: () => void;
  onDone: () => Promise<void>;
  onDeleted: () => Promise<void>;
}) {
  return (
    <div className={`desk-action-layer ${action ? "is-open" : ""}`} aria-hidden={!action}>
      <button type="button" className="desk-action-backdrop" onClick={onClose} aria-label={copy.close} />
      <aside className="desk-action-drawer" role="dialog" aria-modal="true" aria-label={copy.actionTray}>
        <div className="desk-action-top">
          <span>{copy.actionTray}</span>
          <button type="button" onClick={onClose} aria-label={copy.close}><X size={17} /></button>
        </div>
        <div className="desk-action-scroll">
          {action === "mcp" ? (
            <McpPanel />
          ) : action === "integrations" ? (
            <IntegrationsPanel />
          ) : action ? (
            <ActionForm key={actionKey(action)} action={action} state={state} currency={currency} copy={copy} onDone={onDone} onDeleted={onDeleted} onClose={onClose} />
          ) : null}
        </div>
      </aside>
    </div>
  );
}

function ActionForm({
  action,
  state,
  currency,
  copy,
  onDone,
  onDeleted,
  onClose,
}: {
  action: Exclude<DesktopAction, "mcp" | "integrations" | null>;
  state: AppState;
  currency: Currency;
  copy: DesktopCopy;
  onDone: () => Promise<void>;
  onDeleted: () => Promise<void>;
  onClose: () => void;
}) {
  const editing = isEdit(action);
  const kind = createKind(action);
  const editId = editing ? action.id : null;
  const expense = editId && kind === "expense" ? state.expenses.find((item) => item.id === editId) : null;
  const budget = editId && kind === "budget" ? state.budgets.find((item) => item.id === editId) : null;
  const account = editId && kind === "account" ? state.accounts.find((item) => item.id === editId) : null;
  const goal = editId && kind === "goal" ? state.goals.find((item) => item.id === editId) : null;
  const rule = editId && kind === "recurring" ? state.recurringRules.find((item) => item.id === editId) : null;

  const { busy, run } = useMutationLock();
  const [error, setError] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [flowKind, setFlowKind] = useState<"expense" | "income">(rule?.kind ?? "expense");
  const [accountType, setAccountType] = useState(account?.type ?? "checking");
  const tomorrow = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
  const actionCurrency = expense?.currency ?? currency;
  const accounts = state.accounts.filter((item) => item.currency === actionCurrency);
  const budgets = expenseCategoryOptions(state, actionCurrency);
  const meta = ACTION_META[kind];
  const nowLocal = toLocalDateTime(new Date());
  const expenseDate = expense ? toLocalDateTime(new Date(expense.occurred_at)) : nowLocal;

  const submit = async (form: FormData) => {
    await run(async () => {
    setError("");
    try {
      if (!editing && kind === "expense") {
        await addExpenseAction({
          name: textValue(form, "name"),
          amount: numberValue(form, "amount"),
          catKey: textValue(form, "category"),
          accountId: textValue(form, "account"),
          occurredAt: localDateTimeValue(form, "date"),
          budgets: state.budgets,
          accounts: state.accounts,
        });
      }
      if (editing && kind === "expense" && editId) {
        await updateExpenseAction({
          id: editId,
          name: textValue(form, "name"),
          amount: numberValue(form, "amount"),
          catKey: textValue(form, "category"),
          accountId: textValue(form, "account"),
          occurredAt: localDateTimeValue(form, "date"),
          budgets: state.budgets,
        });
      }
      if (!editing && kind === "income") {
        await addIncomeAction({
          name: textValue(form, "name"),
          amt: numberValue(form, "amount"),
          accountId: textValue(form, "account"),
          occurredAt: localDateTimeValue(form, "date"),
        });
      }
      if (!editing && kind === "account") {
        await addAccountAction({
          name: textValue(form, "name"),
          type: textValue(form, "type"),
          currency,
          icon: textValue(form, "type") === "card" ? "▣" : "◉",
          color: textValue(form, "color"),
          last4: nullableText(form, "last4"),
          creditLimit: nullableNumber(form, "limit"),
        });
      }
      if (editing && kind === "account" && editId) {
        await updateAccountAction({
          id: editId,
          name: textValue(form, "name"),
          type: textValue(form, "type"),
          color: textValue(form, "color"),
          icon: textValue(form, "type") === "card" ? "▣" : "◉",
          last4: nullableText(form, "last4"),
          creditLimit: nullableNumber(form, "limit"),
        });
      }
      if (!editing && kind === "transfer") {
        await transferAction({
          fromId: textValue(form, "from"),
          toId: textValue(form, "to"),
          amount: numberValue(form, "amount"),
        });
      }
      if (!editing && kind === "goal") {
        await addGoalAction({
          name: textValue(form, "name"),
          target: numberValue(form, "amount"),
          icon: "◆",
          color: textValue(form, "color"),
        });
      }
      if (editing && kind === "goal" && editId) {
        await updateGoalAction({
          id: editId,
          name: textValue(form, "name"),
          target: numberValue(form, "amount"),
          color: textValue(form, "color"),
        });
        await setGoalSavedAction(editId, numberValue(form, "saved"));
      }
      if (!editing && kind === "budget") {
        await addBudgetAction({
          name: textValue(form, "name"),
          amount: numberValue(form, "amount"),
          icon: "●",
          color: textValue(form, "color"),
          currency,
        });
      }
      if (editing && kind === "budget" && editId) {
        await updateBudgetAction({
          id: editId,
          name: textValue(form, "name"),
          amount: numberValue(form, "amount"),
          icon: budget?.icon || "●",
          color: textValue(form, "color"),
          currency,
        });
      }
      if (!editing && kind === "recurring") {
        await createRecurringRuleAction({
          kind: flowKind,
          name: textValue(form, "name"),
          amount: numberValue(form, "amount"),
          accountId: textValue(form, "account"),
          categoryId: flowKind === "expense" ? textValue(form, "category") : null,
          frequencyUnit: textValue(form, "frequency") as "day" | "week" | "month" | "year",
          frequencyInterval: numberValue(form, "interval"),
          startDate: textValue(form, "date"),
          endDate: null,
          timezone: state.prefs.timezone ?? "America/Lima",
          confirmCatchUp: false,
        });
      }
      if (editing && kind === "recurring" && editId) {
        await updateRecurringRuleAction({
          id: editId,
          kind: flowKind,
          name: textValue(form, "name"),
          amount: numberValue(form, "amount"),
          accountId: textValue(form, "account"),
          categoryId: flowKind === "expense" ? textValue(form, "category") : null,
          frequencyUnit: textValue(form, "frequency") as "day" | "week" | "month" | "year",
          frequencyInterval: numberValue(form, "interval"),
          startDate: textValue(form, "date"),
          timezone: state.prefs.timezone ?? "America/Lima",
        });
      }
      await onDone();
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The action could not be completed.");
    }
    });
  };

  const deleteSelectedExpense = async () => {
    if (!expense) return;
    await run(async () => {
    setError("");
    try {
      await deleteExpenseAction(expense.id);
      await onDeleted();
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The expense could not be deleted.");
    }
    });
  };

  const toggleRecurring = async () => {
    if (!rule) return;
    await run(async () => {
    setError("");
    try {
      if (rule.status === "paused") await resumeRecurringRuleAction(rule.id);
      else await pauseRecurringRuleAction(rule.id);
      await onDone();
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The action could not be completed.");
    }
    });
  };

  const title =
    editing && kind === "expense" ? copy.editExpense
    : editing && kind === "budget" ? copy.editBudget
    : editing && kind === "account" ? copy.editAccount
    : editing && kind === "goal" ? copy.editGoal
    : editing && kind === "recurring" ? copy.editRecurring
    : meta.title(copy);

  return (
    <>
      <div className="desk-action-intro">
        {editing ? <Pencil size={20} /> : meta.icon}
        <div>
          <span>sam://{editing ? "edit" : "create"}/{kind}</span>
          <h2>{title}</h2>
          <p>{editing ? "Update this ledger object and keep balances coherent." : meta.description}</p>
        </div>
      </div>
      <form action={submit} className="desk-action-form">
        {(kind === "recurring") && (
          <label className="desk-field">
            <span>Flow</span>
            <select name="kind" value={flowKind} onChange={(event) => setFlowKind(event.target.value as "expense" | "income")}>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </label>
        )}
        {kind !== "transfer" && (
          <Field label={copy.description}>
            <input
              name="name"
              required
              maxLength={120}
              defaultValue={expense?.name ?? budget?.name ?? account?.name ?? goal?.name ?? rule?.name ?? ""}
              placeholder={kind === "account" ? "Everyday checking" : kind === "goal" ? "Emergency runway" : "What is this?"}
            />
          </Field>
        )}
        {(kind === "account") && (
          <>
            <Field label="Account type">
              <select name="type" value={accountType} onChange={(event) => setAccountType(event.target.value)}>
                <option value="checking">Checking</option>
                <option value="savings">Savings</option>
                <option value="cash">Cash</option>
                <option value="card">Credit card</option>
              </select>
            </Field>
            {accountType === "card" && (
              <div className="desk-form-row">
                <Field label="Last four"><input name="last4" inputMode="numeric" pattern="[0-9]{4}" placeholder="1234" defaultValue={account?.last4 ?? ""} /></Field>
                <Field label="Credit limit"><input name="limit" type="number" min="0" step="0.01" placeholder="0.00" defaultValue={account?.creditLimit ?? ""} /></Field>
              </div>
            )}
          </>
        )}
        {!["account"].includes(kind) && (
          <Field label={kind === "budget" ? "Monthly cap" : kind === "goal" ? "Target" : copy.amount}>
            <div className="desk-money-input">
              <span>{actionCurrency}</span>
              <input
                name="amount"
                type="number"
                min={kind === "budget" || kind === "goal" ? "0" : "0.01"}
                step="0.01"
                required
                placeholder="0.00"
                inputMode="decimal"
                defaultValue={expense?.amount ?? budget?.cap ?? goal?.target ?? rule?.amount ?? ""}
              />
            </div>
          </Field>
        )}
        {editing && kind === "goal" && (
          <Field label={copy.savedAmount}>
            <div className="desk-money-input">
              <span>{currency}</span>
              <input name="saved" type="number" min="0" step="0.01" required defaultValue={goal?.saved ?? 0} />
            </div>
          </Field>
        )}
        {kind === "expense" && (
          <>
            <Field label={copy.account}><AccountSelect name="account" accounts={accounts} defaultValue={expense?.accountId} /></Field>
            <Field label={copy.category}>
              <select name="category" required defaultValue={expense?.catKey ?? budgets[0]?.key}>
                {budgets.map((item) => <option key={item.id} value={item.key}>{item.icon} {item.name}</option>)}
              </select>
            </Field>
            <Field label={copy.date}>
              <input name="date" type="datetime-local" defaultValue={expenseDate} required />
            </Field>
          </>
        )}
        {kind === "income" && (
          <>
            <Field label={copy.account}><AccountSelect name="account" accounts={accounts} /></Field>
            <Field label={copy.date}><input name="date" type="datetime-local" defaultValue={nowLocal} /></Field>
          </>
        )}
        {kind === "transfer" && (
          <>
            <Field label="From"><AccountSelect name="from" accounts={accounts} /></Field>
            <Field label="To"><AccountSelect name="to" accounts={accounts} defaultIndex={1} /></Field>
          </>
        )}
        {["account", "goal", "budget"].includes(kind) && (
          <Field label="Signal color">
            <input
              name="color"
              type="color"
              defaultValue={budget?.c ?? account?.color ?? goal?.c ?? (kind === "account" ? "#54d8e4" : kind === "goal" ? "#a8e63b" : "#f3b63f")}
            />
          </Field>
        )}
        {kind === "recurring" && (
          <>
            <Field label={copy.account}>
              <AccountSelect name="account" accounts={accounts} defaultValue={rule?.accountId} />
            </Field>
            {flowKind === "expense" && (
              <Field label={copy.category}>
                <select name="category" required defaultValue={rule?.categoryId ?? budgets[0]?.id}>
                  {state.budgets.map((item) => <option key={item.id} value={item.id}>{item.icon} {item.name}</option>)}
                </select>
              </Field>
            )}
            <div className="desk-form-row">
              <Field label="Every">
                <input name="interval" type="number" min="1" max="365" defaultValue={rule?.frequencyInterval ?? 1} required />
              </Field>
              <Field label="Period">
                <select name="frequency" defaultValue={rule?.frequencyUnit ?? "month"}>
                  <option value="day">Day</option>
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                  <option value="year">Year</option>
                </select>
              </Field>
            </div>
            <Field label="Starts">
              <input
                name="date"
                type="date"
                min={editing ? undefined : tomorrow}
                defaultValue={rule?.startDate ?? tomorrow}
                required
              />
            </Field>
          </>
        )}
        {accounts.length === 0 && ["expense", "income", "transfer", "recurring"].includes(kind) && (
          <p className="desk-form-error">Create a {actionCurrency} account before using this action.</p>
        )}
        {kind === "transfer" && accounts.length === 1 && <p className="desk-form-error">A transfer needs two {actionCurrency} accounts.</p>}
        {kind === "expense" && budgets.length === 0 && <p className="desk-form-error">Create a {actionCurrency} budget category first.</p>}
        {error && <p className="desk-form-error" role="alert">{error}</p>}
        {confirmingDelete && expense && (
          <div className="desk-delete-confirm" role="alertdialog" aria-labelledby="desk-delete-title" aria-describedby="desk-delete-hint">
            <AlertTriangle size={18} />
            <div>
              <strong id="desk-delete-title">{copy.deleteExpenseTitle}</strong>
              <p id="desk-delete-hint">{copy.deleteExpenseHint}</p>
            </div>
            <div>
              <button type="button" className="desk-secondary-button" disabled={busy} onClick={() => setConfirmingDelete(false)}>{copy.keepExpense}</button>
              <button type="button" className="desk-danger-button" disabled={busy} onClick={() => void deleteSelectedExpense()}>
                {busy ? <LoaderCircle className="desk-spin" size={15} /> : <Trash2 size={15} />}
                {busy ? copy.deleting : copy.deleteExpense}
              </button>
            </div>
          </div>
        )}
        <div className="desk-form-footer">
          {editing && kind === "expense" && !confirmingDelete && (
            <button type="button" className="desk-danger-button" disabled={busy} onClick={() => setConfirmingDelete(true)}>
              <Trash2 size={15} /> {copy.deleteExpense}
            </button>
          )}
          {editing && kind === "recurring" && rule && rule.status !== "archived" && (
            <button type="button" className="desk-secondary-button" disabled={busy} onClick={toggleRecurring}>
              {rule.status === "paused" ? copy.resume : copy.pause}
            </button>
          )}
          <span className="desk-form-footer-spacer" />
          <button type="button" className="desk-secondary-button" onClick={onClose}>{copy.cancel}</button>
          <button
            type="submit"
            className="desk-primary-button"
            aria-busy={busy}
            disabled={
              busy
              || confirmingDelete
              || (["expense", "income", "transfer", "recurring"].includes(kind) && accounts.length === 0)
              || (kind === "transfer" && accounts.length < 2)
              || (kind === "expense" && budgets.length === 0)
            }
          >
            {busy ? <LoaderCircle className="desk-spin" size={15} /> : editing ? <Pencil size={15} /> : <Plus size={15} />}
            {busy ? copy.saving : copy.save}
          </button>
        </div>
      </form>
    </>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="desk-field"><span>{label}</span>{children}</label>;
}

function AccountSelect({
  name,
  accounts,
  defaultIndex = 0,
  defaultValue,
}: {
  name: string;
  accounts: AppState["accounts"];
  defaultIndex?: number;
  defaultValue?: string;
}) {
  return (
    <select name={name} required defaultValue={defaultValue ?? accounts[defaultIndex]?.id}>
      {accounts.map((item) => <option key={item.id} value={item.id}>{item.icon} {item.name}</option>)}
    </select>
  );
}

function textValue(form: FormData, key: string) {
  return String(form.get(key) ?? "");
}
function numberValue(form: FormData, key: string) {
  return Number(form.get(key));
}
function nullableText(form: FormData, key: string) {
  const value = textValue(form, key).trim();
  return value || null;
}
function nullableNumber(form: FormData, key: string) {
  const value = textValue(form, key);
  return value ? Number(value) : null;
}

function localDateTimeValue(form: FormData, key: string) {
  const date = new Date(textValue(form, key));
  if (Number.isNaN(date.getTime())) throw new Error("Invalid date");
  return date.toISOString();
}

function toLocalDateTime(date: Date) {
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

const ACTION_META = {
  expense: { icon: <ReceiptText size={20} />, title: (copy: DesktopCopy) => copy.addExpense, description: "Write a confirmed expense into the ledger for the month you choose." },
  income: { icon: <CircleDollarSign size={20} />, title: (copy: DesktopCopy) => copy.addIncome, description: "Add income and update its destination account." },
  account: { icon: <Landmark size={20} />, title: (copy: DesktopCopy) => copy.addAccount, description: "Register a bank account, cash reserve or card." },
  transfer: { icon: <ArrowLeftRight size={20} />, title: (copy: DesktopCopy) => copy.transfer, description: "Move value safely between accounts in one operation." },
  goal: { icon: <Flag size={20} />, title: (copy: DesktopCopy) => copy.addGoal, description: "Create a visible runway for a future target." },
  budget: { icon: <CircleDollarSign size={20} />, title: (copy: DesktopCopy) => copy.addBudget, description: "Set a monthly guardrail for a category." },
  recurring: { icon: <CalendarPlus size={20} />, title: (copy: DesktopCopy) => copy.addRecurring, description: "Schedule a realistic future commitment." },
} as const;
