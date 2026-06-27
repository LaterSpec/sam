# SAM MCP — Tool Reference

All tools return JSON in MCP `content[0].text`. Money amounts are numbers in the user's currency (from `sam_get_profile`).

**Read scope:** `sam:read` unless noted.

---

## Profile

### `sam_get_profile`

No arguments.

Returns: `id`, `email`, `fullName`, `username`, `plan`, `currency`, `streak`, `memberSince`, `prefs`, `capabilities` (granted scopes).

### `sam_update_username`

Scope: `sam:profile.write`

| Field | Type | Required |
| --- | --- | --- |
| `username` | string (1–60, no spaces) | yes |

### `sam_update_prefs`

Scope: `sam:profile.write`

| Field | Type | Notes |
| --- | --- | --- |
| `notifications` | boolean | optional |
| `biometric` | boolean | optional |
| `theme` | enum | solarized-cream, ayu-mirage, catppuccin-latte, github-light, kanagawa, ansi-dark, ayu-light, dark, light |
| `rollover` | boolean | optional |
| `accentHue` | number 0–360 | optional |

---

## Accounts

### `sam_list_accounts`

No arguments. Returns accounts with `id`, `name`, `type`, `balance`, `icon`.

### `sam_get_net_worth`

No arguments. Returns total net worth (assets minus card liabilities).

### `sam_create_account`

Scope: `sam:accounts.write`

| Field | Type | Default |
| --- | --- | --- |
| `name` | string (1–120) | required |
| `type` | `cash` \| `checking` \| `savings` \| `card` | `cash` |
| `icon` | string (≤8) | optional |

### `sam_update_account`

Scope: `sam:accounts.write`

| Field | Type | Required |
| --- | --- | --- |
| `id` | uuid | yes |
| `name` | string | optional |
| `type` | enum | optional |
| `icon` | string | optional |

### `sam_transfer_between_accounts`

Scope: `sam:accounts.transfer` · **High risk** · `destructiveHint`

| Field | Type | Required |
| --- | --- | --- |
| `fromId` | uuid | yes |
| `toId` | uuid | yes |
| `amount` | positive number | yes |
| `confirm` | boolean | default `false` — must be `true` to execute |

---

## Expenses & transactions

### `sam_list_transactions`

| Field | Type | Notes |
| --- | --- | --- |
| `from` | ISO date string | optional start |
| `to` | ISO date string | optional end |
| `kind` | `expense` \| `income` | optional filter |
| `categoryKey` | string | optional |
| `accountId` | uuid | optional |
| `search` | string (≤120) | optional free text |
| `limit` | int 1–500 | optional, default paginated |
| `offset` | int ≥0 | optional |

Returns: `count`, `total`, `limit`, `offset`, `transactions[]` with `id`, `name`, `amount`, `category`, `catKey`, `catColor`, `icon`, `time`, `occurred_at`, `kind`, `accountId`.

### `sam_add_expense`

Scope: `sam:expenses.write`

| Field | Type | Default |
| --- | --- | --- |
| `amount` | positive number | required |
| `name` | string (1–120) | required |
| `categoryKey` | string | `misc` |
| `accountId` | uuid | optional (uses default account) |

### `sam_update_expense`

Scope: `sam:expenses.write`

| Field | Type | Required |
| --- | --- | --- |
| `id` | uuid | yes |
| `amount` | positive number | optional |
| `name` | string | optional |
| `categoryKey` | string | optional |
| `accountId` | uuid | optional |
| `notes` | string (≤2000) | optional |

### `sam_delete_expense`

Scope: `sam:expenses.write` · `destructiveHint`

| Field | Type |
| --- | --- |
| `id` | uuid (required) |

Restores affected account balance.

---

## Categories & budgets

### `sam_list_categories`

Returns categories with monthly cap, current-month spend, remaining, percent used.

### `sam_get_budget_status`

| Field | Type | Default |
| --- | --- | --- |
| `nearThresholdPct` | number 1–100 | 80 |

Returns categories over budget and near cap.

### `sam_create_category`

Scope: `sam:categories.write`

