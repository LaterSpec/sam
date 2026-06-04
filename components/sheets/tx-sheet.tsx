"use client";

import { useEffect, useState } from "react";
import { useSam } from "@/lib/theme/sam-theme";
import { Mono, Comment } from "@/components/ui/sam-primitives";
import type { ClientAppState, SheetPayload } from "@/components/screens/types";
import { deleteExpenseAction, updateExpenseAction } from "@/lib/actions/data-actions";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";

type TxSheetProps = {
  sheet: Extract<SheetPayload, { kind: "tx" }>;
  state: ClientAppState;
  setState: React.Dispatch<React.SetStateAction<ClientAppState>>;
  onClose: () => void;
};

type TxMode = "view" | "edit" | "recategorize" | "deleting" | "deleted" | "error";

export function TxSheet({ sheet, state, setState, onClose }: TxSheetProps) {
  const { sam } = useSam();
  const reducedMotion = useReducedMotion();
  const tx = sheet.tx;
  const [mode, setMode] = useState<TxMode>("view");
  const [amount, setAmount] = useState(String(tx.amount));
  const [name, setName] = useState(tx.name);
  const [catKey, setCatKey] = useState(tx.catKey);
  const [notes] = useState("");
  const [logLines, setLogLines] = useState<Array<{ text: string; c: string }>>([]);
  const [busy, setBusy] = useState(false);

  const cats = (state.budgets || []).map((b) => ({
    key: b.key,
    icon: b.icon,
    name: b.name,
    c: b.c,
  }));

  const accountLabel =
    state.accounts.find((a) => a.type === "checking" || a.type === "card")?.name ?? "account";

  const shortId = tx.id.slice(0, 8);

  const pushLog = (text: string, c: string) => setLogLines((lines) => [...lines, { text, c }]);

  const saveEdit = async () => {
    const parsed = parseFloat(amount);
    if (!name.trim() || isNaN(parsed)) return;
    setBusy(true);
    try {
      const row = await updateExpenseAction({
        id: tx.id,
        amount: parsed,
        name: name.trim(),
        catKey,
        budgets: state.budgets,
      });
      if ("error" in row) return;
      setState((s) => ({
        ...s,
        expenses: s.expenses.map((e) => (e.id === tx.id ? { ...e, ...row } : e)),
      }));
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const saveRecategorize = async (key: string) => {
    setBusy(true);
    try {
      const row = await updateExpenseAction({
        id: tx.id,
        catKey: key,
        budgets: state.budgets,
      });
      if ("error" in row) return;
      setState((s) => ({
        ...s,
        expenses: s.expenses.map((e) => (e.id === tx.id ? { ...e, ...row } : e)),
      }));
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const runDelete = async () => {
    setMode("deleting");
    setLogLines([]);

    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

    if (reducedMotion) {
      try {
        await deleteExpenseAction(tx.id);
        setState((s) => ({ ...s, expenses: s.expenses.filter((e) => e.id !== tx.id) }));
        pushLog("✓ deleted", sam.green);
        setMode("deleted");
        await wait(400);
        onClose();
      } catch {
        pushLog("✗ delete failed", sam.red);
        setMode("error");
      }
      return;
    }

    pushLog(`› rm tx --id=${shortId}`, sam.cyan);
    await wait(280);
    pushLog("› purging from ledger...", sam.comment);
    await wait(400);

    try {
      await deleteExpenseAction(tx.id);
      setState((s) => ({ ...s, expenses: s.expenses.filter((e) => e.id !== tx.id) }));
      pushLog("✓ deleted", sam.green);
      setMode("deleted");
      await wait(700);
      onClose();
    } catch {
      pushLog("✗ delete failed", sam.red);
      setMode("error");
    }
  };

  useEffect(() => {
    if (mode === "error") {
      const t = setTimeout(() => setMode("view"), 2000);
      return () => clearTimeout(t);
    }
  }, [mode]);

  const headerCmd =
    mode === "edit" ? "$ tx --edit" : mode === "recategorize" ? "$ tx --recat" : "$ tx --view";

  const deleting = mode === "deleting" || mode === "deleted";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 14 }}>
        <span
          onClick={deleting ? undefined : onClose}
          style={{ cursor: deleting ? "default" : "pointer", color: sam.comment, opacity: deleting ? 0.4 : 1 }}
        >
          [cancel]
        </span>
        <Mono c={sam.cyan} b>
          {headerCmd}
        </Mono>
        {mode === "view" && (
          <span onClick={() => setMode("edit")} style={{ color: sam.yellow, cursor: "pointer" }}>
            [edit]
          </span>
        )}
        {mode === "edit" && (
          <span
            onClick={busy ? undefined : saveEdit}
            style={{
              color: busy ? sam.comment : sam.green,
              cursor: busy ? "default" : "pointer",
              fontWeight: 600,
            }}
          >
            [save]
          </span>
        )}
        {mode !== "view" && mode !== "edit" && <span style={{ width: 40 }} />}
      </div>

      {mode === "recategorize" && (
        <div style={{ marginBottom: 14 }}>
          <Comment>pick category</Comment>
          {cats.map((cat) => (
            <div
              key={cat.key}
              onClick={() => !busy && saveRecategorize(cat.key)}
              style={{
                marginTop: 8,
                fontSize: 13,
                cursor: busy ? "default" : "pointer",
                padding: "6px 8px",
                border: `1px solid ${cat.key === tx.catKey ? cat.c : sam.border}`,
                background: cat.key === tx.catKey ? `${cat.c}11` : "transparent",
              }}
            >
              <Mono c={cat.c} b>
                {cat.icon} {cat.name}
              </Mono>
            </div>
          ))}
        </div>
      )}

      {mode === "edit" && (
        <div style={{ marginBottom: 14, fontSize: 13 }}>
          <label className="mb-3 block">
            <Comment>amount</Comment>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              className="mt-1 w-full border bg-transparent px-3 py-2 text-sm outline-none"
              style={{ borderColor: sam.border, color: sam.text, fontFamily: sam.font }}
            />
          </label>
          <label className="mb-3 block">
            <Comment>merchant</Comment>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full border bg-transparent px-3 py-2 text-sm outline-none"
              style={{ borderColor: sam.border, color: sam.text, fontFamily: sam.font }}
            />
          </label>
          <label className="block">
            <Comment>category</Comment>
            <select
              value={catKey}
              onChange={(e) => setCatKey(e.target.value)}
              className="mt-1 w-full border bg-transparent px-3 py-2 text-sm outline-none"
              style={{ borderColor: sam.border, color: sam.text, fontFamily: sam.font }}
            >
              {cats.map((c) => (
                <option key={c.key} value={c.key} style={{ background: sam.bgAlt }}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {mode !== "recategorize" && mode !== "edit" && (
        <>
          <div
            className={deleting && !reducedMotion ? "sam-tx-delete" : undefined}
            style={{ textAlign: "center", marginTop: 10, marginBottom: 18 }}
          >
            <div style={{ fontSize: 36, color: tx.catColor }}>{tx.icon}</div>
            <div
              style={{
                fontSize: 30,
                fontWeight: 700,
                color: sam.red,
                fontVariantNumeric: "tabular-nums",
                marginTop: 4,
              }}
            >
              -${tx.amount.toFixed(2)}
            </div>
            <div style={{ fontSize: 14, color: sam.text, marginTop: 2, fontWeight: 600 }}>{tx.name}</div>
          </div>
          <div style={{ fontSize: 13, borderTop: `1px solid ${sam.border}`, paddingTop: 12 }}>
            {(
              [
                ["├─", "category", tx.category],
                ["├─", "account", accountLabel],
                ["├─", "date", tx.time],
                ["├─", "merchant", tx.name],
                ["└─", "notes", notes || "none"],
              ] as const
            ).map(([t, k, v], i) => (
              <div key={i} style={{ display: "flex", marginTop: 6 }}>
                <Mono c={sam.comment}>{t} </Mono>
                <Mono c={sam.text}>{k}</Mono>
                <span style={{ flex: 1 }} />
                <Mono c={sam.comment}>{v}</Mono>
              </div>
            ))}
          </div>
        </>
      )}

      {(mode === "deleting" || mode === "deleted" || mode === "error") && logLines.length > 0 && (
        <div
          style={{
            marginTop: 14,
            padding: 10,
            background: sam.bgAlt,
            border: `1px solid ${sam.border}`,
            fontSize: 11,
            lineHeight: 1.7,
          }}
        >
          {logLines.map((l, i) => (
            <div key={i} className={reducedMotion ? undefined : "sam-fade-in"}>
              <Mono c={l.c}>{l.text}</Mono>
            </div>
          ))}
          {mode === "deleted" && (
            <div className="sam-pop" style={{ marginTop: 8, fontSize: 20, color: sam.green, textAlign: "center" }}>
              ✓
            </div>
          )}
        </div>
      )}

      {mode === "view" && (
        <div style={{ marginTop: 18, display: "flex", gap: 12 }}>
          <span style={{ color: sam.comment, cursor: "default", opacity: 0.5 }} title="coming soon">
            [split]
          </span>
          <span onClick={() => setMode("recategorize")} style={{ color: sam.cyan, cursor: "pointer" }}>
            [recategorize]
          </span>
          <span style={{ flex: 1 }} />
          <span onClick={runDelete} style={{ color: sam.red, cursor: "pointer" }}>
            [delete]
          </span>
        </div>
      )}
    </div>
  );
}
