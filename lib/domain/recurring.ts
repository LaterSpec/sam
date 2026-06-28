import { and, asc, desc, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSql } from "@/lib/db/sql";
import {
  accounts,
  categories,
  recurringOccurrences,
  recurringRules,
} from "@/lib/db/schema";
import {
  countOccurrencesThrough,
  nextOccurrenceAfter,
  nextOccurrenceFrom,
  parseIsoDate,
  todayInTimeZone,
  type RecurrenceUnit,
} from "@/lib/finance/recurrence";
import { DomainError, DomainErrorCodes, type ActorContext } from "./types";
import { positiveMoneySchema, shortTextSchema, uuidSchema } from "./validation";

export type RecurringKind = "expense" | "income";
export type RecurringStatus = "active" | "paused" | "archived";
export type OccurrenceStatus = "processing" | "posted" | "failed" | "skipped";

export type RecurringRuleDto = {
  id: string;
  kind: RecurringKind;
  name: string;
  amount: number;
  accountId: string;
  accountName: string;
  accountCurrency: string;
  categoryId: string | null;
  categoryName: string | null;
  categoryKey: string | null;
  categoryIcon: string | null;
  categoryColor: string | null;
  frequencyUnit: RecurrenceUnit;
  frequencyInterval: number;
  startDate: string;
  nextOccurrenceDate: string;
  endDate: string | null;
  timezone: string;
  status: RecurringStatus;
  needsReview: boolean;
  lastProcessedAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RecurringOccurrenceDto = {
  id: string;
  ruleId: string;
  ruleName: string;
  kind: RecurringKind;
  amount: number;
  scheduledDate: string;
  status: OccurrenceStatus;
  transactionId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  attempts: number;
  postedAt: string | null;
  lastAttemptAt: string;
  createdAt: string;
};

const kindSchema = z.enum(["expense", "income"]);
const unitSchema = z.enum(["day", "week", "month", "year"]);
const statusSchema = z.enum(["active", "paused", "archived"]);
const isoDateSchema = z.string().refine((value) => {
  try {
    parseIsoDate(value);
    return true;
  } catch {
    return false;
  }
}, "invalid ISO date");
const timezoneSchema = z.string().min(1).max(80).refine((value) => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}, "invalid IANA timezone");

const createRuleSchema = z.object({
  kind: kindSchema,
  name: shortTextSchema,
  amount: positiveMoneySchema,
  accountId: uuidSchema,
  categoryId: uuidSchema.nullish(),
  frequencyUnit: unitSchema,
  frequencyInterval: z.coerce.number().int().min(1).max(365).default(1),
  startDate: isoDateSchema,
  endDate: isoDateSchema.nullish(),
  timezone: timezoneSchema.default("America/Lima"),
  confirmCatchUp: z.boolean().default(false),
});

export type CreateRecurringRuleInput = z.input<typeof createRuleSchema>;
export type UpdateRecurringRuleInput = Partial<
  Omit<z.input<typeof createRuleSchema>, "confirmCatchUp">
> & { id: string };

type RuleJoinedRow = {
  rule: typeof recurringRules.$inferSelect;
  accountName: string;
  accountCurrency: string;
  categoryName: string | null;
  categoryKey: string | null;
  categoryIcon: string | null;
  categoryColor: string | null;
};

