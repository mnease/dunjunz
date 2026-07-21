import postgres, { type Sql } from 'postgres';

let sql: Sql | null = null;

/**
 * Vercel Neon Storage prefixes vars with the store name, e.g. dunjunz_POSTGRES_URL.
 */
const DB_URL_KEYS = [
  'DATABASE_URL',
  'POSTGRES_URL',
  'POSTGRES_PRISMA_URL',
  'DATABASE_URL_UNPOOLED',
  'POSTGRES_URL_NON_POOLING',
  'POSTGRES_URL_NO_SSL',
  'NEON_DATABASE_URL',
  'dunjunz_DATABASE_URL',
  'dunjunz_POSTGRES_URL',
  'dunjunz_POSTGRES_PRISMA_URL',
  'dunjunz_DATABASE_URL_UNPOOLED',
  'dunjunz_POSTGRES_URL_NON_POOLING',
  'dunjunz_POSTGRES_URL_NO_SSL',
] as const;

export function resolveDatabaseUrl(): string | null {
  for (const k of DB_URL_KEYS) {
    const v = process.env[k]?.trim();
    if (v) return v;
  }
  for (const [k, v] of Object.entries(process.env)) {
    if (
      v?.trim() &&
      (/_POSTGRES_URL$/i.test(k) ||
        /_DATABASE_URL$/i.test(k) ||
        k === 'POSTGRES_URL' ||
        k === 'DATABASE_URL')
    ) {
      return v.trim();
    }
  }
  return null;
}

export function resolveDatabaseUrlSource(): string | null {
  for (const k of DB_URL_KEYS) {
    if (process.env[k]?.trim()) return k;
  }
  for (const [k, v] of Object.entries(process.env)) {
    if (v?.trim() && (/POSTGRES_URL/i.test(k) || /DATABASE_URL/i.test(k))) {
      return k;
    }
  }
  return null;
}

export function getSql(): Sql {
  const url = resolveDatabaseUrl();
  if (!url) {
    throw new Error(
      'No database URL (expect dunjunz_POSTGRES_URL / dunjunz_DATABASE_URL from Vercel Neon)',
    );
  }
  if (!sql) {
    sql = postgres(url, {
      ssl: 'require',
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false, // better with poolers
    });
  }
  return sql;
}

export function dbConfigured(): boolean {
  return !!resolveDatabaseUrl();
}

export async function pingDb(): Promise<void> {
  const s = getSql();
  await s`SELECT 1 AS ok`;
}
