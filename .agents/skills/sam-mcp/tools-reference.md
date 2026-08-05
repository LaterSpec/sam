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
| `category` | string | optional display-name filter, case-insensitive |
| `accountId` | uuid | optional |
| `search` | string (≤120) | optional free text |
| `limit` | int 1–500 | optional, default paginated |
| `offset` | int ≥0 | optional |

Returns: `count`, `total`, `limit`, `offset`, `transactions[]` with `id`, `name`, `amount`, `category`, `catColor`, `icon`, `time`, `occurred_at`, `kind`, `accountId`. `category` is the user-facing text; internal keys are not returned.

### `sam_add_expense`

Scope: `sam:expenses.write`

| Field | Type | Default |
| --- | --- | --- |
| `amount` | positive number | required |
| `name` | string (1–120) | required |
| `category` | string | optional; defaults to the user's miscellaneous category and otherwise must match `sam_list_categories` |
| `accountId` | uuid | optional (uses default account) |

### `sam_update_expense`

Scope: `sam:expenses.write`

| Field | Type | Required |
| --- | --- | --- |
| `id` | uuid | yes |
| `amount` | positive number | optional |
| `name` | string | optional |
| `category` | string | optional; must match a name from `sam_list_categories` |
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

Returns categories with `id`, user-facing `name`, icon/color, monthly cap, current-month spend, remaining, and percent used. Internal category keys are not returned.

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
| `category` | string | optional display-name filter, case-insensitive |
| `groupBy` | `category` \| `day` \| `month` | optional |

Returns: `from`, `to`, `groupBy`, `category`, `total`, `transactionCount`, `groups[]` with `bucket`, `total`, `count`. When grouped by category, `bucket` is the user-facing category name.

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

Deprecated, read-only compatibility view. Use `sam_list_recurring_rules`.

### `sam_add_income`

Scope: `sam:income.write`

| Field | Type | Required |
| --- | --- | --- |
| `name` | string (1–120) | yes |
| `amount` | positive number | yes |
| `accountId` | uuid | yes |
| `occurredAt` | ISO datetime | optional |

This always creates one income transaction. Use recurring tools for schedules.

---

## Recurring movements

Read tools (`sam:read`):

- `sam_list_recurring_rules`
- `sam_list_recurring_occurrences`

Write tools require `sam:recurring.write`:

- `sam_create_recurring_rule`
- `sam_update_recurring_rule`
- `sam_pause_recurring_rule`
- `sam_resume_recurring_rule`
- `sam_archive_recurring_rule`
- `sam_delete_recurring_rule` (archive compatibility alias)
- `sam_retry_recurring_occurrence`

Create inputs: `kind`, `name`, `amount`, `accountId`, `frequencyUnit`,
`frequencyInterval`, `startDate`, optional `endDate`, and `timezone`.
Expenses require `categoryId`; income omits it. A past/current start requires
`confirmCatchUp: true`. Archive/delete require `confirm: true`.

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

## Not exposed via MCP

- Account deletion
- Credential / password changes
- Raw SQL or admin operations

---

## Source of truth

Tool definitions live in `lib/mcp/tools/*.ts`. If this reference drifts, regenerate from `tools/list` or read the source files.
