import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

let sql: NeonQueryFunction<false, false> | null = null;

export function getSql(): NeonQueryFunction<false, false> {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error('DATABASE_URL is not configured');
  }
  if (!sql) {
    // HTTP fetch driver (no WebSocket) — works on Vercel Node 20
    sql = neon(url, { fullResults: false });
  }
  return sql;
}

export function dbConfigured(): boolean {
  return !!process.env.DATABASE_URL?.trim();
}

/** Run a health query; throws with a readable message if schema/URL bad. */
export async function pingDb(): Promise<void> {
  const s = getSql();
  await s`SELECT 1 AS ok`;
}
