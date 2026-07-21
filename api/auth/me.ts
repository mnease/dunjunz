import type { VercelRequest, VercelResponse } from '@vercel/node';
import { listSlotSummaries, resolveAuth } from '../_lib/auth';
import { dbConfigured } from '../_lib/db';
import { methodGuard } from '../_lib/http';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (!methodGuard(req, res, ['GET'])) return;
  if (!dbConfigured()) {
    res.status(200).json({ ok: true, authenticated: false, reason: 'no_db' });
    return;
  }
  try {
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
    console.error('[auth/me]', err);
    res.status(500).json({ ok: false, error: 'Server error.' });
  }
}
