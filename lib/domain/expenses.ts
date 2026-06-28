import { getSql } from "@/lib/db/sql";
import { formatTime } from "@/lib/utils";
import {
  positiveMoneySchema,
  shortTextSchema,
  uuidSchema,
  longTextSchema,
} from "./validation";
import { DomainError, DomainErrorCodes, type ActorContext } from "./types";
import { mapRawAccountRow, type RawAccountRow, type AccountDto } from "./accounts";
import { normalizeCurrency, type Currency } from "@/lib/finance/currency";

export type RawTxRow = {
  id: string;
  name: string;
  amount: string | number;
  category: string | null;
  cat_key: string | null;
  cat_color: string | null;
  icon: string | null;
  occurred_at: Date | string;
  kind: string;
  currency: string;
  account_id: string | null;
  notes: string | null;
};

export type TxDto = {
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
  currency: Currency;
  accountId?: string;
  notes?: string;
};

type AddExpenseSqlRow = RawTxRow & {
  account_row_id: string;
  account_name: string;
  account_type: string;
  account_balance: string | number;
  account_currency: string;
  account_credit_limit: string | number | null;
  account_last4: string | null;
  account_icon: string;
  account_color: string;
};

type UpdateExpenseSqlRow = RawTxRow & {
  accounts: RawAccountRow[];
};

export function mapRawTxRow(row: RawTxRow): TxDto {
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
    currency: normalizeCurrency(row.currency),
    accountId: row.account_id ?? undefined,
    notes: row.notes ?? undefined,
  };
}

export async function addExpense(
  ctx: ActorContext,
  input: { amount: number; name: string; catKey: string; accountId?: string }
): Promise<{ tx: TxDto; accounts: AccountDto[] }> {
  const uid = ctx.userId;
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
    updated_account as (
      update accounts a
      set balance = a.balance - $2::numeric
      from selected_account
      where a.id = selected_account.id
        and a.user_id = $1
        and (
          (a.type = 'card' and (a.credit_limit is null or a.balance - $2::numeric >= -a.credit_limit))
          or (a.type <> 'card' and a.balance >= $2::numeric)
        )
      returning a.*
    ),
    inserted_tx as (
      insert into transactions (
        user_id, name, amount, kind, category_id, account_id, icon, currency, status, source
      )
      select
        $1, $3, $2::numeric, 'expense', selected_category.id, updated_account.id,
        coalesce(selected_category.icon, '●'), updated_account.currency, 'confirmed', 'manual'
      from updated_account
      join selected_category on true
      returning *
    )
    select
      inserted_tx.id,
      inserted_tx.name,
      inserted_tx.amount,
      inserted_tx.kind,
      inserted_tx.currency,
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
    [uid, amount, name, accountId, catKey]
  )) as AddExpenseSqlRow[];

  const row = rows[0];
  if (!row) {
    throw new DomainError(
      DomainErrorCodes.accountNotFound,
      accountId ? "account not found" : "no account available"
    );
  }

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

export async function deleteExpense(ctx: ActorContext, id: string): Promise<{ accounts: AccountDto[] }> {
  const uid = ctx.userId;
  const txId = uuidSchema.parse(id);
  const sql = getSql();
  const rows = (await sql.query(
    `
    with existing as (
      select *
      from transactions
      where id = $2::uuid and user_id = $1 and kind = 'expense'
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
  return { accounts: rows.map(mapRawAccountRow) };
}

export async function updateExpense(
  ctx: ActorContext,
  input: {
    id: string;
    amount?: number;
    name?: string;
    catKey?: string;
    accountId?: string;
    notes?: string;
  }
): Promise<{ tx: TxDto; accounts: AccountDto[] }> {
  const uid = ctx.userId;
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
      where id = $2::uuid and user_id = $1 and kind = 'expense'
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
        and accounts.currency = next_values.currency
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
    projected_accounts as (
      select
        a.*,
        a.balance + d.delta as projected_balance
      from net_account_deltas d
      join accounts a on a.id = d.account_id and a.user_id = $1
    ),
    validation as (
      select coalesce(
        bool_and(
          (type = 'card' and (credit_limit is null or projected_balance >= -credit_limit))
          or (type <> 'card' and projected_balance >= 0)
        ),
        true
      ) as ok
      from projected_accounts
    ),
    changed_accounts as (
      update accounts a
      set balance = a.balance + net_account_deltas.delta
      from net_account_deltas, validation
      where a.id = net_account_deltas.account_id
        and a.user_id = $1
        and validation.ok
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
      from guard, validation
      left join selected_category on true
      where t.id = guard.id and t.user_id = $1 and validation.ok
      returning t.*
    )
    select
      updated_tx.id,
      updated_tx.name,
      updated_tx.amount,
      updated_tx.kind,
      updated_tx.currency,
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
    group by updated_tx.id, updated_tx.name, updated_tx.amount, updated_tx.kind, updated_tx.currency, updated_tx.account_id, updated_tx.notes, updated_tx.occurred_at, selected_category.name, selected_category.key, selected_category.color, updated_tx.icon, selected_category.icon
    `,
    [uid, txId, nextAmount, nextName, nextCatKey, nextAccountId, accountWasProvided, notes]
  )) as UpdateExpenseSqlRow[];

  const row = rows[0];
  if (!row) throw new DomainError(DomainErrorCodes.transactionNotFound, "transaction not found");

  return {
    tx: mapRawTxRow(row),
    accounts: (row.accounts as RawAccountRow[]).map(mapRawAccountRow),
  };
}