function asIso(value: Date | string | null): string | null {
  if (value == null) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapRule(row: RuleJoinedRow): RecurringRuleDto {
  return {
    id: row.rule.id,
    kind: row.rule.kind as RecurringKind,
    name: row.rule.name,
    amount: Number(row.rule.amount),
    accountId: row.rule.accountId,
    accountName: row.accountName,
    accountCurrency: row.accountCurrency,
    categoryId: row.rule.categoryId,
    categoryName: row.categoryName,
    categoryKey: row.categoryKey,
    categoryIcon: row.categoryIcon,
    categoryColor: row.categoryColor,
    frequencyUnit: row.rule.frequencyUnit as RecurrenceUnit,
    frequencyInterval: row.rule.frequencyInterval,
    startDate: row.rule.startDate,
    nextOccurrenceDate: row.rule.nextOccurrenceDate,
    endDate: row.rule.endDate,
    timezone: row.rule.timezone,
    status: row.rule.status as RecurringStatus,
    needsReview: row.rule.needsReview,
    lastProcessedAt: asIso(row.rule.lastProcessedAt),
    lastError: row.rule.lastError,
    createdAt: asIso(row.rule.createdAt)!,
    updatedAt: asIso(row.rule.updatedAt)!,
  };
}

async function getOwnedRule(userId: string, id: string): Promise<RecurringRuleDto> {
  const ruleId = uuidSchema.parse(id);
  const rows = await db
    .select({
      rule: recurringRules,
      accountName: accounts.name,
      accountCurrency: accounts.currency,
      categoryName: categories.name,
      categoryKey: categories.key,
      categoryIcon: categories.icon,
      categoryColor: categories.color,
    })
    .from(recurringRules)
    .innerJoin(accounts, eq(accounts.id, recurringRules.accountId))
    .leftJoin(categories, eq(categories.id, recurringRules.categoryId))
    .where(and(eq(recurringRules.userId, userId), eq(recurringRules.id, ruleId)))
    .limit(1);
  if (!rows[0]) {
    throw new DomainError(DomainErrorCodes.transactionNotFound, "recurring rule not found");
  }
  return mapRule(rows[0]);
}

async function assertAccountAndCategory(input: {
  userId: string;
  accountId: string;
  kind: RecurringKind;
  categoryId?: string | null;
}): Promise<void> {
  const account = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.userId, input.userId), eq(accounts.id, input.accountId)))
    .limit(1);
  if (!account[0]) throw new DomainError(DomainErrorCodes.accountNotFound, "account not found");

  if (input.kind === "income" && input.categoryId) {
    throw new DomainError(DomainErrorCodes.categoryNotFound, "income cannot have a category");
  }
  if (input.kind === "expense") {
    if (!input.categoryId) {
      throw new DomainError(DomainErrorCodes.categoryNotFound, "expense category is required");
    }
    const category = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.userId, input.userId), eq(categories.id, input.categoryId)))
      .limit(1);
    if (!category[0]) {
      throw new DomainError(DomainErrorCodes.categoryNotFound, "category not found");
    }
  }
}

export async function listRecurringRules(
  ctx: ActorContext,
  input: { status?: RecurringStatus; kind?: RecurringKind; includeArchived?: boolean } = {}
): Promise<RecurringRuleDto[]> {
  const filters = [eq(recurringRules.userId, ctx.userId)];
  if (input.status) filters.push(eq(recurringRules.status, statusSchema.parse(input.status)));
  else if (!input.includeArchived) filters.push(ne(recurringRules.status, "archived"));
  if (input.kind) filters.push(eq(recurringRules.kind, kindSchema.parse(input.kind)));

  const rows = await db
    .select({
      rule: recurringRules,
      accountName: accounts.name,
      accountCurrency: accounts.currency,
      categoryName: categories.name,
      categoryKey: categories.key,
      categoryIcon: categories.icon,
      categoryColor: categories.color,
    })
    .from(recurringRules)
    .innerJoin(accounts, eq(accounts.id, recurringRules.accountId))
    .leftJoin(categories, eq(categories.id, recurringRules.categoryId))
    .where(and(...filters))
    .orderBy(asc(recurringRules.nextOccurrenceDate), asc(recurringRules.createdAt));
  return rows.map(mapRule);
}

export async function createRecurringRule(
  ctx: ActorContext,
  rawInput: CreateRecurringRuleInput
): Promise<RecurringRuleDto> {
  const input = createRuleSchema.parse(rawInput);
  if (input.endDate && input.endDate < input.startDate) {
    throw new Error("end date must be on or after start date");
  }
  await assertAccountAndCategory({
    userId: ctx.userId,
    accountId: input.accountId,
    kind: input.kind,
    categoryId: input.categoryId,
  });

  const today = todayInTimeZone(input.timezone);
  const dueCount = countOccurrencesThrough({
    startDate: input.startDate,
    unit: input.frequencyUnit,
    interval: input.frequencyInterval,
    throughDate: today,
    endDate: input.endDate,
    cap: 101,
  });
  if (dueCount > 0 && !input.confirmCatchUp) {
    throw new DomainError(
      DomainErrorCodes.confirmationRequired,
      `${Math.min(dueCount, 100)} past or current occurrences require confirmation`
    );
  }

  const [row] = await db
    .insert(recurringRules)
    .values({
      userId: ctx.userId,
      accountId: input.accountId,
      categoryId: input.kind === "expense" ? input.categoryId! : null,
      kind: input.kind,
      name: input.name,
      amount: String(input.amount),
      frequencyUnit: input.frequencyUnit,
      frequencyInterval: input.frequencyInterval,
      startDate: input.startDate,
      nextOccurrenceDate: input.startDate,
      endDate: input.endDate ?? null,
      timezone: input.timezone,
      status: "active",
      needsReview: false,
      updatedAt: new Date(),
    })
    .returning({ id: recurringRules.id });

  if (dueCount > 0) {
    await processDueRecurring({ userId: ctx.userId, ruleId: row.id, perRuleLimit: 100 });
  }
  return getOwnedRule(ctx.userId, row.id);
}

