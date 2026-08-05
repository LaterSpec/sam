"use client";

import { useEffect, useState } from "react";
import { Check, Copy, KeyRound, LoaderCircle, Trash2 } from "lucide-react";
import { createMcpTokenAction, listMcpTokensAction, revokeMcpTokenAction, type McpTokenSummary } from "@/lib/actions/mcp-actions";
import { ALL_SCOPES, SCOPE_DESCRIPTIONS } from "@/lib/mcp/scopes";

export function McpPanel() {
  const [tokens, setTokens] = useState<McpTokenSummary[]>([]);
  const [revealed, setRevealed] = useState("");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => { void listMcpTokensAction().then(setTokens).catch((cause) => setError(cause instanceof Error ? cause.message : "Could not load tokens")).finally(() => setBusy(false)); }, []);
  const create = async (form: FormData) => { setBusy(true); setError(""); try { const result = await createMcpTokenAction({ name: String(form.get("name") || "Desktop client"), scopes: form.getAll("scopes").map(String), expiresInDays: Number(form.get("days") || 90) }); setRevealed(result.token); setTokens((items) => [result.summary, ...items]); } catch (cause) { setError(cause instanceof Error ? cause.message : "Token creation failed"); } finally { setBusy(false); } };
  const revoke = async (id: string) => { setBusy(true); try { await revokeMcpTokenAction(id); setTokens((items) => items.map((item) => item.id === id ? { ...item, revokedAt: new Date().toISOString() } : item)); } finally { setBusy(false); } };
  const copy = async () => { await navigator.clipboard.writeText(revealed); setCopied(true); window.setTimeout(() => setCopied(false), 1600); };
  return <div className="desk-mcp-panel"><div className="desk-action-intro"><KeyRound size={20}/><div><h2>Connect SAM MCP</h2><p>Create a scoped credential. The secret is shown once.</p></div></div>{revealed && <div className="desk-secret"><code>{revealed}</code><button type="button" onClick={copy}>{copied ? <Check size={14}/> : <Copy size={14}/>} {copied ? "Copied" : "Copy"}</button></div>}<form action={create} className="desk-action-form"><label className="desk-field"><span>Token name</span><input name="name" required defaultValue="Desktop client"/></label><label className="desk-field"><span>Expires</span><select name="days" defaultValue="90"><option value="30">30 days</option><option value="90">90 days</option><option value="365">1 year</option></select></label><fieldset className="desk-scope-list"><legend>Permissions</legend>{ALL_SCOPES.map((scope) => <label key={scope}><input type="checkbox" name="scopes" value={scope} defaultChecked={["sam:read", "sam:expenses.write", "sam:categories.write"].includes(scope)}/><span><strong>{scope}</strong><small>{SCOPE_DESCRIPTIONS[scope]}</small></span></label>)}</fieldset>{error && <p className="desk-form-error" role="alert">{error}</p>}<button type="submit" className="desk-primary-button" disabled={busy}>{busy ? <LoaderCircle className="desk-spin" size={15}/> : <KeyRound size={15}/>} Generate token</button></form><div className="desk-token-list"><h3>Credentials</h3>{tokens.map((token) => <div key={token.id} className={token.revokedAt ? "is-revoked" : ""}><span><strong>{token.name}</strong><small>{token.publicPrefix}… · {token.revokedAt ? "revoked" : "active"}</small></span>{!token.revokedAt && <button type="button" onClick={() => void revoke(token.id)} aria-label={`Revoke ${token.name}`}><Trash2 size={14}/></button>}</div>)}</div></div>;
}
