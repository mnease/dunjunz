import type { VercelRequest, VercelResponse } from '@vercel/node';

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

    const { dbConfigured, getSql } = await import('../_lib/db');
    if (!dbConfigured()) {
      res.status(503).json({
        ok: false,
        error: 'no_db',
        message:
          'Cloud accounts need a Neon URL (POSTGRES_URL from Vercel Storage, or DATABASE_URL). Run sql/001_auth_slots.sql, redeploy.',
      });
      return;
    }

    const { ensureThreeEmptySlots } = await import('../_lib/auth');
    const { hashToken, isValidEmail, randomToken } = await import('../_lib/crypto');
    const { clientIp, readJson } = await import('../_lib/http');
    const { sendMagicLinkEmail } = await import('../_lib/mail');
    const { rateLimit } = await import('../_lib/rate-limit');

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
        : 'https://dunjunz.vercel.app');
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
      ? 'Run sql/001_auth_slots.sql in Neon SQL editor.'
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
