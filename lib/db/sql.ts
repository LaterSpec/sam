import { neon } from "@neondatabase/serverless";

type NeonSql = ReturnType<typeof neon>;

let _sql: NeonSql | null = null;

export function getSql() {
  if (!_sql) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL is not set");
    }
    _sql = neon(url);
  }
  return _sql;
}
