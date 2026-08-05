"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useSam } from "@/lib/theme/sam-theme";
import { Mono, Comment, Prompt, TabBar, ScreenHeader } from "@/components/ui/sam-primitives";
import { signOutAction, deleteAccountAction, updatePrefsAction, updateUsernameAction } from "@/lib/actions/data-actions";
import { useI18n } from "@/lib/i18n/i18n-context";
import { LanguageToggle } from "@/components/ui/language-toggle";
import { SUPPORTED_CURRENCIES, normalizeCurrency, type Currency } from "@/lib/finance/currency";
import type { ScreenProps } from "./types";
import { SCREEN_PAD } from "./types";

function samUserHandle(state: ScreenProps["state"]) {
  const u = state.user;
  const base = u.username || u.full_name || u.email.split("@")[0] || "";
  return (String(base).trim().split(/\s+/)[0] || "you").toLowerCase();
}

export function ProfileScreen({ state, setState, openSheet }: ScreenProps) {
  const { sam } = useSam();
  const { t, lang, setLang } = useI18n();
  const router = useRouter();
  const [confirmDel, setConfirmDel] = useState(false);
  const [busy, setBusy] = useState("");
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState(samUserHandle(state));
  const [usernameError, setUsernameError] = useState("");

  const changeLanguage = (next: typeof lang) => {
    setLang(next);
    const prefs = { ...state.prefs, language: next };
    setState((s) => ({ ...s, prefs }));
    void updatePrefsAction(prefs);
  };

  const currentCurrency = normalizeCurrency(state.prefs.defaultCurrency);
  const changeCurrency = (next: Currency) => {
    const prefs = { ...state.prefs, defaultCurrency: next };
    setState((s) => ({ ...s, prefs }));
    void updatePrefsAction(prefs);
  };
  const changeTimezone = (timezone: string) => {
    const prefs = { ...state.prefs, timezone };
    setState((s) => ({ ...s, prefs }));
    void updatePrefsAction(prefs);
  };

  const user = state.user;
  const accountCount = (state.accounts || []).length;
  const initial = (user.full_name || user.email || "?").charAt(0).toUpperCase();
  const displayName = user.username || user.full_name || user.email.split("@")[0];
  const memberSince = user.member_since
    ? new Date(user.member_since + "T00:00:00").toLocaleDateString(lang === "es" ? "es" : "en", { month: "short", year: "numeric" })
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
      rows.push([e.occurred_at || "", e.name, "expense", e.category, e.amount])
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

  const saveUsername = async () => {
    const clean = usernameDraft.trim();
    if (!clean || /\s/.test(clean)) {
      setUsernameError("username cannot contain spaces");
      return;
    }
    setBusy("username");
    setUsernameError("");
    try {
      const row = await updateUsernameAction(clean);
      setState((s) => ({ ...s, user: { ...s.user, username: row.username } }));
      setEditingUsername(false);
    } catch (e) {
      setUsernameError(e instanceof Error ? e.message : "could not save username");
    } finally {
      setBusy("");
    }
  };

  const CurrencyToggle = () => (
    <span style={{ userSelect: "none" }}>
      {SUPPORTED_CURRENCIES.map((c, i) => {
        const active = c.code === currentCurrency;
        return (
          <span key={c.code} onClick={() => changeCurrency(c.code)} style={{ cursor: "pointer" }}>
            {i > 0 && <Mono c={sam.comment}> · </Mono>}
            <Mono c={active ? sam.cyan : sam.comment} b={active}>
              {c.label}
            </Mono>
          </span>
        );
      })}
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
        { k: "username", v: <Mono c={sam.comment}>@{handle}</Mono>, onClick: () => setEditingUsername(true) },
        { k: "member since", v: <Mono c={sam.comment}>{memberSince}</Mono> },
      ],
    },
    {
      title: "preferences",
      icon: "⚙",
      c: sam.cyan,
      items: [
        { k: "language", v: <LanguageToggle value={lang} onChange={changeLanguage} /> },
        { k: "currency", v: <CurrencyToggle /> },
        {
          k: "timezone",
          v: (
            <select
              value={state.prefs.timezone ?? "America/Lima"}
              onChange={(event) => changeTimezone(event.target.value)}
              style={{
                maxWidth: 150,
                border: `1px solid ${sam.border}`,
                background: sam.bgAlt,
                color: sam.comment,
                fontFamily: sam.font,
                fontSize: 11,
              }}
            >
              <option value="America/Lima">America/Lima</option>
              <option value="America/Bogota">America/Bogota</option>
              <option value="America/Mexico_City">America/Mexico_City</option>
              <option value="America/New_York">America/New_York</option>
              <option value="Europe/Madrid">Europe/Madrid</option>
              <option value="UTC">UTC</option>
            </select>
          ),
        },
      ],
    },
    {
      title: "data",
      icon: "⬢",
      c: sam.green,
      items: [
        { k: "export csv", v: <Mono c={sam.cyan}>→</Mono>, onClick: exportCsv },
      ],
    },
  ];

  return (
    <div style={{ padding: SCREEN_PAD }}>
      <ScreenHeader>
        <TabBar
          tabs={["profile", "stats", "help", "settings"]}
          active={state.profileTab}
          onChange={(t) => setState((s) => ({ ...s, profileTab: t }))}
        />
      </ScreenHeader>
      <div style={{ marginTop: 20 }}>
        <Prompt user={handle} host="init.Profile" cmd="whoami" />
        <Comment>{t("your configured account and finance data")}</Comment>
        <div
          style={{
            marginTop: 16,
            padding: "12px 14px",
            border: `1px solid ${sam.border}`,
              display: "flex",
              gap: 14,
              alignItems: "center",
              minWidth: 0,
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
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: sam.text }}>{displayName}</div>
            <div style={{ fontSize: 12, color: sam.comment }}>
              {memberSince} · {accountCount} {t("accounts")}
            </div>
          </div>
        </div>
        {editingUsername && (
          <div style={{ marginTop: 12, padding: 12, border: `1px solid ${sam.border}`, background: sam.surface }}>
            <Comment>{t("username · no spaces")}</Comment>
            <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
              <Mono c={sam.cyan}>@</Mono>
              <input
                value={usernameDraft}
                onChange={(e) => {
                  setUsernameDraft(e.target.value.replace(/\s/g, ""));
                  setUsernameError("");
                }}
                className="min-w-0 flex-1 border bg-transparent px-3 py-2 text-sm outline-none"
                style={{ borderColor: sam.border, color: sam.text, fontFamily: sam.font }}
              />
            </div>
            {usernameError && <div style={{ marginTop: 6, color: sam.red, fontSize: 11 }}>{usernameError}</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 10, fontSize: 12 }}>
              <span onClick={() => setEditingUsername(false)} style={{ cursor: "pointer", color: sam.comment }}>
                {t("[cancel]")}
              </span>
              <span onClick={busy === "username" ? undefined : saveUsername} style={{ cursor: "pointer", color: sam.green, fontWeight: 600 }}>
                {busy === "username" ? t("[saving...]") : t("[save]")}
              </span>
            </div>
          </div>
        )}
        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
          {[
            { v: state.expenses.length, l: "tx logged", c: sam.text },
            { v: state.goals.length, l: "goals", c: sam.cyan },
            { v: accountCount, l: "accounts", c: sam.green },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: "center", padding: "8px 4px", border: `1px solid ${sam.border}` }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: s.c }}>{s.v}</div>
              <div style={{ fontSize: 10, color: sam.comment }}>{`// ${t(s.l)}`}</div>
            </div>
          ))}
        </div>
        {sections.map((sec, si) => (
          <div key={si} style={{ marginTop: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              <Mono c={sec.c}>{sec.icon}</Mono>
              <Mono c={sec.c} b>
                {" "}
                {t(sec.title)}
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
                  <Mono c={sam.text}>{t(it.k)}</Mono>
                  <span style={{ flex: 1 }} />
                  <span>{it.v}</span>
                </div>
              );
            })}
          </div>
        ))}
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            <Mono c={sam.magenta}>⬡</Mono>
            <Mono c={sam.magenta} b>
              {" "}
              {t("integrations")}
            </Mono>
          </div>
          <div
            onClick={() => openSheet({ kind: "mcp-connect" })}
            style={{ display: "flex", fontSize: 13, marginTop: 6, alignItems: "baseline", cursor: "pointer" }}
          >
            <Mono c={sam.comment}>└─ </Mono>
            <Mono c={sam.cyan}>{t("connect mcp")}</Mono>
            <span style={{ flex: 1 }} />
            <Mono c={sam.cyan}>→</Mono>
          </div>
        </div>
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            <Mono c={sam.red}>⚠</Mono>
            <Mono c={sam.red} b>
              {" "}
              {t("danger")}
            </Mono>
          </div>
          <div
            onClick={busy ? undefined : signOut}
            style={{ display: "flex", fontSize: 13, marginTop: 6, alignItems: "baseline", cursor: "pointer" }}
          >
            <Mono c={sam.comment}>├─ </Mono>
            <Mono c={sam.text}>{t("sign out")}</Mono>
            <span style={{ flex: 1 }} />
            <Mono c={sam.red}>{busy === "out" ? "..." : "→"}</Mono>
          </div>
          <div
            onClick={busy ? undefined : () => openSheet({ kind: "change-credentials" })}
            style={{ display: "flex", fontSize: 13, marginTop: 6, alignItems: "baseline", cursor: "pointer" }}
          >
            <Mono c={sam.comment}>├─ </Mono>
            <Mono c={sam.yellow}>{t("change credentials")}</Mono>
            <span style={{ flex: 1 }} />
            <Mono c={sam.yellow}>→</Mono>
          </div>
          {!confirmDel ? (
            <div
              onClick={() => setConfirmDel(true)}
              style={{ display: "flex", fontSize: 13, marginTop: 6, alignItems: "baseline", cursor: "pointer" }}
            >
              <Mono c={sam.comment}>└─ </Mono>
              <Mono c={sam.red}>{t("delete account")}</Mono>
              <span style={{ flex: 1 }} />
              <Mono c={sam.red}>→</Mono>
            </div>
          ) : (
            <div style={{ marginTop: 8, padding: 10, border: `1px solid ${sam.red}55`, background: `${sam.red}12` }}>
              <div style={{ fontSize: 11, color: sam.comment }}>
                {`// ${t("this wipes your account + all data. cannot be undone.")}`}
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
                  {t("[cancel]")}
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
                  {busy === "del" ? t("[deleting...]") : t("[confirm delete]")}
                </div>
              </div>
            </div>
          )}
        </div>
        <div style={{ marginTop: 22, fontSize: 11, color: sam.comment, textAlign: "center" }}>
          sam v2.0.0 · build 2026.06.28
        </div>
      </div>
    </div>
  );
}
