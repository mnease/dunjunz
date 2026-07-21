import type { VercelRequest, VercelResponse } from '@vercel/node';
import { hashToken, randomToken } from '../lib/crypto';
import { dbConfigured, getSql } from '../lib/db';
import { sessionCookie } from '../lib/http';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).send('Method not allowed');
    return;
  }
  if (!dbConfigured()) {
    res.status(503).send('Database not configured');
    return;
  }

  const token = String(req.query.token || '');
  const base =
    process.env.AUTH_BASE_URL?.replace(/\/$/, '') ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000');

  if (!token) {
    res.redirect(302, `${base}/?auth=error&reason=missing_token`);
    return;
  }

  try {
    const sql = getSql();
    const th = hashToken(token);
    const rows = await sql`
      SELECT id, user_id, expires_at, used_at
      FROM magic_links
      WHERE token_hash = ${th}
      LIMIT 1
    `;
    if (!rows.length) {
      res.redirect(302, `${base}/?auth=error&reason=invalid`);
      return;
    }
    const link = rows[0] as {
      id: string;
      user_id: string;
      expires_at: string;
      used_at: string | null;
    };
    if (link.used_at) {
      res.redirect(302, `${base}/?auth=error&reason=used`);
      return;
    }
    if (new Date(link.expires_at).getTime() < Date.now()) {
      res.redirect(302, `${base}/?auth=error&reason=expired`);
      return;
    }

    await sql`
      UPDATE magic_links SET used_at = now() WHERE id = ${link.id}
    `;
    await sql`
      UPDATE users
      SET email_verified_at = COALESCE(email_verified_at, now()),
          last_login_at = now(),
          updated_at = now()
      WHERE id = ${link.user_id}
    `;

    const sessionRaw = `sess_${randomToken(32)}`;
    const sh = hashToken(sessionRaw);
    const ua = String(req.headers['user-agent'] || '').slice(0, 200);
    await sql`
      INSERT INTO sessions (user_id, token_hash, expires_at, user_agent)
      VALUES (
        ${link.user_id},
        ${sh},
        now() + interval '30 days',
        ${ua || null}
      )
    `;

    const maxAge = 30 * 24 * 60 * 60;
    res.setHeader('Set-Cookie', sessionCookie(sessionRaw, maxAge));
    res.redirect(302, `${base}/?auth=ok`);
  } catch (err) {
    console.error('[auth/callback]', err);
    res.redirect(302, `${base}/?auth=error&reason=server`);
  }
}
