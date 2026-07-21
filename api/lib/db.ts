import { createPool, type VercelPool } from '@vercel/postgres';

let pool: VercelPool | null = null;

const DB_URL_KEYS = [
  'DATABASE_URL',
  'POSTGRES_URL',
  'POSTGRES_PRISMA_URL',
  'DATABASE_URL_UNPOOLED',
  'POSTGRES_URL_NON_POOLING',
  'dunjunz_DATABASE_URL',
  'dunjunz_POSTGRES_URL',
  'dunjunz_POSTGRES_PRISMA_URL',
  'dunjunz_DATABASE_URL_UNPOOLED',
  'dunjunz_POSTGRES_URL_NON_POOLING',
] as const;

export function resolveDatabaseUrl(): string | null {
  for (const k of DB_URL_KEYS) {
    const v = process.env[k]?.trim();
    if (v) return v;
  }
  for (const [k, v] of Object.entries(process.env)) {
    if (v?.trim() && /POSTGRES_URL|DATABASE_URL/i.test(k)) return v.trim();
  }
  return null;
}

export function resolveDatabaseUrlSource(): string | null {
  for (const k of DB_URL_KEYS) {
    if (process.env[k]?.trim()) return k;
  }
  for (const [k, v] of Object.entries(process.env)) {
    if (v?.trim() && /POSTGRES_URL|DATABASE_URL/i.test(k)) return k;
  }
  return null;
}

export function dbConfigured(): boolean {
  return !!resolveDatabaseUrl();
}

function getPool(): VercelPool {
  const url = resolveDatabaseUrl();
  if (!url) {
    throw new Error('No database URL (dunjunz_POSTGRES_URL / DATABASE_URL)');
  }
  // @vercel/postgres reads POSTGRES_URL by default — inject our resolved URL
  if (!process.env.POSTGRES_URL) {
    process.env.POSTGRES_URL = url;
  }
  if (!pool) {
    pool = createPool({ connectionString: url });
  }
  return pool;
}

/** sql tagged template compatible helper */
export function getSql() {
  const p = getPool();
  return p.sql.bind(p) as typeof p.sql;
}

export async function pingDb(): Promise<void> {
  const sql = getSql();
  await sql`SELECT 1 AS ok`;
}

/** Execute a query and return rows array */
export async function query<T extends Record<string, unknown> = Record<string, unknown>>(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<T[]> {
  const sql = getSql();
  const result = await sql(strings, ...values);
  // @vercel/postgres returns { rows, ... }
  if (result && Array.isArray((result as { rows?: unknown }).rows)) {
    return (result as { rows: T[] }).rows;
  }
  if (Array.isArray(result)) return result as T[];
  return [];
}
