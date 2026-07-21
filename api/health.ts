import type { VercelRequest, VercelResponse } from '@vercel/node';

/** Minimal probe — if this 500s, Node runtime itself is broken. */
export default function handler(_req: VercelRequest, res: VercelResponse): void {
  res.status(200).json({
    ok: true,
    node: process.version,
    hasDatabaseUrl: !!process.env.DATABASE_URL?.trim(),
    hasResendKey: !!process.env.RESEND_API_KEY?.trim(),
    hasAuthBase: !!process.env.AUTH_BASE_URL?.trim(),
  });
}