export type ListTransactionsInput = {
  from?: string;
  to?: string;
  kind?: "expense" | "income";
  category?: string;
  accountId?: string;
  search?: string;
  limit?: number;
  offset?: number;
};

/**
 * Flexible transaction listing used by MCP read tools:
 * - date range (from/to inclusive), kind, category, account, free-text search
 * - newest-first, paginated. Always scoped to ctx.userId.
 */
export async function listTransactions(ctx: ActorContext, input: ListTransactionsInput = {}) {
  const uid = ctx.userId;
  const from = input.from ? new Date(input.from) : null;
  const to = input.to ? new Date(input.to) : null;
  if (from && Number.isNaN(from.getTime())) throw new Error("invalid 'from' date");
  if (to && Number.isNaN(to.getTime())) throw new Error("invalid 'to' date");
  const kind = input.kind === "expense" || input.kind === "income" ? input.kind : null;
  const category = input.category ? shortTextSchema.parse(input.category) : null;
  const accountId = input.accountId ? uuidSchema.parse(input.accountId) : null;
  const search = input.search ? input.search.trim().slice(0, 120) : null;
  const limit = Math.min(Math.max(Math.trunc(input.limit ?? 50), 1), 500);
  const offset = Math.max(Math.trunc(input.offset ?? 0), 0);

  const sql = getSql();
  const rows = (await sql.query(
    `
    select
      t.id,
      t.name,
      t.amount,
      t.kind,
      t.currency,
      t.account_id,
      t.notes,
      t.occurred_at,
      coalesce(c.name, 'Miscellaneous') as category,
      coalesce(c.key, 'misc') as cat_key,
      coalesce(c.color, '#8b949e') as cat_color,
      coalesce(t.icon, c.icon, '●') as icon
    from transactions t
    left join categories c on c.id = t.category_id
    where t.user_id = $1
      and t.status = 'confirmed'
      and ($2::timestamptz is null or t.occurred_at >= $2::timestamptz)
      and ($3::timestamptz is null or t.occurred_at <= $3::timestamptz)
      and ($4::text is null or t.kind = $4::text)
      and ($5::text is null or lower(c.name) = lower($5::text))
      and ($6::uuid is null or t.account_id = $6::uuid)
      and ($7::text is null or t.name ilike '%' || $7::text || '%' or coalesce(t.notes, '') ilike '%' || $7::text || '%')
    order by t.occurred_at desc, t.created_at desc
    limit $8 offset $9
    `,
    [
      uid,
      from ? from.toISOString() : null,
      to ? to.toISOString() : null,
      kind,
      category,
      accountId,
      search,
      limit,
      offset,
    ]
  )) as RawTxRow[];

  const items = rows.map(mapRawTxRow);
  const totalsByCurrency = Array.from(
    items.reduce((totals, item) => {
      totals.set(item.currency, (totals.get(item.currency) ?? 0) + item.amount);
      return totals;
    }, new Map<string, number>()),
    ([currency, total]) => ({ currency, total: Math.round(total * 100) / 100 })
  );
  return {
    count: items.length,
    total: totalsByCurrency.length === 1 ? totalsByCurrency[0].total : null,
    currency: totalsByCurrency.length === 1 ? totalsByCurrency[0].currency : null,
    mixedCurrency: totalsByCurrency.length > 1,
    totalsByCurrency,
    limit,
    offset,
    transactions: items,
  };
}