export async function updateRecurringRule(
  ctx: ActorContext,
  rawInput: UpdateRecurringRuleInput
): Promise<RecurringRuleDto> {
  const id = uuidSchema.parse(rawInput.id);
  const current = await getOwnedRule(ctx.userId, id);
  const candidate = createRuleSchema.omit({ confirmCatchUp: true }).parse({
    kind: rawInput.kind ?? current.kind,
    name: rawInput.name ?? current.name,
    amount: rawInput.amount ?? current.amount,
    accountId: rawInput.accountId ?? current.accountId,
    categoryId:
      rawInput.categoryId !== undefined ? rawInput.categoryId : current.categoryId,
    frequencyUnit: rawInput.frequencyUnit ?? current.frequencyUnit,
    frequencyInterval: rawInput.frequencyInterval ?? current.frequencyInterval,
    startDate: rawInput.startDate ?? current.startDate,
    endDate: rawInput.endDate !== undefined ? rawInput.endDate : current.endDate,
    timezone: rawInput.timezone ?? current.timezone,
  });
  if (candidate.endDate && candidate.endDate < candidate.startDate) {
    throw new Error("end date must be on or after start date");
  }
  await assertAccountAndCategory({
    userId: ctx.userId,
    accountId: candidate.accountId,
    kind: candidate.kind,
    categoryId: candidate.categoryId,
  });

  const scheduleChanged =
    candidate.startDate !== current.startDate ||
    candidate.frequencyUnit !== current.frequencyUnit ||
    candidate.frequencyInterval !== current.frequencyInterval;
  let nextOccurrenceDate = current.nextOccurrenceDate;
  if (scheduleChanged) {
    const today = todayInTimeZone(candidate.timezone);
    nextOccurrenceDate =
      candidate.startDate > today
        ? candidate.startDate
        : nextOccurrenceAfter(
            candidate.startDate,
            candidate.frequencyUnit,
            candidate.frequencyInterval,
            today
          );
  }

  await db
    .update(recurringRules)
    .set({
      accountId: candidate.accountId,
      categoryId: candidate.kind === "expense" ? candidate.categoryId! : null,
      kind: candidate.kind,
      name: candidate.name,
      amount: String(candidate.amount),
      frequencyUnit: candidate.frequencyUnit,
      frequencyInterval: candidate.frequencyInterval,
      startDate: candidate.startDate,
      nextOccurrenceDate,
      endDate: candidate.endDate ?? null,
      timezone: candidate.timezone,
      needsReview: false,
      lastError: null,
      updatedAt: new Date(),
    })
    .where(and(eq(recurringRules.userId, ctx.userId), eq(recurringRules.id, id)));
  return getOwnedRule(ctx.userId, id);
}

