import { db } from "@/lib/db";
import { getSql } from "@/lib/db/sql";
import { categories, transactions } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import {
  moneySchema,
  shortTextSchema,
  uuidSchema,
  colorSchema,
  keyFromName,
} from "./validation";
import { DomainError, DomainErrorCodes, type ActorContext } from "./types";

export type CategoryDto = {
  id: string;
  key: string;
  name: string;
  icon: string;
  c: string;
  cap: number;
};

export type CategoryWithSpendDto = CategoryDto & {
  spentThisMonth: number;
  remaining: number;
  pctUsed: number | null;
};

type CategorySpendRow = {
  id: string;
  key: string;
  name: string;
  icon: string;
  color: string;
  monthly_cap: string | number;
  spent: string | number;
};

/** Categories with the current calendar-month expense spend per category. */
export async function listCategories(ctx: ActorContext): Promise<CategoryWithSpendDto[]> {
  const sql = getSql();
  const rows = (await sql.query(
    `
    select
      c.id,
      c.key,
      c.name,
      c.icon,
      c.color,
      c.monthly_cap,
      coalesce(sum(t.amount) filter (
        where t.kind = 'expense'
          and t.occurred_at >= date_trunc('month', now())
      ), 0) as spent
    from categories c
    left join transactions t on t.category_id = c.id and t.user_id = c.user_id
    where c.user_id = $1
    group by c.id, c.key, c.name, c.icon, c.color, c.monthly_cap, c.sort
    order by c.sort asc
    `,
    [ctx.userId]
  )) as CategorySpendRow[];

  return rows.map((r) => {
    const cap = Number(r.monthly_cap);
    const spent = Number(r.spent);
    return {
      id: r.id,
      key: r.key,
      name: r.name,
      icon: r.icon,
      c: r.color,
      cap,
      spentThisMonth: Math.round(spent * 100) / 100,
      remaining: Math.round((cap - spent) * 100) / 100,
      pctUsed: cap > 0 ? Math.round((spent / cap) * 1000) / 10 : null,
    };
  });
}

/** Categories at or near their monthly cap (default >= 80% used). */
export async function getBudgetStatus(ctx: ActorContext, nearThresholdPct = 80) {
  const cats = await listCategories(ctx);
  const withCap = cats.filter((c) => c.cap > 0);
  const overBudget = withCap.filter((c) => c.spentThisMonth > c.cap);
  const nearLimit = withCap.filter(
    (c) => c.spentThisMonth <= c.cap && (c.pctUsed ?? 0) >= nearThresholdPct
  );
  return {
    totalCap: Math.round(withCap.reduce((a, c) => a + c.cap, 0) * 100) / 100,
    totalSpent: Math.round(cats.reduce((a, c) => a + c.spentThisMonth, 0) * 100) / 100,
    overBudget,
    nearLimit,
    categories: cats,
  };
}

export async function createCategory(
  ctx: ActorContext,
  input: { name: string; monthlyCap?: number; icon?: string; color?: string }
): Promise<CategoryDto> {
  const uid = ctx.userId;
  const name = shortTextSchema.parse(input.name);
  const cap = moneySchema.parse(input.monthlyCap ?? 0);
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
      monthlyCap: String(cap),
      sort: (existing[0]?.sort ?? -1) + 1,
    })
    .returning();
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    icon: row.icon,
    c: row.color,
    cap: Number(row.monthlyCap),
  };
}

export async function updateCategory(
  ctx: ActorContext,
  input: { id: string; name: string; monthlyCap: number; icon?: string; color?: string }
): Promise<CategoryDto> {
  const uid = ctx.userId;
  const id = uuidSchema.parse(input.id);
  const icon = input.icon || "●";
  const color = colorSchema.parse(input.color) || "#8b949e";
  const [row] = await db
    .update(categories)
    .set({
      name: shortTextSchema.parse(input.name),
      monthlyCap: String(moneySchema.parse(input.monthlyCap)),
      icon,
      color,
    })
    .where(and(eq(categories.id, id), eq(categories.userId, uid)))
    .returning();
  if (!row) throw new DomainError(DomainErrorCodes.budgetNotFound, "budget not found");
  await db
    .update(transactions)
    .set({ icon })
    .where(and(eq(transactions.categoryId, id), eq(transactions.userId, uid)));
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    icon: row.icon,
    c: row.color,
    cap: Number(row.monthlyCap),
  };
}

export async function setCategoryCap(ctx: ActorContext, categoryId: string, cap: number) {
  const id = uuidSchema.parse(categoryId);
  const [row] = await db
    .update(categories)
    .set({ monthlyCap: String(moneySchema.parse(cap)) })
    .where(and(eq(categories.id, id), eq(categories.userId, ctx.userId)))
    .returning();
  if (!row) throw new DomainError(DomainErrorCodes.categoryNotFound, "category not found");
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    icon: row.icon,
    c: row.color,
    cap: Number(row.monthlyCap),
  };
}
