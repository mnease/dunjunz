import type { VercelRequest, VercelResponse } from '@vercel/node';
import { resolveDatabaseUrlSource } from './_lib/db';

/** Minimal probe — if this 500s, Node runtime itself is broken. */
export default function handler(_req: VercelRequest, res: VercelResponse): void {
  const dbSource = resolveDatabaseUrlSource();
  res.status(200).json({
    ok: true,
    node: process.version,
    hasDatabaseUrl: !!dbSource,
    databaseUrlSource: dbSource, // e.g. POSTGRES_URL — not the secret value
    hasResendKey: !!process.env.RESEND_API_KEY?.trim(),
    hasAuthBase: !!process.env.AUTH_BASE_URL?.trim(),
  });
}