| Field | Type | Required |
| --- | --- | --- |
| `name` | string (1–120) | yes |
| `monthlyCap` | number ≥0 | optional |
| `icon` | string (≤8) | optional |
| `color` | `#RRGGBB` | optional |

### `sam_update_category`

Scope: `sam:categories.write`

| Field | Type | Required |
| --- | --- | --- |
| `id` | uuid | yes |
| `name` | string (1–120) | yes |
| `monthlyCap` | number ≥0 | yes |
| `icon` | string | optional |
| `color` | `#RRGGBB` | optional |

### `sam_update_category_cap`

Scope: `sam:categories.write`

| Field | Type |
| --- | --- |
| `categoryId` | uuid |
| `monthlyCap` | number ≥0 |

---

## Summaries

### `sam_get_spending_summary`

| Field | Type | Notes |
| --- | --- | --- |
| `from` | ISO date | optional |
| `to` | ISO date | optional |
| `categoryKey` | string | optional filter |
| `groupBy` | `category` \| `day` \| `month` | optional |

Returns: `from`, `to`, `groupBy`, `total`, `transactionCount`, `groups[]` with `bucket`, `total`, `count`.

### `sam_get_cashflow`

| Field | Type |
| --- | --- |
| `from` | ISO date (optional) |
| `to` | ISO date (optional) |

Returns: `income`, `expense`, `net`, `incomeCount`, `expenseCount`.

---

## Goals

### `sam_list_goals`

Returns goals with target, saved, completion status.

### `sam_create_goal`

Scope: `sam:goals.write`

| Field | Type | Required |
| --- | --- | --- |
| `name` | string (1–120) | yes |
| `target` | number ≥0 | yes |
| `icon` | string | optional |
| `color` | `#RRGGBB` | optional |

### `sam_update_goal`

Scope: `sam:goals.write`

| Field | Type | Required |
| --- | --- | --- |
| `id` | uuid | yes |
| `name` | string | optional |
| `target` | number | optional |
| `icon` | string | optional |
| `color` | `#RRGGBB` | optional |

### `sam_set_goal_saved`

Scope: `sam:goals.write`

| Field | Type |
| --- | --- |
| `id` | uuid |
| `saved` | number ≥0 (capped at target) |

---

## Income

### `sam_list_income_sources`

Recurring sources with amount, frequency, next date.

### `sam_add_income`

Scope: `sam:income.write`

| Field | Type | Required |
| --- | --- | --- |
| `name` | string (1–120) | yes |
| `amount` | positive number | yes |
| `freq` | string (≤32) | optional |
| `next` | string (≤32) | optional |
| `accountId` | uuid | optional — credits account if set |

---

## Savings

### `sam_list_savings_buckets`

Buckets with balance, target, APY.

### `sam_set_bucket_balance`

Scope: `sam:savings.write`

| Field | Type |
| --- | --- |
| `bucketId` | uuid |
| `balance` | number ≥0 |

---

## Simulated investing

Not real broker trades.

### `sam_list_holdings`

Holdings: symbol, quantity, average cost.

### `sam_list_watchlist`

Watchlist symbols.

### `sam_get_quote`

| Field | Type |
| --- | --- |
| `symbol` | string (1–16) |

Latest market quote.

### `sam_buy_holding`

Scope: `sam:invest.write`

| Field | Type | Required |
| --- | --- | --- |
| `symbol` | string | yes |
| `amount` | positive number (dollars) | yes |
| `price` | positive number | yes |
| `name` | string | optional |

### `sam_sell_holding`

Scope: `sam:invest.write` · `destructiveHint`

| Field | Type | Required |
| --- | --- | --- |
| `symbol` | string | yes |
| `price` | positive number | yes |
| `qty` | positive number | optional (or `amount`) |
| `amount` | positive number | optional (or `qty`) |

### `sam_add_watch` / `sam_remove_watch`

Scope: `sam:invest.write`

| Field | Type |
| --- | --- |
| `symbol` | string (required) |
| `name` | string (add only, optional) |

---

## Not exposed via MCP

- Account deletion
- Credential / password changes
- Raw SQL or admin operations

---

## Source of truth

Tool definitions live in `lib/mcp/tools/*.ts`. If this reference drifts, regenerate from `tools/list` or read the source files.
