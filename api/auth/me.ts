import type { VercelRequest, VercelResponse } from '@vercel/node';
import { listSlotSummaries, resolveAuth } from '../lib/auth';
import { dbConfigured } from '../lib/db';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  try {
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    if (req.method !== 'GET') {
      res.status(405).json({ ok: false, error: 'Method not allowed.' });
      return;
    }

    if (!dbConfigured()) {
      res.status(200).json({
        ok: true,
        authenticated: false,
        reason: 'no_db',
        hint:
          'Neon URL not found (expect dunjunz_POSTGRES_URL). Redeploy after linking Storage.',
      });
      return;
    }

    const auth = await resolveAuth(req);
    if (!auth) {
      res.status(200).json({ ok: true, authenticated: false });
      return;
    }
    const slots = await listSlotSummaries(auth.userId);
    res.status(200).json({
      ok: true,
      authenticated: true,
      mode: auth.mode,
      email: auth.email,
      verified: auth.verified,
      userId: auth.userId,
      slots,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[auth/me]', msg);
    res.status(500).json({
      ok: false,
      error: 'Server error.',
      detail: msg.slice(0, 240),
    });
  }
}
