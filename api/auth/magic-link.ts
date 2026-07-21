import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureThreeEmptySlots } from '../_lib/auth';
import { hashToken, isValidEmail, randomToken } from '../_lib/crypto';
import { dbConfigured, getSql } from '../_lib/db';
import { clientIp, methodGuard, readJson } from '../_lib/http';
import { sendMagicLinkEmail } from '../_lib/mail';
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

  const body = readJson<{ email?: string }>(req);
  const email = String(body.email ?? '').trim();

  // Anti-enumeration: always ok shape for valid emails
  if (!isValidEmail(email)) {
    res.status(400).json({ ok: false, error: 'Valid email required.' });
    return;
  }

  try {
    const ip = clientIp(req);
    const norm = email.toLowerCase();
    if (!(await rateLimit(`magic:ip:${ip}`, 10, 60 * 60 * 1000))) {
      res.status(429).json({ ok: false, error: 'rate_limited' });
      return;
    }
    if (!(await rateLimit(`magic:email:${norm}`, 3, 60 * 60 * 1000))) {
      // Still success-shaped for anti-enumeration
      res.status(200).json({ ok: true });
      return;
    }

    const sql = getSql();
    let userId: string;
    const existing = await sql`
      SELECT id FROM users WHERE email_normalized = ${norm} LIMIT 1
    `;
    if (existing.length) {
      userId = (existing[0] as { id: string }).id;
    } else {
      const created = await sql`
        INSERT INTO users (email) VALUES (${email}) RETURNING id
      `;
      userId = (created[0] as { id: string }).id;
    }
    await ensureThreeEmptySlots(userId);

    const raw = randomToken(32);
    const th = hashToken(raw);
    await sql`
      INSERT INTO magic_links (user_id, token_hash, expires_at, request_ip)
      VALUES (
        ${userId},
        ${th},
        now() + interval '15 minutes',
        ${ip}
      )
    `;

    const base =
      process.env.AUTH_BASE_URL?.replace(/\/$/, '') ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000');
    const link = `${base}/api/auth/callback?token=${encodeURIComponent(raw)}`;

    try {
      await sendMagicLinkEmail(email, link);
    } catch (mailErr) {
      console.error('[auth/magic-link] mail', mailErr);
      // Still return ok to avoid enumeration; log for ops
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[auth/magic-link]', msg);
    // Common: relation "users" does not exist → migration not run
    const hint = /relation .* does not exist/i.test(msg)
      ? 'Run sql/001_auth_slots.sql in your Neon SQL editor.'
      : /DATABASE_URL/i.test(msg)
        ? 'Set DATABASE_URL on Vercel and redeploy.'
        : undefined;
    res.status(500).json({
      ok: false,
      error: 'Server error.',
      detail: msg.slice(0, 240),
      hint,
    });
  }
}
