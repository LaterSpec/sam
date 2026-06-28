import { config } from "dotenv";
import { Pool } from "@neondatabase/serverless";

config({ path: ".env.local" });

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set");
  const pool = new Pool({ connectionString: databaseUrl });
  try {
  const tables = await pool.query<{
    recurring_rules: string | number;
    recurring_occurrences: string | number;
    account_transfers: string | number;
  }>(`
    select
      (select count(*) from recurring_rules) as recurring_rules,
      (select count(*) from recurring_occurrences) as recurring_occurrences,
      (select count(*) from account_transfers) as account_transfers
  `);
  const provenance = await pool.query<{
    missing_currency: string | number;
    invalid_recurring_links: string | number;
  }>(`
    select
      count(*) filter (where currency is null or currency = '') as missing_currency,
      count(*) filter (
        where source = 'recurring' and recurring_occurrence_id is null
      ) as invalid_recurring_links
    from transactions
  `);
  const duplicates = await pool.query<{ duplicates: string | number }>(`
    select count(*) as duplicates
    from (
      select rule_id, scheduled_date
      from recurring_occurrences
      group by rule_id, scheduled_date
      having count(*) > 1
    ) duplicate_rows
  `);
  console.log(
    JSON.stringify(
      {
        ...tables.rows[0],
        ...provenance.rows[0],
        ...duplicates.rows[0],
      },
      null,
      2
    )
  );
  } finally {
    await pool.end();
  }
}

void main();
