"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useSam } from "@/lib/theme/sam-theme";
import { Mono, Comment, Prompt, TabBar } from "@/components/ui/sam-primitives";
import { signOutAction, deleteAccountAction, updatePrefsAction } from "@/lib/actions/data-actions";
import type { ScreenProps } from "./types";
import { SCREEN_PAD } from "./types";

function samUserHandle(state: ScreenProps["state"]) {
  const u = state.user;
  const base = u.username || u.full_name || u.email.split("@")[0] || "";
  return (String(base).trim().split(/\s+/)[0] || "you").toLowerCase();
}

export function ProfileScreen({ state, setState }: ScreenProps) {
  const { sam } = useSam();
  const router = useRouter();
  const [confirmDel, setConfirmDel] = useState(false);
  const [busy, setBusy] = useState("");

  const toggle = (k: "notifications" | "biometric") => {
    const prefs = { ...state.prefs, [k]: !state.prefs[k] };
    setState((s) => ({ ...s, prefs }));
    void updatePrefsAction(prefs);
  };

  const setTheme = (t: "dark" | "light") => {
    const prefs = { ...state.prefs, theme: t };
    setState((s) => ({ ...s, prefs }));
    void updatePrefsAction(prefs);
  };

  const user = state.user;
  const accountCount = (state.accounts || []).length;
  const totalSaved = state.goals.reduce((a, g) => a + g.saved, 0);
  const initial = (user.full_name || user.email || "?").charAt(0).toUpperCase();
  const displayName = user.username || user.full_name || user.email.split("@")[0];
  const memberSince = user.member_since
    ? new Date(user.member_since + "T00:00:00").toLocaleDateString("en", { month: "short", year: "numeric" })
    : "—";
  const handle = samUserHandle(state);

  const signOut = async () => {
    setBusy("out");
    await signOutAction();
    router.push("/");
    router.refresh();
  };

  const deleteAccount = async () => {
    setBusy("del");
    await deleteAccountAction();
    router.push("/");
    router.refresh();
  };

  const exportCsv = () => {
    const rows: (string | number)[][] = [["date", "name", "type", "category", "amount"]];
    (state.expenses || []).forEach((e) =>
      rows.push([e.occurred_at || "", e.name, "expense", e.catKey, e.amount])
    );
    (state.incomeTx || []).forEach((e) => rows.push([e.occurred_at || "", e.name, "income", "", e.amount]));
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sam-transactions.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const Toggle = ({ value, onChange }: { value: boolean; onChange: () => void }) => (
    <span onClick={onChange} style={{ cursor: "pointer", userSelect: "none" }}>
      <Mono c={value ? sam.cyan : sam.comment} b={value}>
        [on]
      </Mono>
      <Mono c={!value ? sam.text : sam.comment} b={!value}>
        {" "}
        off
      </Mono>
    </span>
  );

  const ThemeToggle = () => (
    <span style={{ userSelect: "none" }}>
      <span onClick={() => setTheme("dark")} style={{ cursor: "pointer" }}>
        <Mono c={state.prefs.theme === "dark" ? sam.cyan : sam.comment} b={state.prefs.theme === "dark"}>
          [dark]
        </Mono>
      </span>
      <Mono c={sam.comment}> </Mono>
      <span onClick={() => setTheme("light")} style={{ cursor: "pointer" }}>
        <Mono c={state.prefs.theme === "light" ? sam.cyan : sam.text} b={state.prefs.theme === "light"}>
          light
        </Mono>
      </span>
    </span>
  );

  const sections: Array<{
    title: string;
    icon: string;
    c: string;
    items: Array<{ k: string; v: ReactNode; onClick?: () => void }>;
  }> = [
    {
      title: "account",
      icon: "◉",
      c: sam.yellow,
      items: [
        { k: "email", v: <Mono c={sam.comment}>{user.email}</Mono> },
        { k: "handle", v: <Mono c={sam.comment}>@{handle}</Mono> },
        { k: "member since", v: <Mono c={sam.comment}>{memberSince}</Mono> },
      ],
    },
    {
      title: "preferences",
      icon: "⚙",
      c: sam.cyan,
      items: [
        { k: "currency", v: <Mono c={sam.comment}>USD $</Mono> },
        { k: "theme", v: <ThemeToggle /> },
        { k: "notifications", v: <Toggle value={state.prefs.notifications} onChange={() => toggle("notifications")} /> },
        { k: "biometric lock", v: <Toggle value={state.prefs.biometric} onChange={() => toggle("biometric")} /> },
      ],
    },
    {
      title: "data",
      icon: "⬢",
      c: sam.green,
      items: [
        { k: "export csv", v: <Mono c={sam.cyan}>→</Mono>, onClick: exportCsv },
        { k: "sync accounts", v: <Mono c={sam.comment}>{accountCount} linked</Mono> },
        { k: "backup", v: <Mono c={sam.comment}>just now</Mono> },
      ],
    },
  ];

  return (
    <div style={{ padding: SCREEN_PAD }}>
      <TabBar
        tabs={["profile", "stats", "help", "settings"]}
        active={state.profileTab}
        onChange={(t) => setState((s) => ({ ...s, profileTab: t }))}
      />
      <div style={{ marginTop: 20 }}>
        <Prompt host="init.Profile" cmd="whoami" />
        <Comment>member of the 0.3% who budget weekly. keep going.</Comment>
        <div
          style={{
            marginTop: 16,
            padding: "12px 14px",
            border: `1px solid ${sam.border}`,
            display: "flex",
            gap: 14,
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: 54,
              height: 54,
              background: `linear-gradient(135deg, ${sam.yellow}, ${sam.orange})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              fontWeight: 700,
              color: sam.bg,
              fontFamily: sam.font,
            }}
          >
            {initial}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: sam.text }}>{displayName}</div>
            <div style={{ fontSize: 12, color: sam.comment }}>
              {memberSince} · ${totalSaved.toLocaleString()} saved
            </div>
            <div style={{ fontSize: 11, color: sam.green, marginTop: 2 }}>◆ {state.streak} day streak</div>
          </div>
        </div>
        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {[
            { v: state.expenses.length, l: "tx logged", c: sam.text },
            { v: state.goals.length, l: "goals", c: sam.cyan },
            { v: accountCount, l: "accounts", c: sam.green },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: "center", padding: "8px 4px", border: `1px solid ${sam.border}` }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: s.c }}>{s.v}</div>
              <div style={{ fontSize: 10, color: sam.comment }}>{`// ${s.l}`}</div>
            </div>
          ))}
        </div>
        {sections.map((sec, si) => (
          <div key={si} style={{ marginTop: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              <Mono c={sec.c}>{sec.icon}</Mono>
              <Mono c={sec.c} b>
                {" "}
                {sec.title}
              </Mono>
            </div>
            {sec.items.map((it, i) => {
              const isLast = i === sec.items.length - 1;
              return (
                <div
                  key={i}
                  onClick={it.onClick}
                  style={{
                    display: "flex",
                    fontSize: 13,
                    marginTop: 6,
                    alignItems: "baseline",
                    cursor: it.onClick ? "pointer" : "default",
                  }}
                >
                  <Mono c={sam.comment}>{isLast ? "└─ " : "├─ "}</Mono>
                  <Mono c={sam.text}>{it.k}</Mono>
                  <span style={{ flex: 1 }} />
                  <span>{it.v}</span>
                </div>
              );
            })}
          </div>
        ))}
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            <Mono c={sam.red}>⚠</Mono>
            <Mono c={sam.red} b>
              {" "}
              danger
            </Mono>
          </div>
          <div
            onClick={busy ? undefined : signOut}
            style={{ display: "flex", fontSize: 13, marginTop: 6, alignItems: "baseline", cursor: "pointer" }}
          >
            <Mono c={sam.comment}>├─ </Mono>
            <Mono c={sam.text}>sign out</Mono>
            <span style={{ flex: 1 }} />
            <Mono c={sam.red}>{busy === "out" ? "..." : "→"}</Mono>
          </div>
          {!confirmDel ? (
            <div
              onClick={() => setConfirmDel(true)}
              style={{ display: "flex", fontSize: 13, marginTop: 6, alignItems: "baseline", cursor: "pointer" }}
            >
              <Mono c={sam.comment}>└─ </Mono>
              <Mono c={sam.red}>delete account</Mono>
              <span style={{ flex: 1 }} />
              <Mono c={sam.red}>→</Mono>
            </div>
          ) : (
            <div style={{ marginTop: 8, padding: 10, border: `1px solid ${sam.red}55`, background: "rgba(248,81,73,0.05)" }}>
              <div style={{ fontSize: 11, color: sam.comment }}>
                {`// this wipes your account + all data. cannot be undone.`}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <div
                  onClick={busy ? undefined : () => setConfirmDel(false)}
                  style={{
                    flex: 1,
                    textAlign: "center",
                    padding: "8px 0",
                    border: `1px solid ${sam.border}`,
                    color: sam.text,
                    cursor: "pointer",
                  }}
                >
                  [cancel]
                </div>
                <div
                  onClick={busy ? undefined : deleteAccount}
                  style={{
                    flex: 1,
                    textAlign: "center",
                    padding: "8px 0",
                    background: sam.red,
                    color: sam.bg,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {busy === "del" ? "[deleting...]" : "[confirm delete]"}
                </div>
              </div>
            </div>
          )}
        </div>
        <div style={{ marginTop: 22, fontSize: 11, color: sam.comment, textAlign: "center" }}>
          sam v1.0.0 · build 2026.05.29
        </div>
      </div>
    </div>
  );
}
