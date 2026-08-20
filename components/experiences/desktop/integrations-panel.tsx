"use client";

import { useCallback, useEffect, useState } from "react";
import { useMutationLock } from "@/lib/hooks/use-mutation-lock";
import {
  Check,
  Link2,
  LoaderCircle,
  Plug,
  PlugZap,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import {
  bootstrapFirstPartyIntegrationsAction,
  connectIntegrationAction,
  disconnectIntegrationAction,
  installIntegrationAction,
  listIntegrationCatalogAction,
  listMyIntegrationInstallsAction,
  listMySubmittedIntegrationsAction,
  listPendingIntegrationReviewsAction,
  reviewIntegrationAction,
  submitIntegrationAction,
  syncIntegrationAction,
  uninstallIntegrationAction,
  upsertIntegrationAuthorAction,
} from "@/lib/actions/integration-actions";

type Tab = "connected" | "explore" | "publish" | "review";

type CatalogItem = Awaited<ReturnType<typeof listIntegrationCatalogAction>>[number];
type InstallItem = Awaited<ReturnType<typeof listMyIntegrationInstallsAction>>[number];

export function IntegrationsPanel() {
  const [tab, setTab] = useState<Tab>("connected");
  const { busy, run } = useMutationLock();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [installs, setInstalls] = useState<InstallItem[]>([]);
  const [submitted, setSubmitted] = useState<Array<{ id: string; slug: string; name: string; status: string; currentVersion: string | null }>>([]);
  const [pending, setPending] = useState<Awaited<ReturnType<typeof listPendingIntegrationReviewsAction>>>({
    canReview: false,
    items: [],
  });
  const [revealedWebhook, setRevealedWebhook] = useState<{ path: string; token: string } | null>(null);
  const [apiKeyDraft, setApiKeyDraft] = useState<Record<string, string>>({});
  const [manifestDraft, setManifestDraft] = useState(
    JSON.stringify(
      {
        id: "my-connector",
        version: "1.0.0",
        name: "My connector",
        description: "Describe what it does",
        author: { displayName: "You" },
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
  const [authorName, setAuthorName] = useState("");

  const load = useCallback(async () => {
    const [nextCatalog, nextInstalls, nextSubmitted, nextPending] = await Promise.all([
      listIntegrationCatalogAction(),
      listMyIntegrationInstallsAction(),
      listMySubmittedIntegrationsAction(),
      listPendingIntegrationReviewsAction(),
    ]);
    setCatalog(nextCatalog);
    setInstalls(nextInstalls);
    setSubmitted(nextSubmitted);
    setPending(nextPending);
  }, []);

  const refresh = useCallback(async () => {
    setError("");
    try {
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to load integrations");
    }
  }, [load]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const install = async (integrationId: string) => {
    await run(async () => {
      setError("");
      setNotice("");
      const result = await installIntegrationAction({ integrationId });
      if (result.webhookToken) {
        setRevealedWebhook({ path: result.webhookPath, token: result.webhookToken });
      }
      setNotice(`Installed (${result.status})`);
      setTab("connected");
      await load();
    }).catch((cause) => {
      setError(cause instanceof Error ? cause.message : "Install failed");
    });
  };

  const mutate = (task: () => Promise<unknown>, failed: string) => {
    void run(async () => {
      setError("");
      setNotice("");
      await task();
      await load();
    }).catch((cause) => {
      setError(cause instanceof Error ? cause.message : failed);
    });
  };

  return (
    <div className="desk-integrations-panel">
      <div className="desk-action-intro">
        <PlugZap size={20} />
        <div>
          <h2>Integrations</h2>
          <p>Marketplace connectors that sync or push data into your ledger. Authors appear on every listing.</p>
        </div>
      </div>

      <div className="desk-heading-actions" style={{ marginBottom: 14 }}>
        <a className="desk-secondary-button" href="/developers" target="_blank" rel="noreferrer">
          SAM for Developers
        </a>
        <button type="button" className="desk-primary-button" onClick={() => setTab("publish")}>
          <Upload size={14} /> Create integration
        </button>
      </div>

      <div className="desk-integrations-tabs" role="tablist">
        {(
          [
            ["connected", "Connected"],
            ["explore", "Explore"],
            ["publish", "Publish"],
            ...(pending.canReview ? [["review", "Review"]] as const : []),
          ] as Array<[Tab, string]>
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? "is-active" : ""}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
        <button type="button" className="desk-text-button" onClick={() => void run(refresh)} disabled={busy}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && <p className="desk-form-error" role="alert">{error}</p>}
      {notice && <p className="desk-form-note">{notice}</p>}

      {revealedWebhook && (
        <div className="desk-secret">
          <code>
            POST {revealedWebhook.path}
            {"\n"}Authorization: Bearer {revealedWebhook.token}
          </code>
          <button type="button" onClick={() => setRevealedWebhook(null)}>
            <Check size={14} /> Dismiss
          </button>
        </div>
      )}

      {tab === "connected" && (
        <div className="desk-integration-list">
          {!installs.length && <p className="desk-empty-inline">No integrations installed yet. Explore the marketplace.</p>}
          {installs.map((item) => (
            <article key={item.id} className="desk-integration-card">
              <header>
                <strong>{item.name}</strong>
                <small>
                  by {item.authorName} · {item.status} · v{item.version}
                </small>
              </header>
              <p>
                Auth: {item.authType}
                {item.lastSyncAt ? ` · last sync ${new Date(item.lastSyncAt).toLocaleString()}` : ""}
                {item.lastError ? ` · error: ${item.lastError}` : ""}
              </p>
              <div className="desk-heading-actions">
                {item.authType === "api_key" && item.status !== "connected" && (
                  <>
                    <input
                      className="desk-inline-input"
                      placeholder="API key"
                      value={apiKeyDraft[item.id] ?? ""}
                      onChange={(event) =>
                        setApiKeyDraft((current) => ({ ...current, [item.id]: event.target.value }))
                      }
                    />
                    <button
                      type="button"
                      className="desk-secondary-button"
                      disabled={busy}
                      onClick={() =>
                        mutate(
                          () => connectIntegrationAction({
                            installId: item.id,
                            apiKey: apiKeyDraft[item.id],
                          }),
                          "Connect failed"
                        )
                      }
                    >
                      <Link2 size={14} /> Connect
                    </button>
                  </>
                )}
                {item.authType === "oauth2" && item.status !== "connected" && (
                  <a className="desk-secondary-button" href={`/api/integrations/oauth/start?installId=${item.id}`}>
                    <Link2 size={14} /> Connect OAuth
                  </a>
                )}
                {item.status === "connected" && (
                  <>
                    <button
                      type="button"
                      className="desk-secondary-button"
                      disabled={busy}
                      onClick={() => mutate(() => syncIntegrationAction(item.id), "Sync failed")}
                    >
                      <RefreshCw size={14} /> Sync
                    </button>
                    <button
                      type="button"
                      className="desk-secondary-button"
                      disabled={busy}
                      onClick={() => mutate(() => disconnectIntegrationAction(item.id), "Disconnect failed")}
                    >
                      Disconnect
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="desk-secondary-button"
                  disabled={busy}
                  onClick={() => mutate(() => uninstallIntegrationAction(item.id), "Uninstall failed")}
                >
                  <Trash2 size={14} /> Uninstall
                </button>
              </div>
              {item.webhookPath && (
                <small className="desk-muted-line">Webhook: {item.webhookPath} (token shown only at install)</small>
              )}
            </article>
          ))}
        </div>
      )}

      {tab === "explore" && (
        <div className="desk-integration-list">
          <div className="desk-heading-actions" style={{ marginBottom: 12 }}>
            <button
              type="button"
              className="desk-secondary-button"
              disabled={busy}
              onClick={() =>
                mutate(
                  async () => {
                    await bootstrapFirstPartyIntegrationsAction();
                    setNotice("Webhook Echo is available in the catalog");
                  },
                  "Bootstrap failed"
                )
              }
            >
              <Plug size={14} /> Ensure webhook echo
            </button>
          </div>
          {!catalog.length && <p className="desk-empty-inline">No published integrations yet.</p>}
          {catalog.map((item) => {
            const installed = installs.some((row) => row.integrationId === item.id);
            return (
              <article key={item.id} className="desk-integration-card">
                <header>
                  <strong>
                    <span aria-hidden="true">{item.iconKey ?? "🔌"} </span>
                    {item.name}
                  </strong>
                  <small>
                    by {item.author.displayName}
                    {item.author.verified ? " · verified" : ""} · {item.authType} · v{item.currentVersion}
                  </small>
                </header>
                <p>{item.summary}</p>
                <small className="desk-muted-line">Scopes: {item.scopes.join(", ") || "—"}</small>
                <div className="desk-heading-actions">
                  <button
                    type="button"
                    className="desk-primary-button"
                    disabled={busy || installed}
                    onClick={() => void install(item.id)}
                  >
                    {busy ? <LoaderCircle className="desk-spin" size={14} /> : <Plug size={14} />}
                    {installed ? "Installed" : "Install"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {tab === "publish" && (
        <form
          className="desk-action-form"
          onSubmit={(event) => {
            event.preventDefault();
            mutate(async () => {
              if (authorName.trim()) {
                await upsertIntegrationAuthorAction({ displayName: authorName.trim() });
              }
              const manifest = JSON.parse(manifestDraft) as unknown;
              const result = await submitIntegrationAction({ manifest });
              setNotice(`Submitted ${result.slug}@${result.version} for review`);
            }, "Submit failed");
          }}
        >
          <p className="desk-muted-line">
            Read the online docs before submitting:{" "}
            <a href="/developers/author-guide" target="_blank" rel="noreferrer">
              Author guide
            </a>{" "}
            ·{" "}
            <a href="/developers/manifest" target="_blank" rel="noreferrer">
              Manifest
            </a>
          </p>
          <label className="desk-field">
            <span>Author display name</span>
            <input value={authorName} onChange={(event) => setAuthorName(event.target.value)} placeholder="Shown on listings" />
          </label>
          <label className="desk-field">
            <span>Manifest JSON</span>
            <textarea rows={16} value={manifestDraft} onChange={(event) => setManifestDraft(event.target.value)} />
          </label>
          <button type="submit" className="desk-primary-button" disabled={busy}>
            {busy ? <LoaderCircle className="desk-spin" size={14} /> : <Upload size={14} />}
            Submit for review
          </button>
          {!!submitted.length && (
            <div className="desk-integration-list">
              <h3>Your submissions</h3>
              {submitted.map((row) => (
                <article key={row.id} className="desk-integration-card">
                  <strong>{row.name}</strong>
                  <small>
                    {row.slug} · {row.status} · {row.currentVersion ?? "no published version"}
                  </small>
                </article>
              ))}
            </div>
          )}
        </form>
      )}

      {tab === "review" && pending.canReview && (
        <div className="desk-integration-list">
          {!pending.items.length && <p className="desk-empty-inline">No pending reviews.</p>}
          {pending.items.map((item) => (
            <article key={item.versionId} className="desk-integration-card">
              <header>
                <strong>{item.name}</strong>
                <small>
                  {item.slug}@{item.version} by {item.authorName} · {item.runtime}
                </small>
              </header>
              <p>{item.changelog || "No changelog"}</p>
              <div className="desk-heading-actions">
                <button
                  type="button"
                  className="desk-primary-button"
                  disabled={busy}
                  onClick={() =>
                    mutate(
                      () => reviewIntegrationAction({ versionId: item.versionId, decision: "published" }),
                      "Review failed"
                    )
                  }
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="desk-secondary-button"
                  disabled={busy}
                  onClick={() =>
                    mutate(
                      () => reviewIntegrationAction({ versionId: item.versionId, decision: "rejected" }),
                      "Review failed"
                    )
                  }
                >
                  Reject
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
