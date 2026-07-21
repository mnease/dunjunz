import type { VercelRequest, VercelResponse } from '@vercel/node';

/** Env key names we accept for Postgres (no secret values). */
const DB_URL_KEYS = [
  'DATABASE_URL',
  'POSTGRES_URL',
  'POSTGRES_PRISMA_URL',
  'dunjunz_DATABASE_URL',
  'dunjunz_POSTGRES_URL',
  'dunjunz_POSTGRES_PRISMA_URL',
  'dunjunz_POSTGRES_URL_NON_POOLING',
  'dunjunz_DATABASE_URL_UNPOOLED',
];

function findDbSource(): string | null {
  for (const k of DB_URL_KEYS) {
    if (process.env[k]?.trim()) return k;
  }
  for (const [k, v] of Object.entries(process.env)) {
    if (v?.trim() && /POSTGRES_URL|DATABASE_URL/i.test(k)) return k;
  }
  return null;
}

/** Minimal probe — no Neon import (avoids cold-start crashes). */
export default function handler(_req: VercelRequest, res: VercelResponse): void {
  const dbSource = findDbSource();
  res.status(200).json({
    ok: true,
    node: process.version,
    hasDatabaseUrl: !!dbSource,
    databaseUrlSource: dbSource,
    hasResendKey: !!process.env.RESEND_API_KEY?.trim(),
    hasAuthBase: !!process.env.AUTH_BASE_URL?.trim(),
  });
}