async function setRuleStatus(
  ctx: ActorContext,
  idValue: string,
  status: RecurringStatus
): Promise<RecurringRuleDto> {
  const id = uuidSchema.parse(idValue);
  const current = await getOwnedRule(ctx.userId, id);
  if (status === "active" && current.needsReview) {
    throw new DomainError(
      DomainErrorCodes.confirmationRequired,
      "review and save the migrated rule before resuming it"
    );
  }
  let nextOccurrenceDate = current.nextOccurrenceDate;
  if (status === "active") {
    const today = todayInTimeZone(current.timezone);
    nextOccurrenceDate =
      current.startDate > today
        ? current.startDate
        : nextOccurrenceAfter(
            current.startDate,
            current.frequencyUnit,
            current.frequencyInterval,
            today
          );
  }
  const [updated] = await db
    .update(recurringRules)
    .set({
      status,
      nextOccurrenceDate,
      archivedAt: status === "archived" ? new Date() : null,
      lastError: status === "active" ? null : current.lastError,
      updatedAt: new Date(),
    })
    .where(and(eq(recurringRules.userId, ctx.userId), eq(recurringRules.id, id)))
    .returning({ id: recurringRules.id });
  if (!updated) {
    throw new DomainError(DomainErrorCodes.transactionNotFound, "recurring rule not found");
  }
  return getOwnedRule(ctx.userId, id);
}

export const pauseRecurringRule = (ctx: ActorContext, id: string) =>
  setRuleStatus(ctx, id, "paused");
export const resumeRecurringRule = (ctx: ActorContext, id: string) =>
  setRuleStatus(ctx, id, "active");
export const archiveRecurringRule = (ctx: ActorContext, id: string) =>
  setRuleStatus(ctx, id, "archived");

