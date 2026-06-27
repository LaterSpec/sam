---
name: sam-mcp
description: Connects to the SAM personal finance MCP server over Streamable HTTP to read and manage the authenticated user's accounts, expenses, budgets, goals, income, savings, and simulated investments. Use when configuring MCP clients (Cursor, Claude, Hermes Agent, OpenClaw), calling SAM finance tools, querying spending or transactions via MCP, adding expenses through an agent, or when the user mentions SAM MCP, /api/mcp, or sam_mcp tokens.
---

# SAM MCP

SAM exposes a remote MCP server at `{APP_URL}/api/mcp`.

**Production:** `https://sam-app.its-manuel-caceres.workers.dev/api/mcp`  
**Local:** `http://localhost:3000/api/mcp`

All financial data access for agents must go through MCP tools — never query the database or internal Server Actions when the user requested MCP-only access.

## Setup (human)

1. Log in to SAM → Profile → **Connect MCP** → create token.
2. Set `SAM_MCP_TOKEN` in the environment (never commit the token).
3. Point the MCP client at `{APP_URL}/api/mcp` with `Authorization: Bearer $SAM_MCP_TOKEN`.

Full client configs: [client-configs.md](client-configs.md)  
Human-readable guide: [docs/MCP.md](../../../docs/MCP.md)

## Agent workflow

1. Call **`sam_get_profile`** first — get `currency`, `capabilities` (scopes), and user context.
2. Pick tools by intent (see table below).
3. Parse tool output: JSON string in `result.content[0].text`.
4. On `scope_denied`, tell the user which scope is missing; do not bypass with DB access.
5. On `confirmation_required`, ask the user before retrying with `confirm: true`.

## Tool selection

| Intent | Tools |
| --- | --- |
| Profile / currency / scopes | `sam_get_profile` |
| List expenses / spending history | `sam_list_transactions` (`kind: "expense"`) |
| Spending totals / breakdown | `sam_get_spending_summary` (`groupBy`: category/day/month) |
| Income vs expense | `sam_get_cashflow` |
| Add / edit / delete expense | `sam_add_expense`, `sam_update_expense`, `sam_delete_expense` |
| Accounts / balances / net worth | `sam_list_accounts`, `sam_get_net_worth` |
| Budget categories / caps | `sam_list_categories`, `sam_get_budget_status` |
| Create / update category | `sam_create_category`, `sam_update_category`, `sam_update_category_cap` |
| Transfer money | `sam_list_accounts` → `sam_transfer_between_accounts` (`confirm: true`) |
| Goals | `sam_list_goals`, `sam_create_goal`, `sam_update_goal`, `sam_set_goal_saved` |
| Income sources | `sam_list_income_sources`, `sam_add_income` |
| Savings buckets | `sam_list_savings_buckets`, `sam_set_bucket_balance` |
| Simulated invest | `sam_list_holdings`, `sam_get_quote`, `sam_buy_holding`, `sam_sell_holding`, `sam_list_watchlist`, `sam_add_watch`, `sam_remove_watch` |
| Prefs / username | `sam_update_prefs`, `sam_update_username` |

Full schemas and scopes: [tools-reference.md](tools-reference.md)

## Protocol (when calling HTTP directly)

Required headers on every `POST`:

```
Content-Type: application/json
Accept: application/json, text/event-stream
Authorization: Bearer sam_mcp_<prefix>_<secret>
```

JSON-RPC methods:

- `initialize` — handshake
- `tools/list` — discover tools
- `tools/call` — `{ "name": "sam_list_transactions", "arguments": { "kind": "expense", "limit": 50 } }`

Stateless: no session id; one request per message.

Examples (curl, PowerShell): [examples.md](examples.md)

## Scopes

Check `capabilities` from `sam_get_profile` before writes.

| Scope | Write tools |
| --- | --- |
| `sam:read` | All read tools |
| `sam:expenses.write` | `sam_add_expense`, `sam_update_expense`, `sam_delete_expense` |
| `sam:categories.write` | Category create/update tools |
| `sam:income.write` | `sam_add_income` |
| `sam:savings.write` | `sam_set_bucket_balance` |
| `sam:goals.write` | Goal create/update tools |
| `sam:accounts.write` | `sam_create_account`, `sam_update_account` |
| `sam:accounts.transfer` | `sam_transfer_between_accounts` |
| `sam:invest.write` | Buy/sell/watch tools |
| `sam:profile.write` | `sam_update_username`, `sam_update_prefs` |

## Error handling

| Code | Action |
| --- | --- |
| `scope_denied` | Inform user; suggest regenerating token with scope |
| `confirmation_required` | Ask user, then retry with `confirm: true` |
| `account_not_found` / `category_not_found` | Call list tools to resolve valid ids/keys |
| `insufficient_balance` | Report balance issue; do not retry blindly |

## Reporting results to the user

- Use the profile `currency` for money formatting.
- Summarize lists; show tables for ≤20 rows.
- For spending questions, prefer `sam_get_spending_summary` for totals and `sam_list_transactions` for line items.
- Mention date range used when filtering.

## OpenClaw note

Tools may appear namespaced as `sam:sam_list_transactions`. Arguments and behavior are unchanged.
