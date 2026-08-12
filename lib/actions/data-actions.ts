"use server";

import { db } from "@/lib/db";
import { getSql } from "@/lib/db/sql";
import {
  transactions,
  goals,
  categories,
  savingsBuckets,
  profiles,
  accounts,
  user as userTable,
  session as sessionTable,
  account as accountTable,
} from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { loadUserData } from "@/lib/db/queries/load-user-data";
import { revalidatePath } from "next/cache";
import { formatTime } from "@/lib/utils";
import { accountColor, accountDefaultIcon } from "@/lib/accounts/account-types";
import { auth } from "@/lib/auth/auth";
import { addIncomeTransaction } from "@/lib/domain/income";
import {
  addExpense as addExpenseDomain,
  deleteExpense as deleteExpenseDomain,
  updateExpense as updateExpenseDomain,
} from "@/lib/domain/expenses";
import {
  createAccount as createAccountDomain,
  transferBetweenAccounts,
  updateAccount as updateAccountDomain,
} from "@/lib/domain/accounts";
import { normalizeCurrency } from "@/lib/finance/currency";
import { z } from "zod";

const shouldUseSharedFinanceDomain = () => true;

function mapAccountRow(a: typeof accounts.$inferSelect) {
  return {
    id: a.id,
    name: a.name,
    type: a.type,
    balance: Number(a.balance),
    currency: normalizeCurrency(a.currency),
    creditLimit: a.creditLimit != null ? Number(a.creditLimit) : null,
    last4: a.last4,
    icon: a.icon,
    color: a.color,
  };
}

type RawAccountRow = {
  id: string;
  name: string;
  type: string;
  balance: string | number;
  currency?: string | null;
  credit_limit: string | number | null;
  last4: string | null;
  icon: string;
  color: string;
};

type RawTxRow = {
  id: string;
  name: string;
  amount: string | number;
  category: string | null;
  cat_key: string | null;
  cat_color: string | null;
  icon: string | null;
  occurred_at: Date | string;
  kind: string;
  account_id: string | null;
  notes: string | null;
};

type AddExpenseSqlRow = RawTxRow & {
  account_row_id: string;
  account_name: string;
  account_type: string;
  account_balance: string | number;
  account_currency: string | null;
  account_credit_limit: string | number | null;
  account_last4: string | null;
  account_icon: string;
  account_color: string;
};

type UpdateExpenseSqlRow = RawTxRow & {
  accounts: RawAccountRow[];
};

type TransferSqlRow = {
  owned_count: string | number;
  from_balance: string | number;
  accounts: Array<{ id: string; balance: string | number }>;
};

function mapRawAccountRow(a: RawAccountRow) {
  return {
    id: a.id,
    name: a.name,
    type: a.type,
    balance: Number(a.balance),
    currency: normalizeCurrency(a.currency),
    creditLimit: a.credit_limit != null ? Number(a.credit_limit) : null,
    last4: a.last4,
    icon: a.icon,
    color: a.color,
  };
}

function mapRawTxRow(row: RawTxRow) {
  const occurredAt = row.occurred_at instanceof Date ? row.occurred_at : new Date(row.occurred_at);
  const iso = occurredAt.toISOString();
  return {
    id: row.id,
    name: row.name,
    amount: Number(row.amount),
    category: row.category ?? "Miscellaneous",
    catKey: row.cat_key ?? "misc",
    catColor: row.cat_color ?? "#8b949e",
    icon: row.icon ?? "●",
    time: formatTime(iso),
    occurred_at: iso,
    kind: row.kind,
    accountId: row.account_id ?? undefined,
    notes: row.notes ?? undefined,
  };
}

const moneySchema = z.number().finite().nonnegative().max(999999999999).transform((v) => Math.round(v * 100) / 100);
const positiveMoneySchema = moneySchema.refine((v) => v > 0, "amount must be positive");
const uuidSchema = z.string().uuid();
const shortTextSchema = z.string().trim().min(1).max(120);
const longTextSchema = z.string().trim().max(2000).optional();
const colorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/)
  .optional();
