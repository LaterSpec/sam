"use client";

import { useCallback, useEffect, useState } from "react";
import { useSam } from "@/lib/theme/sam-theme";
import { Mono, Comment, Prompt, ScreenHeader, userHandleFromState } from "@/components/ui/sam-primitives";
import { useT } from "@/lib/i18n/i18n-context";
import {
  bootstrapFirstPartyIntegrationsAction,
  connectIntegrationAction,
  disconnectIntegrationAction,
  installIntegrationAction,
  listIntegrationCatalogAction,
  listMyIntegrationInstallsAction,
  listMySubmittedIntegrationsAction,
  submitIntegrationAction,
  syncIntegrationAction,
  uninstallIntegrationAction,
  upsertIntegrationAuthorAction,
} from "@/lib/actions/integration-actions";
import type { ScreenProps } from "./types";
import { SCREEN_PAD } from "./types";

type Tab = "connected" | "explore" | "publish";

export function IntegrationsScreen({ state, setState }: ScreenProps) {
  const { sam } = useSam();
  const t = useT();
  const [tab, setTab] = useState<Tab>("connected");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [catalog, setCatalog] = useState<Awaited<ReturnType<typeof listIntegrationCatalogAction>>>([]);
  const [installs, setInstalls] = useState<Awaited<ReturnType<typeof listMyIntegrationInstallsAction>>>([]);
  const [submitted, setSubmitted] = useState<Awaited<ReturnType<typeof listMySubmittedIntegrationsAction>>>([]);
  const [webhookReveal, setWebhookReveal] = useState("");
  const [authorName, setAuthorName] = useState(state.user.full_name || "");
  const [manifestDraft, setManifestDraft] = useState(
    JSON.stringify(
      {
        id: "my-connector",
        version: "1.0.0",
        name: "My connector",
        description: "Describe what it does",
        author: { displayName: state.user.full_name || "Author" },
        runtime: "connector",
        icon: "🧩",
        scopes: ["sam:read", "sam:expenses.write"],
        auth: { type: "none" },
        capabilities: { webhook: { enabled: true }, sync: { handler: "builtin:webhook-echo" } },
      },
      null,
      2
    )
  );

  const refresh = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const [nextCatalog, nextInstalls, nextSubmitted] = await Promise.all([
        listIntegrationCatalogAction(),
        listMyIntegrationInstallsAction(),
        listMySubmittedIntegrationsAction(),
      ]);
      setCatalog(nextCatalog);
      setInstalls(nextInstalls);
      setSubmitted(nextSubmitted);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "load failed");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const card = {
    border: `1px solid ${sam.border}`,
    background: sam.surface,
    padding: 12,
    marginTop: 10,
  } as const;

  return (
    <div style={{ padding: SCREEN_PAD, paddingBottom: 28 }}>
      <ScreenHeader>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
          <Prompt user={userHandleFromState(state)} host="sam" cmd="integrations" />
          <button
            type="button"
            onClick={() => setState((s) => ({ ...s, profileTab: "settings" }))}
            style={{ border: 0, background: "transparent", color: sam.cyan, fontFamily: sam.font, cursor: "pointer" }}
          >
            ← {t("settings")}
          </button>
        </div>
      </ScreenHeader>

      <Comment>{t("marketplace connectors · author name shown on every listing")}</Comment>

      <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
        {(["connected", "explore", "publish"] as Tab[]).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            style={{
              minHeight: 32,
              padding: "0 10px",
              border: `1px solid ${tab === id ? sam.accent : sam.border}`,
              background: tab === id ? sam.active : "transparent",
              color: tab === id ? sam.accent : sam.comment,
              fontFamily: sam.font,
              cursor: "pointer",
            }}
          >
            {id === "connected" ? t("Connected") : id === "explore" ? t("Explore") : t("Create")}
          </button>
        ))}
        <a
          href="/developers"
          target="_blank"
          rel="noreferrer"
          style={{ minHeight: 32, display: "inline-flex", alignItems: "center", color: sam.cyan, fontSize: 12 }}
        >
          {t("SAM for Developers")}
        </a>
      </div>

      {error && <div style={{ marginTop: 10, color: sam.red, fontSize: 12 }}>{error}</div>}
      {notice && <div style={{ marginTop: 10, color: sam.green, fontSize: 12 }}>{notice}</div>}
      {webhookReveal && (
        <pre style={{ ...card, whiteSpace: "pre-wrap", fontSize: 11, color: sam.comment }}>{webhookReveal}</pre>
      )}

      {tab === "connected" && (
        <div style={{ marginTop: 8 }}>
          {!installs.length && <Comment>{t("no integrations installed yet")}</Comment>}
          {installs.map((item) => (
            <div key={item.id} style={card}>
              <div style={{ fontWeight: 700 }}>{item.name}</div>
              <Mono c={sam.comment}>
                by {item.authorName} · {item.status}
              </Mono>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                {item.authType === "api_key" && item.status !== "connected" && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      const apiKey = window.prompt("API key") ?? "";
                      if (!apiKey) return;
                      void connectIntegrationAction({ installId: item.id, apiKey }).then(refresh);
                    }}
                    style={{ border: `1px solid ${sam.border}`, background: "transparent", color: sam.text, padding: "6px 10px", fontFamily: sam.font }}
                  >
                    Connect
                  </button>
                )}
                {item.status === "connected" && (
                  <>
                    <button type="button" disabled={busy} onClick={() => void syncIntegrationAction(item.id).then(refresh)} style={{ border: `1px solid ${sam.border}`, background: "transparent", color: sam.text, padding: "6px 10px", fontFamily: sam.font }}>
                      Sync
                    </button>
                    <button type="button" disabled={busy} onClick={() => void disconnectIntegrationAction(item.id).then(refresh)} style={{ border: `1px solid ${sam.border}`, background: "transparent", color: sam.text, padding: "6px 10px", fontFamily: sam.font }}>
                      Disconnect
                    </button>
                  </>
                )}
                <button type="button" disabled={busy} onClick={() => void uninstallIntegrationAction(item.id).then(refresh)} style={{ border: `1px solid ${sam.border}`, background: "transparent", color: sam.red, padding: "6px 10px", fontFamily: sam.font }}>
                  Uninstall
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "explore" && (
        <div style={{ marginTop: 8 }}>
          <button
            type="button"
            disabled={busy}
            onClick={() => void bootstrapFirstPartyIntegrationsAction().then(refresh)}
            style={{ border: `1px solid ${sam.border}`, background: sam.overlay, color: sam.cyan, padding: "8px 10px", fontFamily: sam.font, width: "100%" }}
          >
            Ensure webhook echo
          </button>
          {catalog.map((item) => {
            const installed = installs.some((row) => row.integrationId === item.id);
            return (
              <div key={item.id} style={card}>
                <div style={{ fontWeight: 700 }}>
                  {item.iconKey ?? "🔌"} {item.name}
                </div>
                <Mono c={sam.comment}>by {item.author.displayName}</Mono>
                <div style={{ marginTop: 6, fontSize: 12, color: sam.comment }}>{item.summary}</div>
                <button
                  type="button"
                  disabled={busy || installed}
                  onClick={() =>
                    void installIntegrationAction({ integrationId: item.id }).then((result) => {
                      if (result.webhookToken) {
                        setWebhookReveal(`POST ${result.webhookPath}\nAuthorization: Bearer ${result.webhookToken}`);
                      }
                      setTab("connected");
                      return refresh();
                    })
                  }
                  style={{
                    marginTop: 10,
                    width: "100%",
                    minHeight: 36,
                    border: 0,
                    background: installed ? sam.border : sam.accent,
                    color: installed ? sam.comment : sam.bg,
                    fontFamily: sam.font,
                    fontWeight: 700,
                  }}
                >
                  {installed ? "Installed" : "Install"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {tab === "publish" && (
        <form
          style={{ marginTop: 8 }}
          onSubmit={(event) => {
            event.preventDefault();
            void (async () => {
              setBusy(true);
              setError("");
              try {
                await upsertIntegrationAuthorAction({ displayName: authorName.trim() || "Author" });
                const result = await submitIntegrationAction({ manifest: JSON.parse(manifestDraft) });
                setNotice(`Submitted ${result.slug}@${result.version}`);
                await refresh();
              } catch (cause) {
                setError(cause instanceof Error ? cause.message : "submit failed");
              } finally {
                setBusy(false);
              }
            })();
          }}
        >
          <Comment>
            {t("read docs before publishing")} ·{" "}
            <a href="/developers/author-guide" target="_blank" rel="noreferrer" style={{ color: sam.cyan }}>
              /developers
            </a>
          </Comment>
          <label style={{ display: "block", marginTop: 10, fontSize: 12, color: sam.comment }}>
            Author name
            <input
              value={authorName}
              onChange={(event) => setAuthorName(event.target.value)}
              style={{ display: "block", width: "100%", marginTop: 6, minHeight: 36, padding: "0 10px", border: `1px solid ${sam.border}`, background: sam.bg, color: sam.text, fontFamily: sam.font }}
            />
          </label>
          <label style={{ display: "block", marginTop: 10, fontSize: 12, color: sam.comment }}>
            Manifest JSON
            <textarea
              value={manifestDraft}
              onChange={(event) => setManifestDraft(event.target.value)}
              rows={14}
              style={{ display: "block", width: "100%", marginTop: 6, padding: 10, border: `1px solid ${sam.border}`, background: sam.bg, color: sam.text, fontFamily: "ui-monospace, monospace", fontSize: 11 }}
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            style={{ marginTop: 12, width: "100%", minHeight: 40, border: 0, background: sam.accent, color: sam.bg, fontFamily: sam.font, fontWeight: 700 }}
          >
            {t("Create integration")}
          </button>
          {submitted.map((row) => (
            <div key={row.id} style={card}>
              <strong>{row.name}</strong>
              <Mono c={sam.comment}>
                {row.slug} · {row.status}
              </Mono>
            </div>
          ))}
        </form>
      )}
    </div>
  );
}
