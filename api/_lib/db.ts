import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

let sql: NeonQueryFunction<false, false> | null = null;

/**
 * Vercel Neon integration often injects POSTGRES_URL / POSTGRES_PRISMA_URL
 * rather than DATABASE_URL. Prefer pooled URLs for serverless.
 */
export function resolveDatabaseUrl(): string | null {
  const candidates = [
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL,
    process.env.POSTGRES_PRISMA_URL,
    process.env.DATABASE_URL_UNPOOLED,
    process.env.POSTGRES_URL_NON_POOLING,
    process.env.POSTGRES_URL_NO_SSL,
    process.env.NEON_DATABASE_URL,
  ];
  for (const c of candidates) {
    const v = c?.trim();
    if (v) return v;
  }
  return null;
}

/** Which env key provided the URL (for /api/health — no secrets). */
export function resolveDatabaseUrlSource(): string | null {
  const keys = [
    'DATABASE_URL',
    'POSTGRES_URL',
    'POSTGRES_PRISMA_URL',
    'DATABASE_URL_UNPOOLED',
    'POSTGRES_URL_NON_POOLING',
    'POSTGRES_URL_NO_SSL',
    'NEON_DATABASE_URL',
  ] as const;
  for (const k of keys) {
    if (process.env[k]?.trim()) return k;
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
