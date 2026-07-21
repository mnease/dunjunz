type Sql = ReturnType<typeof import('postgres')> extends never
  ? never
  : import('postgres').Sql;

let sqlPromise: Promise<Sql> | null = null;

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
  'dunjunz_POSTGRES_URL_NO_SSL',
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

/** Lazy dynamic import — static import of postgres crashed some Vercel functions. */
export async function getSql(): Promise<Sql> {
  if (!sqlPromise) {
    sqlPromise = (async () => {
      const url = resolveDatabaseUrl();
      if (!url) {
        throw new Error(
          'No database URL (expect dunjunz_DATABASE_URL / dunjunz_POSTGRES_URL)',
        );
      }
      const mod = await import('postgres');
      const postgres = (mod as { default?: typeof mod }).default ?? mod;
      return (postgres as typeof import('postgres'))(url, {
        ssl: 'require',
        max: 1,
        prepare: false,
        connect_timeout: 10,
        idle_timeout: 20,
      }) as unknown as Sql;
    })();
  }
  return sqlPromise;
}

export async function pingDb(): Promise<void> {
  const s = await getSql();
  await s`SELECT 1 AS ok`;
}
