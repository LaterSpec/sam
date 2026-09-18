import { config } from "dotenv";
import { Pool } from "@neondatabase/serverless";
import { z } from "zod";

config({ path: ".env.local" });

const args = process.argv.slice(2);
function value(name: string) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

const inputSchema = z
  .object({
    email: z.string().email(),
    plan: z.enum(["free", "pro", "agent"]),
    expiresAt: z.string().datetime({ offset: true }).optional(),
    operator: z.string().trim().min(1).max(120),
    reason: z.string().trim().min(3).max(500),
    dryRun: z.boolean(),
  })
  .superRefine((input, ctx) => {
    if (input.plan !== "free" && !input.expiresAt) {
      ctx.addIssue({ code: "custom", path: ["expiresAt"], message: "paid plans require --expires-at" });
    }
    if (input.expiresAt && new Date(input.expiresAt).getTime() <= Date.now()) {
      ctx.addIssue({ code: "custom", path: ["expiresAt"], message: "expiry must be in the future" });
    }
  });

async function main() {
  const input = inputSchema.parse({
    email: value("--email"),
    plan: value("--plan"),
    expiresAt: value("--expires-at"),
    operator: value("--operator"),
    reason: value("--reason"),
    dryRun: args.includes("--dry-run"),
  });
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set");
  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();
  try {
    await client.query("begin");
    const result = await client.query<{
      id: string;
      email: string;
      plan: string;
      plan_expires_at: Date | null;
      entitlement_version: number;
    }>(
      `select u.id, u.email, p.plan, p.plan_expires_at, p.entitlement_version
       from "user" u join profiles p on p.id = u.id
       where lower(u.email) = lower($1)
       for update`,
      [input.email]
    );
    if (result.rows.length !== 1) throw new Error("exactly one user must match --email");
    const current = result.rows[0];
    const now = new Date();
    const expiresAt = input.plan === "free" ? null : new Date(input.expiresAt!);
    await client.query(
      `update profiles
       set plan = $2,
           plan_started_at = case when $2 = 'free' then null else $3 end,
           plan_expires_at = $4,
           trial_ends_at = case
             when $2 = 'free' and trial_ends_at > $3 then $3
             else trial_ends_at
           end,
           plan_updated_at = $3,
           entitlement_version = entitlement_version + 1
       where id = $1`,
      [current.id, input.plan, now, expiresAt]
    );
    await client.query(
      `insert into plan_change_events
       (user_id, from_plan, to_plan, effective_at, expires_at, operator, reason, source)
       values ($1, $2, $3, $4, $5, $6, $7, 'manual_db')`,
      [current.id, current.plan, input.plan, now, expiresAt, input.operator, input.reason]
    );
    if (input.dryRun) await client.query("rollback");
    else await client.query("commit");
    console.log(
      JSON.stringify(
        {
          status: input.dryRun ? "validated_rollback" : "updated",
          userId: current.id,
          email: current.email,
          before: { plan: current.plan, expiresAt: current.plan_expires_at },
          after: { plan: input.plan, expiresAt },
        },
        null,
        2
      )
    );
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

void main();
