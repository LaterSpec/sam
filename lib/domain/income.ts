import { db } from "@/lib/db";
import { getSql } from "@/lib/db/sql";
import { incomeSources } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { formatTime } from "@/lib/utils";
import { positiveMoneySchema, shortTextSchema, uuidSchema } from "./validation";
import { DomainError, DomainErrorCodes, type ActorContext } from "./types";
import type { TxDto } from "./expenses";
import { mapRawAccountRow, type AccountDto, type RawAccountRow } from "./accounts";
import { normalizeCurrency } from "@/lib/finance/currency";

export type IncomeSourceDto = {
  id: string;
  name: string;
  amt: number;
  icon: string;
  c: string;
  freq: string;
  next: string | null;
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
  account_currency: string;
};

export async function listIncomeSources(ctx: ActorContext): Promise<IncomeSourceDto[]> {
  const rows = await db
    .select()
    .from(incomeSources)
    .where(eq(incomeSources.userId, ctx.userId))
    .orderBy(asc(incomeSources.sort));
  return rows.map((s) => ({
    id: s.id,
    name: s.name,
    amt: Number(s.amount),
    icon: s.icon,
    c: s.color,
    freq: s.freq,
    next: s.nextDate,
  }));
}

export async function addIncome(
  ctx: ActorContext,
  input: { name: string; amt: number; freq?: string; next?: string; accountId?: string }
) {
  const uid = ctx.userId;
  const name = shortTextSchema.parse(input.name);
  const amount = positiveMoneySchema.parse(input.amt);
  const accountId = input.accountId ? uuidSchema.parse(input.accountId) : null;

  let row: typeof incomeSources.$inferSelect;
  let incomeTxRow: TxDto | null = null;
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
        updated_account.balance as account_balance,
        updated_account.currency as account_currency
      from inserted_tx
      join updated_account on updated_account.id = inserted_tx.account_id
      join inserted_source on true
      `,
      [uid, amount, name, accountId, input.freq || "one-time", input.next || "—"]
    )) as IncomeSqlRow[];
    const txRow = rows[0];
    if (!txRow) throw new DomainError(DomainErrorCodes.accountNotFound, "account not found");
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
      currency: normalizeCurrency(txRow.account_currency),
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

type AddIncomeTransactionRow = {
  id: string;
  name: string;
  amount: string | number;
  kind: string;
  account_id: string;
  notes: string | null;
  occurred_at: Date | string;
  icon: string | null;
  account_name: string;
  account_type: string;
  account_balance: string | number;
  account_currency: string;
  account_credit_limit: string | number | null;
  account_last4: string | null;
  account_icon: string;
  account_color: string;
};

/** Records one real income transaction. Recurrence is modeled separately. */
export async function addIncomeTransaction(
  ctx: ActorContext,
  input: { name: string; amount: number; accountId: string; occurredAt?: string }
): Promise<{ tx: TxDto; account: AccountDto }> {
  const name = shortTextSchema.parse(input.name);
  const amount = positiveMoneySchema.parse(input.amount);
  const accountId = uuidSchema.parse(input.accountId);
  const occurredAt = input.occurredAt ? new Date(input.occurredAt) : new Date();
  if (Number.isNaN(occurredAt.getTime())) throw new Error("invalid occurredAt date");
  const sql = getSql();
  const rows = (await sql.query(
    `
    with owned_account as (
      select *
      from accounts
      where id = $4::uuid and user_id = $1
      limit 1
    ),
    updated_account as (
      update accounts a
      set balance = a.balance + $2::numeric
      from owned_account
      where a.id = owned_account.id and a.user_id = $1
      returning a.*
    ),
    inserted_tx as (
      insert into transactions (
        user_id, name, amount, kind, account_id, icon, currency, status, source, occurred_at
      )
      select $1, $3, $2::numeric, 'income', updated_account.id, '◆', updated_account.currency, 'confirmed', 'manual', $5::timestamp
      from updated_account
      returning *
    )
    select
      tx.id,
      tx.name,
      tx.amount,
      tx.kind,
      tx.account_id,
      tx.notes,
      tx.occurred_at,
      tx.icon,
      a.name as account_name,
      a.type as account_type,
      a.balance as account_balance,
      a.currency as account_currency,
      a.credit_limit as account_credit_limit,
      a.last4 as account_last4,
      a.icon as account_icon,
      a.color as account_color
    from inserted_tx tx
    join updated_account a on a.id = tx.account_id
    `,
    [ctx.userId, amount, name, accountId, occurredAt.toISOString()]
  )) as AddIncomeTransactionRow[];
  const row = rows[0];
  if (!row) throw new DomainError(DomainErrorCodes.accountNotFound, "account not found");
  const txDate = row.occurred_at instanceof Date ? row.occurred_at : new Date(row.occurred_at);
  const accountRow: RawAccountRow = {
    id: row.account_id,
    name: row.account_name,
    type: row.account_type,
    balance: row.account_balance,
    currency: row.account_currency,
    credit_limit: row.account_credit_limit,
    last4: row.account_last4,
    icon: row.account_icon,
    color: row.account_color,
  };
  return {
    tx: {
      id: row.id,
      name: row.name,
      amount: Number(row.amount),
      category: "income",
      catKey: "income",
      catColor: "#56d364",
      icon: row.icon ?? "◆",
      time: formatTime(txDate.toISOString()),
      occurred_at: txDate.toISOString(),
      kind: "income",
      currency: normalizeCurrency(row.account_currency),
      accountId: row.account_id,
    },
    account: mapRawAccountRow(accountRow),
  };
}

type UpdateIncomeSqlRow = {
  source_id: string;
  source_name: string;
  source_amount: string | number;
  source_icon: string;
  source_color: string;
  source_freq: string;
  source_next_date: string | null;
  tx_id: string | null;
  tx_name: string | null;
  tx_amount: string | number | null;
  tx_account_id: string | null;
  tx_icon: string | null;
  tx_occurred_at: Date | string | null;
  accounts: Array<{ id: string; balance: string | number }>;
};

/**
 * Update an income source (name + amount) and, when an account is selected,
 * move the credited cash from the previous account to the new one without
 * duplicating balances. All changes happen in a single statement.
 */
export async function updateIncome(
  ctx: ActorContext,
  input: {
    id: string;
    name: string;
    amt: number;
    accountId?: string | null;
    prevAccountId?: string | null;
    prevAmount?: number;
    txId?: string | null;
  }
) {
  const uid = ctx.userId;
  const id = uuidSchema.parse(input.id);
  const name = shortTextSchema.parse(input.name);
  const amount = positiveMoneySchema.parse(input.amt);
  const newAccountId = input.accountId ? uuidSchema.parse(input.accountId) : null;
  const prevAccountId = input.prevAccountId ? uuidSchema.parse(input.prevAccountId) : null;
  const prevAmount = input.prevAmount && input.prevAmount > 0 ? Math.round(input.prevAmount * 100) / 100 : 0;
  const txId = input.txId ? uuidSchema.parse(input.txId) : null;

  const sql = getSql();
  const rows = (await sql.query(
    `
    with owned_source as (
      select * from income_sources where id = $2::uuid and user_id = $1 limit 1
    ),
    new_account as (
      select * from accounts where id = $5::uuid and user_id = $1 limit 1
    ),
    updated_source as (
      update income_sources s
      set name = $3, amount = $4::numeric
      from owned_source
      where s.id = owned_source.id and s.user_id = $1
      returning s.*
    ),
    updated_tx as (
      update transactions t
      set account_id = $5::uuid, name = $3, amount = $4::numeric
      where t.user_id = $1 and t.id = $8::uuid
      returning t.*
    ),
    inserted_tx as (
      insert into transactions (user_id, name, amount, kind, account_id, icon)
      select $1, $3, $4::numeric, 'income', $5::uuid, '◆'
      where $8::uuid is null and exists (select 1 from new_account)
      returning *
    ),
    all_tx as (
      select * from updated_tx
      union all
      select * from inserted_tx
    ),
    deltas as (
      select $6::uuid as id, -$7::numeric as delta where $6::uuid is not null
      union all
      select $5::uuid as id, $4::numeric as delta where $5::uuid is not null
    ),
    net as (
      select id, sum(delta) as delta from deltas group by id having sum(delta) <> 0
    ),
    updated_accounts as (
      update accounts a
      set balance = a.balance + net.delta
      from net
      where a.id = net.id and a.user_id = $1
      returning a.id, a.balance
    )
    select
      us.id as source_id,
      us.name as source_name,
      us.amount as source_amount,
      us.icon as source_icon,
      us.color as source_color,
      us.freq as source_freq,
      us.next_date as source_next_date,
      tx.id as tx_id,
      tx.name as tx_name,
      tx.amount as tx_amount,
      tx.account_id as tx_account_id,
      coalesce(tx.icon, '◆') as tx_icon,
      tx.occurred_at as tx_occurred_at,
      (select coalesce(json_agg(json_build_object('id', id, 'balance', balance)), '[]'::json) from updated_accounts) as accounts
    from updated_source us
    left join all_tx tx on true
    `,
    [uid, id, name, amount, newAccountId, prevAccountId, prevAmount, txId]
  )) as UpdateIncomeSqlRow[];

  const r = rows[0];
  if (!r) throw new DomainError(DomainErrorCodes.transactionNotFound, "income source not found");

  let incomeTxRow: TxDto | null = null;
  if (r.tx_id) {
    const occurredAt = r.tx_occurred_at
      ? r.tx_occurred_at instanceof Date
        ? r.tx_occurred_at
        : new Date(r.tx_occurred_at)
      : new Date();
    incomeTxRow = {
      id: r.tx_id,
      name: r.tx_name ?? name,
      amount: Number(r.tx_amount ?? amount),
      category: "income",
      catKey: "income",
      catColor: "#56d364",
      icon: r.tx_icon ?? "◆",
      time: formatTime(occurredAt.toISOString()),
      occurred_at: occurredAt.toISOString(),
      kind: "income",
      currency: normalizeCurrency("USD"),
      accountId: r.tx_account_id ?? undefined,
    };
  }

  return {
    source: {
      id: r.source_id,
      name: r.source_name,
      amt: Number(r.source_amount),
      icon: r.source_icon,
      c: r.source_color,
      freq: r.source_freq,
      next: r.source_next_date,
    },
    incomeTx: incomeTxRow,
    txId,
    accounts: (r.accounts || []).map((a) => ({ id: a.id, balance: Number(a.balance) })),
  };
}