export async function listRecurringOccurrences(
  ctx: ActorContext,
  input: {
    ruleId?: string;
    status?: OccurrenceStatus;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ count: number; limit: number; offset: number; occurrences: RecurringOccurrenceDto[] }> {
  const filters = [eq(recurringOccurrences.userId, ctx.userId)];
  if (input.ruleId) filters.push(eq(recurringOccurrences.ruleId, uuidSchema.parse(input.ruleId)));
  if (input.status) filters.push(eq(recurringOccurrences.status, input.status));
  const limit = Math.min(Math.max(Math.trunc(input.limit ?? 100), 1), 500);
  const offset = Math.max(Math.trunc(input.offset ?? 0), 0);
  const rows = await db
    .select({
      occurrence: recurringOccurrences,
      ruleName: recurringRules.name,
      kind: recurringRules.kind,
      amount: recurringRules.amount,
    })
    .from(recurringOccurrences)
    .innerJoin(recurringRules, eq(recurringRules.id, recurringOccurrences.ruleId))
    .where(and(...filters))
    .orderBy(desc(recurringOccurrences.scheduledDate), desc(recurringOccurrences.createdAt))
    .limit(limit)
    .offset(offset);
  const occurrences = rows.map(({ occurrence, ruleName, kind, amount }) => ({
    id: occurrence.id,
    ruleId: occurrence.ruleId,
    ruleName,
    kind: kind as RecurringKind,
    amount: Number(amount),
    scheduledDate: occurrence.scheduledDate,
    status: occurrence.status as OccurrenceStatus,
    transactionId: occurrence.transactionId,
    errorCode: occurrence.errorCode,
    errorMessage: occurrence.errorMessage,
    attempts: occurrence.attempts,
    postedAt: asIso(occurrence.postedAt),
    lastAttemptAt: asIso(occurrence.lastAttemptAt)!,
    createdAt: asIso(occurrence.createdAt)!,
  }));
  return { count: occurrences.length, limit, offset, occurrences };
}

type PostOccurrenceRow = {
  occurrence_id: string;
  occurrence_status: OccurrenceStatus;
};

async function postScheduledOccurrence(input: {
  userId: string;
  ruleId: string;
  scheduledDate: string;
  nextOccurrenceDate: string;
}): Promise<OccurrenceStatus | "duplicate"> {
  const sql = getSql();
  const rows = (await sql.query(
    `
    with selected_rule as (
      select r.*, a.type as account_type, a.credit_limit, a.balance as account_balance
      from recurring_rules r
      join accounts a on a.id = r.account_id and a.user_id = r.user_id
      where r.id = $2::uuid
        and r.user_id = $1
        and r.status = 'active'
        and r.next_occurrence_date = $3::date
      limit 1
    ),
    claimed as (
      insert into recurring_occurrences (
        rule_id, user_id, scheduled_date, status, attempts, last_attempt_at
      )
      select id, user_id, $3::date, 'processing', 1, now()
      from selected_rule
      on conflict (rule_id, scheduled_date) do nothing
      returning *
    ),
    updated_account as (
      update accounts a
      set balance = case
        when r.kind = 'income' then a.balance + r.amount
        else a.balance - r.amount
      end
      from selected_rule r, claimed c
      where a.id = r.account_id
        and a.user_id = r.user_id
        and (
          r.kind = 'income'
          or (
            r.kind = 'expense'
            and (
              (a.type = 'card' and (a.credit_limit is null or a.balance - r.amount >= -a.credit_limit))
              or (a.type <> 'card' and a.balance >= r.amount)
            )
          )
        )
      returning a.id, a.balance, a.currency
    ),
    inserted_tx as (
      insert into transactions (
        user_id, account_id, category_id, name, amount, kind, icon, status,
        source, currency, recurring_occurrence_id, scheduled_for, occurred_at
      )
      select
        r.user_id,
        r.account_id,
        r.category_id,
        r.name,
        r.amount,
        r.kind,
        case when r.kind = 'income' then '◆' else coalesce(cat.icon, '●') end,
        'confirmed',
        'recurring',
        a.currency,
        c.id,
        $3::date::timestamp,
        $3::date::timestamp
      from selected_rule r
      join claimed c on true
      join updated_account a on a.id = r.account_id
      left join categories cat on cat.id = r.category_id and cat.user_id = r.user_id
      returning id, recurring_occurrence_id
    ),
    finalized as (
      update recurring_occurrences o
      set
        status = case when tx.id is not null then 'posted' else 'failed' end,
        transaction_id = tx.id,
        error_code = case when tx.id is null then 'insufficient_balance' else null end,
        error_message = case when tx.id is null then 'insufficient available balance' else null end,
        posted_at = case when tx.id is not null then now() else null end,
        last_attempt_at = now()
      from claimed c
      left join inserted_tx tx on tx.recurring_occurrence_id = c.id
      where o.id = c.id
      returning o.*
    ),
    advanced as (
      update recurring_rules r
      set
        next_occurrence_date = $4::date,
        last_processed_at = now(),
        last_error = case when f.status = 'failed' then f.error_message else null end,
        updated_at = now()
      from finalized f
      where r.id = f.rule_id and r.user_id = f.user_id
      returning r.id
    )
    select f.id as occurrence_id, f.status as occurrence_status
    from finalized f
    join advanced a on a.id = f.rule_id
    `,
    [input.userId, input.ruleId, input.scheduledDate, input.nextOccurrenceDate]
  )) as PostOccurrenceRow[];

  if (rows[0]) return rows[0].occurrence_status;

  const recovered = (await sql.query(
    `
    update recurring_rules r
    set next_occurrence_date = $4::date, last_processed_at = now(), updated_at = now()
    where r.id = $2::uuid
      and r.user_id = $1
      and r.status = 'active'
      and r.next_occurrence_date = $3::date
      and exists (
        select 1
        from recurring_occurrences o
        where o.rule_id = r.id
          and o.scheduled_date = $3::date
          and o.status in ('posted', 'failed', 'skipped')
      )
    returning r.id
    `,
    [input.userId, input.ruleId, input.scheduledDate, input.nextOccurrenceDate]
  )) as Array<{ id: string }>;
  return recovered[0] ? "duplicate" : "duplicate";
}

export async function processDueRecurring(input: {
  userId?: string;
  ruleId?: string;
  perRuleLimit?: number;
} = {}): Promise<{
  rules: number;
  processed: number;
  posted: number;
  failed: number;
  duplicates: number;
}> {
  const filters = [eq(recurringRules.status, "active")];
  if (input.userId) filters.push(eq(recurringRules.userId, input.userId));
  if (input.ruleId) filters.push(eq(recurringRules.id, uuidSchema.parse(input.ruleId)));
  const rules = await db
    .select()
    .from(recurringRules)
    .where(and(...filters))
    .orderBy(asc(recurringRules.nextOccurrenceDate))
    .limit(500);

  let processed = 0;
  let posted = 0;
  let failed = 0;
  let duplicates = 0;
  const perRuleLimit = Math.min(Math.max(Math.trunc(input.perRuleLimit ?? 100), 1), 100);

  for (const rule of rules) {
    const today = todayInTimeZone(rule.timezone);
    let scheduledDate = rule.nextOccurrenceDate;
    let count = 0;
    while (scheduledDate <= today && count < perRuleLimit) {
      if (rule.endDate && scheduledDate > rule.endDate) {
        await db
          .update(recurringRules)
          .set({ status: "archived", archivedAt: new Date(), updatedAt: new Date() })
          .where(
            and(
              eq(recurringRules.id, rule.id),
              eq(recurringRules.userId, rule.userId),
              eq(recurringRules.nextOccurrenceDate, scheduledDate)
            )
          );
        break;
      }
      const nextDate = nextOccurrenceFrom(
        rule.startDate,
        scheduledDate,
        rule.frequencyUnit as RecurrenceUnit,
        rule.frequencyInterval
      );
      const result = await postScheduledOccurrence({
        userId: rule.userId,
        ruleId: rule.id,
        scheduledDate,
        nextOccurrenceDate: nextDate,
      });
      processed += 1;
      count += 1;
      if (result === "posted") posted += 1;
      else if (result === "failed") failed += 1;
      else duplicates += 1;
      scheduledDate = nextDate;
    }
  }

  return { rules: rules.length, processed, posted, failed, duplicates };
}

type RetryRow = {
  occurrence_id: string;
  status: OccurrenceStatus;
};

export async function retryRecurringOccurrence(
  ctx: ActorContext,
  idValue: string
): Promise<RecurringOccurrenceDto> {
  const id = uuidSchema.parse(idValue);
  const sql = getSql();
  const rows = (await sql.query(
    `
    with claimed as (
      update recurring_occurrences o
      set status = 'processing', attempts = attempts + 1, last_attempt_at = now()
      where o.id = $2::uuid and o.user_id = $1 and o.status = 'failed'
      returning o.*
    ),
    selected_rule as (
      select r.*
      from recurring_rules r
      join claimed c on c.rule_id = r.id and c.user_id = r.user_id
      where r.user_id = $1
    ),
    updated_account as (
      update accounts a
      set balance = case
        when r.kind = 'income' then a.balance + r.amount
        else a.balance - r.amount
      end
      from selected_rule r, claimed c
      where a.id = r.account_id
        and a.user_id = r.user_id
        and (
          r.kind = 'income'
          or (
            r.kind = 'expense'
            and (
              (a.type = 'card' and (a.credit_limit is null or a.balance - r.amount >= -a.credit_limit))
              or (a.type <> 'card' and a.balance >= r.amount)
            )
          )
        )
      returning a.id
    ),
    inserted_tx as (
      insert into transactions (
        user_id, account_id, category_id, name, amount, kind, icon, status,
        source, currency, recurring_occurrence_id, scheduled_for, occurred_at
      )
      select
        r.user_id,
        r.account_id,
        r.category_id,
        r.name,
        r.amount,
        r.kind,
        case when r.kind = 'income' then '◆' else coalesce(cat.icon, '●') end,
        'confirmed',
        'recurring',
        (select currency from accounts where id = r.account_id),
        c.id,
        c.scheduled_date::timestamp,
        c.scheduled_date::timestamp
      from selected_rule r
      join claimed c on true
      join updated_account a on a.id = r.account_id
      left join categories cat on cat.id = r.category_id and cat.user_id = r.user_id
      returning id, recurring_occurrence_id
    ),
    finalized as (
      update recurring_occurrences o
      set
        status = case when tx.id is not null then 'posted' else 'failed' end,
        transaction_id = tx.id,
        error_code = case when tx.id is null then 'insufficient_balance' else null end,
        error_message = case when tx.id is null then 'insufficient available balance' else null end,
        posted_at = case when tx.id is not null then now() else null end,
        last_attempt_at = now()
      from claimed c
      left join inserted_tx tx on tx.recurring_occurrence_id = c.id
      where o.id = c.id
      returning o.id as occurrence_id, o.status
    )
    select * from finalized
    `,
    [ctx.userId, id]
  )) as RetryRow[];
  if (!rows[0]) {
    throw new DomainError(
      DomainErrorCodes.transactionNotFound,
      "failed recurring occurrence not found"
    );
  }
  const result = await listRecurringOccurrences(ctx, { ruleId: undefined, limit: 500 });
  const occurrence = result.occurrences.find((item) => item.id === id);
  if (!occurrence) {
    throw new DomainError(DomainErrorCodes.transactionNotFound, "occurrence not found");
  }
  return occurrence;
}
