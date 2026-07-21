import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  ensureThreeEmptySlots,
  listSlotSummaries,
} from '../lib/auth';
import { hashToken, isValidEmail, randomToken } from '../lib/crypto';
import { dbConfigured, getSql } from '../lib/db';
import { clientIp, readJson } from '../lib/http';
import { rateLimit } from '../lib/rate-limit';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  try {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    if (req.method !== 'POST') {
      res.status(405).json({ ok: false, error: 'Method not allowed.' });
      return;
    }

    if (!dbConfigured()) {
      res.status(503).json({
        ok: false,
        error: 'no_db',
        message: 'Cloud guest needs Neon (dunjunz_POSTGRES_URL).',
      });
      return;
    }

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

    const sql = await getSql();
    const norm = email.toLowerCase();

    const existing = await sql`
      SELECT id, email_verified_at FROM users
      WHERE email_normalized = ${norm}
      LIMIT 1
    `;
    if (existing.length && existing[0]!.email_verified_at) {
      res.status(409).json({
        ok: false,
        error: 'email_has_account',
        message: 'This email already has an account. Use magic link to sign in.',
      });
      return;
    }

    let userId: string;
    if (existing.length) {
      userId = existing[0]!.id as string;
    } else {
      const created = await sql`
        INSERT INTO users (email) VALUES (${email})
        RETURNING id
      `;
      userId = created[0]!.id as string;
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
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[auth/guest]', msg);
    res.status(500).json({
      ok: false,
      error: 'Server error creating guest.',
      detail: msg.slice(0, 240),
      hint: /relation .* does not exist/i.test(msg)
        ? 'POST /api/migrate with bootstrap secret.'
        : undefined,
    });
  }
}
