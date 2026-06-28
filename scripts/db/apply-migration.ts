import { readFile } from "node:fs/promises";
import { resolve, relative } from "node:path";
import { config } from "dotenv";
import { Pool } from "@neondatabase/serverless";

config({ path: ".env.local" });

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const migrationArg = process.argv.slice(2).find((value) => !value.startsWith("--"));
  if (!migrationArg) {
    throw new Error("usage: npm run db:apply -- drizzle/migrations/<migration>.sql");
  }

  const root = process.cwd();
  const migrationsRoot = resolve(root, "drizzle", "migrations");
  const migrationPath = resolve(root, migrationArg);
  const relativePath = relative(migrationsRoot, migrationPath);
  if (relativePath.startsWith("..") || relativePath.includes(":")) {
    throw new Error("migration must be inside drizzle/migrations");
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set");
  const sql = await readFile(migrationPath, "utf8");
  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();

  try {
    await client.query("begin");
    await client.query(sql);
    if (dryRun) await client.query("rollback");
    else await client.query("commit");
    console.log(
      JSON.stringify({
        migration: relativePath.replaceAll("\\", "/"),
        status: dryRun ? "validated_rollback" : "applied",
      })
    );
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

void main();
