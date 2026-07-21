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

    if (!process.env.DATABASE_URL?.trim()) {
      res.status(503).json({
        ok: false,
        error: 'no_db',
        message:
          'Cloud guest needs DATABASE_URL. Add Neon connection string in Vercel, run sql/001_auth_slots.sql, redeploy.',
      });
      return;
    }

    const { ensureThreeEmptySlots, listSlotSummaries } = await import('../_lib/auth');
    const { hashToken, isValidEmail, randomToken } = await import('../_lib/crypto');
    const { getSql } = await import('../_lib/db');
    const { clientIp, readJson } = await import('../_lib/http');
    const { rateLimit } = await import('../_lib/rate-limit');

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

    const existing = await sql`
      SELECT id, email_verified_at FROM users
      WHERE email_normalized = ${norm}
      LIMIT 1
    `;
    if (
      existing.length &&
      (existing[0] as { email_verified_at: string | null }).email_verified_at
    ) {
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
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[auth/guest]', msg);
    res.status(500).json({
      ok: false,
      error: 'Server error creating guest.',
      detail: msg.slice(0, 240),
      hint: /relation .* does not exist/i.test(msg)
        ? 'Run sql/001_auth_slots.sql in Neon.'
        : undefined,
    });
  }
}
