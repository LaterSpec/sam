"use client";

import { useEffect, useState } from "react";
import { useSam } from "@/lib/theme/sam-theme";
import { Mono, Comment, BlockBar } from "@/components/ui/sam-primitives";
import { useT } from "@/lib/i18n/i18n-context";
import { currencySymbol, normalizeCurrency, SUPPORTED_CURRENCIES, type Currency } from "@/lib/finance/currency";
import type { ClientAppState, SheetPayload } from "@/components/experiences/mobile/screens/types";
import {
  addExpenseAction,
  addGoalAction,
  updateGoalAction,
  setGoalSavedAction,
  addBudgetAction,
  updateBudgetAction,
  addIncomeAction,
  updateIncomeAction,
  setBucketBalanceAction,
  addAccountAction,
  updateAccountAction,
  transferAction,
  setCredentialsAction,
} from "@/lib/actions/data-actions";
import {
  createMcpTokenAction,
  listMcpTokensAction,
  revokeMcpTokenAction,
  type McpTokenSummary,
} from "@/lib/actions/mcp-actions";
import { SCOPE_DESCRIPTIONS, DEFAULT_SCOPES, ALL_SCOPES, type Scope } from "@/lib/mcp/scopes";
import {
  ACCOUNT_TYPES,
  ACCOUNT_EMOJIS,
  accountColor,
  accountDefaultIcon,
  accountLabel,
} from "@/lib/accounts/account-types";
import { BUDGET_ICON_PRESETS, GOAL_ICON_PRESETS, type FinanceIconPreset } from "@/lib/finance/icon-presets";
import { TxSheet } from "@/components/experiences/mobile/sheets/tx-sheet";
import { RecurringSheet } from "@/components/experiences/mobile/sheets/recurring-sheets";
import { SheetSaveControl } from "@/components/experiences/mobile/sheets/sheet-save-control";
import { useMutationLock } from "@/lib/hooks/use-mutation-lock";

type SheetContentProps = {
  sheet: SheetPayload;
  state: ClientAppState;
  setState: React.Dispatch<React.SetStateAction<ClientAppState>>;
  onClose: () => void;
  openSheet: (sheet: SheetPayload | null) => void;
};

export function SheetContent({ sheet, state, setState, onClose, openSheet }: SheetContentProps) {
  switch (sheet.kind) {
    case "tx":
      return <TxSheet sheet={sheet} state={state} setState={setState} onClose={onClose} />;
    case "category":
      return <CategorySheet sheet={sheet} state={state} onClose={onClose} openSheet={openSheet} />;
    case "goal":
      return <GoalSheet sheet={sheet} setState={setState} onClose={onClose} />;
    case "new-expense":
      return <NewExpenseSheet state={state} setState={setState} onClose={onClose} />;
    case "new-goal":
      return <NewGoalSheet setState={setState} onClose={onClose} />;
    case "edit-budget":
      return <EditBudgetSheet sheet={sheet} setState={setState} onClose={onClose} />;
    case "new-budget":
      return <NewBudgetSheet state={state} setState={setState} onClose={onClose} />;
    case "new-income":
      return <NewIncomeSheet state={state} setState={setState} onClose={onClose} />;
    case "new-recurring":
    case "recurring-rule":
      return <RecurringSheet sheet={sheet} state={state} setState={setState} onClose={onClose} />;
    case "account":
      return (
        <AccountSheet sheet={sheet} state={state} openSheet={openSheet} onClose={onClose} />
      );
    case "new-account":
      return <CreateAccountSheet setState={setState} onClose={onClose} />;
    case "edit-account":
      return (
        <EditAccountSheet sheet={sheet} state={state} setState={setState} openSheet={openSheet} onClose={onClose} />
      );
    case "transfer":
      return (
        <TransferSheet sheet={sheet} state={state} setState={setState} onClose={onClose} />
      );
    case "change-credentials":
      return <ChangeCredentialsSheet onClose={onClose} />;
    case "mcp-connect":
      return <McpConnectSheet onClose={onClose} />;
    case "bucket":
      return <BucketSheet sheet={sheet} setState={setState} onClose={onClose} />;
    default:
      return null;
  }
}

