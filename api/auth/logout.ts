import type { VercelRequest, VercelResponse } from '@vercel/node';
import { hashToken } from '../lib/crypto';
import { dbConfigured, getSql } from '../lib/db';
import {
  clearSessionCookie,
  methodGuard,
  parseCookies,
} from '../lib/http';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (!methodGuard(req, res, ['POST'])) return;

  try {
    if (dbConfigured()) {
      const cookies = parseCookies(req);
      const raw = cookies.dunjunz_session;
      if (raw) {
        const sql = getSql();
        await sql`
          UPDATE sessions SET revoked_at = now()
          WHERE token_hash = ${hashToken(raw)} AND revoked_at IS NULL
        `;
      }
    }
    res.setHeader('Set-Cookie', clearSessionCookie());
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[auth/logout]', err);
    res.setHeader('Set-Cookie', clearSessionCookie());
    res.status(200).json({ ok: true });
  }
}
