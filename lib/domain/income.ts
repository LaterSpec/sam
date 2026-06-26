import { db } from "@/lib/db";
import { getSql } from "@/lib/db/sql";
import { incomeSources } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { formatTime } from "@/lib/utils";
import { positiveMoneySchema, shortTextSchema, uuidSchema } from "./validation";
import { DomainError, DomainErrorCodes, type ActorContext } from "./types";
import type { TxDto } from "./expenses";

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
        updated_account.balance as account_balance
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
