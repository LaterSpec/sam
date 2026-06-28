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

type GroupRow = { bucket: string; currency: string; total: string | number; count: string | number };
type TotalRow = { currency: string; total: string | number; count: string | number };

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
           t.currency,
           coalesce(sum(t.amount), 0) as total,
           count(*) as count
    from transactions t
    left join categories c on c.id = t.category_id
    where t.user_id = $1
      and t.kind = 'expense'
      and t.status = 'confirmed'
      and ($2::timestamptz is null or t.occurred_at >= $2::timestamptz)
      and ($3::timestamptz is null or t.occurred_at <= $3::timestamptz)
      and ($4::text is null or lower(c.name) = lower($4::text))
    group by bucket, t.currency
    order by total desc
    `,
    [ctx.userId, from, to, category]
  )) as GroupRow[];

  const totals = (await sql.query(
    `
    select t.currency, coalesce(sum(t.amount), 0) as total, count(*) as count
    from transactions t
    left join categories c on c.id = t.category_id
    where t.user_id = $1
      and t.kind = 'expense'
      and t.status = 'confirmed'
      and ($2::timestamptz is null or t.occurred_at >= $2::timestamptz)
      and ($3::timestamptz is null or t.occurred_at <= $3::timestamptz)
      and ($4::text is null or lower(c.name) = lower($4::text))
    group by t.currency
    `,
    [ctx.userId, from, to, category]
  )) as TotalRow[];

  const single = totals.length === 1 ? totals[0] : null;
  return {
    from: input.from ?? null,
    to: input.to ?? null,
    groupBy,
    category,
    total: single ? Math.round(Number(single.total) * 100) / 100 : null,
    currency: single?.currency ?? null,
    mixedCurrency: totals.length > 1,
    totalsByCurrency: totals.map((row) => ({
      currency: row.currency,
      total: Math.round(Number(row.total) * 100) / 100,
      count: Number(row.count),
    })),
    transactionCount: totals.reduce((sum, row) => sum + Number(row.count), 0),
    groups: groups.map((g) => ({
      bucket: g.bucket,
      currency: g.currency,
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
           t.currency,
           coalesce(sum(t.amount), 0) as total,
           count(*) as count
    from transactions t
    where t.user_id = $1
      and t.kind in ('expense', 'income')
      and t.status = 'confirmed'
      and ($2::timestamptz is null or t.occurred_at >= $2::timestamptz)
      and ($3::timestamptz is null or t.occurred_at <= $3::timestamptz)
    group by t.kind, t.currency
    `,
    [ctx.userId, from, to]
  )) as Array<{ kind: string; currency: string; total: string | number; count: string | number }>;

  const grouped = new Map<string, { income: number; expense: number; incomeCount: number; expenseCount: number }>();
  for (const r of rows) {
    const current = grouped.get(r.currency) ?? { income: 0, expense: 0, incomeCount: 0, expenseCount: 0 };
    if (r.kind === "income") {
      current.income = Number(r.total);
      current.incomeCount = Number(r.count);
    } else if (r.kind === "expense") {
      current.expense = Number(r.total);
      current.expenseCount = Number(r.count);
    }
    grouped.set(r.currency, current);
  }
  const byCurrency = Array.from(grouped, ([currency, value]) => ({
    currency,
    income: Math.round(value.income * 100) / 100,
    expense: Math.round(value.expense * 100) / 100,
    net: Math.round((value.income - value.expense) * 100) / 100,
    incomeCount: value.incomeCount,
    expenseCount: value.expenseCount,
  }));
  const single = byCurrency.length === 1 ? byCurrency[0] : null;
  return {
    from: input.from ?? null,
    to: input.to ?? null,
    income: single?.income ?? null,
    expense: single?.expense ?? null,
    net: single?.net ?? null,
    incomeCount: byCurrency.reduce((sum, value) => sum + value.incomeCount, 0),
    expenseCount: byCurrency.reduce((sum, value) => sum + value.expenseCount, 0),
    mixedCurrency: byCurrency.length > 1,
    byCurrency,
  };
}
