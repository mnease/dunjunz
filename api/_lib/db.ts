import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

let sql: NeonQueryFunction<false, false> | null = null;

/**
 * Connection string from env.
 * Vercel Neon *Storage* integration prefixes vars with the store name, e.g.
 *   dunjunz_POSTGRES_URL, dunjunz_DATABASE_URL
 * Classic names also supported: DATABASE_URL, POSTGRES_URL, …
 */
const DB_URL_KEYS = [
  'DATABASE_URL',
  'POSTGRES_URL',
  'POSTGRES_PRISMA_URL',
  'DATABASE_URL_UNPOOLED',
  'POSTGRES_URL_NON_POOLING',
  'POSTGRES_URL_NO_SSL',
  'NEON_DATABASE_URL',
  // Vercel marketplace / Storage “dunjunz” Neon integration
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
  // Last resort: any env ending in POSTGRES_URL / DATABASE_URL with a value
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

/** Which env key provided the URL (for /api/health — not the secret). */
export function resolveDatabaseUrlSource(): string | null {
  for (const k of DB_URL_KEYS) {
    if (process.env[k]?.trim()) return k;
  }
  for (const [k, v] of Object.entries(process.env)) {
    if (
      v?.trim() &&
      (/POSTGRES_URL/i.test(k) || /DATABASE_URL/i.test(k))
    ) {
      return k;
    }
  }
  return null;
}

export function getSql(): NeonQueryFunction<false, false> {
  const url = resolveDatabaseUrl();
  if (!url) {
    throw new Error(
      'No database URL (set DATABASE_URL or POSTGRES_URL from Vercel Neon)',
    );
  }
  if (!sql) {
    sql = neon(url);
  }
  return sql;
}

export function dbConfigured(): boolean {
  return !!resolveDatabaseUrl();
}

/** Run a health query; throws with a readable message if schema/URL bad. */
export async function pingDb(): Promise<void> {
  const s = getSql();
  await s`SELECT 1 AS ok`;
}
