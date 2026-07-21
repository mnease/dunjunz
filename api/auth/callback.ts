import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHash, randomBytes } from 'node:crypto';

function hashToken(raw: string): string {
  return createHash('sha256').update(raw, 'utf8').digest('hex');
}
function randomToken(n = 32): string {
  return randomBytes(n).toString('base64url');
}
function dbUrl(): string {
  return (
    process.env.dunjunz_DATABASE_URL?.trim() ||
    process.env.dunjunz_POSTGRES_URL?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    ''
  );
}
function sessionCookie(raw: string, maxAgeSec: number): string {
  const secure = process.env.VERCEL === '1';
  const parts = [
    `dunjunz_session=${encodeURIComponent(raw)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSec}`,
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  const base =
    process.env.AUTH_BASE_URL?.replace(/\/$/, '') || 'https://www.dunjunz.com';

  if (req.method !== 'GET') {
    res.status(405).send('Method not allowed');
    return;
  }

  const token = String(req.query.token || '');
  if (!token) {
    res.redirect(302, `${base}/?auth=error&reason=missing_token`);
    return;
  }

  const url = dbUrl();
  if (!url) {
    res.redirect(302, `${base}/?auth=error&reason=no_db`);
    return;
  }

  try {
    const mod = await import('postgres');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const postgres = (mod as any).default ?? mod;
    const sql = postgres(url, {
      ssl: 'require',
      max: 1,
      prepare: false,
      connect_timeout: 10,
    });

    const th = hashToken(token);
    const rows = await sql`
      SELECT id, user_id, expires_at, used_at
      FROM magic_links WHERE token_hash = ${th} LIMIT 1
    `;
    if (!rows.length) {
      await sql.end({ timeout: 1 });
      res.redirect(302, `${base}/?auth=error&reason=invalid`);
      return;
    }
    const link = rows[0];
    if (link.used_at) {
      await sql.end({ timeout: 1 });
      res.redirect(302, `${base}/?auth=error&reason=used`);
      return;
    }
    if (new Date(link.expires_at as string).getTime() < Date.now()) {
      await sql.end({ timeout: 1 });
      res.redirect(302, `${base}/?auth=error&reason=expired`);
      return;
    }

    await sql`UPDATE magic_links SET used_at = now() WHERE id = ${link.id as string}`;
    await sql`
      UPDATE users
      SET email_verified_at = COALESCE(email_verified_at, now()),
          last_login_at = now(),
          updated_at = now()
      WHERE id = ${link.user_id as string}
    `;

    const sessionRaw = `sess_${randomToken(32)}`;
    const sh = hashToken(sessionRaw);
    const ua = String(req.headers['user-agent'] || '').slice(0, 200);
    await sql`
      INSERT INTO sessions (user_id, token_hash, expires_at, user_agent)
      VALUES (
        ${link.user_id as string},
        ${sh},
        now() + interval '30 days',
        ${ua || null}
      )
    `;
    await sql.end({ timeout: 2 });

    res.setHeader('Set-Cookie', sessionCookie(sessionRaw, 30 * 24 * 60 * 60));
    res.redirect(302, `${base}/?auth=ok`);
  } catch (err) {
    console.error('[auth/callback]', err);
    res.redirect(302, `${base}/?auth=error&reason=server`);
  }
}
