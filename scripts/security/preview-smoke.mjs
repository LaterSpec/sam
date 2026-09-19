import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { randomBytes, createHash } from "node:crypto";
import { mkdtemp, writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { neon } from "@neondatabase/serverless";

// Explicit opt-in. Never accepts the default/production branch or a data clone.
const [projectId, branchId] = process.argv.slice(2);
assert.ok(projectId && branchId, "Usage: node scripts/security/preview-smoke.mjs PROJECT_ID BRANCH_ID");
const neonctl = (args) => execFileSync("npx", ["--yes", "neonctl", ...args], { encoding: "utf8" });
const branch = JSON.parse(neonctl(["branches", "get", branchId, "--project-id", projectId, "--output", "json"]));
assert.equal(branch.default, false);
assert.equal(branch.primary, false);
assert.equal(branch.init_source, "parent-schema");
assert.ok(branch.name.startsWith("security-validation-"));
const databaseUrl = neonctl(["connection-string", branchId, "--project-id", projectId]).trim();
const productionUrl = neonctl(["connection-string", "production", "--project-id", projectId]).trim();
assert.notEqual(new URL(databaseUrl).hostname.replace("-pooler", ""), new URL(productionUrl).hostname.replace("-pooler", ""));
const sql = neon(databaseUrl);
await sql`delete from "user" where email like 'security-%'`;
const [{ count }] = await sql`select count(*)::int as count from "user"`;
assert.equal(count, 0, "Requires an empty schema-only branch; will not erase existing data");

const base = "http://127.0.0.1:8791";
const pepper = randomBytes(32).toString("hex");
const folder = await mkdtemp(join(tmpdir(), "sam-security-smoke-"));
const envFile = join(folder, "preview.env");
const isolated = {
  DATABASE_URL: databaseUrl,
  BETTER_AUTH_SECRET: randomBytes(32).toString("hex"),
  BETTER_AUTH_URL: base, NEXT_PUBLIC_APP_URL: base,
  MCP_TOKEN_PEPPER: pepper, BETTER_AUTH_EMAIL_ENABLED: "true",
  GOOGLE_CLIENT_ID: "", GOOGLE_CLIENT_SECRET: "", OPENAI_API_KEY: "test-only-no-provider-access",
  OPENAI_BASE_URL: "http://127.0.0.1:9/v1", RECURRING_CRON_ENABLED: "false",
};
await writeFile(envFile, Object.entries(isolated).map(([key, value]) => `${key}=${JSON.stringify(value)}`).join("\n"), { mode: 0o600 });
let logs = "";
const worker = spawn(process.execPath, ["node_modules/wrangler/bin/wrangler.js", "dev", "--local", "--ip", "127.0.0.1", "--port", "8791", "--env-file", envFile, "--persist-to", join(folder, "state")], {
  env: { ...process.env, ...isolated, WRANGLER_SEND_METRICS: "false" }, stdio: ["ignore", "pipe", "pipe"],
});
worker.stdout.on("data", chunk => { logs = (logs + chunk).slice(-18000); });
worker.stderr.on("data", chunk => { logs = (logs + chunk).slice(-18000); });
const request = (path, options = {}) => fetch(base + path, { ...options, redirect: "manual", signal: AbortSignal.timeout(30000) });
const jsonPost = (path, body, cookie = "", origin = base) => request(path, { method: "POST", headers: { "content-type": "application/json", origin, cookie }, body: JSON.stringify(body) });
const check = name => console.log(`PASS ${name}`);
const cookies = response => response.headers.getSetCookie().map(value => value.split(";")[0]).join("; ");
try {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    try { if ((await request("/manifest.webmanifest")).ok) { ready = true; break; } } catch { /* booting */ }
    if (worker.exitCode !== null) throw new Error("Worker exited during startup");
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  assert.ok(ready, "Preview did not start");
  for (const path of ["/", "/manifest.webmanifest", "/~offline"]) assert.equal((await request(path)).status, 200, path);
  assert.equal((await request("/_next/image?url=/icon.png&w=64&q=75")).status, 404);
  assert.equal((await request("/api/plan")).status, 401, "anonymous plan");
  const anonymousSamy = await jsonPost("/api/samy/chat", { message: "Hola" });
  assert.equal(anonymousSamy.status, 401, `anonymous Samy: ${(await anonymousSamy.text()).slice(0, 1500)}`);
  assert.equal((await request("/api/mcp", { method: "POST", headers: { "content-type": "application/json", accept: "application/json, text/event-stream" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" }) })).status, 401, "anonymous MCP");
  assert.equal((await request("/app/settings")).status, 307);
  check("public pages, PWA, disabled image optimizer and unauthenticated access");

  const users = [];
  for (const tag of ["a", "b"]) {
    const email = `security-${tag}-${randomBytes(5).toString("hex")}@example.com`;
    const password = randomBytes(24).toString("hex");
    const response = await jsonPost("/api/auth/sign-up/email", { email, password, name: `Security Test ${tag}` });
    assert.equal(response.status, 200, `sign-up ${tag}: ${await response.clone().text()}`);
    const payload = await response.json();
    const cookie = cookies(response);
    assert.ok(cookie);
    const user = { id: payload.user.id, email, password, cookie };
    users.push(user);
    const session = await request("/api/auth/get-session", { headers: { cookie } });
    assert.equal((await session.json()).user.id, user.id);
    const plan = await request("/api/plan", { headers: { cookie } });
    assert.equal((await plan.json()).accessMode, "trial");
    assert.equal((await request("/app/settings", { headers: { cookie } })).status, 200);
  }
  const [a, b] = users;
  check("two registrations, bootstrap, sessions, protected page and trial");
  assert.equal((await jsonPost("/api/auth/sign-in/email", { email: a.email, password: "wrong-password" })).status, 401);
  const login = await jsonPost("/api/auth/sign-in/email", { email: a.email, password: a.password });
  assert.equal(login.status, 200);
  a.cookie = cookies(login);
  assert.equal((await jsonPost("/api/auth/sign-out", {}, a.cookie, "https://untrusted.example")).status, 403);
  check("login, invalid password and untrusted-origin rejection");

  // Fixture provisioning only, on the verified empty test branch.
  for (const user of users) {
    const prefix = randomBytes(6).toString("hex");
    const secret = randomBytes(32).toString("hex");
    const hash = createHash("sha256").update(`${pepper}:${secret}`).digest("hex");
    const scopes = ["sam:read", "sam:expenses.write", "sam:income.write"];
    await sql`insert into mcp_tokens (user_id, name, public_prefix, token_hash, scopes) values (${user.id}, 'security-fixture', ${prefix}, ${hash}, ${scopes})`;
    user.token = `sam_mcp_${prefix}_${secret}`;
  }
  let rpcId = 0;
  const call = async (user, name, args = {}) => {
    const response = await request("/api/mcp", { method: "POST", headers: { "content-type": "application/json", accept: "application/json, text/event-stream", authorization: `Bearer ${user.token}` }, body: JSON.stringify({ jsonrpc: "2.0", id: ++rpcId, method: "tools/call", params: { name, arguments: args } }) });
    assert.equal(response.status, 200, `${name} HTTP ${response.status}`);
    const result = await response.json();
    assert.ok(result.result?.content?.[0]?.text, `${name}: missing tool response`);
    return JSON.parse(result.result.content[0].text);
  };
  for (const user of users) {
    const profile = await call(user, "sam_get_profile");
    assert.equal(profile.id, user.id);
    assert.ok(profile.capabilities.includes("sam:expenses.write"));
  }
  const accountsA = await call(a, "sam_list_accounts");
  const accountsB = await call(b, "sam_list_accounts");
  const itemsA = Array.isArray(accountsA) ? accountsA : (accountsA.accounts ?? []);
  const itemsB = Array.isArray(accountsB) ? accountsB : (accountsB.accounts ?? []);
  const accountA = itemsA[0].id;
  assert.ok(!itemsB.some(account => account.id === accountA));
  assert.ok(!(await call(a, "sam_add_income", { amount: 20, name: "Fixture funding", accountId: accountA })).error);
  assert.ok(!(await call(a, "sam_add_expense", { amount: 5, name: "Fixture expense", accountId: accountA })).error);
  const listA = await call(a, "sam_list_transactions", { kind: "expense" });
  const listB = await call(b, "sam_list_transactions", { kind: "expense" });
  assert.equal(listA.count, 1);
  assert.equal(listB.count, 0);
  const denied = await call(b, "sam_add_expense", { amount: 1, name: "Cross-user denial test", accountId: accountA });
  assert.ok(denied.error, "Foreign account write must fail");
  assert.equal((await call(a, "sam_get_spending_summary")).total, 5);
  check("MCP scopes, reads/writes, authoritative totals and cross-user isolation");

  const stream = await jsonPost("/api/samy/chat", { message: "escribe un poema sobre el mar" }, a.cookie);
  assert.equal(stream.status, 200);
  assert.match(await stream.text(), /event: done/);
  check("Samy SSE refusal path without an LLM request");
  await sql`update profiles set trial_ends_at = now() - interval '1 second', entitlement_version = entitlement_version + 1 where id = ${a.id}`;
  const planForA = async () => (await request("/api/plan", { headers: { cookie: a.cookie } })).json();
  assert.equal((await planForA()).accessMode, "free");
  assert.equal((await jsonPost("/api/samy/chat", { message: "Mis gastos" }, a.cookie)).status, 403);
  await sql`update profiles set plan = 'pro', plan_started_at = now(), plan_expires_at = now() + interval '1 day', entitlement_version = entitlement_version + 1 where id = ${a.id}`;
  assert.equal((await planForA()).accessMode, "paid");
  await sql`update profiles set plan_started_at = now() - interval '2 days', plan_expires_at = now() - interval '1 second', entitlement_version = entitlement_version + 1 where id = ${a.id}`;
  assert.equal((await planForA()).accessMode, "free");
  check("trial expiry, Samy entitlement denial, paid plan activation and expiry");
  assert.equal((await jsonPost("/api/auth/sign-out", {}, a.cookie)).status, 200);
  assert.equal((await request("/api/plan", { headers: { cookie: a.cookie } })).status, 401);
  check("logout invalidates server session");
  console.log(`Verified branch ${branch.id}; synthetic fixtures retained until branch expiry ${branch.expires_at}.`);
} catch (error) {
  await new Promise(resolve => setTimeout(resolve, 250));
  // No tokens, cookies, database credentials or raw worker logs in output.
  const message = String(error?.message ?? error).replaceAll(databaseUrl, "[REDACTED]");
  console.error(message.slice(0, 1500));
  console.error("Worker log diagnostics:", logs.split("\n").filter(line => /ERROR|Error|Cannot|failed|cause|500|Reference|TypeError|Module/.test(line)).map(line => {
    for (const value of Object.values(isolated)) if (value.length > 8) line = line.replaceAll(value, "[REDACTED]");
    return line;
  }).slice(-25));
  process.exitCode = 1;
} finally {
  worker.kill("SIGTERM");
  await unlink(envFile);
}