function IconPresetPicker({
  presets,
  value,
  onChange,
}: {
  presets: FinanceIconPreset[];
  value: FinanceIconPreset;
  onChange: (preset: FinanceIconPreset) => void;
}) {
  const { sam } = useSam();
  return (
    <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 6 }}>
      {presets.map((preset) => {
        const selected = preset.key === value.key || (preset.icon === value.icon && preset.color === value.color);
        return (
          <button
            key={preset.key}
            type="button"
            onClick={() => onChange(preset)}
            title={preset.label}
            style={{
              minWidth: 0,
              padding: "8px 4px",
              border: `1px solid ${selected ? preset.color : sam.border}`,
              background: selected ? `${preset.color}18` : sam.overlay,
              color: selected ? preset.color : sam.comment,
              fontFamily: sam.font,
              cursor: "pointer",
              fontSize: 15,
            }}
          >
            <div style={{ fontWeight: 700 }}>{preset.icon}</div>
            <div style={{ marginTop: 2, fontSize: 8, overflow: "hidden", textOverflow: "ellipsis" }}>
              {preset.label.toLowerCase()}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function presetFromStored(presets: FinanceIconPreset[], icon: string, color: string) {
  return presets.find((p) => p.icon === icon && p.color === color) ?? {
    key: `custom-${icon}-${color}`,
    label: "Custom",
    icon,
    color,
  };
}

function CategorySheet({
  sheet,
  state,
  onClose,
  openSheet,
}: {
  sheet: Extract<SheetPayload, { kind: "category" }>;
  state: ClientAppState;
  onClose: () => void;
  openSheet: (sheet: SheetPayload | null) => void;
}) {
  const { sam } = useSam();
  const { cat, spent, pct } = sheet;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 14 }}>
        <span onClick={onClose} style={{ cursor: "pointer", color: sam.comment }}>
          [close]
        </span>
        <Mono
          c={sam.cyan}
          b
          style={{ margin: "0 8px", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        >
          $ budget --view {cat.name}
        </Mono>
        <span
          onClick={() => {
            const budget = state.budgets.find((b) => b.key === cat.key);
            if (budget) openSheet({ kind: "edit-budget", budget, spent });
          }}
          style={{ color: sam.yellow, cursor: "pointer" }}
        >
          [edit]
        </span>
      </div>
      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 13 }}>
          <Mono c={cat.c} b>
            {cat.icon} {cat.name}
          </Mono>
        </div>
        <Comment style={{ marginTop: 4 }}>budget ${cat.budget}/month</Comment>
        <div
          style={{
            marginTop: 14,
            fontSize: 28,
            fontWeight: 700,
            color: pct > 90 ? sam.red : cat.c,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          ${spent.toFixed(2)}
        </div>
        <div style={{ fontSize: 12, color: sam.comment, marginTop: 2 }}>
          {pct}% · ${(cat.budget - spent).toFixed(0)} left
        </div>
        <div style={{ marginTop: 10 }}>
          <BlockBar pct={pct} width={24} c={pct > 90 ? sam.red : cat.c} />
        </div>
      </div>
      <div style={{ marginTop: 20 }}>
        <Mono c={sam.cyan} b>
          ▸ transactions
        </Mono>
        {state.expenses
          .filter((e) => e.catKey === cat.key)
          .map((e) => (
            <div
              key={e.id}
              onClick={() => openSheet({ kind: "tx", tx: e })}
              style={{ fontSize: 13, marginTop: 8, display: "flex", cursor: "pointer" }}
            >
              <Mono c={sam.comment}>├─ </Mono>
              <Mono c={sam.text}>{e.name}</Mono>
              <span style={{ flex: 1 }} />
              <Mono c={sam.red} b>
                -${e.amount.toFixed(2)}
              </Mono>
            </div>
          ))}
      </div>
    </div>
  );
}

function GoalSheet({
  sheet,
  setState,
  onClose,
}: {
  sheet: Extract<SheetPayload, { kind: "goal" }>;
  setState: SheetContentProps["setState"];
  onClose: () => void;
}) {
  const { sam } = useSam();
  const t = useT();
  const g = sheet.goal;
  const pct = Math.min(100, Math.round((g.saved / Math.max(1, g.target)) * 100));
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [amount, setAmount] = useState("50");
  const [name, setName] = useState(g.name);
  const [target, setTarget] = useState(String(g.target));
  const [iconPreset, setIconPreset] = useState(presetFromStored(GOAL_ICON_PRESETS, g.icon, g.c));
  const parsedAmount = parseFloat(amount) || 0;
  const remaining = Math.max(0, g.target - g.saved);
  const { busy, run } = useMutationLock();

  const applyContribution = async (dir: 1 | -1) => {
    if (!(parsedAmount > 0)) return;
    await run(async () => {
      const newSaved = Math.max(0, Math.min(g.target, g.saved + dir * parsedAmount));
      const done = newSaved >= g.target;
      setState((s) => ({
        ...s,
        goals: s.goals.map((gg) => (gg.id === g.id ? { ...gg, saved: newSaved, done } : gg)),
      }));
      await setGoalSavedAction(g.id, newSaved, done);
      onClose();
    }, dir > 0 ? "add" : "subtract");
  };

  const saveEdit = async () => {
    const parsedTarget = parseFloat(target);
    if (!name.trim() || !Number.isFinite(parsedTarget) || parsedTarget < 0) return;
    await run(async () => {
      const row = await updateGoalAction({
        id: g.id,
        name,
        target: parsedTarget,
        icon: iconPreset.icon,
        color: iconPreset.color,
      });
      setState((s) => ({
        ...s,
        goals: s.goals.map((gg) => (gg.id === g.id ? row : gg)),
      }));
      onClose();
    });
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 14 }}>
        <span onClick={onClose} style={{ cursor: "pointer", color: sam.comment }}>
          [close]
        </span>
        <Mono c={sam.cyan} b>
          {mode === "edit" ? "$ goal --edit" : "$ goal --view"}
        </Mono>
        {mode === "edit" ? (
          <SheetSaveControl
            enabled={!!(name.trim() && Number.isFinite(parseFloat(target)) && parseFloat(target) >= 0)}
            busy={busy}
            onSave={saveEdit}
          />
        ) : (
          <span onClick={() => setMode("edit")} style={{ color: sam.yellow, cursor: "pointer" }}>
            [edit]
          </span>
        )}
      </div>
      {mode === "edit" && (
        <div style={{ marginBottom: 16 }}>
          <Comment>edit goal details</Comment>
          <div style={{ marginTop: 10 }}>
            <IconPresetPicker presets={GOAL_ICON_PRESETS} value={iconPreset} onChange={setIconPreset} />
          </div>
          <label className="mt-3 block">
            <Comment>name</Comment>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full border bg-transparent px-3 py-2 text-sm outline-none"
              style={{ borderColor: sam.border, color: sam.text, fontFamily: sam.font }}
            />
          </label>
          <label className="mt-3 block">
            <Comment>target amount</Comment>
            <input
              value={target}
              onChange={(e) => setTarget(e.target.value.replace(/[^0-9.]/g, ""))}
              className="mt-1 w-full border bg-transparent px-3 py-2 text-sm outline-none"
              style={{ borderColor: sam.border, color: sam.text, fontFamily: sam.font }}
            />
          </label>
        </div>
      )}
      <div style={{ textAlign: "center", marginTop: 8, marginBottom: 12 }}>
        <div style={{ fontSize: 34 }}>{g.icon}</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: sam.text, marginTop: 4 }}>{g.name}</div>
        <div
          style={{
            fontSize: 26,
            fontWeight: 700,
            color: g.c,
            marginTop: 8,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          ${g.saved.toLocaleString()}{" "}
          <Mono c={sam.comment} style={{ fontSize: 14 }}>
            / ${g.target.toLocaleString()}
          </Mono>
        </div>
        <div style={{ fontSize: 12, color: sam.comment, marginTop: 2 }}>
          {pct}% · ${remaining.toLocaleString()} remaining
        </div>
        <div style={{ marginTop: 10, padding: "0 10px" }}>
          <BlockBar pct={pct} width={20} c={g.c} />
        </div>
      </div>
      <div style={{ fontSize: 13, marginTop: 16 }}>
          <Mono c={sam.green} b>
          ▸ move money
        </Mono>
        <div
          style={{
            marginTop: 10,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: 12,
            border: `1px solid ${sam.border}`,
          }}
        >
          <span
            onClick={() => setAmount(String(Math.max(0, parsedAmount - 10)))}
            style={{ cursor: "pointer", color: sam.comment, fontSize: 18 }}
          >
            [-]
          </span>
          <div style={{ flex: 1, textAlign: "center" }}>
            <Mono c={sam.yellow} b style={{ fontSize: 26, fontVariantNumeric: "tabular-nums" }}>
              ${parsedAmount}
            </Mono>
          </div>
          <span
            onClick={() => setAmount(String(parsedAmount + 10))}
            style={{ cursor: "pointer", color: sam.comment, fontSize: 18 }}
          >
            [+]
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          {[25, 50, 100, 250].map((v) => (
            <div
              key={v}
              onClick={() => setAmount(String(v))}
              style={{
                flex: 1,
                textAlign: "center",
                padding: "6px 0",
                border: `1px solid ${parsedAmount === v ? sam.yellow : sam.border}`,
                color: parsedAmount === v ? sam.yellow : sam.text,
                cursor: "pointer",
                fontSize: 13,
                background: parsedAmount === v ? sam.active : "transparent",
              }}
            >
              ${v}
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
        <div
          onClick={() => applyContribution(1)}
          style={{
            flex: 1,
            padding: "10px 0",
            textAlign: "center",
            background: sam.green,
            color: sam.bg,
            fontWeight: 700,
            cursor: parsedAmount > 0 && !busy ? "pointer" : "default",
            opacity: parsedAmount > 0 && !busy ? 1 : 0.45,
            fontSize: 13,
            pointerEvents: parsedAmount > 0 && !busy ? "auto" : "none",
          }}
        >
          {busy ? t("[saving...]") : "[add]"}
        </div>
        <div
          onClick={() => applyContribution(-1)}
          style={{
            flex: 1,
            padding: "10px 0",
            textAlign: "center",
            background: sam.red,
            color: sam.bg,
            fontWeight: 700,
            cursor: parsedAmount > 0 && !busy ? "pointer" : "default",
            opacity: parsedAmount > 0 && !busy ? 1 : 0.45,
            fontSize: 13,
            pointerEvents: parsedAmount > 0 && !busy ? "auto" : "none",
          }}
        >
          {busy ? t("[saving...]") : "[subtract]"}
        </div>
      </div>
    </div>
  );
}

function NewExpenseSheet({
  state,
  setState,
  onClose,
}: {
  state: ClientAppState;
  setState: SheetContentProps["setState"];
  onClose: () => void;
}) {
  const { sam } = useSam();
  const t = useT();
  const [amount, setAmount] = useState("");
  const [name, setName] = useState("");
  const [catKey, setCatKey] = useState("food");
  const defaultAccount =
    state.accounts.find((a) => a.type === "checking") ||
    state.accounts.find((a) => a.type === "cash") ||
    state.accounts[0];
  const [accountId, setAccountId] = useState(defaultAccount?.id ?? "");
  const cats = (state.budgets || []).map((b) => ({
    key: b.key,
    icon: b.icon,
    name: b.name,
    c: b.c,
  }));
  const selectedAccount = state.accounts.find((a) => a.id === accountId);
  const canSave = !!(amount && name && !isNaN(parseFloat(amount)) && accountId);
  const { busy, run } = useMutationLock();

  const save = async () => {
    if (!canSave) return;
    await run(async () => {
      const res = await addExpenseAction({
        amount: parseFloat(amount),
        name,
        catKey,
        accountId,
        budgets: state.budgets,
        accounts: state.accounts,
      });
      setState((s) => ({
        ...s,
        expenses: [...s.expenses, res.tx],
        accounts: s.accounts.map((a) => res.accounts.find((x) => x.id === a.id) ?? a),
      }));
      onClose();
    });
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 14 }}>
        <span onClick={onClose} style={{ cursor: "pointer", color: sam.comment }}>
          {t("[cancel]")}
        </span>
        <Mono c={sam.cyan} b>
          $ expense --new
        </Mono>
        <SheetSaveControl enabled={canSave} busy={busy} onSave={save} />
      </div>
      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>
          <Mono c={sam.green}>$</Mono>{" "}
          <Mono c={sam.green} b>
            {" "}
            {t("amount")}
          </Mono>
        </div>
        <div
          style={{
            marginTop: 6,
            padding: "10px 12px",
            border: `1px solid ${sam.border}`,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Mono c={sam.yellow} b style={{ fontSize: 20 }}>
            {currencySymbol(selectedAccount?.currency)}
          </Mono>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="0.00"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: sam.text,
              fontFamily: sam.font,
              fontSize: 22,
              fontWeight: 600,
            }}
          />
        </div>
      </div>
      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>
          <Mono c={sam.cyan}>✎</Mono>{" "}
          <Mono c={sam.cyan} b>
            {t("name")}
          </Mono>
        </div>
        <div style={{ marginTop: 6, padding: "10px 12px", border: `1px solid ${sam.border}` }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("e.g. Lunch, Coffee, Uber...")}
            style={{
              width: "100%",
              background: "transparent",
              border: "none",
              outline: "none",
              color: sam.text,
              fontFamily: sam.font,
              fontSize: 14,
            }}
          />
        </div>
      </div>
      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>
          <Mono c={sam.magenta}>◎</Mono>{" "}
          <Mono c={sam.magenta} b>
            {t("category")}
          </Mono>
        </div>
        <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 6 }}>
          {cats.map((c) => (
            <div
              key={c.key}
              onClick={() => setCatKey(c.key)}
              style={{
                minWidth: 0,
                padding: "8px 4px",
                textAlign: "center",
                border: `1px solid ${catKey === c.key ? c.c : sam.border}`,
                background: catKey === c.key ? `${c.c}15` : "transparent",
                cursor: "pointer",
                transition: "all 140ms",
              }}
            >
              <div style={{ fontSize: 16 }}>{c.icon}</div>
              <div
                style={{
                  fontSize: 10,
                  marginTop: 2,
                  color: catKey === c.key ? c.c : sam.comment,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {c.name.toLowerCase()}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>
          <Mono c={sam.cyan}>◉</Mono>{" "}
          <Mono c={sam.cyan} b>
            {t("account")}
          </Mono>
        </div>
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
          {state.accounts.map((a) => {
            const c = accountColor(a.type);
            const selected = accountId === a.id;
            return (
              <div
                key={a.id}
                onClick={() => setAccountId(a.id)}
                style={{
                  padding: "8px 10px",
                  border: `1px solid ${selected ? c : sam.border}`,
                  background: selected ? `${c}15` : "transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                }}
              >
                <Mono c={c} b>
                  {a.icon}
                </Mono>
                <Mono c={sam.text} b>
                  {a.name}
                </Mono>
                <Mono c={sam.comment} style={{ fontSize: 11 }}>
                  {accountLabel(a.type)} · {currencySymbol(a.currency)}
                </Mono>
                <span style={{ flex: 1 }} />
                {selected && <Mono c={c}>✓</Mono>}
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ marginTop: 18, fontSize: 11, color: sam.comment }}>
        {`// ${t("will log to {date} · {account}", { date: new Date().toLocaleString(undefined, { month: "short", day: "numeric" }), account: selectedAccount?.name ?? t("account") })}`}
      </div>
    </div>
  );
}

function NewGoalSheet({
  setState,
  onClose,
}: {
  setState: SheetContentProps["setState"];
  onClose: () => void;
}) {
  const { sam } = useSam();
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [iconPreset, setIconPreset] = useState(GOAL_ICON_PRESETS[0]);
  const parsedTarget = parseFloat(target);
  const canSave = !!(name.trim() && target && !isNaN(parsedTarget) && parsedTarget >= 0);
  const { busy, run } = useMutationLock();

  const save = async () => {
    if (!canSave) return;
    await run(async () => {
      const row = await addGoalAction({
        name,
        target: parsedTarget,
        icon: iconPreset.icon,
        color: iconPreset.color,
      });
      setState((s) => ({ ...s, goals: [...s.goals, row] }));
      onClose();
    });
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 14 }}>
        <span onClick={onClose} style={{ cursor: "pointer", color: sam.comment }}>
          [cancel]
        </span>
        <Mono c={sam.cyan} b>
          $ goal --new
        </Mono>
        <SheetSaveControl enabled={canSave} busy={busy} onSave={save} />
      </div>
      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>
          <Mono c={iconPreset.color}>◆</Mono>{" "}
          <Mono c={iconPreset.color} b>
            icon
          </Mono>
        </div>
        <IconPresetPicker presets={GOAL_ICON_PRESETS} value={iconPreset} onChange={setIconPreset} />
      </div>
      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>
          <Mono c={sam.green}>✎</Mono>{" "}
          <Mono c={sam.green} b>
            name
          </Mono>
        </div>
        <div style={{ marginTop: 6, padding: "10px 12px", border: `1px solid ${sam.border}` }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Trip to Japan"
            style={{
              width: "100%",
              background: "transparent",
              border: "none",
              outline: "none",
              color: sam.text,
              fontFamily: sam.font,
              fontSize: 14,
            }}
          />
        </div>
      </div>
      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>
          <Mono c={sam.yellow}>◎</Mono>{" "}
          <Mono c={sam.yellow} b>
            target
          </Mono>
        </div>
        <div
          style={{
            marginTop: 6,
            padding: "10px 12px",
            border: `1px solid ${sam.border}`,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Mono c={sam.yellow} b style={{ fontSize: 20 }}>
            $
          </Mono>
          <input
            value={target}
            onChange={(e) => setTarget(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="5000"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: sam.text,
              fontFamily: sam.font,
              fontSize: 22,
              fontWeight: 600,
            }}
          />
        </div>
      </div>
    </div>
  );
}

function NewBudgetSheet({
  state,
  setState,
  onClose,
}: {
  state: ClientAppState;
  setState: SheetContentProps["setState"];
  onClose: () => void;
}) {
  const { sam } = useSam();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [iconPreset, setIconPreset] = useState(BUDGET_ICON_PRESETS[0]);
  const parsedAmount = parseFloat(amount);
  const canSave = !!(name.trim() && Number.isFinite(parsedAmount) && parsedAmount >= 0);
  const { busy, run } = useMutationLock();

  const save = async () => {
    if (!canSave) return;
    await run(async () => {
      const row = await addBudgetAction({
        name,
        amount: parsedAmount,
        icon: iconPreset.icon,
        color: iconPreset.color,
        currency: state.prefs.defaultCurrency,
      });
      setState((s) => ({ ...s, budgets: [...s.budgets, row] }));
      onClose();
    });
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 14 }}>
        <span onClick={onClose} style={{ cursor: "pointer", color: sam.comment }}>
          [cancel]
        </span>
        <Mono c={sam.cyan} b>
          $ envelope --new
        </Mono>
        <SheetSaveControl enabled={canSave} busy={busy} onSave={save} />
      </div>
      <Comment>create budget envelope</Comment>
      <div style={{ marginTop: 12 }}>
        <IconPresetPicker presets={BUDGET_ICON_PRESETS} value={iconPreset} onChange={setIconPreset} />
      </div>
      <label className="mt-3 block">
        <Comment>name</Comment>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Groceries"
          className="mt-1 w-full border bg-transparent px-3 py-2 text-sm outline-none"
          style={{ borderColor: sam.border, color: sam.text, fontFamily: sam.font }}
        />
      </label>
      <label className="mt-3 block">
        <Comment>monthly amount</Comment>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
          placeholder="500"
          className="mt-1 w-full border bg-transparent px-3 py-2 text-sm outline-none"
          style={{ borderColor: sam.border, color: sam.text, fontFamily: sam.font }}
        />
      </label>
    </div>
  );
}

function EditBudgetSheet({
  sheet,
  setState,
  onClose,
}: {
  sheet: Extract<SheetPayload, { kind: "edit-budget" }>;
  setState: SheetContentProps["setState"];
  onClose: () => void;
}) {
  const { sam } = useSam();
  const { budget: b, spent } = sheet;
  const [cap, setCap] = useState(String(b.cap));
  const [name, setName] = useState(b.name);
  const [iconPreset, setIconPreset] = useState(presetFromStored(BUDGET_ICON_PRESETS, b.icon, b.c));
  const parsedCap = parseFloat(cap);
  const canSave = !!(name.trim() && Number.isFinite(parsedCap) && parsedCap >= 0);
  const { busy, run } = useMutationLock();

  const save = async () => {
    if (!canSave || !b.id) return;
    await run(async () => {
      const row = await updateBudgetAction({
        id: b.id,
        name,
        amount: parsedCap,
        icon: iconPreset.icon,
        color: iconPreset.color,
      });
      setState((s) => ({
        ...s,
        budgets: s.budgets.map((x) => (x.key === b.key ? row : x)),
        expenses: s.expenses.map((e) =>
          e.catKey === b.key
            ? { ...e, category: row.name, catKey: row.key, catColor: row.c, icon: row.icon }
            : e
        ),
      }));
      onClose();
    });
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 14 }}>
        <span onClick={onClose} style={{ cursor: "pointer", color: sam.comment }}>
          [cancel]
        </span>
        <Mono
          c={sam.cyan}
          b
          style={{ margin: "0 8px", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        >
          $ budget --edit {name || b.name}
        </Mono>
        <SheetSaveControl enabled={canSave} busy={busy} onSave={save} />
      </div>
      <div style={{ textAlign: "center", marginTop: 10, marginBottom: 18 }}>
        <div style={{ fontSize: 34, color: iconPreset.color }}>{iconPreset.icon}</div>
        <div style={{ fontSize: 15, color: sam.text, fontWeight: 600, marginTop: 4 }}>{name || b.name}</div>
        <div style={{ fontSize: 11, color: sam.comment, marginTop: 2 }}>
          spent ${spent.toFixed(0)} this month
        </div>
      </div>
      <IconPresetPicker presets={BUDGET_ICON_PRESETS} value={iconPreset} onChange={setIconPreset} />
      <label className="mt-3 block">
        <Comment>name</Comment>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full border bg-transparent px-3 py-2 text-sm outline-none"
          style={{ borderColor: sam.border, color: sam.text, fontFamily: sam.font }}
        />
      </label>
      <div style={{ fontSize: 13, fontWeight: 600 }}>
        <Mono c={sam.yellow}>◎</Mono>{" "}
        <Mono c={sam.yellow} b>
          {" "}
          monthly cap
        </Mono>
      </div>
      <div
        style={{
          marginTop: 10,
          padding: "10px 12px",
          border: `1px solid ${sam.border}`,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <Mono c={sam.yellow} b style={{ fontSize: 18 }}>$</Mono>
        <input
          value={cap}
          onChange={(e) => setCap(e.target.value.replace(/[^0-9.]/g, ""))}
          className="w-full bg-transparent text-xl font-semibold outline-none"
          style={{ color: sam.text, fontFamily: sam.font }}
        />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        {[100, 250, 500, 1000].map((v) => (
          <div
            key={v}
            onClick={() => setCap(String(v))}
            style={{
              flex: 1,
              textAlign: "center",
              padding: "6px 0",
              border: `1px solid ${parsedCap === v ? sam.yellow : sam.border}`,
              color: parsedCap === v ? sam.yellow : sam.text,
              cursor: "pointer",
              fontSize: 13,
              background: parsedCap === v ? sam.active : "transparent",
            }}
          >
            ${v}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 16, fontSize: 11, color: sam.comment }}>
        {`// ${parsedCap >= spent ? `$${(parsedCap - spent).toFixed(0)} left this month` : `$${(spent - parsedCap).toFixed(0)} over budget`}`}
      </div>
    </div>
  );
}

// Kept for one read-only compatibility window while legacy income sources migrate.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function IncomeSrcSheet({
  sheet,
  state,
  setState,
  onClose,
}: {
  sheet: Extract<SheetPayload, { kind: "income-src" }>;
  state: ClientAppState;
  setState: SheetContentProps["setState"];
  onClose: () => void;
}) {
  const { sam } = useSam();
  const t = useT();
  const s = sheet.src as {
    id?: string;
    icon?: string;
    c?: string;
    name?: string;
    amt?: number;
    amount?: number;
    freq?: string;
    next?: string;
  };
  const amt = s.amt ?? (s.amount as number) ?? 0;
  const payments = (state.incomeTx || [])
    .filter((tx) => tx.name.toLowerCase() === (s.name || "").toLowerCase())
    .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())
    .slice(0, 6);
  const linkedTx = payments.find((p) => p.accountId);
  const depositAccountId = linkedTx?.accountId;
  const depositAccount = depositAccountId
    ? state.accounts.find((a) => a.id === depositAccountId)
    : undefined;

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(s.name ?? "");
  const [amount, setAmount] = useState(String(amt || ""));
  const defaultAccountId = depositAccountId ?? state.accounts[0]?.id ?? "";
  const [accountId, setAccountId] = useState(defaultAccountId);
  const { busy, run } = useMutationLock();
  const [error, setError] = useState("");

  const canSave = !!(name.trim() && amount && !isNaN(parseFloat(amount)) && accountId);

  const save = async () => {
    if (!canSave || !s.id) return;
    const sourceId = s.id;
    await run(async () => {
      setError("");
      try {
        const res = await updateIncomeAction({
          id: sourceId,
          name: name.trim(),
          amt: parseFloat(amount),
          accountId,
          prevAccountId: depositAccountId ?? null,
          prevAmount: linkedTx?.amount ?? 0,
          txId: linkedTx?.id ?? null,
        });
        setState((st) => {
          const balById = new Map(res.accounts.map((a) => [a.id, a.balance]));
          let incomeTx = st.incomeTx;
          if (res.incomeTx) {
            const exists = incomeTx.some((tx) => tx.id === res.incomeTx!.id);
            incomeTx = exists
              ? incomeTx.map((tx) => (tx.id === res.incomeTx!.id ? res.incomeTx! : tx))
              : [...incomeTx, res.incomeTx!];
          }
          return {
            ...st,
            incomeSources: st.incomeSources.map((src) =>
              src.id === res.source.id ? { ...src, ...res.source } : src
            ),
            incomeTx,
            accounts: st.accounts.map((a) =>
              balById.has(a.id) ? { ...a, balance: balById.get(a.id)! } : a
            ),
          };
        });
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : "could not save");
      }
    });
  };

  if (editing) {
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 14 }}>
          <span onClick={() => setEditing(false)} style={{ cursor: "pointer", color: sam.comment }}>
            {t("[cancel]")}
          </span>
          <Mono c={sam.cyan} b>
            $ income --edit
          </Mono>
          <SheetSaveControl enabled={canSave} busy={busy} onSave={save} />
        </div>
        <div style={{ marginTop: 10, fontSize: 13, fontWeight: 600 }}>
          <Mono c={sam.green}>✎</Mono>{" "}
          <Mono c={sam.green} b>
            {t("source name")}
          </Mono>
        </div>
        <div style={{ marginTop: 6, padding: "10px 12px", border: `1px solid ${sam.border}` }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ width: "100%", background: "transparent", border: "none", outline: "none", color: sam.text, fontFamily: sam.font, fontSize: 14 }}
          />
        </div>
        <div style={{ marginTop: 16, fontSize: 13, fontWeight: 600 }}>
          <Mono c={sam.yellow}>$</Mono>{" "}
          <Mono c={sam.yellow} b>
            {t("amount")}
          </Mono>
        </div>
        <div style={{ marginTop: 6, padding: "10px 12px", border: `1px solid ${sam.border}`, display: "flex", alignItems: "center", gap: 6 }}>
          <Mono c={sam.yellow} b style={{ fontSize: 20 }}>
            {currencySymbol(state.accounts.find((a) => a.id === accountId)?.currency)}
          </Mono>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="0.00"
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: sam.text, fontFamily: sam.font, fontSize: 22, fontWeight: 600 }}
          />
        </div>
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            <Mono c={sam.cyan}>◉</Mono>{" "}
            <Mono c={sam.cyan} b>
              {t("deposit to")}
            </Mono>
          </div>
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
            {state.accounts.map((a) => {
              const c = accountColor(a.type);
              const selected = accountId === a.id;
              return (
                <div
                  key={a.id}
                  onClick={() => setAccountId(a.id)}
                  style={{ padding: "8px 10px", border: `1px solid ${selected ? c : sam.border}`, background: selected ? `${c}15` : "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}
                >
                  <Mono c={c} b>{a.icon}</Mono>
                  <Mono c={sam.text} b>{a.name}</Mono>
                  <Mono c={sam.comment} style={{ fontSize: 11 }}>{accountLabel(a.type)} · {currencySymbol(a.currency)}</Mono>
                  <span style={{ flex: 1 }} />
                  {selected && <Mono c={c}>✓</Mono>}
                </div>
              );
            })}
          </div>
        </div>
        {error && <div style={{ marginTop: 10, fontSize: 11, color: sam.red }}>{error}</div>}
        <div style={{ marginTop: 14, fontSize: 11, color: sam.comment }}>
          {`// ${t("changing the account moves the cash, no duplication")}`}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 14 }}>
        <span onClick={onClose} style={{ cursor: "pointer", color: sam.comment }}>
          {t("[close]")}
        </span>
        <Mono c={sam.cyan} b>
          $ income --view
        </Mono>
        <span
          onClick={s.id ? () => setEditing(true) : undefined}
          style={{ color: s.id ? sam.yellow : sam.comment, cursor: s.id ? "pointer" : "default" }}
        >
          {t("[edit]")}
        </span>
      </div>
      <div style={{ textAlign: "center", marginTop: 8, marginBottom: 18 }}>
        <div style={{ fontSize: 34, color: s.c }}>{s.icon}</div>
        <div style={{ fontSize: 15, color: sam.text, fontWeight: 600, marginTop: 4 }}>{s.name}</div>
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: sam.green,
            marginTop: 8,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          +{currencySymbol(depositAccount?.currency)}{amt.toLocaleString()}
        </div>
        <div style={{ fontSize: 12, color: sam.comment, marginTop: 2 }}>
          {s.freq || t("recurring")} · {t("next")} {s.next || t("tbd")}
        </div>
        {depositAccount && (
          <div style={{ fontSize: 12, color: sam.comment, marginTop: 8 }}>
            {t("deposit to")} ·{" "}
            <Mono c={depositAccount.color || accountColor(depositAccount.type)}>
              {depositAccount.icon || accountDefaultIcon(depositAccount.type)}
            </Mono>{" "}
            <Mono c={sam.text}>{depositAccount.name}</Mono>
          </div>
        )}
      </div>
      <div style={{ fontSize: 13, borderTop: `1px solid ${sam.border}`, paddingTop: 12 }}>
        <Mono c={sam.cyan} b>
          ▸ {t("recent payments")}
        </Mono>
        {payments.length === 0 && (
          <div style={{ marginTop: 8, fontSize: 12, color: sam.comment }}>{`// ${t("no payments logged yet")}`}</div>
        )}
        {payments.map((p, i) => (
          <div key={p.id} style={{ display: "flex", marginTop: 6, fontSize: 12 }}>
            <Mono c={sam.comment}>{i === payments.length - 1 ? "└─ " : "├─ "}</Mono>
            <Mono c={sam.text}>{p.time}</Mono>
            <span style={{ flex: 1 }} />
            <Mono c={sam.green} b>
              +{currencySymbol(state.accounts.find((a) => a.id === p.accountId)?.currency ?? depositAccount?.currency)}{p.amount.toLocaleString()}
            </Mono>
          </div>
        ))}
      </div>
    </div>
  );
}

function NewIncomeSheet({
  state,
  setState,
  onClose,
}: {
  state: ClientAppState;
  setState: SheetContentProps["setState"];
  onClose: () => void;
}) {
  const { sam } = useSam();
  const [name, setName] = useState("");
  const [amt, setAmt] = useState("");
  const defaultAccount =
    state.accounts.find((a) => a.type === "checking") ||
    state.accounts.find((a) => a.type === "cash") ||
    state.accounts[0];
  const [accountId, setAccountId] = useState(defaultAccount?.id ?? "");
  const selectedAccount = state.accounts.find((a) => a.id === accountId);
  const canSave = !!(name && amt && !isNaN(parseFloat(amt)) && accountId);
  const { busy, run } = useMutationLock();

  const save = async () => {
    if (!canSave) return;
    await run(async () => {
      const row = await addIncomeAction({
        name,
        amt: parseFloat(amt),
        accountId,
      });
      setState((st) => ({
        ...st,
        incomeTx: [...st.incomeTx, row.tx],
        accounts: st.accounts.map((a) => (a.id === row.account.id ? row.account : a)),
      }));
      onClose();
    });
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 14 }}>
        <span onClick={onClose} style={{ cursor: "pointer", color: sam.comment }}>
          [cancel]
        </span>
        <Mono c={sam.cyan} b>
          $ income --new
        </Mono>
        <SheetSaveControl enabled={canSave} busy={busy} onSave={save} />
      </div>
      <div style={{ marginTop: 10, fontSize: 13, fontWeight: 600 }}>
        <Mono c={sam.green}>✎</Mono>{" "}
        <Mono c={sam.green} b>
          source name
        </Mono>
      </div>
      <div style={{ marginTop: 6, padding: "10px 12px", border: `1px solid ${sam.border}` }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Client X · consulting"
          style={{
            width: "100%",
            background: "transparent",
            border: "none",
            outline: "none",
            color: sam.text,
            fontFamily: sam.font,
            fontSize: 14,
          }}
        />
      </div>
      <div style={{ marginTop: 16, fontSize: 13, fontWeight: 600 }}>
        <Mono c={sam.yellow}>$</Mono>{" "}
        <Mono c={sam.yellow} b>
          amount
        </Mono>
      </div>
      <div
        style={{
          marginTop: 6,
          padding: "10px 12px",
          border: `1px solid ${sam.border}`,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <Mono c={sam.yellow} b style={{ fontSize: 20 }}>
          $
        </Mono>
        <input
          value={amt}
          onChange={(e) => setAmt(e.target.value.replace(/[^0-9.]/g, ""))}
          placeholder="0.00"
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: sam.text,
            fontFamily: sam.font,
            fontSize: 22,
            fontWeight: 600,
          }}
        />
      </div>
      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>
          <Mono c={sam.cyan}>◉</Mono>{" "}
          <Mono c={sam.cyan} b>
            deposit to
          </Mono>
        </div>
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
          {state.accounts.map((a) => {
            const c = accountColor(a.type);
            const selected = accountId === a.id;
            return (
              <div
                key={a.id}
                onClick={() => setAccountId(a.id)}
                style={{
                  padding: "8px 10px",
                  border: `1px solid ${selected ? c : sam.border}`,
                  background: selected ? `${c}15` : "transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                }}
              >
                <Mono c={c} b>
                  {a.icon}
                </Mono>
                <Mono c={sam.text} b>
                  {a.name}
                </Mono>
                <Mono c={sam.comment} style={{ fontSize: 11 }}>
                  {accountLabel(a.type)}
                </Mono>
                <span style={{ flex: 1 }} />
                {selected && <Mono c={c}>✓</Mono>}
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ marginTop: 18, fontSize: 11, color: sam.comment }}>
        {`// credits ${selectedAccount?.name ?? "account"} on save`}
      </div>
    </div>
  );
}

function AccountSheet({
  sheet,
  state,
  openSheet,
  onClose,
}: {
  sheet: Extract<SheetPayload, { kind: "account" }>;
  state: ClientAppState;
  openSheet: SheetContentProps["openSheet"];
  onClose: () => void;
}) {
  const { sam } = useSam();
  const a = state.accounts.find((x) => x.id === sheet.accountId);
  if (!a) {
    return (
      <div style={{ fontSize: 13, color: sam.comment }}>
        // account not found
        <div onClick={onClose} style={{ marginTop: 12, cursor: "pointer", color: sam.cyan }}>
          [close]
        </div>
      </div>
    );
  }
  const color = accountColor(a.type);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 14 }}>
        <span onClick={onClose} style={{ cursor: "pointer", color: sam.comment }}>
          [close]
        </span>
        <Mono c={sam.cyan} b>
          $ account --view
        </Mono>
        <span
          onClick={() => openSheet({ kind: "edit-account", accountId: a.id })}
          style={{ color: sam.yellow, cursor: "pointer" }}
        >
          [edit]
        </span>
      </div>
      <div style={{ textAlign: "center", marginTop: 8 }}>
        <div style={{ fontSize: 34, color }}>{a.icon}</div>
        <div style={{ fontSize: 15, color: sam.text, fontWeight: 600, marginTop: 4 }}>
          {a.name}
        </div>
        <div style={{ fontSize: 11, color, marginTop: 2 }}>{accountLabel(a.type)}</div>
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            marginTop: 10,
            color: a.balance < 0 ? sam.red : color,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {a.balance < 0 ? "-" : ""}$
          {Math.abs(a.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </div>
      </div>
      <div style={{ marginTop: 18, fontSize: 13 }}>
        <div
          onClick={() => openSheet({ kind: "transfer", fromId: a.id })}
          style={{
            textAlign: "center",
            padding: "10px 0",
            border: `1px solid ${sam.border}`,
            cursor: "pointer",
            color: sam.cyan,
          }}
        >
          [transfer]
        </div>
      </div>
    </div>
  );
}

function AccountFormFields({
  type,
  setType,
  name,
  setName,
  icon,
  setIcon,
  currency,
  setCurrency,
}: {
  type: string;
  setType: (t: string) => void;
  name: string;
  setName: (n: string) => void;
  icon: string;
  setIcon: (i: string) => void;
  currency: Currency;
  setCurrency: (c: Currency) => void;
}) {
  const { sam } = useSam();
  const t = useT();
  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "transparent",
    border: "none",
    outline: "none",
    color: sam.text,
    fontFamily: sam.font,
    fontSize: 14,
  };

  return (
    <>
      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>
          <Mono c={sam.magenta}>◎</Mono>{" "}
          <Mono c={sam.magenta} b>
            {t("type")}
          </Mono>
        </div>
        <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
          {ACCOUNT_TYPES.map((at) => {
            const selected = type === at.key;
            return (
              <div
                key={at.key}
                onClick={() => {
                  setType(at.key);
                  setIcon(at.defaultIcon);
                }}
                style={{
                  padding: "8px 6px",
                  textAlign: "center",
                  border: `1px solid ${selected ? at.color : sam.border}`,
                  background: selected ? `${at.color}15` : "transparent",
                  cursor: "pointer",
                }}
              >
                <Mono c={at.color} b>
                  {at.defaultIcon} {t(at.label)}
                </Mono>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>
          <Mono c={sam.cyan}>$</Mono>{" "}
          <Mono c={sam.cyan} b>
            {t("currency")}
          </Mono>
        </div>
        <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
          {SUPPORTED_CURRENCIES.map((cur) => {
            const selected = currency === cur.code;
            return (
              <div
                key={cur.code}
                onClick={() => setCurrency(cur.code)}
                style={{
                  padding: "8px 6px",
                  textAlign: "center",
                  border: `1px solid ${selected ? sam.cyan : sam.border}`,
                  background: selected ? `${sam.cyan}15` : "transparent",
                  cursor: "pointer",
                }}
              >
                <Mono c={selected ? sam.cyan : sam.comment} b={selected}>
                  {cur.label}
                </Mono>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>
          <Mono c={sam.green}>✎</Mono>{" "}
          <Mono c={sam.green} b>
            {t("name")}
          </Mono>
        </div>
        <div style={{ marginTop: 6, padding: "10px 12px", border: `1px solid ${sam.border}` }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("e.g. Cash, Main Card...")}
            style={inputStyle}
          />
        </div>
      </div>
      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>
          <Mono c={sam.yellow}>◉</Mono>{" "}
          <Mono c={sam.yellow} b>
            {t("icon")}
          </Mono>
        </div>
        <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 4 }}>
          {ACCOUNT_EMOJIS.map((e) => (
            <div
              key={e}
              onClick={() => setIcon(e)}
              style={{
                padding: "8px 0",
                textAlign: "center",
                border: `1px solid ${icon === e ? accountColor(type) : sam.border}`,
                background: icon === e ? `${accountColor(type)}15` : "transparent",
                cursor: "pointer",
                fontSize: 16,
              }}
            >
              {e}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function CreateAccountSheet({
  setState,
  onClose,
}: {
  setState: SheetContentProps["setState"];
  onClose: () => void;
}) {
  const { sam } = useSam();
  const t = useT();
  const [type, setType] = useState("cash");
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(accountDefaultIcon("cash"));
  const [currency, setCurrency] = useState<Currency>("USD");
  const [error, setError] = useState("");
  const canSave = name.trim().length >= 1;
  const { busy, run } = useMutationLock();

  const save = async () => {
    if (!canSave) return;
    await run(async () => {
      setError("");
      try {
        const row = await addAccountAction({ name: name.trim(), type, icon, currency });
        setState((s) => ({ ...s, accounts: [...s.accounts, row] }));
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : "failed to create account");
      }
    });
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 14 }}>
        <span onClick={onClose} style={{ cursor: "pointer", color: sam.comment }}>
          [cancel]
        </span>
        <Mono c={sam.cyan} b>
          $ account --new
        </Mono>
        <SheetSaveControl enabled={canSave} busy={busy} onSave={save} />
      </div>
      <AccountFormFields type={type} setType={setType} name={name} setName={setName} icon={icon} setIcon={setIcon} currency={currency} setCurrency={setCurrency} />
      {error && <div style={{ marginTop: 12, fontSize: 11, color: sam.red }}>{error}</div>}
    </div>
  );
}

function EditAccountSheet({
  sheet,
  state,
  setState,
  openSheet,
  onClose,
}: {
  sheet: Extract<SheetPayload, { kind: "edit-account" }>;
  state: ClientAppState;
  setState: SheetContentProps["setState"];
  openSheet: SheetContentProps["openSheet"];
  onClose: () => void;
}) {
  const { sam } = useSam();
  const t = useT();
  const existing = state.accounts.find((a) => a.id === sheet.accountId);
  const [type, setType] = useState(existing?.type ?? "cash");
  const [name, setName] = useState(existing?.name ?? "");
  const [icon, setIcon] = useState(existing?.icon ?? accountDefaultIcon("cash"));
  const [currency, setCurrency] = useState<Currency>(normalizeCurrency(existing?.currency));
  const [error, setError] = useState("");
  const canSave = name.trim().length >= 1 && !!existing;
  const { busy, run } = useMutationLock();

  const cancel = () => openSheet({ kind: "account", accountId: sheet.accountId });

  const save = async () => {
    if (!canSave || !existing) return;
    await run(async () => {
      setError("");
      try {
        const row = await updateAccountAction({
          id: existing.id,
          name: name.trim(),
          type,
          icon,
          currency,
        });
        setState((s) => ({
          ...s,
          accounts: s.accounts.map((a) => (a.id === row.id ? row : a)),
        }));
        openSheet({ kind: "account", accountId: row.id });
      } catch (e) {
        setError(e instanceof Error ? e.message : "failed to update account");
      }
    });
  };

  if (!existing) {
    return (
      <div style={{ fontSize: 13, color: sam.comment }}>
        // account not found
        <div onClick={onClose} style={{ marginTop: 12, cursor: "pointer", color: sam.cyan }}>
          [close]
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 14 }}>
        <span onClick={cancel} style={{ cursor: "pointer", color: sam.comment }}>
          [cancel]
        </span>
        <Mono c={sam.cyan} b>
          $ account --edit
        </Mono>
        <SheetSaveControl enabled={canSave} busy={busy} onSave={save} />
      </div>
      <AccountFormFields type={type} setType={setType} name={name} setName={setName} icon={icon} setIcon={setIcon} currency={currency} setCurrency={setCurrency} />
      {error && <div style={{ marginTop: 12, fontSize: 11, color: sam.red }}>{error}</div>}
    </div>
  );
}

function TransferSheet({
  sheet,
  state,
  setState,
  onClose,
}: {
  sheet: Extract<SheetPayload, { kind: "transfer" }>;
  state: ClientAppState;
  setState: SheetContentProps["setState"];
  onClose: () => void;
}) {
  const { sam } = useSam();
  const accounts = state.accounts;
  const defaultFrom =
    sheet.fromId && accounts.some((a) => a.id === sheet.fromId)
      ? sheet.fromId
      : accounts[0]?.id ?? "";
  const [fromId, setFromId] = useState(defaultFrom);
  const [toId, setToId] = useState(
    accounts.find((a) => a.id !== defaultFrom)?.id ?? ""
  );
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const amt = parseFloat(amount);
  const canSave = !!(fromId && toId && fromId !== toId && amt > 0);
  const { busy, run } = useMutationLock();

  const save = async () => {
    if (!canSave) return;
    await run(async () => {
      setError("");
      try {
        const res = await transferAction({ fromId, toId, amount: amt });
        setState((s) => ({
          ...s,
          accounts: s.accounts.map((a) => {
            if (a.id === res.from.id) return { ...a, balance: res.from.balance };
            if (a.id === res.to.id) return { ...a, balance: res.to.balance };
            return a;
          }),
        }));
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : "transfer failed");
      }
    });
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 14 }}>
        <span onClick={onClose} style={{ cursor: "pointer", color: sam.comment }}>
          [cancel]
        </span>
        <Mono c={sam.cyan} b>
          $ transfer
        </Mono>
        <SheetSaveControl enabled={canSave} busy={busy} onSave={save} />
      </div>
      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>
          <Mono c={sam.cyan}>◉</Mono>{" "}
          <Mono c={sam.cyan} b>
            from
          </Mono>
        </div>
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
          {accounts.map((a) => {
            const c = accountColor(a.type);
            const selected = fromId === a.id;
            return (
              <div
                key={a.id}
                onClick={() => {
                  setFromId(a.id);
                  if (toId === a.id) {
                    const other = accounts.find((x) => x.id !== a.id);
                    if (other) setToId(other.id);
                  }
                }}
                style={{
                  padding: "8px 10px",
                  border: `1px solid ${selected ? c : sam.border}`,
                  background: selected ? `${c}15` : "transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                }}
              >
                <Mono c={c} b>
                  {a.icon}
                </Mono>
                <Mono c={sam.text} b>
                  {a.name}
                </Mono>
                <span style={{ flex: 1 }} />
                <Mono c={c} b>
                  ${a.balance.toFixed(2)}
                </Mono>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>
          <Mono c={sam.yellow}>$</Mono>{" "}
          <Mono c={sam.yellow} b>
            amount
          </Mono>
        </div>
        <div
          style={{
            marginTop: 6,
            padding: "10px 12px",
            border: `1px solid ${sam.border}`,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Mono c={sam.yellow} b style={{ fontSize: 20 }}>
            $
          </Mono>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="0.00"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: sam.text,
              fontFamily: sam.font,
              fontSize: 22,
              fontWeight: 600,
            }}
          />
        </div>
      </div>
      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>
          <Mono c={sam.green}>◎</Mono>{" "}
          <Mono c={sam.green} b>
            to
          </Mono>
        </div>
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
          {accounts
            .filter((a) => a.id !== fromId)
            .map((a) => {
              const c = accountColor(a.type);
              const selected = toId === a.id;
              return (
                <div
                  key={a.id}
                  onClick={() => setToId(a.id)}
                  style={{
                    padding: "8px 10px",
                    border: `1px solid ${selected ? c : sam.border}`,
                    background: selected ? `${c}15` : "transparent",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 13,
                  }}
                >
                  <Mono c={c} b>
                    {a.icon}
                  </Mono>
                  <Mono c={sam.text} b>
                    {a.name}
                  </Mono>
                  <span style={{ flex: 1 }} />
                  {selected && <Mono c={c}>✓</Mono>}
                </div>
              );
            })}
        </div>
      </div>
      {error && <div style={{ marginTop: 12, fontSize: 11, color: sam.red }}>{error}</div>}
    </div>
  );
}

function ChangeCredentialsSheet({ onClose }: { onClose: () => void }) {
  const { sam } = useSam();
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const { busy, run } = useMutationLock();
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const match = pw1 === pw2 && pw1.length >= 8;
  const canSave = match;

  const save = async () => {
    if (!canSave) return;
    await run(async () => {
      setError("");
      try {
        await setCredentialsAction(pw1);
        setDone(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "failed to update credentials");
      }
    });
  };

  const inputStyle: React.CSSProperties = {
    flex: 1,
    background: "transparent",
    border: "none",
    outline: "none",
    color: sam.text,
    fontFamily: sam.font,
    fontSize: 14,
  };

  if (done) {
    return (
      <div>
        <div style={{ fontSize: 13, color: sam.green, marginTop: 8 }}>✓ credentials updated</div>
        <div style={{ fontSize: 11, color: sam.comment, marginTop: 6 }}>
          {`// you can now sign in with email + password`}
        </div>
        <div
          onClick={onClose}
          style={{
            marginTop: 18,
            padding: "10px 0",
            textAlign: "center",
            background: sam.green,
            color: sam.bg,
            fontWeight: 700,
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          [done]
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 14 }}>
        <span onClick={onClose} style={{ cursor: "pointer", color: sam.comment }}>
          [cancel]
        </span>
        <Mono c={sam.cyan} b>
          $ credentials --set
        </Mono>
        <SheetSaveControl enabled={canSave} busy={busy} onSave={save} />
      </div>
      <div style={{ fontSize: 11, color: sam.comment, marginBottom: 12 }}>
        {`// set or update your email + password login`}
      </div>
      {(["new password", "confirm password"] as const).map((label, i) => (
        <div key={label} style={{ marginTop: i === 0 ? 0 : 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            <Mono c={sam.yellow}>◎</Mono>{" "}
            <Mono c={sam.yellow} b>
              {label}
            </Mono>
          </div>
          <div
            style={{
              marginTop: 6,
              padding: "10px 12px",
              border: `1px solid ${sam.border}`,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <input
              value={i === 0 ? pw1 : pw2}
              onChange={(e) => (i === 0 ? setPw1 : setPw2)(e.target.value)}
              type={show ? "text" : "password"}
              autoComplete={i === 0 ? "new-password" : "new-password"}
              placeholder="••••••••"
              style={inputStyle}
            />
            {i === 1 && (
              <span onClick={() => setShow(!show)} style={{ cursor: "pointer", fontSize: 11, color: sam.comment }}>
                [{show ? "hide" : "show"}]
              </span>
            )}
          </div>
        </div>
      ))}
      {pw2 && pw1 !== pw2 && (
        <div style={{ marginTop: 8, fontSize: 11, color: sam.red }}>{`// passwords do not match`}</div>
      )}
      {pw1 && pw1.length < 8 && (
        <div style={{ marginTop: 8, fontSize: 11, color: sam.comment }}>{`// minimum 8 characters`}</div>
      )}
      {error && <div style={{ marginTop: 12, fontSize: 11, color: sam.red }}>{error}</div>}
    </div>
  );
}

function McpConnectSheet({ onClose }: { onClose: () => void }) {
  const { sam } = useSam();
  const t = useT();
  const [tokens, setTokens] = useState<McpTokenSummary[] | null>(null);
  const [name, setName] = useState("My assistant");
  const [scopes, setScopes] = useState<Scope[]>([...DEFAULT_SCOPES]);
  const { busy, run } = useMutationLock();
  const [error, setError] = useState("");
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState<"token" | "url" | null>(null);

  const endpoint =
    typeof window !== "undefined" ? `${window.location.origin}/api/mcp` : "/api/mcp";

  const refresh = async () => {
    try {
      setTokens(await listMcpTokensAction());
    } catch {
      setTokens([]);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const toggleScope = (scope: Scope) => {
    setScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  const copy = (value: string, which: "token" | "url") => {
    const done = () => {
      setCopied(which);
      setTimeout(() => setCopied(null), 1600);
    };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(value).then(done).catch(done);
    else done();
  };

  const generate = async () => {
    if (!name.trim() || scopes.length === 0) return;
    await run(async () => {
      setError("");
      try {
        const res = await createMcpTokenAction({ name: name.trim(), scopes });
        setNewToken(res.token);
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "could not create token");
      }
    }, "connect");
  };

  const revoke = async (id: string) => {
    await run(async () => {
      await revokeMcpTokenAction(id);
      await refresh();
    }, "revoke");
  };

  const inputStyle: React.CSSProperties = {
    flex: 1,
    background: "transparent",
    border: "none",
    outline: "none",
    color: sam.text,
    fontFamily: sam.font,
    fontSize: 14,
  };

  const activeTokens = (tokens || []).filter((t) => !t.revokedAt);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 14 }}>
        <span onClick={onClose} style={{ cursor: "pointer", color: sam.comment }}>
          [close]
        </span>
        <Mono c={sam.cyan} b>
          $ mcp --connect
        </Mono>
        <span style={{ width: 44 }} />
      </div>
      <div style={{ fontSize: 11, color: sam.comment, marginBottom: 12 }}>
        {`// connect an AI assistant to SAM over MCP`}
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>
          <Mono c={sam.green}>⬡</Mono>{" "}
          <Mono c={sam.green} b>
            endpoint
          </Mono>
        </div>
        <div
          onClick={() => copy(endpoint, "url")}
          style={{
            marginTop: 6,
            padding: "10px 12px",
            border: `1px solid ${sam.border}`,
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
          }}
        >
          <Mono c={sam.text} style={{ flex: 1, fontSize: 12, wordBreak: "break-all" }}>
            {endpoint}
          </Mono>
          <Mono c={copied === "url" ? sam.green : sam.cyan}>{copied === "url" ? "[copied]" : "[copy]"}</Mono>
        </div>
      </div>

      {newToken ? (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            border: `1px solid ${sam.green}55`,
            background: `${sam.green}10`,
          }}
        >
          <div style={{ fontSize: 11, color: sam.green, marginBottom: 6 }}>
            {`// copy now — this token is shown only once`}
          </div>
          <div
            onClick={() => copy(newToken, "token")}
            style={{
              padding: "10px 12px",
              border: `1px solid ${sam.border}`,
              background: sam.bg,
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
            }}
          >
            <Mono c={sam.text} style={{ flex: 1, fontSize: 11, wordBreak: "break-all" }}>
              {newToken}
            </Mono>
            <Mono c={copied === "token" ? sam.green : sam.cyan}>
              {copied === "token" ? "[copied]" : "[copy]"}
            </Mono>
          </div>
          <div
            onClick={() => setNewToken(null)}
            style={{
              marginTop: 12,
              padding: "9px 0",
              textAlign: "center",
              background: sam.green,
              color: sam.bg,
              fontWeight: 700,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            [done]
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            <Mono c={sam.yellow}>◎</Mono>{" "}
            <Mono c={sam.yellow} b>
              new token
            </Mono>
          </div>
          <div
            style={{
              marginTop: 6,
              padding: "10px 12px",
              border: `1px solid ${sam.border}`,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="token name"
              maxLength={60}
              style={inputStyle}
            />
          </div>
          <div style={{ marginTop: 10, fontSize: 11, color: sam.comment }}>{`// scopes`}</div>
          <div style={{ marginTop: 6, border: `1px solid ${sam.border}` }}>
            {ALL_SCOPES.map((scope, i) => {
              const on = scopes.includes(scope);
              return (
                <div
                  key={scope}
                  onClick={() => toggleScope(scope)}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    padding: "8px 10px",
                    borderBottom: i === ALL_SCOPES.length - 1 ? 0 : `1px solid ${sam.border}`,
                    cursor: "pointer",
                  }}
                >
                  <Mono c={on ? sam.green : sam.comment} b={on}>
                    {on ? "[x]" : "[ ]"}
                  </Mono>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Mono c={sam.text} style={{ fontSize: 12 }}>
                      {scope}
                    </Mono>
                    <div style={{ fontSize: 10, color: sam.comment, marginTop: 2 }}>
                      {SCOPE_DESCRIPTIONS[scope]}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {error && <div style={{ marginTop: 10, fontSize: 11, color: sam.red }}>{error}</div>}
          <div
            onClick={generate}
            style={{
              marginTop: 12,
              padding: "10px 0",
              textAlign: "center",
              background: name.trim() && scopes.length > 0 && !busy ? sam.cyan : sam.surface,
              color: name.trim() && scopes.length > 0 && !busy ? sam.bg : sam.comment,
              fontWeight: 700,
              cursor: name.trim() && scopes.length > 0 && !busy ? "pointer" : "default",
              pointerEvents: name.trim() && scopes.length > 0 && !busy ? "auto" : "none",
              fontSize: 14,
            }}
          >
            {busy ? t("[saving...]") : "[connect mcp]"}
          </div>
        </div>
      )}

      <div>
        <div style={{ fontSize: 13, fontWeight: 600 }}>
          <Mono c={sam.cyan}>▸</Mono>{" "}
          <Mono c={sam.cyan} b>
            active tokens
          </Mono>
          <span style={{ float: "right", color: sam.comment, fontWeight: 400, fontSize: 12 }}>
            [{activeTokens.length}]
          </span>
        </div>
        {tokens === null ? (
          <div style={{ marginTop: 10, fontSize: 11, color: sam.comment }}>{`// loading...`}</div>
        ) : activeTokens.length === 0 ? (
          <div style={{ marginTop: 10, fontSize: 11, color: sam.comment }}>{`// no active tokens`}</div>
        ) : (
          <div style={{ marginTop: 8 }}>
            {activeTokens.map((t) => (
              <div
                key={t.id}
                style={{
                  padding: "8px 10px",
                  border: `1px solid ${sam.border}`,
                  marginTop: 6,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Mono c={sam.text} style={{ fontSize: 13 }}>
                    {t.name}
                  </Mono>
                  <div style={{ fontSize: 10, color: sam.comment, marginTop: 2 }}>
                    {`sam_mcp_${t.publicPrefix}… · ${t.scopes.length} scope${t.scopes.length === 1 ? "" : "s"} · `}
                    {t.lastUsedAt ? `used ${new Date(t.lastUsedAt).toLocaleDateString()}` : "never used"}
                  </div>
                </div>
                <span
                  onClick={busy ? undefined : () => revoke(t.id)}
                  style={{ cursor: busy ? "default" : "pointer", color: sam.red, fontSize: 12 }}
                >
                  [revoke]
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BucketSheet({
  sheet,
  setState,
  onClose,
}: {
  sheet: Extract<SheetPayload, { kind: "bucket" }>;
  setState: SheetContentProps["setState"];
  onClose: () => void;
}) {
  const { sam } = useSam();
  const t = useT();
  const b = sheet.bucket;
  const [amount, setAmount] = useState(50);
  const pct = Math.min(100, Math.round((b.balance / b.target) * 100));
  const { busy, run } = useMutationLock();

  const add = async (delta: number) => {
    await run(async () => {
      const newBal = Math.max(0, b.balance + delta);
      setState((s) => ({
        ...s,
        buckets: s.buckets.map((x) => (x.id === b.id ? { ...x, balance: newBal } : x)),
      }));
      await setBucketBalanceAction(b.id, newBal);
      onClose();
    }, delta >= 0 ? "deposit" : "withdraw");
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 14 }}>
        <span onClick={onClose} style={{ cursor: "pointer", color: sam.comment }}>
          [close]
        </span>
        <Mono c={sam.cyan} b>
          $ bucket --view
        </Mono>
        <span style={{ color: sam.yellow, cursor: "pointer" }}>[edit]</span>
      </div>
      <div style={{ textAlign: "center", marginTop: 8 }}>
        <div style={{ fontSize: 34, color: b.c }}>{b.icon}</div>
        <div style={{ fontSize: 15, color: sam.text, fontWeight: 600, marginTop: 4 }}>{b.name}</div>
        <div
          style={{
            fontSize: 26,
            fontWeight: 700,
            color: b.c,
            marginTop: 8,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          ${b.balance.toLocaleString()}{" "}
          <Mono c={sam.comment} style={{ fontSize: 14 }}>
            / ${b.target.toLocaleString()}
          </Mono>
        </div>
        <div style={{ fontSize: 12, color: sam.comment, marginTop: 2 }}>
          {pct}% · {b.apy}% apy
        </div>
        <div style={{ marginTop: 10, padding: "0 10px" }}>
          <BlockBar pct={pct} width={20} c={b.c} />
        </div>
      </div>
      <div style={{ marginTop: 18, fontSize: 13 }}>
        <Mono c={sam.green} b>
          ▸ move money
        </Mono>
        <div
          style={{
            marginTop: 10,
            padding: 12,
            border: `1px solid ${sam.border}`,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span
            onClick={() => setAmount(Math.max(10, amount - 25))}
            style={{ cursor: "pointer", color: sam.comment, fontSize: 18 }}
          >
            [-]
          </span>
          <div style={{ flex: 1, textAlign: "center" }}>
            <Mono c={sam.yellow} b style={{ fontSize: 24, fontVariantNumeric: "tabular-nums" }}>
              ${amount}
            </Mono>
          </div>
          <span onClick={() => setAmount(amount + 25)} style={{ cursor: "pointer", color: sam.comment, fontSize: 18 }}>
            [+]
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <div
            onClick={() => add(-amount)}
            style={{
              flex: 1,
              textAlign: "center",
              padding: "10px 0",
              background: sam.red,
              color: sam.bg,
              fontWeight: 700,
              cursor: busy ? "default" : "pointer",
              pointerEvents: busy ? "none" : "auto",
              opacity: busy ? 0.45 : 1,
            }}
          >
            {busy ? t("[saving...]") : `[withdraw $${amount}]`}
          </div>
          <div
            onClick={() => add(amount)}
            style={{
              flex: 1,
              textAlign: "center",
              padding: "10px 0",
              background: sam.green,
              color: sam.bg,
              fontWeight: 700,
              cursor: busy ? "default" : "pointer",
              pointerEvents: busy ? "none" : "auto",
              opacity: busy ? 0.45 : 1,
            }}
          >
            {busy ? t("[saving...]") : `[deposit $${amount}]`}
          </div>
        </div>
      </div>
    </div>
  );
}
