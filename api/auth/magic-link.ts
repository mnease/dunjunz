import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureThreeEmptySlots } from '../lib/auth';
import { hashToken, isValidEmail, randomToken } from '../lib/crypto';
import { dbConfigured, getSql } from '../lib/db';
import { clientIp, readJson } from '../lib/http';
import { sendMagicLinkEmail } from '../lib/mail';
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
        message:
          'Cloud accounts need Neon (dunjunz_POSTGRES_URL). Link Storage + redeploy.',
      });
      return;
    }

    const body = readJson<{ email?: string }>(req);
    const email = String(body.email ?? '').trim();
    if (!isValidEmail(email)) {
      res.status(400).json({ ok: false, error: 'Valid email required.' });
      return;
    }

    const ip = clientIp(req);
    const norm = email.toLowerCase();
    if (!(await rateLimit(`magic:ip:${ip}`, 10, 60 * 60 * 1000))) {
      res.status(429).json({ ok: false, error: 'rate_limited' });
      return;
    }
    if (!(await rateLimit(`magic:email:${norm}`, 3, 60 * 60 * 1000))) {
      res.status(200).json({ ok: true });
      return;
    }

    const sql = await getSql();
    let userId: string;
    const existing = await sql`
      SELECT id FROM users WHERE email_normalized = ${norm} LIMIT 1
    `;
    if (existing.length) {
      userId = existing[0]!.id as string;
    } else {
      const created = await sql`
        INSERT INTO users (email) VALUES (${email}) RETURNING id
      `;
      userId = created[0]!.id as string;
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
        : 'https://www.dunjunz.com');
    const link = `${base}/api/auth/callback?token=${encodeURIComponent(raw)}`;

    try {
      await sendMagicLinkEmail(email, link);
    } catch (mailErr) {
      console.error('[auth/magic-link] mail', mailErr);
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[auth/magic-link]', msg);
    const hint = /relation .* does not exist/i.test(msg)
      ? 'POST /api/migrate with bootstrap secret to create tables.'
      : undefined;
    res.status(500).json({
      ok: false,
      error: 'Server error.',
      detail: msg.slice(0, 240),
      hint,
    });
  }
}
