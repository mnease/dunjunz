import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  ensureThreeEmptySlots,
  listSlotSummaries,
} from '../_lib/auth';
import { hashToken, isValidEmail, randomToken } from '../_lib/crypto';
import { dbConfigured, getSql } from '../_lib/db';
import { clientIp, methodGuard, readJson } from '../_lib/http';
import { rateLimit } from '../_lib/rate-limit';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (!methodGuard(req, res, ['POST'])) return;
  if (!dbConfigured()) {
    res.status(503).json({ ok: false, error: 'Database not configured (DATABASE_URL).' });
    return;
  }

  try {
    const ip = clientIp(req);
    if (!(await rateLimit(`guest:ip:${ip}`, 5, 60 * 60 * 1000))) {
      res.status(429).json({ ok: false, error: 'rate_limited' });
      return;
    }

    const body = readJson<{ email?: string }>(req);
    const email = String(body.email ?? '').trim();
    if (!isValidEmail(email)) {
      res.status(400).json({ ok: false, error: 'Valid email required.' });
      return;
    }

    const sql = getSql();
    const norm = email.toLowerCase();

    // If verified account exists for this email, force magic link
    const existing = await sql`
      SELECT id, email_verified_at FROM users
      WHERE email_normalized = ${norm}
      LIMIT 1
    `;
    if (existing.length && (existing[0] as { email_verified_at: string | null }).email_verified_at) {
      res.status(409).json({
        ok: false,
        error: 'email_has_account',
        message: 'This email already has an account. Use magic link to sign in.',
      });
      return;
    }

    let userId: string;
    if (existing.length) {
      userId = (existing[0] as { id: string }).id;
    } else {
      const created = await sql`
        INSERT INTO users (email) VALUES (${email})
        RETURNING id
      `;
      userId = (created[0] as { id: string }).id;
    }

    await ensureThreeEmptySlots(userId);

    const raw = randomToken(32);
    const th = hashToken(raw);
    const ua = String(req.headers['user-agent'] || '').slice(0, 200);
    await sql`
      INSERT INTO guest_tokens (user_id, token_hash, label)
      VALUES (${userId}, ${th}, ${ua || null})
    `;

    const slots = await listSlotSummaries(userId);
    res.status(200).json({
      ok: true,
      mode: 'guest',
      userId,
      email,
      guestToken: raw,
      slots,
    });
  } catch (err) {
    console.error('[auth/guest]', err);
    res.status(500).json({ ok: false, error: 'Server error creating guest.' });
  }
}
