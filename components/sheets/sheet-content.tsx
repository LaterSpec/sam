"use client";

import { useState } from "react";
import { useSam } from "@/lib/theme/sam-theme";
import { Mono, Comment, BlockBar } from "@/components/ui/sam-primitives";
import { makeSeries, seriesToPrices, symbolSeed } from "@/lib/market/build-market";
import type { ClientAppState, SheetPayload } from "@/components/screens/types";
import {
  addExpenseAction,
  addGoalAction,
  setGoalSavedAction,
  setBudgetCapAction,
  addIncomeAction,
  setBucketBalanceAction,
  buyHoldingAction,
  sellHoldingAction,
  addWatchAction,
  fetchBarsAction,
  addAccountAction,
  updateAccountAction,
  transferAction,
  setCredentialsAction,
} from "@/lib/actions/data-actions";
import {
  ACCOUNT_TYPES,
  ACCOUNT_EMOJIS,
  accountColor,
  accountDefaultIcon,
  accountLabel,
} from "@/lib/accounts/account-types";
import { TxSheet } from "@/components/sheets/tx-sheet";

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
    case "income-src":
      return <IncomeSrcSheet sheet={sheet} state={state} onClose={onClose} />;
    case "new-income":
      return <NewIncomeSheet state={state} setState={setState} onClose={onClose} />;
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
    case "bucket":
      return <BucketSheet sheet={sheet} setState={setState} onClose={onClose} />;
    case "trade":
      return <TradeSheet sheet={sheet} state={state} setState={setState} onClose={onClose} />;
    case "ticker-detail":
      return <TickerDetailSheet sheet={sheet} state={state} setState={setState} onClose={onClose} />;
    case "add-ticker":
      return <AddTickerSheet state={state} setState={setState} onClose={onClose} />;
    default:
      return null;
  }
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
        <Mono c={sam.cyan} b>
          $ cat --view {cat.key}
        </Mono>
        <span style={{ color: sam.yellow, cursor: "pointer" }}>[edit]</span>
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
  const g = sheet.goal;
  const pct = Math.min(100, Math.round((g.saved / g.target) * 100));
  const [amount, setAmount] = useState(50);

  const contribute = async () => {
    const newSaved = Math.min(g.target, g.saved + amount);
    const done = newSaved >= g.target;
    setState((s) => ({
      ...s,
      goals: s.goals.map((gg) => (gg.id === g.id ? { ...gg, saved: newSaved, done } : gg)),
    }));
    await setGoalSavedAction(g.id, newSaved, done);
    onClose();
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 14 }}>
        <span onClick={onClose} style={{ cursor: "pointer", color: sam.comment }}>
          [close]
        </span>
        <Mono c={sam.cyan} b>
          $ goal --view
        </Mono>
        <span style={{ color: sam.yellow, cursor: "pointer" }}>[edit]</span>
      </div>
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
          {pct}% · eta {g.eta}
        </div>
        <div style={{ marginTop: 10, padding: "0 10px" }}>
          <BlockBar pct={pct} width={20} c={g.c} />
        </div>
      </div>
      <div style={{ fontSize: 13, marginTop: 16 }}>
        <Mono c={sam.green} b>
          ▸ contribute
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
            onClick={() => setAmount(Math.max(0, amount - 10))}
            style={{ cursor: "pointer", color: sam.comment, fontSize: 18 }}
          >
            [-]
          </span>
          <div style={{ flex: 1, textAlign: "center" }}>
            <Mono c={sam.yellow} b style={{ fontSize: 26, fontVariantNumeric: "tabular-nums" }}>
              ${amount}
            </Mono>
          </div>
          <span
            onClick={() => setAmount(amount + 10)}
            style={{ cursor: "pointer", color: sam.comment, fontSize: 18 }}
          >
            [+]
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          {[25, 50, 100, 250].map((v) => (
            <div
              key={v}
              onClick={() => setAmount(v)}
              style={{
                flex: 1,
                textAlign: "center",
                padding: "6px 0",
                border: `1px solid ${amount === v ? sam.yellow : sam.border}`,
                color: amount === v ? sam.yellow : sam.text,
                cursor: "pointer",
                fontSize: 13,
                background: amount === v ? "rgba(227,179,65,0.06)" : "transparent",
              }}
            >
              ${v}
            </div>
          ))}
        </div>
      </div>
      <div
        onClick={contribute}
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
        [confirm] add ${amount} to {g.name.toLowerCase()}
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

  const save = async () => {
    if (!canSave) return;
    const row = await addExpenseAction({
      amount: parseFloat(amount),
      name,
      catKey,
      accountId,
      budgets: state.budgets,
      accounts: state.accounts,
    });
    setState((s) => ({ ...s, expenses: [...s.expenses, row] }));
    onClose();
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 14 }}>
        <span onClick={onClose} style={{ cursor: "pointer", color: sam.comment }}>
          [cancel]
        </span>
        <Mono c={sam.cyan} b>
          $ expense --new
        </Mono>
        <span
          onClick={canSave ? save : undefined}
          style={{
            cursor: canSave ? "pointer" : "default",
            color: canSave ? sam.green : sam.comment,
            fontWeight: 600,
          }}
        >
          [save]
        </span>
      </div>
      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>
          <Mono c={sam.green}>$</Mono>{" "}
          <Mono c={sam.green} b>
            {" "}
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
          <Mono c={sam.cyan}>✎</Mono>{" "}
          <Mono c={sam.cyan} b>
            name
          </Mono>
        </div>
        <div style={{ marginTop: 6, padding: "10px 12px", border: `1px solid ${sam.border}` }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Lunch, Coffee, Uber..."
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
            category
          </Mono>
        </div>
        <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
          {cats.map((c) => (
            <div
              key={c.key}
              onClick={() => setCatKey(c.key)}
              style={{
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
            account
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
        {`// will log to ${new Date().toLocaleString("en", { month: "short", day: "numeric" })} · ${selectedAccount?.name ?? "account"}`}
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
  const canSave = !!(name && target && !isNaN(parseFloat(target)));

  const save = async () => {
    if (!canSave) return;
    const row = await addGoalAction({ name, target: parseFloat(target) });
    setState((s) => ({ ...s, goals: [...s.goals, row] }));
    onClose();
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
        <span
          onClick={canSave ? save : undefined}
          style={{
            cursor: canSave ? "pointer" : "default",
            color: canSave ? sam.green : sam.comment,
            fontWeight: 600,
          }}
        >
          [save]
        </span>
      </div>
      <div style={{ marginTop: 10 }}>
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
      <div style={{ marginTop: 18, fontSize: 11, color: sam.comment }}>
        {`// auto-calculate eta based on monthly savings rate`}
      </div>
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
  const [cap, setCap] = useState(b.cap);

  const save = async () => {
    setState((s) => ({
      ...s,
      budgets: s.budgets.map((x) => (x.key === b.key ? { ...x, cap } : x)),
    }));
    if (b.id) await setBudgetCapAction(b.id, cap);
    onClose();
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 14 }}>
        <span onClick={onClose} style={{ cursor: "pointer", color: sam.comment }}>
          [cancel]
        </span>
        <Mono c={sam.cyan} b>
          $ budget --edit {b.key}
        </Mono>
        <span onClick={save} style={{ cursor: "pointer", color: sam.green, fontWeight: 600 }}>
          [save]
        </span>
      </div>
      <div style={{ textAlign: "center", marginTop: 10, marginBottom: 18 }}>
        <div style={{ fontSize: 34, color: b.c }}>{b.icon}</div>
        <div style={{ fontSize: 15, color: sam.text, fontWeight: 600, marginTop: 4 }}>{b.name}</div>
        <div style={{ fontSize: 11, color: sam.comment, marginTop: 2 }}>
          spent ${spent.toFixed(0)} this month
        </div>
      </div>
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
          padding: 14,
          border: `1px solid ${sam.border}`,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span
          onClick={() => setCap(Math.max(0, cap - 25))}
          style={{ cursor: "pointer", color: sam.comment, fontSize: 18 }}
        >
          [-]
        </span>
        <div style={{ flex: 1, textAlign: "center" }}>
          <Mono c={sam.yellow} b style={{ fontSize: 28, fontVariantNumeric: "tabular-nums" }}>
            ${cap}
          </Mono>
        </div>
        <span onClick={() => setCap(cap + 25)} style={{ cursor: "pointer", color: sam.comment, fontSize: 18 }}>
          [+]
        </span>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        {[100, 250, 500, 1000].map((v) => (
          <div
            key={v}
            onClick={() => setCap(v)}
            style={{
              flex: 1,
              textAlign: "center",
              padding: "6px 0",
              border: `1px solid ${cap === v ? sam.yellow : sam.border}`,
              color: cap === v ? sam.yellow : sam.text,
              cursor: "pointer",
              fontSize: 13,
              background: cap === v ? "rgba(227,179,65,0.06)" : "transparent",
            }}
          >
            ${v}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 16, fontSize: 11, color: sam.comment }}>
        {`// ${cap >= spent ? `$${cap - spent} left this month` : `$${spent - cap} over budget`}`}
      </div>
    </div>
  );
}

function IncomeSrcSheet({
  sheet,
  state,
  onClose,
}: {
  sheet: Extract<SheetPayload, { kind: "income-src" }>;
  state: ClientAppState;
  onClose: () => void;
}) {
  const { sam } = useSam();
  const s = sheet.src as { icon?: string; c?: string; name?: string; amt?: number; amount?: number; freq?: string; next?: string };
  const amt = s.amt ?? (s.amount as number) ?? 0;
  const payments = (state.incomeTx || [])
    .filter((t) => t.name.toLowerCase() === (s.name || "").toLowerCase())
    .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())
    .slice(0, 6);
  const depositAccountId = payments.find((p) => p.accountId)?.accountId;
  const depositAccount = depositAccountId
    ? state.accounts.find((a) => a.id === depositAccountId)
    : undefined;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 14 }}>
        <span onClick={onClose} style={{ cursor: "pointer", color: sam.comment }}>
          [close]
        </span>
        <Mono c={sam.cyan} b>
          $ income --view
        </Mono>
        <span style={{ color: sam.yellow, cursor: "pointer" }}>[edit]</span>
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
          +${amt.toLocaleString()}
        </div>
        <div style={{ fontSize: 12, color: sam.comment, marginTop: 2 }}>
          {s.freq || "recurring"} · next {s.next || "tbd"}
        </div>
        {depositAccount && (
          <div style={{ fontSize: 12, color: sam.comment, marginTop: 8 }}>
            deposit to ·{" "}
            <Mono c={depositAccount.color || accountColor(depositAccount.type)}>
              {depositAccount.icon || accountDefaultIcon(depositAccount.type)}
            </Mono>{" "}
            <Mono c={sam.text}>{depositAccount.name}</Mono>
          </div>
        )}
      </div>
      <div style={{ fontSize: 13, borderTop: `1px solid ${sam.border}`, paddingTop: 12 }}>
        <Mono c={sam.cyan} b>
          ▸ recent payments
        </Mono>
        {payments.length === 0 && (
          <div style={{ marginTop: 8, fontSize: 12, color: sam.comment }}>{`// no payments logged yet`}</div>
        )}
        {payments.map((p, i) => (
          <div key={p.id} style={{ display: "flex", marginTop: 6, fontSize: 12 }}>
            <Mono c={sam.comment}>{i === payments.length - 1 ? "└─ " : "├─ "}</Mono>
            <Mono c={sam.text}>{p.time}</Mono>
            <span style={{ flex: 1 }} />
            <Mono c={sam.green} b>
              +${p.amount.toLocaleString()}
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

  const save = async () => {
    if (!canSave) return;
    const row = await addIncomeAction({
      name,
      amt: parseFloat(amt),
      freq: "one-time",
      next: "—",
      accountId,
    });
    setState((st) => ({
      ...st,
      incomeSources: [...st.incomeSources, row],
      incomeTx: row.incomeTx ? [...st.incomeTx, row.incomeTx] : st.incomeTx,
      accounts: row.account
        ? st.accounts.map((a) => (a.id === row.account!.id ? { ...a, balance: row.account!.balance } : a))
        : st.accounts,
    }));
    onClose();
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
        <span
          onClick={canSave ? save : undefined}
          style={{
            cursor: canSave ? "pointer" : "default",
            color: canSave ? sam.green : sam.comment,
            fontWeight: 600,
          }}
        >
          [save]
        </span>
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
}: {
  type: string;
  setType: (t: string) => void;
  name: string;
  setName: (n: string) => void;
  icon: string;
  setIcon: (i: string) => void;
}) {
  const { sam } = useSam();
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
            type
          </Mono>
        </div>
        <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
          {ACCOUNT_TYPES.map((t) => {
            const selected = type === t.key;
            return (
              <div
                key={t.key}
                onClick={() => {
                  setType(t.key);
                  setIcon(t.defaultIcon);
                }}
                style={{
                  padding: "8px 6px",
                  textAlign: "center",
                  border: `1px solid ${selected ? t.color : sam.border}`,
                  background: selected ? `${t.color}15` : "transparent",
                  cursor: "pointer",
                }}
              >
                <Mono c={t.color} b>
                  {t.defaultIcon} {t.label}
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
            name
          </Mono>
        </div>
        <div style={{ marginTop: 6, padding: "10px 12px", border: `1px solid ${sam.border}` }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Cash, Main Card..."
            style={inputStyle}
          />
        </div>
      </div>
      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>
          <Mono c={sam.yellow}>◉</Mono>{" "}
          <Mono c={sam.yellow} b>
            icon
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
  const [type, setType] = useState("cash");
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(accountDefaultIcon("cash"));
  const [error, setError] = useState("");
  const canSave = name.trim().length >= 1;

  const save = async () => {
    if (!canSave) return;
    setError("");
    try {
      const row = await addAccountAction({ name: name.trim(), type, icon });
      setState((s) => ({ ...s, accounts: [...s.accounts, row] }));
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed to create account");
    }
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
        <span
          onClick={canSave ? save : undefined}
          style={{
            cursor: canSave ? "pointer" : "default",
            color: canSave ? sam.green : sam.comment,
            fontWeight: 600,
          }}
        >
          [save]
        </span>
      </div>
      <AccountFormFields type={type} setType={setType} name={name} setName={setName} icon={icon} setIcon={setIcon} />
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
  const existing = state.accounts.find((a) => a.id === sheet.accountId);
  const [type, setType] = useState(existing?.type ?? "cash");
  const [name, setName] = useState(existing?.name ?? "");
  const [icon, setIcon] = useState(existing?.icon ?? accountDefaultIcon("cash"));
  const [error, setError] = useState("");
  const canSave = name.trim().length >= 1 && !!existing;

  const cancel = () => openSheet({ kind: "account", accountId: sheet.accountId });

  const save = async () => {
    if (!canSave || !existing) return;
    setError("");
    try {
      const row = await updateAccountAction({
        id: existing.id,
        name: name.trim(),
        type,
        icon,
      });
      setState((s) => ({
        ...s,
        accounts: s.accounts.map((a) => (a.id === row.id ? row : a)),
      }));
      openSheet({ kind: "account", accountId: row.id });
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed to update account");
    }
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
        <span
          onClick={canSave ? save : undefined}
          style={{
            cursor: canSave ? "pointer" : "default",
            color: canSave ? sam.green : sam.comment,
            fontWeight: 600,
          }}
        >
          [save]
        </span>
      </div>
      <AccountFormFields type={type} setType={setType} name={name} setName={setName} icon={icon} setIcon={setIcon} />
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

  const save = async () => {
    if (!canSave) return;
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
        <span
          onClick={canSave ? save : undefined}
          style={{
            cursor: canSave ? "pointer" : "default",
            color: canSave ? sam.green : sam.comment,
            fontWeight: 600,
          }}
        >
          [save]
        </span>
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const match = pw1 === pw2 && pw1.length >= 8;
  const canSave = match && !busy;

  const save = async () => {
    if (!canSave) return;
    setBusy(true);
    setError("");
    try {
      await setCredentialsAction(pw1);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed to update credentials");
    } finally {
      setBusy(false);
    }
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
        <span
          onClick={canSave ? save : undefined}
          style={{
            cursor: canSave ? "pointer" : "default",
            color: canSave ? sam.green : sam.comment,
            fontWeight: 600,
          }}
        >
          {busy ? "..." : "[save]"}
        </span>
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
  const b = sheet.bucket;
  const [amount, setAmount] = useState(50);
  const pct = Math.min(100, Math.round((b.balance / b.target) * 100));

  const add = async (delta: number) => {
    const newBal = Math.max(0, b.balance + delta);
    setState((s) => ({
      ...s,
      buckets: s.buckets.map((x) => (x.id === b.id ? { ...x, balance: newBal } : x)),
    }));
    await setBucketBalanceAction(b.id, newBal);
    onClose();
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
              cursor: "pointer",
            }}
          >
            [withdraw ${amount}]
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
              cursor: "pointer",
            }}
          >
            [deposit ${amount}]
          </div>
        </div>
      </div>
    </div>
  );
}

function TradeSheet({
  sheet,
  state,
  setState,
  onClose,
}: {
  sheet: Extract<SheetPayload, { kind: "trade" }>;
  state: ClientAppState;
  setState: SheetContentProps["setState"];
  onClose: () => void;
}) {
  const { sam } = useSam();
  const h = sheet.holding;
  const q = ((state.market?.[h.sym] as { price?: number; pct?: number; live?: boolean } | undefined) ??
    {}) as { price?: number; pct?: number; live?: boolean };
  const price = q.price != null ? q.price : h.avgCost || 0;
  const pct = q.pct || 0;
  const [mode, setMode] = useState<"buy" | "sell">("buy");
  const [qty, setQty] = useState(1);
  const totalCost = qty * price;

  const confirm = async () => {
    if (!(price > 0)) {
      onClose();
      return;
    }
    if (mode === "buy") {
      const res = await buyHoldingAction({ symbol: h.sym, name: h.name, amount: qty * price, price });
      if (res?.row) {
        setState((s) => ({
          ...s,
          holdings: [...s.holdings.filter((x) => x.sym !== h.sym), res.row],
          watchlist: (s.watchlist || []).filter((w) => w.sym !== h.sym),
        }));
      }
    } else {
      const res = await sellHoldingAction({ symbol: h.sym, qty, price });
      if (res && !("error" in res && res.error)) {
        setState((s) =>
          res.removed
            ? { ...s, holdings: s.holdings.filter((x) => x.sym !== h.sym) }
            : { ...s, holdings: s.holdings.map((x) => (x.sym === h.sym && res.row ? res.row : x)) }
        );
      }
    }
    onClose();
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 14 }}>
        <span onClick={onClose} style={{ cursor: "pointer", color: sam.comment }}>
          [cancel]
        </span>
        <Mono c={sam.cyan} b>
          $ trade {h.sym}
        </Mono>
        <span style={{ color: q.live ? sam.green : sam.comment }}>{q.live ? "live" : "delayed"}</span>
      </div>
      <div style={{ textAlign: "center", marginTop: 8 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: sam.yellow, fontFamily: sam.font }}>{h.sym}</div>
        <div style={{ fontSize: 12, color: sam.comment, marginTop: 2 }}>{h.name}</div>
        <div
          style={{
            fontSize: 26,
            fontWeight: 700,
            color: pct >= 0 ? sam.green : sam.red,
            marginTop: 8,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          <Mono style={{ fontSize: 13, marginLeft: 8 }} c={pct >= 0 ? sam.green : sam.red}>
            {pct >= 0 ? "▲" : "▼"} {Math.abs(pct).toFixed(2)}%
          </Mono>
        </div>
        <div style={{ fontSize: 11, color: sam.comment, marginTop: 2 }}>
          you own {h.qty} @ avg ${(h.avgCost || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </div>
      </div>
      <div style={{ marginTop: 18, display: "flex", gap: 6 }}>
        {(["buy", "sell"] as const).map((m) => (
          <div
            key={m}
            onClick={() => setMode(m)}
            style={{
              flex: 1,
              textAlign: "center",
              padding: "8px 0",
              cursor: "pointer",
              border: `1px solid ${mode === m ? (m === "buy" ? sam.green : sam.red) : sam.border}`,
              color: mode === m ? (m === "buy" ? sam.green : sam.red) : sam.comment,
              fontWeight: mode === m ? 700 : 400,
              fontSize: 13,
              background:
                mode === m
                  ? m === "buy"
                    ? "rgba(86,211,100,0.06)"
                    : "rgba(248,81,73,0.06)"
                  : "transparent",
            }}
          >
            [{m}]
          </div>
        ))}
      </div>
      <div style={{ marginTop: 14, fontSize: 13, fontWeight: 600 }}>
        <Mono c={sam.magenta}>◎</Mono>{" "}
        <Mono c={sam.magenta} b>
          shares
        </Mono>
      </div>
      <div
        style={{
          marginTop: 6,
          padding: 12,
          border: `1px solid ${sam.border}`,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span
          onClick={() => setQty(Math.max(0.1, +(qty - 0.5).toFixed(2)))}
          style={{ cursor: "pointer", color: sam.comment, fontSize: 18 }}
        >
          [-]
        </span>
        <div style={{ flex: 1, textAlign: "center" }}>
          <Mono c={sam.yellow} b style={{ fontSize: 22, fontVariantNumeric: "tabular-nums" }}>
            {qty.toFixed(1)}
          </Mono>
        </div>
        <span
          onClick={() => setQty(+(qty + 0.5).toFixed(2))}
          style={{ cursor: "pointer", color: sam.comment, fontSize: 18 }}
        >
          [+]
        </span>
      </div>
      <div style={{ marginTop: 14, fontSize: 13, display: "flex" }}>
        <Mono c={sam.comment}>est {mode} cost</Mono>
        <span style={{ flex: 1 }} />
        <Mono c={mode === "buy" ? sam.red : sam.green} b>
          {mode === "buy" ? "-" : "+"}$
          {totalCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </Mono>
      </div>
      <div
        onClick={confirm}
        style={{
          marginTop: 18,
          padding: "12px 0",
          textAlign: "center",
          background: mode === "buy" ? sam.green : sam.red,
          color: sam.bg,
          fontWeight: 700,
          cursor: "pointer",
          fontSize: 14,
        }}
      >
        [confirm {mode}] {qty.toFixed(1)} × {h.sym}
      </div>
    </div>
  );
}

const TICKER_RANGES = [
  { k: "1D", len: 48, vol: 0.04, labels: ["09:30", "11:00", "12:30", "14:00", "15:30"] },
  { k: "1W", len: 56, vol: 0.06, labels: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
  { k: "1M", len: 60, vol: 0.09, labels: ["W1", "W2", "W3", "W4", "now"] },
  { k: "3M", len: 64, vol: 0.14, labels: ["Mar", "Apr", "May", "Jun", "now"] },
  { k: "1Y", len: 72, vol: 0.22, labels: ["Q1", "Q2", "Q3", "Q4", "now"] },
] as const;

function TickerDetailSheet({
  sheet,
  state,
  setState,
  onClose,
}: {
  sheet: Extract<SheetPayload, { kind: "ticker-detail" }>;
  state: ClientAppState;
  setState: SheetContentProps["setState"];
  onClose: () => void;
}) {
  const { sam } = useSam();
  const { sym, name, price, pct, qty, owned } = sheet;
  const [rangeKey, setRangeKey] = useState("1D");
  const [amount, setAmount] = useState("100");
  const [hover, setHover] = useState<number | null>(null);

  const range = TICKER_RANGES.find((r) => r.k === rangeKey) ?? TICKER_RANGES[0];
  const seed = symbolSeed(sym);
  const realBars = (state.dailyBars && state.dailyBars[sym]) || [];

  let prices: number[];
  if ((rangeKey === "1M" || rangeKey === "3M" || rangeKey === "1Y") && realBars.length >= 5) {
    const n = rangeKey === "1M" ? 22 : rangeKey === "3M" ? 66 : realBars.length;
    prices = realBars.slice(-n).map((b) => b.close);
    if (price != null) prices[prices.length - 1] = price;
  } else {
    const series = makeSeries(seed, range.len, 0, range.vol);
    prices = seriesToPrices(series, price, range.vol);
  }

  const up = pct >= 0;
  const lineColor = up ? sam.green : sam.red;
  const W = 320;
  const H = 180;
  const padL = 40;
  const padR = 8;
  const padT = 8;
  const padB = 22;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const rng = max - min || 1;
  const xStep = innerW / (prices.length - 1);
  const pts = prices.map((v, i) => [padL + i * xStep, padT + innerH * (1 - (v - min) / rng)] as const);
  const linePath = pts
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePath} L${pts[pts.length - 1][0].toFixed(1)},${padT + innerH} L${pts[0][0].toFixed(1)},${padT + innerH} Z`;
  const gradId = `td-grad-${sym}`;
  const yLabels = [0, 0.25, 0.5, 0.75, 1].map((t) => min + rng * (1 - t));
  const amt = parseFloat(amount) || 0;
  const sharesAtAmt = price > 0 ? amt / price : 0;
  const hoverPt = hover != null ? pts[hover] : null;
  const hoverPrice = hover != null ? prices[hover] : null;

  const trade = async (mode: "buy" | "sell") => {
    if (amt <= 0 || !(price > 0)) return;
    if (mode === "sell" && !owned) return;
    if (mode === "buy") {
      const res = await buyHoldingAction({ symbol: sym, name, amount: amt, price });
      if (res?.row) {
        setState((s) => ({
          ...s,
          holdings: [...s.holdings.filter((h) => h.sym !== sym), res.row],
          watchlist: (s.watchlist || []).filter((w) => w.sym !== sym),
        }));
      }
    } else {
      const res = await sellHoldingAction({ symbol: sym, amount: amt, price });
      if (res && !("error" in res && res.error)) {
        setState((s) =>
          res.removed
            ? { ...s, holdings: s.holdings.filter((h) => h.sym !== sym) }
            : { ...s, holdings: s.holdings.map((h) => (h.sym === sym && res.row ? res.row : h)) }
        );
      }
    }
    onClose();
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 12 }}>
        <span onClick={onClose} style={{ cursor: "pointer", color: sam.comment }}>
          [close]
        </span>
        <Mono c={sam.cyan} b>
          $ {sym.toLowerCase()} --detail
        </Mono>
        <Mono c={up ? sam.green : sam.red} b>
          {up ? "▲" : "▼"} {Math.abs(pct).toFixed(2)}%
        </Mono>
      </div>
      <div style={{ marginBottom: 10 }}>
        <Mono c={sam.comment} style={{ fontSize: 12 }}>
          {name}
        </Mono>
        <div
          style={{
            fontSize: 30,
            fontWeight: 700,
            color: lineColor,
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1.1,
            marginTop: 2,
          }}
        >
          ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        {owned && qty != null && (
          <div style={{ fontSize: 11, color: sam.comment, marginTop: 2 }}>
            <Mono c={sam.textDim}>{qty}</Mono>
            <Mono c={sam.comment}> shares · </Mono>
            <Mono c={sam.text} b>
              ${(qty * price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Mono>
            <Mono c={sam.comment}> position</Mono>
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
        {TICKER_RANGES.map((r) => (
          <div
            key={r.k}
            onClick={() => setRangeKey(r.k)}
            style={{
              flex: 1,
              textAlign: "center",
              padding: "4px 0",
              border: `1px solid ${rangeKey === r.k ? lineColor : sam.border}`,
              color: rangeKey === r.k ? lineColor : sam.comment,
              cursor: "pointer",
              fontSize: 11,
              fontWeight: rangeKey === r.k ? 700 : 400,
              background: rangeKey === r.k ? `${lineColor}10` : "transparent",
              transition: "all 140ms",
            }}
          >
            {r.k}
          </div>
        ))}
      </div>
      <div
        style={{
          border: `1px solid ${sam.border}`,
          background: "rgba(255,255,255,0.012)",
          padding: 4,
        }}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          height={H}
          style={{ display: "block", overflow: "visible" }}
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity="0.28" />
              <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
            </linearGradient>
          </defs>
          {yLabels.map((v, i) => {
            const y = padT + (innerH / (yLabels.length - 1)) * i;
            return (
              <g key={`y${i}`}>
                <line
                  x1={padL}
                  y1={y}
                  x2={W - padR}
                  y2={y}
                  stroke={sam.border}
                  strokeWidth="1"
                  strokeDasharray="2 3"
                />
                <text
                  x={padL - 6}
                  y={y + 3}
                  fill={sam.comment}
                  fontSize="9"
                  fontFamily={sam.font}
                  textAnchor="end"
                >
                  ${v.toFixed(v < 10 ? 2 : 0)}
                </text>
              </g>
            );
          })}
          {range.labels.map((lbl, i) => {
            const x = padL + (innerW / (range.labels.length - 1)) * i;
            return (
              <text
                key={`x${i}`}
                x={x}
                y={H - 6}
                fill={sam.comment}
                fontSize="9"
                fontFamily={sam.font}
                textAnchor={i === 0 ? "start" : i === range.labels.length - 1 ? "end" : "middle"}
              >
                {lbl}
              </text>
            );
          })}
          <line x1={padL} y1={padT} x2={padL} y2={padT + innerH} stroke={sam.border} strokeWidth="1" />
          <line
            x1={padL}
            y1={padT + innerH}
            x2={W - padR}
            y2={padT + innerH}
            stroke={sam.border}
            strokeWidth="1"
          />
          <path d={areaPath} fill={`url(#${gradId})`} stroke="none" />
          <path
            d={linePath}
            fill="none"
            stroke={lineColor}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle
            cx={pts[pts.length - 1][0]}
            cy={pts[pts.length - 1][1]}
            r="3"
            fill={lineColor}
            stroke={sam.bg}
            strokeWidth="1.5"
          />
          {hoverPt && hoverPrice != null && (
            <g>
              <line
                x1={hoverPt[0]}
                y1={padT}
                x2={hoverPt[0]}
                y2={padT + innerH}
                stroke={sam.comment}
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              <circle cx={hoverPt[0]} cy={hoverPt[1]} r="3.5" fill={sam.bg} stroke={lineColor} strokeWidth="2" />
              <g
                transform={`translate(${Math.min(W - padR - 70, Math.max(padL, hoverPt[0] - 35))}, ${Math.max(padT, hoverPt[1] - 28)})`}
              >
                <rect width="70" height="22" fill={sam.bg} stroke={lineColor} strokeWidth="1" />
                <text x="6" y="9" fill={sam.comment} fontSize="8" fontFamily={sam.font}>
                  {`t: ${hover}`}
                </text>
                <text x="6" y="18" fill={lineColor} fontSize="10" fontFamily={sam.font} fontWeight="700">
                  {`$${hoverPrice.toFixed(2)}`}
                </text>
              </g>
            </g>
          )}
          {pts.map(([x], i) => (
            <rect
              key={`h${i}`}
              x={x - xStep / 2}
              y={padT}
              width={xStep}
              height={innerH}
              fill="transparent"
              style={{ cursor: "crosshair" }}
              onMouseEnter={() => setHover(i)}
            />
          ))}
        </svg>
      </div>
      <div
        style={{
          marginTop: 12,
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 6,
          fontSize: 11,
        }}
      >
        {(
          [
            { l: "open", v: `$${(price * 0.992).toFixed(2)}` },
            { l: "high", v: `$${max.toFixed(2)}`, c: sam.green },
            { l: "low", v: `$${min.toFixed(2)}`, c: sam.red },
            { l: "volume", v: `${(Math.abs(Math.sin(seed)) * 9 + 0.3).toFixed(1)}M` },
          ] as const
        ).map((s) => (
          <div
            key={s.l}
            style={{ padding: "6px 4px", border: `1px solid ${sam.border}`, textAlign: "center" }}
          >
            <div style={{ color: sam.comment, fontSize: 9 }}>// {s.l}</div>
            <Mono c={"c" in s ? s.c : sam.text} b style={{ fontVariantNumeric: "tabular-nums" }}>
              {s.v}
            </Mono>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 11, color: sam.comment, marginBottom: 4 }}>
          <Mono c={sam.text} b>
            AMOUNT $
          </Mono>
          <Mono c={sam.comment}> · ≈ {sharesAtAmt.toFixed(4)} shares</Mono>
        </div>
        <div
          style={{
            padding: "10px 12px",
            border: `1px solid ${sam.border}`,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Mono c={sam.yellow} b style={{ fontSize: 18 }}>
            $
          </Mono>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="100"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: sam.text,
              fontFamily: sam.font,
              fontSize: 20,
              fontWeight: 600,
            }}
          />
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <div
            onClick={() => trade("buy")}
            style={{
              flex: 1,
              padding: "12px 0",
              textAlign: "center",
              background: sam.green,
              color: sam.bg,
              fontWeight: 700,
              cursor: amt > 0 ? "pointer" : "default",
              opacity: amt > 0 ? 1 : 0.4,
              fontSize: 14,
              letterSpacing: 1,
            }}
          >
            [ BUY ]
          </div>
          <div
            onClick={() => trade("sell")}
            style={{
              flex: 1,
              padding: "12px 0",
              textAlign: "center",
              background: sam.red,
              color: sam.bg,
              fontWeight: 700,
              cursor: amt > 0 && owned ? "pointer" : "default",
              opacity: amt > 0 && owned ? 1 : 0.4,
              fontSize: 14,
              letterSpacing: 1,
            }}
          >
            [ SELL ]
          </div>
        </div>
      </div>
      <div style={{ marginTop: 10, fontSize: 9, color: sam.comment, textAlign: "center" }}>
        {`// simulated price · orders execute against fake market data`}
      </div>
    </div>
  );
}

function AddTickerSheet({
  state,
  setState,
  onClose,
}: {
  state: ClientAppState;
  setState: SheetContentProps["setState"];
  onClose: () => void;
}) {
  const { sam } = useSam();
  const [query, setQuery] = useState("");
  const pool = state.tickerPool || [];
  const ownedSyms = new Set(state.holdings.map((h) => h.sym));
  const watchedSyms = new Set((state.watchlist || []).map((w) => w.sym));

  const q = query.trim().toUpperCase();
  const candidates = pool
    .filter((p) => !ownedSyms.has(p.sym) && !watchedSyms.has(p.sym))
    .filter((p) => !q || p.sym.includes(q) || p.name.toUpperCase().includes(q))
    .slice(0, 16);

  const add = async (item: { sym: string; name: string }) => {
    const row = await addWatchAction(item.sym, item.name);
    setState((s) => ({
      ...s,
      watchlist: [...(s.watchlist || []), { sym: row.sym, name: row.name }],
    }));
    const bars = await fetchBarsAction([item.sym]);
    if (bars?.[item.sym]) {
      setState((s) => ({ ...s, dailyBars: { ...(s.dailyBars || {}), ...bars } }));
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 14 }}>
        <span onClick={onClose} style={{ cursor: "pointer", color: sam.comment }}>
          [cancel]
        </span>
        <Mono c={sam.cyan} b>
          $ ticker --add
        </Mono>
        <span onClick={onClose} style={{ cursor: "pointer", color: sam.green, fontWeight: 600 }}>
          [done]
        </span>
      </div>
      <div
        style={{
          padding: "10px 12px",
          border: `1px solid ${sam.border}`,
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <Mono c={sam.yellow} b style={{ fontSize: 14 }}>
          ⌕
        </Mono>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="search ticker or name (e.g. AAPL, bitcoin)"
          autoFocus
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: sam.text,
            fontFamily: sam.font,
            fontSize: 13,
          }}
        />
        {query && (
          <span onClick={() => setQuery("")} style={{ cursor: "pointer", color: sam.comment, fontSize: 12 }}>
            [clr]
          </span>
        )}
      </div>
      <Comment>tap a ticker to add it to your watchlist</Comment>
      <div style={{ marginTop: 10, maxHeight: 320, overflowY: "auto" }}>
        {candidates.length === 0 && (
          <div
            style={{
              padding: 20,
              textAlign: "center",
              color: sam.comment,
              fontSize: 12,
              border: `1px dashed ${sam.border}`,
            }}
          >
            // no matches · try a different query
          </div>
        )}
        {candidates.map((c) => {
          const seed = symbolSeed(c.sym);
          const sample = makeSeries(seed, 24, 0, 0.08);
          const dir = sample[sample.length - 1] - sample[0];
          const color = dir >= 0 ? sam.green : sam.red;
          const min = Math.min(...sample);
          const max = Math.max(...sample);
          const rng = max - min || 1;
          const W = 56;
          const H = 18;
          const pad = 1;
          const linePts = sample
            .map((v, idx) => {
              const x = pad + idx * ((W - pad * 2) / (sample.length - 1));
              const y = pad + (H - pad * 2) * (1 - (v - min) / rng);
              return `${x.toFixed(1)},${y.toFixed(1)}`;
            })
            .join(" ");

          return (
            <div
              key={c.sym}
              onClick={() => add(c)}
              style={{
                display: "grid",
                gridTemplateColumns: "70px 1fr 60px 28px",
                alignItems: "center",
                gap: 8,
                padding: "10px 10px",
                cursor: "pointer",
                borderBottom: `1px solid ${sam.border}`,
                transition: "background 140ms",
              }}
            >
              <Mono c={sam.yellow} b style={{ fontSize: 13 }}>
                {c.sym}
              </Mono>
              <Mono c={sam.comment} style={{ fontSize: 11 }}>
                {c.name}
              </Mono>
              <svg width={W} height={H} style={{ display: "block" }}>
                <polyline
                  points={linePts}
                  fill="none"
                  stroke={color}
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <Mono c={sam.green} b style={{ fontSize: 16, textAlign: "center" }}>
                +
              </Mono>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 12, fontSize: 10, color: sam.comment, textAlign: "center" }}>
        {`// owned + watched tickers are filtered out automatically`}
      </div>
    </div>
  );
}
