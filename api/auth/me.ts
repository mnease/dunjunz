import type { VercelRequest, VercelResponse } from '@vercel/node';
import { listSlotSummaries, resolveAuth } from '../_lib/auth';
import { dbConfigured, pingDb } from '../_lib/db';
import { methodGuard } from '../_lib/http';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  try {
    if (!methodGuard(req, res, ['GET'])) return;
    if (!dbConfigured()) {
      res.status(200).json({ ok: true, authenticated: false, reason: 'no_db' });
      return;
    }

    // Fail soft if schema not migrated yet
    try {
      await pingDb();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[auth/me] db ping', msg);
      res.status(503).json({
        ok: false,
        error: 'db_unreachable',
        message:
          'Database URL set but unreachable or schema missing. Run sql/001_auth_slots.sql on Neon.',
        detail: msg.slice(0, 200),
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