const themeSchema = z.enum([
  "solarized-cream",
  "ayu-mirage",
  "catppuccin-latte",
  "github-light",
  "kanagawa",
  "ansi-dark",
  "ayu-light",
  "dark",
  "light",
]);
const prefsSchema = z
  .object({
    theme: themeSchema.default("ayu-mirage"),
    accentHue: z.number().finite().min(0).max(360).optional(),
    language: z.enum(["en", "es"]).optional(),
    defaultCurrency: z.enum(["USD", "PEN"]).optional(),
    timezone: z.string().min(1).max(80).default("America/Lima"),
    hideBalance: z.boolean().default(false),
  })
  .strip();

function cleanName(value: string, field = "name") {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${field} required`);
  return trimmed;
}

function keyFromName(name: string) {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return base || `item-${crypto.randomUUID().slice(0, 8)}`;
}

export async function fetchUserDataAction() {
  const session = await requireSession();
  return loadUserData(session.user.id, session.user.email);
}

export async function addExpenseAction(input: {
  amount: number;
  name: string;
  catKey: string;
  accountId?: string;
  occurredAt?: string;
  budgets: Array<{ id: string; key: string; icon: string; c: string }>;
  accounts: Array<{ id: string; type: string }>;
}) {
  const session = await requireSession();
  if (shouldUseSharedFinanceDomain()) {
    const result = await addExpenseDomain(
      {
        userId: session.user.id,
        email: session.user.email ?? "",
        authMethod: "session",
        scopes: [],
      },
      input
    );
    revalidatePath("/app");
    return result;
  }
  const uid = session.user.id;
  const amount = positiveMoneySchema.parse(input.amount);
  const name = shortTextSchema.parse(input.name);
  const accountId = input.accountId ? uuidSchema.parse(input.accountId) : null;
  const catKey = shortTextSchema.parse(input.catKey);
  const occurredAt = input.occurredAt ? new Date(input.occurredAt) : new Date();
  if (Number.isNaN(occurredAt.getTime())) throw new Error("invalid occurredAt date");
  const sql = getSql();

  const rows = (await sql.query(
    `
    with selected_account as (
      select *
      from accounts
      where user_id = $1
        and (($4::uuid is not null and id = $4::uuid) or ($4::uuid is null))
      order by
        case when $4::uuid is not null then 0 when type = 'checking' then 1 when type = 'cash' then 2 else 3 end,
        sort asc,
        created_at asc
      limit 1
    ),
    selected_category as (
      select *
      from categories
      where user_id = $1 and key = $5
      limit 1
    ),
    inserted_tx as (
      insert into transactions (user_id, name, amount, kind, category_id, account_id, icon, occurred_at)
      select $1, $3, $2::numeric, 'expense', selected_category.id, selected_account.id, coalesce(selected_category.icon, '●'), $6::timestamptz
      from selected_account
      left join selected_category on true
      returning *
    ),
    updated_account as (
      update accounts a
      set balance = a.balance - $2::numeric
      from selected_account
      where a.id = selected_account.id and a.user_id = $1
      returning a.*
    )
    select
      inserted_tx.id,
      inserted_tx.name,
      inserted_tx.amount,
      inserted_tx.kind,
      inserted_tx.account_id,
      inserted_tx.notes,
      inserted_tx.occurred_at,
      coalesce(selected_category.name, 'Miscellaneous') as category,
      coalesce(selected_category.key, 'misc') as cat_key,
      coalesce(selected_category.color, '#8b949e') as cat_color,
      coalesce(inserted_tx.icon, selected_category.icon, '●') as icon,
      updated_account.id as account_row_id,
      updated_account.name as account_name,
      updated_account.type as account_type,
      updated_account.balance as account_balance,
      updated_account.currency as account_currency,
      updated_account.credit_limit as account_credit_limit,
      updated_account.last4 as account_last4,
      updated_account.icon as account_icon,
      updated_account.color as account_color
    from inserted_tx
    join updated_account on updated_account.id = inserted_tx.account_id
    left join selected_category on true
    `,
    [uid, amount, name, accountId, catKey, occurredAt.toISOString()]
  )) as AddExpenseSqlRow[];

  const row = rows[0];
  if (!row) throw new Error(accountId ? "account not found" : "account required");

  revalidatePath("/app");
  return {
    tx: mapRawTxRow(row),
    accounts: [
      mapRawAccountRow({
        id: row.account_row_id,
        name: row.account_name,
        type: row.account_type,
        balance: row.account_balance,
        currency: row.account_currency,
        credit_limit: row.account_credit_limit,
        last4: row.account_last4,
        icon: row.account_icon,
        color: row.account_color,
      }),
    ],
  };
}

export async function deleteExpenseAction(id: string) {
  const session = await requireSession();
  if (shouldUseSharedFinanceDomain()) {
    const result = await deleteExpenseDomain(
      {
        userId: session.user.id,
        email: session.user.email ?? "",
        authMethod: "session",
        scopes: [],
      },
      id
    );
    revalidatePath("/app");
    return result;
  }
  const uid = session.user.id;
  const txId = uuidSchema.parse(id);
  const sql = getSql();
  const rows = (await sql.query(
    `
    with existing as (
      select *
      from transactions
      where id = $2::uuid and user_id = $1
      limit 1
    ),
    updated_account as (
      update accounts a
      set balance = a.balance + existing.amount
      from existing
      where existing.kind = 'expense'
        and existing.account_id is not null
        and a.id = existing.account_id
        and a.user_id = $1
      returning a.*
    ),
    deleted as (
      delete from transactions t
      using existing
      where t.id = existing.id and t.user_id = $1
      returning t.id
    )
    select
      updated_account.id,
      updated_account.name,
      updated_account.type,
      updated_account.balance,
      updated_account.currency,
      updated_account.credit_limit,
      updated_account.last4,
      updated_account.icon,
      updated_account.color
    from updated_account
    `,
    [uid, txId]
  )) as RawAccountRow[];
  revalidatePath("/app");
  return { accounts: rows.map(mapRawAccountRow) };
}

export async function updateExpenseAction(input: {
  id: string;
  amount?: number;
  name?: string;
  catKey?: string;
  accountId?: string;
  notes?: string;
  budgets: Array<{ id: string; key: string; icon: string; c: string }>;
}) {
  const session = await requireSession();
  if (shouldUseSharedFinanceDomain()) {
    const result = await updateExpenseDomain(
      {
        userId: session.user.id,
        email: session.user.email ?? "",
        authMethod: "session",
        scopes: [],
      },
      input
    );
    revalidatePath("/app");
    return result;
  }
  const uid = session.user.id;
  const txId = uuidSchema.parse(input.id);
  const nextAmount = input.amount != null ? positiveMoneySchema.parse(input.amount) : null;
  const nextName = input.name != null ? shortTextSchema.parse(input.name) : null;
  const nextCatKey = input.catKey != null ? shortTextSchema.parse(input.catKey) : null;
  const nextAccountId = input.accountId !== undefined && input.accountId ? uuidSchema.parse(input.accountId) : null;
  const accountWasProvided = input.accountId !== undefined;
  const notes = input.notes !== undefined ? longTextSchema.parse(input.notes) ?? "" : null;
  const sql = getSql();

  const rows = (await sql.query(
    `
    with existing as (
      select *
      from transactions
      where id = $2::uuid and user_id = $1
      limit 1
    ),
    next_values as (
      select
        existing.*,
        coalesce($3::numeric, existing.amount) as next_amount,
        coalesce($4::text, existing.name) as next_name,
        case when $7::boolean then $6::uuid else existing.account_id end as next_account_id
      from existing
    ),
    selected_category as (
      select *
      from categories
      where user_id = $1
        and (($5::text is not null and key = $5::text) or ($5::text is null and id = (select category_id from existing)))
      limit 1
    ),
    target_account as (
      select accounts.*
      from accounts
      join next_values on next_values.next_account_id = accounts.id
      where accounts.user_id = $1
      limit 1
    ),
    guard as (
      select next_values.*
      from next_values
      where next_values.next_account_id is null or exists (select 1 from target_account)
    ),
    account_deltas as (
      select guard.account_id as account_id, guard.amount as delta
      from guard
      where guard.kind = 'expense' and guard.account_id is not null
      union all
      select guard.next_account_id as account_id, -guard.next_amount as delta
      from guard
      where guard.kind = 'expense' and guard.next_account_id is not null
    ),
    net_account_deltas as (
      select account_id, sum(delta) as delta
      from account_deltas
      group by account_id
      having sum(delta) <> 0
    ),
    changed_accounts as (
      update accounts a
      set balance = a.balance + net_account_deltas.delta
      from net_account_deltas
      where a.id = net_account_deltas.account_id
        and a.user_id = $1
      returning a.*
    ),
    updated_tx as (
      update transactions t
      set
        amount = guard.next_amount,
        name = guard.next_name,
        account_id = guard.next_account_id,
        category_id = case when $5::text is null then t.category_id else selected_category.id end,
        icon = case when $5::text is null then t.icon else coalesce(selected_category.icon, '●') end,
        notes = case when $8::text is null then t.notes else nullif($8::text, '') end
      from guard
      left join selected_category on true
      where t.id = guard.id and t.user_id = $1
      returning t.*
    )
    select
      updated_tx.id,
      updated_tx.name,
      updated_tx.amount,
      updated_tx.kind,
      updated_tx.account_id,
      updated_tx.notes,
      updated_tx.occurred_at,
      coalesce(selected_category.name, 'Miscellaneous') as category,
      coalesce(selected_category.key, 'misc') as cat_key,
      coalesce(selected_category.color, '#8b949e') as cat_color,
      coalesce(updated_tx.icon, selected_category.icon, '●') as icon,
      coalesce(
        json_agg(
          json_build_object(
            'id', changed_accounts.id,
            'name', changed_accounts.name,
            'type', changed_accounts.type,
            'balance', changed_accounts.balance,
            'currency', changed_accounts.currency,
            'credit_limit', changed_accounts.credit_limit,
            'last4', changed_accounts.last4,
            'icon', changed_accounts.icon,
            'color', changed_accounts.color
          )
        ) filter (where changed_accounts.id is not null),
        '[]'::json
      ) as accounts
    from updated_tx
    left join selected_category on true
    left join changed_accounts on true
    group by updated_tx.id, updated_tx.name, updated_tx.amount, updated_tx.kind, updated_tx.account_id, updated_tx.notes, updated_tx.occurred_at, selected_category.name, selected_category.key, selected_category.color, updated_tx.icon, selected_category.icon
    `,
    [uid, txId, nextAmount, nextName, nextCatKey, nextAccountId, accountWasProvided, notes]
  )) as UpdateExpenseSqlRow[];

  const row = rows[0];
  if (!row) return { error: "not found" as const };

  revalidatePath("/app");
  return {
    tx: mapRawTxRow(row),
    accounts: (row.accounts as RawAccountRow[]).map(mapRawAccountRow),
  };
}

export async function addGoalAction(input: { name: string; target: number; icon?: string; color?: string }) {
  const session = await requireSession();
  const name = shortTextSchema.parse(input.name);
  const target = moneySchema.parse(input.target);
  const [row] = await db
    .insert(goals)
    .values({
      userId: session.user.id,
      name,
      target: String(target),
      saved: "0",
      icon: input.icon || "◆",
      color: colorSchema.parse(input.color) || "#58a6ff",
      eta: "tbd",
    })
    .returning();
  revalidatePath("/app");
  return {
    id: row.id,
    name: row.name,
    target: Number(row.target),
    saved: 0,
    eta: row.eta,
    icon: row.icon,
    c: row.color,
    done: row.done,
  };
}

export async function updateGoalAction(input: {
  id: string;
  name?: string;
  target?: number;
  icon?: string;
  color?: string;
}) {
  const session = await requireSession();
  const goalId = uuidSchema.parse(input.id);
  const patch: {
    name?: string;
    target?: string;
    icon?: string;
    color?: string;
    done?: boolean;
  } = {};
  if (input.name != null) patch.name = cleanName(input.name);
  if (input.target != null) patch.target = String(moneySchema.parse(input.target));
  if (input.icon != null) patch.icon = input.icon;
  if (input.color != null) patch.color = colorSchema.parse(input.color);

  const [row] = await db
    .update(goals)
    .set(patch)
    .where(and(eq(goals.id, goalId), eq(goals.userId, session.user.id)))
    .returning();
  if (!row) throw new Error("goal not found");
  const saved = Number(row.saved);
  const target = Number(row.target);
  if (row.done !== saved >= target) {
    await db
      .update(goals)
      .set({ done: saved >= target })
      .where(and(eq(goals.id, goalId), eq(goals.userId, session.user.id)));
  }
  revalidatePath("/app");
  return {
    id: row.id,
    name: row.name,
    target,
    saved,
    eta: row.eta,
    icon: row.icon,
    c: row.color,
    done: saved >= target,
  };
}

export async function setGoalSavedAction(goalId: string, saved: number, _done?: boolean) {
  const session = await requireSession();
  const id = uuidSchema.parse(goalId);
  const nextSaved = moneySchema.parse(saved);
  const [goal] = await db
    .select({ target: goals.target })
    .from(goals)
    .where(and(eq(goals.id, id), eq(goals.userId, session.user.id)))
    .limit(1);
  if (!goal) throw new Error("goal not found");
  const cappedSaved = Math.min(nextSaved, Number(goal.target));
  await db
    .update(goals)
    .set({ saved: String(cappedSaved), done: cappedSaved >= Number(goal.target) })
    .where(and(eq(goals.id, id), eq(goals.userId, session.user.id)));
  revalidatePath("/app");
}

export async function setBudgetCapAction(categoryId: string, cap: number) {
  const session = await requireSession();
  const id = uuidSchema.parse(categoryId);
  await db
    .update(categories)
    .set({ monthlyCap: String(moneySchema.parse(cap)) })
    .where(and(eq(categories.id, id), eq(categories.userId, session.user.id)));
  revalidatePath("/app");
}

export async function addBudgetAction(input: { name: string; amount: number; icon: string; color: string; currency?: string }) {
  const session = await requireSession();
  const uid = session.user.id;
  const name = shortTextSchema.parse(input.name);
  const amount = moneySchema.parse(input.amount);
  const color = colorSchema.parse(input.color) || "#8b949e";
  const existing = await db
    .select({ sort: categories.sort })
    .from(categories)
    .where(eq(categories.userId, uid))
    .orderBy(desc(categories.sort))
    .limit(1);
  const keyBase = keyFromName(name);
  const key = `${keyBase}-${crypto.randomUUID().slice(0, 4)}`;
  const [row] = await db
    .insert(categories)
    .values({
      userId: uid,
      key,
      name,
      icon: input.icon || "●",
      color,
      currency: input.currency === "PEN" ? "PEN" : "USD",
      monthlyCap: String(amount),
      sort: (existing[0]?.sort ?? -1) + 1,
    })
    .returning();
  revalidatePath("/app");
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    icon: row.icon,
    c: row.color,
    cap: Number(row.monthlyCap),
    currency: normalizeCurrency(row.currency),
  };
}

export async function updateBudgetAction(input: {
  id: string;
  name: string;
  amount: number;
  icon: string;
  color: string;
  currency?: string;
}) {
  const session = await requireSession();
  const id = uuidSchema.parse(input.id);
  const icon = input.icon || "●";
  const color = colorSchema.parse(input.color) || "#8b949e";
  const currency = input.currency === "PEN" || input.currency === "USD" ? input.currency : undefined;
  const [row] = await db
    .update(categories)
    .set({
      name: shortTextSchema.parse(input.name),
      monthlyCap: String(moneySchema.parse(input.amount)),
      icon,
      color,
      ...(currency ? { currency } : {}),
    })
    .where(and(eq(categories.id, id), eq(categories.userId, session.user.id)))
    .returning();
  if (row) {
    await db
      .update(transactions)
      .set({ icon })
      .where(and(eq(transactions.categoryId, id), eq(transactions.userId, session.user.id)));
  }
  if (!row) throw new Error("budget not found");
  revalidatePath("/app");
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    icon: row.icon,
    c: row.color,
    cap: Number(row.monthlyCap),
    currency: normalizeCurrency(row.currency),
  };
}

export async function updateUsernameAction(username: string) {
  const session = await requireSession();
  const clean = username.trim();
  if (!clean || /\s/.test(clean)) throw new Error("username cannot contain spaces");
  const [row] = await db
    .update(profiles)
    .set({ username: clean })
    .where(eq(profiles.id, session.user.id))
    .returning({ username: profiles.username });
  revalidatePath("/app");
  return { username: row?.username ?? clean };
}

export async function addIncomeAction(input: {
  name: string;
  amt: number;
  accountId: string;
  occurredAt?: string;
}) {
  const session = await requireSession();
  const result = await addIncomeTransaction(
    {
      userId: session.user.id,
      email: session.user.email ?? "",
      authMethod: "session",
      scopes: [],
    },
    {
      name: input.name,
      amount: input.amt,
      accountId: input.accountId,
      occurredAt: input.occurredAt,
    }
  );
  revalidatePath("/app");
  return result;
}

/** @deprecated Legacy income sources are migrated to recurring rules and are read-only. */
export async function updateIncomeAction(_input: {
  id: string;
  name: string;
  amt: number;
  accountId?: string | null;
  prevAccountId?: string | null;
  prevAmount?: number;
  txId?: string | null;
}): Promise<{
  accounts: Array<{ id: string; balance: number }>;
  incomeTx: {
    id: string;
    name: string;
    amount: number;
    category: string;
    catKey: string;
    catColor: string;
    icon: string;
    time: string;
    occurred_at: string;
    kind: string;
    accountId?: string;
    status?: string;
    source?: string;
  } | null;
  source: {
    id: string;
    name: string;
    amt: number;
    icon: string;
    c: string;
    freq: string;
    next: string | null;
  };
}> {
  throw new Error("legacy income sources are read-only; use recurring rules");
}

export async function setBucketBalanceAction(bucketId: string, balance: number) {
  const session = await requireSession();
  const id = uuidSchema.parse(bucketId);
  await db
    .update(savingsBuckets)
    .set({ balance: String(moneySchema.parse(balance)) })
    .where(and(eq(savingsBuckets.id, id), eq(savingsBuckets.userId, session.user.id)));
  revalidatePath("/app");
}

export async function updatePrefsAction(prefs: Record<string, unknown>) {
  const session = await requireSession();
  const parsed = prefsSchema.parse(prefs);
  await db.update(profiles).set({ prefs: parsed }).where(eq(profiles.id, session.user.id));
  revalidatePath("/app");
}

export async function addAccountAction(input: {
  name: string;
  type: string;
  icon?: string;
  color?: string;
  currency?: string;
  creditLimit?: number | null;
  last4?: string | null;
}) {
  const session = await requireSession();
  if (shouldUseSharedFinanceDomain()) {
    const result = await createAccountDomain(
      {
        userId: session.user.id,
        email: session.user.email ?? "",
        authMethod: "session",
        scopes: [],
      },
      input
    );
    revalidatePath("/app");
    return result;
  }
  const uid = session.user.id;
  const trimmed = shortTextSchema.parse(input.name);

  const existing = await db
    .select({ sort: accounts.sort })
    .from(accounts)
    .where(eq(accounts.userId, uid))
    .orderBy(desc(accounts.sort))
    .limit(1);
  const nextSort = (existing[0]?.sort ?? -1) + 1;
  const allowedTypes = new Set(["cash", "checking", "savings", "card"]);
  const type = allowedTypes.has(input.type) ? input.type : "cash";
  const icon = input.icon?.trim() || accountDefaultIcon(type);
  const currency = input.currency === "PEN" ? "PEN" : "USD";

  const [row] = await db
    .insert(accounts)
    .values({
      userId: uid,
      name: trimmed,
      type,
      balance: "0",
      currency,
      icon,
      color: accountColor(type),
      sort: nextSort,
    })
    .returning();

  revalidatePath("/app");
  return mapAccountRow(row);
}

export async function updateAccountAction(input: {
  id: string;
  name?: string;
  type?: string;
  icon?: string;
  color?: string;
  currency?: string;
  creditLimit?: number | null;
  last4?: string | null;
}) {
  const session = await requireSession();
  if (shouldUseSharedFinanceDomain()) {
    const result = await updateAccountDomain(
      {
        userId: session.user.id,
        email: session.user.email ?? "",
        authMethod: "session",
        scopes: [],
      },
      input
    );
    revalidatePath("/app");
    return result;
  }
  const uid = session.user.id;
  const id = uuidSchema.parse(input.id);
  const allowedTypes = new Set(["cash", "checking", "savings", "card"]);

  const patch: { name?: string; type?: string; icon?: string; color?: string; currency?: string } = {};
  if (input.name != null) {
    patch.name = shortTextSchema.parse(input.name);
  }
  if (input.type != null) {
    if (!allowedTypes.has(input.type)) throw new Error("account type not supported");
    patch.type = input.type;
    patch.color = accountColor(input.type);
  }
  if (input.currency != null) patch.currency = input.currency === "PEN" ? "PEN" : "USD";
  if (input.icon != null) patch.icon = input.icon.trim() || accountDefaultIcon(input.type ?? "cash");

  const [row] = await db
    .update(accounts)
    .set(patch)
    .where(and(eq(accounts.id, id), eq(accounts.userId, uid)))
    .returning();

  if (!row) throw new Error("account not found");
  revalidatePath("/app");
  return mapAccountRow(row);
}

export async function transferAction(input: { fromId: string; toId: string; amount: number }) {
  const session = await requireSession();
  if (shouldUseSharedFinanceDomain()) {
    const result = await transferBetweenAccounts(
      {
        userId: session.user.id,
        email: session.user.email ?? "",
        authMethod: "session",
        scopes: [],
      },
      input
    );
    revalidatePath("/app");
    return result;
  }
  const uid = session.user.id;
  const amount = positiveMoneySchema.parse(input.amount);
  const fromId = uuidSchema.parse(input.fromId);
  const toId = uuidSchema.parse(input.toId);

  if (fromId === toId) throw new Error("cannot transfer to same account");

  const sql = getSql();
  const rows = (await sql.query(
    `
    with owned as (
      select *
      from accounts
      where user_id = $1 and id in ($2::uuid, $3::uuid)
    ),
    guard as (
      select
        (select count(*) from owned) as owned_count,
        (select balance from owned where id = $2::uuid) as from_balance
    ),
    deltas as (
      select $2::uuid as id, -$4::numeric as delta
      from guard
      where owned_count = 2 and from_balance >= $4::numeric
      union all
      select $3::uuid as id, $4::numeric as delta
      from guard
      where owned_count = 2 and from_balance >= $4::numeric
    ),
    updated as (
      update accounts a
      set balance = a.balance + deltas.delta
      from deltas
      where a.id = deltas.id and a.user_id = $1
      returning a.id, a.balance
    )
    select
      (select owned_count from guard) as owned_count,
      (select from_balance from guard) as from_balance,
      coalesce(json_agg(json_build_object('id', updated.id, 'balance', updated.balance)) filter (where updated.id is not null), '[]'::json) as accounts
    from updated
    `,
    [uid, fromId, toId, amount]
  )) as TransferSqlRow[];
  const row = rows[0];
  if (!row || Number(row.owned_count) !== 2) throw new Error("account not found");
  if (Number(row.from_balance) < amount) throw new Error("insufficient balance");
  const updatedAccounts = row.accounts as Array<{ id: string; balance: string | number }>;
  const from = updatedAccounts.find((a) => a.id === fromId);
  const to = updatedAccounts.find((a) => a.id === toId);
  if (!from || !to) throw new Error("transfer failed");

  revalidatePath("/app");
  return {
    from: { id: from.id, balance: Number(from.balance) },
    to: { id: to.id, balance: Number(to.balance) },
  };
}

export async function setCredentialsAction(newPassword: string) {
  const session = await requireSession();
  if (!newPassword || newPassword.length < 8) throw new Error("password must be at least 8 characters");

  const uid = session.user.id;
  const ctx = await auth.$context;
  const hash = await ctx.password.hash(newPassword);

  const existing = await db
    .select()
    .from(accountTable)
    .where(and(eq(accountTable.userId, uid), eq(accountTable.providerId, "credential")))
    .limit(1);

  if (existing[0]) {
    await db
      .update(accountTable)
      .set({ password: hash, updatedAt: new Date() })
      .where(and(eq(accountTable.id, existing[0].id), eq(accountTable.userId, uid)));
  } else {
    await db.insert(accountTable).values({
      id: crypto.randomUUID(),
      accountId: uid,
      providerId: "credential",
      userId: uid,
      password: hash,
    });
  }

  revalidatePath("/app");
  return { ok: true as const };
}

export async function deleteAccountAction() {
  const session = await requireSession();
  const uid = session.user.id;
  await db.delete(sessionTable).where(eq(sessionTable.userId, uid));
  await db.delete(accountTable).where(eq(accountTable.userId, uid));
  await db.delete(userTable).where(eq(userTable.id, uid));
}

export async function signOutAction() {
  const { auth } = await import("@/lib/auth/auth");
  const { headers } = await import("next/headers");
  await auth.api.signOut({ headers: await headers() });
}
