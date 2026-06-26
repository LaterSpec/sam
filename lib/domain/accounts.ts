import { db } from "@/lib/db";
import { getSql } from "@/lib/db/sql";
import { accounts } from "@/lib/db/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { accountColor, accountDefaultIcon } from "@/lib/accounts/account-types";
import { positiveMoneySchema, shortTextSchema, uuidSchema, ACCOUNT_TYPE_SET } from "./validation";
import { DomainError, DomainErrorCodes, type ActorContext } from "./types";

export type AccountDto = {
  id: string;
  name: string;
  type: string;
  balance: number;
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
  let assets = 0;
  let liabilities = 0;
  for (const a of list) {
    if (a.type === "card" && a.balance < 0) liabilities += Math.abs(a.balance);
    else assets += a.balance;
  }
  return {
    netWorth: Math.round((assets - liabilities) * 100) / 100,
    assets: Math.round(assets * 100) / 100,
    liabilities: Math.round(liabilities * 100) / 100,
    accountCount: list.length,
    accounts: list,
  };
}

export async function createAccount(
  ctx: ActorContext,
  input: { name: string; type: string; icon?: string }
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
      icon,
      color: accountColor(type),
      sort: nextSort,
    })
    .returning();

  return mapAccountRow(row);
}

export async function updateAccount(
  ctx: ActorContext,
  input: { id: string; name?: string; type?: string; icon?: string }
): Promise<AccountDto> {
  const uid = ctx.userId;
  const id = uuidSchema.parse(input.id);

  const patch: { name?: string; type?: string; icon?: string; color?: string } = {};
  if (input.name != null) patch.name = shortTextSchema.parse(input.name);
  if (input.type != null) {
    if (!ACCOUNT_TYPE_SET.has(input.type)) throw new Error("account type not supported");
    patch.type = input.type;
    patch.color = accountColor(input.type);
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
  if (!row || Number(row.owned_count) !== 2) throw new DomainError(DomainErrorCodes.accountNotFound, "account not found");
  if (Number(row.from_balance) < amount) throw new DomainError(DomainErrorCodes.insufficientBalance, "insufficient balance");
  const updatedAccounts = row.accounts as Array<{ id: string; balance: string | number }>;
  const from = updatedAccounts.find((a) => a.id === fromId);
  const to = updatedAccounts.find((a) => a.id === toId);
  if (!from || !to) throw new DomainError(DomainErrorCodes.accountNotFound, "transfer failed");

  return {
    amount,
    from: { id: from.id, balance: Number(from.balance) },
    to: { id: to.id, balance: Number(to.balance) },
  };
}
