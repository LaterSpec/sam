"use server";

import { db } from "@/lib/db";
import { getSql } from "@/lib/db/sql";
import {
  transactions,
  goals,
  categories,
  incomeSources,
  savingsBuckets,
  holdings,
  watchlist,
  trades,
  portfolioSnapshots,
  profiles,
  accounts,
  user as userTable,
  session as sessionTable,
  account as accountTable,
} from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { loadUserData, getMarketQuotesOnly, getBarsForSymbols } from "@/lib/db/queries/load-user-data";
import { mapHolding } from "@/lib/market/build-market";
import { revalidatePath } from "next/cache";
import { formatTime } from "@/lib/utils";
import { accountColor, accountDefaultIcon } from "@/lib/accounts/account-types";
import { auth } from "@/lib/auth/auth";
import { z } from "zod";

function mapAccountRow(a: typeof accounts.$inferSelect) {
  return {
    id: a.id,
    name: a.name,
    type: a.type,
    balance: Number(a.balance),
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
  account_credit_limit: string | number | null;
  account_last4: string | null;
  account_icon: string;
  account_color: string;
};

type UpdateExpenseSqlRow = RawTxRow & {
  accounts: RawAccountRow[];
};

type IncomeSqlRow = {
  source_id: string;
  source_name: string;
  source_amount: string | number;
  source_icon: string;
  source_color: string;
  source_freq: string;
  source_next_date: string | null;
  id: string;
  name: string;
  amount: string | number;
  kind: string;
  account_id: string;
  notes: string | null;
  occurred_at: Date | string;
  icon: string | null;
  account_balance: string | number;
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
    category: row.cat_key ?? "misc",
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
const symbolSchema = z.string().trim().toUpperCase().regex(/^[A-Z0-9.\-]{1,16}$/);

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
    notifications: z.boolean().default(true),
    biometric: z.boolean().default(true),
    theme: themeSchema.default("ayu-mirage"),
    rollover: z.boolean().default(false),
    accentHue: z.number().finite().min(0).max(360).optional(),
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

export async function fetchMarketQuotesAction() {
  await requireSession();
  return getMarketQuotesOnly();
}

export async function fetchBarsAction(symbols: string[]) {
  await requireSession();
  return getBarsForSymbols(symbols);
}

export async function addExpenseAction(input: {
  amount: number;
  name: string;
  catKey: string;
  accountId?: string;
  budgets: Array<{ id: string; key: string; icon: string; c: string }>;
  accounts: Array<{ id: string; type: string }>;
}) {
  const session = await requireSession();
  const uid = session.user.id;
  const amount = positiveMoneySchema.parse(input.amount);
  const name = shortTextSchema.parse(input.name);
  const accountId = input.accountId ? uuidSchema.parse(input.accountId) : null;
  const catKey = shortTextSchema.parse(input.catKey);
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
      insert into transactions (user_id, name, amount, kind, category_id, account_id, icon)
      select $1, $3, $2::numeric, 'expense', selected_category.id, selected_account.id, coalesce(selected_category.icon, '●')
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
      coalesce(selected_category.key, 'misc') as cat_key,
      coalesce(selected_category.color, '#8b949e') as cat_color,
      coalesce(inserted_tx.icon, selected_category.icon, '●') as icon,
      updated_account.id as account_row_id,
      updated_account.name as account_name,
      updated_account.type as account_type,
      updated_account.balance as account_balance,
      updated_account.credit_limit as account_credit_limit,
      updated_account.last4 as account_last4,
      updated_account.icon as account_icon,
      updated_account.color as account_color
    from inserted_tx
    join updated_account on updated_account.id = inserted_tx.account_id
    left join selected_category on true
    `,
    [uid, amount, name, accountId, catKey]
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
    group by updated_tx.id, updated_tx.name, updated_tx.amount, updated_tx.kind, updated_tx.account_id, updated_tx.notes, updated_tx.occurred_at, selected_category.key, selected_category.color, updated_tx.icon, selected_category.icon
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

export async function addBudgetAction(input: { name: string; amount: number; icon: string; color: string }) {
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
  };
}

export async function updateBudgetAction(input: {
  id: string;
  name: string;
  amount: number;
  icon: string;
  color: string;
}) {
  const session = await requireSession();
  const id = uuidSchema.parse(input.id);
  const icon = input.icon || "●";
  const color = colorSchema.parse(input.color) || "#8b949e";
  const [row] = await db
    .update(categories)
    .set({
      name: shortTextSchema.parse(input.name),
      monthlyCap: String(moneySchema.parse(input.amount)),
      icon,
      color,
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
  freq?: string;
  next?: string;
  accountId?: string;
}) {
  const session = await requireSession();
  const uid = session.user.id;
  const name = shortTextSchema.parse(input.name);
  const amount = positiveMoneySchema.parse(input.amt);
  const accountId = input.accountId ? uuidSchema.parse(input.accountId) : null;

  let row: typeof incomeSources.$inferSelect;

  let incomeTxRow: {
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
  } | null = null;
  let accountUpdate: { id: string; balance: number } | null = null;

  if (accountId) {
    const sql = getSql();
    const rows = (await sql.query(
      `
      with owned_account as (
        select *
        from accounts
        where id = $4::uuid and user_id = $1
        limit 1
      ),
      inserted_source as (
        insert into income_sources (user_id, name, amount, freq, next_date)
        select $1, $3, $2::numeric, $5, $6
        from owned_account
        returning *
      ),
      inserted_tx as (
        insert into transactions (user_id, name, amount, kind, account_id, icon)
        select $1, $3, $2::numeric, 'income', owned_account.id, '◆'
        from owned_account
        returning *
      ),
      updated_account as (
        update accounts a
        set balance = a.balance + $2::numeric
        from owned_account
        where a.id = owned_account.id and a.user_id = $1
        returning a.*
      )
      select
        inserted_source.id as source_id,
        inserted_source.name as source_name,
        inserted_source.amount as source_amount,
        inserted_source.icon as source_icon,
        inserted_source.color as source_color,
        inserted_source.freq as source_freq,
        inserted_source.next_date as source_next_date,
        inserted_tx.id,
        inserted_tx.name,
        inserted_tx.amount,
        inserted_tx.kind,
        inserted_tx.account_id,
        inserted_tx.notes,
        inserted_tx.occurred_at,
        coalesce(inserted_tx.icon, '◆') as icon,
        updated_account.balance as account_balance
      from inserted_tx
      join updated_account on updated_account.id = inserted_tx.account_id
      join inserted_source on true
      `,
      [uid, amount, name, accountId, input.freq || "one-time", input.next || "—"]
    )) as IncomeSqlRow[];
    const txRow = rows[0];
    if (!txRow) throw new Error("account not found");
    row = {
      id: txRow.source_id,
      userId: uid,
      name: txRow.source_name,
      amount: String(txRow.source_amount),
      icon: txRow.source_icon,
      color: txRow.source_color,
      freq: txRow.source_freq,
      nextDate: txRow.source_next_date,
      sort: 0,
      createdAt: new Date(),
    };
    const occurredAt = txRow.occurred_at instanceof Date ? txRow.occurred_at : new Date(txRow.occurred_at);

    incomeTxRow = {
      id: txRow.id,
      name: txRow.name,
      amount: Number(txRow.amount),
      category: "income",
      catKey: "income",
      catColor: "#56d364",
      icon: txRow.icon ?? "◆",
      time: formatTime(occurredAt.toISOString()),
      occurred_at: occurredAt.toISOString(),
      kind: "income",
      accountId: txRow.account_id ?? undefined,
    };

    accountUpdate = { id: txRow.account_id, balance: Number(txRow.account_balance) };
  } else {
    [row] = await db
      .insert(incomeSources)
      .values({
        userId: uid,
        name,
        amount: String(amount),
        freq: input.freq || "one-time",
        nextDate: input.next || "—",
      })
      .returning();
  }

  revalidatePath("/app");
  return {
    id: row.id,
    name: row.name,
    amt: Number(row.amount),
    icon: row.icon,
    c: row.color,
    freq: row.freq,
    next: row.nextDate,
    incomeTx: incomeTxRow,
    account: accountUpdate,
  };
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

export async function recordSnapshotAction(value: number) {
  const session = await requireSession();
  const parsed = moneySchema.parse(value);
  const recent = await db
    .select({ capturedAt: portfolioSnapshots.capturedAt })
    .from(portfolioSnapshots)
    .where(eq(portfolioSnapshots.userId, session.user.id))
    .orderBy(desc(portfolioSnapshots.capturedAt))
    .limit(1);
  if (recent[0] && Date.now() - recent[0].capturedAt.getTime() < 10 * 60 * 1000) return;
  await db.insert(portfolioSnapshots).values({ userId: session.user.id, value: String(parsed) });
}

export async function buyHoldingAction(input: {
  symbol: string;
  name: string;
  amount: number;
  price: number;
}) {
  const session = await requireSession();
  const uid = session.user.id;
  const symbol = symbolSchema.parse(input.symbol);
  const name = (input.name || symbol).trim().slice(0, 120);
  const amount = positiveMoneySchema.parse(input.amount);
  const price = positiveMoneySchema.parse(input.price);
  const qty = amount / price;

  const existing = await db
    .select()
    .from(holdings)
    .where(and(eq(holdings.userId, uid), eq(holdings.symbol, symbol)))
    .limit(1);

  let row;
  if (existing[0]) {
    const ex = existing[0];
    const newQty = Number(ex.qty) + qty;
    const newAvg = newQty > 0 ? (Number(ex.qty) * Number(ex.avgCost) + amount) / newQty : price;
    [row] = await db
      .update(holdings)
      .set({ qty: String(newQty), avgCost: String(newAvg), updatedAt: new Date() })
      .where(and(eq(holdings.id, ex.id), eq(holdings.userId, uid)))
      .returning();
  } else {
    [row] = await db
      .insert(holdings)
      .values({
        userId: uid,
        symbol,
        name,
        qty: String(qty),
        avgCost: String(price),
      })
      .returning();
  }

  await db.insert(trades).values({
    userId: uid,
    symbol,
    side: "buy",
    qty: String(qty),
    price: String(price),
    amount: String(amount),
  });
  await db.delete(watchlist).where(and(eq(watchlist.userId, uid), eq(watchlist.symbol, symbol)));
  revalidatePath("/app");
  return { row: mapHolding(row), removedFromWatch: symbol };
}

export async function sellHoldingAction(input: {
  symbol: string;
  amount?: number;
  qty?: number;
  price: number;
}) {
  const session = await requireSession();
  const uid = session.user.id;
  const symbol = symbolSchema.parse(input.symbol);
  const price = positiveMoneySchema.parse(input.price);
  const existing = await db
    .select()
    .from(holdings)
    .where(and(eq(holdings.userId, uid), eq(holdings.symbol, symbol)))
    .limit(1);

  if (!existing[0]) return { error: "not held" };
  const ex = existing[0];
  const sellQty = input.qty != null ? positiveMoneySchema.parse(input.qty) : positiveMoneySchema.parse(input.amount ?? 0) / price;
  if (sellQty <= 0) throw new Error("quantity must be positive");
  const newQty = Number(ex.qty) - sellQty;
  const amt = Math.min(sellQty, Number(ex.qty)) * price;

  let removed = false;
  let row = null;
  if (newQty <= 1e-6) {
    await db.delete(holdings).where(and(eq(holdings.id, ex.id), eq(holdings.userId, uid)));
    removed = true;
  } else {
    [row] = await db
      .update(holdings)
      .set({ qty: String(newQty), updatedAt: new Date() })
      .where(and(eq(holdings.id, ex.id), eq(holdings.userId, uid)))
      .returning();
  }

  await db.insert(trades).values({
    userId: uid,
    symbol,
    side: "sell",
    qty: String(Math.min(sellQty, Number(ex.qty))),
    price: String(price),
    amount: String(amt),
  });
  revalidatePath("/app");
  return { row: row ? mapHolding(row) : null, removed, symbol };
}

export async function addWatchAction(symbol: string, name: string) {
  const session = await requireSession();
  const cleanSymbol = symbolSchema.parse(symbol);
  const cleanName = (name || cleanSymbol).trim().slice(0, 120);
  const [row] = await db
    .insert(watchlist)
    .values({ userId: session.user.id, symbol: cleanSymbol, name: cleanName })
    .returning();
  revalidatePath("/app");
  return { sym: row.symbol, name: row.name };
}

export async function removeWatchAction(symbol: string) {
  const session = await requireSession();
  await db.delete(watchlist).where(and(eq(watchlist.userId, session.user.id), eq(watchlist.symbol, symbolSchema.parse(symbol))));
  revalidatePath("/app");
}

export async function addAccountAction(input: { name: string; type: string; icon?: string }) {
  const session = await requireSession();
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

  const [row] = await db
    .insert(accounts)
    .values({
      userId: uid,
      name: trimmed,
      type,
      balance: "0",
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
}) {
  const session = await requireSession();
  const uid = session.user.id;
  const id = uuidSchema.parse(input.id);
  const allowedTypes = new Set(["cash", "checking", "savings", "card"]);

  const patch: { name?: string; type?: string; icon?: string; color?: string } = {};
  if (input.name != null) {
    patch.name = shortTextSchema.parse(input.name);
  }
  if (input.type != null) {
    if (!allowedTypes.has(input.type)) throw new Error("account type not supported");
    patch.type = input.type;
    patch.color = accountColor(input.type);
  }
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
