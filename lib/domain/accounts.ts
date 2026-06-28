import { db } from "@/lib/db";
import { getSql } from "@/lib/db/sql";
import { accounts, transactions } from "@/lib/db/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { accountColor, accountDefaultIcon } from "@/lib/accounts/account-types";
import { positiveMoneySchema, shortTextSchema, uuidSchema, ACCOUNT_TYPE_SET } from "./validation";
import { DomainError, DomainErrorCodes, type ActorContext } from "./types";
import { normalizeCurrency, type Currency } from "@/lib/finance/currency";

export type AccountDto = {
  id: string;
  name: string;
  type: string;
  balance: number;
  currency: Currency;
  creditLimit: number | null;
  last4: string | null;
  icon: string;
  color: string;
};

export type RawAccountRow = {
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

export function mapAccountRow(a: typeof accounts.$inferSelect): AccountDto {
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

export function mapRawAccountRow(a: RawAccountRow): AccountDto {
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

export async function listAccounts(ctx: ActorContext): Promise<AccountDto[]> {
  const rows = await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, ctx.userId))
    .orderBy(asc(accounts.sort));
  return rows.map(mapAccountRow);
}

export async function getNetWorth(ctx: ActorContext) {
  const list = await listAccounts(ctx);
  const grouped = new Map<Currency, { assets: number; liabilities: number }>();
  for (const a of list) {
    const totals = grouped.get(a.currency) ?? { assets: 0, liabilities: 0 };
    if (a.type === "card" && a.balance < 0) totals.liabilities += Math.abs(a.balance);
    else totals.assets += a.balance;
    grouped.set(a.currency, totals);
  }
  const byCurrency = Array.from(grouped, ([currency, totals]) => ({
    currency,
    assets: Math.round(totals.assets * 100) / 100,
    liabilities: Math.round(totals.liabilities * 100) / 100,
    netWorth: Math.round((totals.assets - totals.liabilities) * 100) / 100,
  }));
  const single = byCurrency.length === 1 ? byCurrency[0] : null;
  return {
    netWorth: single?.netWorth ?? null,
    assets: single?.assets ?? null,
    liabilities: single?.liabilities ?? null,
    mixedCurrency: byCurrency.length > 1,
    byCurrency,
    accountCount: list.length,
    accounts: list,
  };
}

export async function createAccount(
  ctx: ActorContext,
  input: { name: string; type: string; icon?: string; currency?: string }
): Promise<AccountDto> {
  const uid = ctx.userId;
  const trimmed = shortTextSchema.parse(input.name);

  const existing = await db
    .select({ sort: accounts.sort })
    .from(accounts)
    .where(eq(accounts.userId, uid))
    .orderBy(desc(accounts.sort))
    .limit(1);
  const nextSort = (existing[0]?.sort ?? -1) + 1;
  const type = ACCOUNT_TYPE_SET.has(input.type) ? input.type : "cash";
  const icon = input.icon?.trim() || accountDefaultIcon(type);

  const [row] = await db
    .insert(accounts)
    .values({
      userId: uid,
      name: trimmed,
      type,
      balance: "0",
      currency: normalizeCurrency(input.currency),
      icon,
      color: accountColor(type),
      sort: nextSort,
    })
    .returning();

  return mapAccountRow(row);
}

export async function updateAccount(
  ctx: ActorContext,
  input: { id: string; name?: string; type?: string; icon?: string; currency?: string }
): Promise<AccountDto> {
  const uid = ctx.userId;
  const id = uuidSchema.parse(input.id);

  const patch: { name?: string; type?: string; icon?: string; color?: string; currency?: Currency } = {};
  if (input.name != null) patch.name = shortTextSchema.parse(input.name);
  if (input.type != null) {
    if (!ACCOUNT_TYPE_SET.has(input.type)) throw new Error("account type not supported");
    patch.type = input.type;
    patch.color = accountColor(input.type);
  }
  if (input.currency != null) {
    const nextCurrency = normalizeCurrency(input.currency);
    const [current] = await db
      .select({ currency: accounts.currency })
      .from(accounts)
      .where(and(eq(accounts.id, id), eq(accounts.userId, uid)))
      .limit(1);
    if (!current) throw new DomainError(DomainErrorCodes.accountNotFound, "account not found");
    if (current.currency !== nextCurrency) {
      const movement = await db
        .select({ id: transactions.id })
        .from(transactions)
        .where(and(eq(transactions.accountId, id), eq(transactions.userId, uid)))
        .limit(1);
      if (movement[0]) throw new Error("account currency cannot change after transactions exist");
      patch.currency = nextCurrency;
    }
  }
  if (input.icon != null) patch.icon = input.icon.trim() || accountDefaultIcon(input.type ?? "cash");

  const [row] = await db
    .update(accounts)
    .set(patch)
    .where(and(eq(accounts.id, id), eq(accounts.userId, uid)))
    .returning();

  if (!row) throw new DomainError(DomainErrorCodes.accountNotFound, "account not found");
  return mapAccountRow(row);
}

type TransferSqlRow = {
  owned_count: string | number;
  from_balance: string | number;
  from_currency: string | null;
  to_currency: string | null;
  transfer_id: string | null;
  accounts: Array<{ id: string; balance: string | number }>;
};

export async function transferBetweenAccounts(
  ctx: ActorContext,
  input: { fromId: string; toId: string; amount: number }
) {
  const uid = ctx.userId;
  const amount = positiveMoneySchema.parse(input.amount);
  const fromId = uuidSchema.parse(input.fromId);
  const toId = uuidSchema.parse(input.toId);

  if (fromId === toId) throw new DomainError(DomainErrorCodes.sameAccount, "cannot transfer to same account");

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
        (select balance from owned where id = $2::uuid) as from_balance,
        (select currency from owned where id = $2::uuid) as from_currency,
        (select currency from owned where id = $3::uuid) as to_currency
    ),
    debited as (
      update accounts a
      set balance = a.balance - $4::numeric
      from guard
      where a.id = $2::uuid
        and a.user_id = $1
        and guard.owned_count = 2
        and guard.from_currency = guard.to_currency
        and (
          (a.type = 'card' and (a.credit_limit is null or a.balance - $4::numeric >= -a.credit_limit))
          or (a.type <> 'card' and a.balance >= $4::numeric)
        )
      returning a.id, a.balance, a.currency
    ),
    credited as (
      update accounts a
      set balance = a.balance + $4::numeric
      from debited
      where a.id = $3::uuid and a.user_id = $1
      returning a.id, a.balance, a.currency
    ),
    created_transfer as (
      insert into account_transfers (
        user_id, from_account_id, to_account_id, amount, currency, status
      )
      select $1, $2::uuid, $3::uuid, $4::numeric, debited.currency, 'posted'
      from debited
      join credited on true
      returning *
    ),
    movements as (
      insert into transactions (
        user_id, account_id, name, amount, kind, icon, currency, status, source, transfer_id
      )
      select $1, $2::uuid, 'Transfer out', $4::numeric, 'transfer_out', '⇄', currency, 'confirmed', 'transfer', id
      from created_transfer
      union all
      select $1, $3::uuid, 'Transfer in', $4::numeric, 'transfer_in', '⇄', currency, 'confirmed', 'transfer', id
      from created_transfer
      returning id
    )
    select
      (select owned_count from guard) as owned_count,
      (select from_balance from guard) as from_balance,
      (select from_currency from guard) as from_currency,
      (select to_currency from guard) as to_currency,
      (select id from created_transfer) as transfer_id,
      coalesce(
        json_build_array(
          json_build_object('id', debited.id, 'balance', debited.balance),
          json_build_object('id', credited.id, 'balance', credited.balance)
        ),
        '[]'::json
      ) as accounts
    from guard
    left join debited on true
    left join credited on true
    `,
    [uid, fromId, toId, amount]
  )) as TransferSqlRow[];
  const row = rows[0];
  if (!row || Number(row.owned_count) !== 2) throw new DomainError(DomainErrorCodes.accountNotFound, "account not found");
  if (row.from_currency !== row.to_currency) throw new Error("cross-currency transfers are not supported");
  if (!row.transfer_id) throw new DomainError(DomainErrorCodes.insufficientBalance, "insufficient available balance");
  const updatedAccounts = row.accounts as Array<{ id: string; balance: string | number }>;
  const from = updatedAccounts.find((a) => a.id === fromId);
  const to = updatedAccounts.find((a) => a.id === toId);
  if (!from || !to) throw new DomainError(DomainErrorCodes.accountNotFound, "transfer failed");

  return {
    id: row.transfer_id,
    amount,
    from: { id: from.id, balance: Number(from.balance) },
    to: { id: to.id, balance: Number(to.balance) },
  };
}
