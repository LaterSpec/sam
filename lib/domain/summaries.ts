import { getSql } from "@/lib/db/sql";
import { shortTextSchema } from "./validation";
import type { ActorContext } from "./types";

export type SpendingSummaryInput = {
  from?: string;
  to?: string;
  category?: string;
  groupBy?: "category" | "day" | "month";
};

function parseRange(from?: string, to?: string) {
  const fromDate = from ? new Date(from) : null;
  const toDate = to ? new Date(to) : null;
  if (fromDate && Number.isNaN(fromDate.getTime())) throw new Error("invalid 'from' date");
  if (toDate && Number.isNaN(toDate.getTime())) throw new Error("invalid 'to' date");
  return {
    from: fromDate ? fromDate.toISOString() : null,
    to: toDate ? toDate.toISOString() : null,
  };
}

type GroupRow = { bucket: string; total: string | number; count: string | number };
type TotalRow = { total: string | number; count: string | number };

/**
 * Expense totals over a date range, optionally filtered by category and grouped
 * by category / day / month. Always scoped to ctx.userId.
 */
export async function spendingSummary(ctx: ActorContext, input: SpendingSummaryInput = {}) {
  const { from, to } = parseRange(input.from, input.to);
  const category = input.category ? shortTextSchema.parse(input.category) : null;
  const groupBy = input.groupBy ?? "category";
  const sql = getSql();

  const bucketExpr =
    groupBy === "day"
      ? "to_char(date_trunc('day', t.occurred_at), 'YYYY-MM-DD')"
      : groupBy === "month"
        ? "to_char(date_trunc('month', t.occurred_at), 'YYYY-MM')"
        : "coalesce(c.name, 'Miscellaneous')";

  const groups = (await sql.query(
    `
    select ${bucketExpr} as bucket,
           coalesce(sum(t.amount), 0) as total,
           count(*) as count
    from transactions t
    left join categories c on c.id = t.category_id
    where t.user_id = $1
      and t.kind = 'expense'
      and ($2::timestamptz is null or t.occurred_at >= $2::timestamptz)
      and ($3::timestamptz is null or t.occurred_at <= $3::timestamptz)
      and ($4::text is null or lower(c.name) = lower($4::text))
    group by bucket
    order by total desc
    `,
    [ctx.userId, from, to, category]
  )) as GroupRow[];

  const totals = (await sql.query(
    `
    select coalesce(sum(t.amount), 0) as total, count(*) as count
    from transactions t
    left join categories c on c.id = t.category_id
    where t.user_id = $1
      and t.kind = 'expense'
      and ($2::timestamptz is null or t.occurred_at >= $2::timestamptz)
      and ($3::timestamptz is null or t.occurred_at <= $3::timestamptz)
      and ($4::text is null or lower(c.name) = lower($4::text))
    `,
    [ctx.userId, from, to, category]
  )) as TotalRow[];

  const totalRow = totals[0] ?? { total: 0, count: 0 };
  return {
    from: input.from ?? null,
    to: input.to ?? null,
    groupBy,
    category,
    total: Math.round(Number(totalRow.total) * 100) / 100,
    transactionCount: Number(totalRow.count),
    groups: groups.map((g) => ({
      bucket: g.bucket,
      total: Math.round(Number(g.total) * 100) / 100,
      count: Number(g.count),
    })),
  };
}

/** Income vs expense totals (and net) over a date range. */
export async function cashflow(ctx: ActorContext, input: { from?: string; to?: string } = {}) {
  const { from, to } = parseRange(input.from, input.to);
  const sql = getSql();
  const rows = (await sql.query(
    `
    select t.kind as kind,
           coalesce(sum(t.amount), 0) as total,
           count(*) as count
    from transactions t
    where t.user_id = $1
      and t.kind in ('expense', 'income')
      and ($2::timestamptz is null or t.occurred_at >= $2::timestamptz)
      and ($3::timestamptz is null or t.occurred_at <= $3::timestamptz)
    group by t.kind
    `,
    [ctx.userId, from, to]
  )) as Array<{ kind: string; total: string | number; count: string | number }>;

  let income = 0;
  let expense = 0;
  let incomeCount = 0;
  let expenseCount = 0;
  for (const r of rows) {
    if (r.kind === "income") {
      income = Number(r.total);
      incomeCount = Number(r.count);
    } else if (r.kind === "expense") {
      expense = Number(r.total);
      expenseCount = Number(r.count);
    }
  }
  return {
    from: input.from ?? null,
    to: input.to ?? null,
    income: Math.round(income * 100) / 100,
    expense: Math.round(expense * 100) / 100,
    net: Math.round((income - expense) * 100) / 100,
    incomeCount,
    expenseCount,
  };
}
