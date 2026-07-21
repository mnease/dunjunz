import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHash, randomBytes } from 'node:crypto';
import { Resend } from 'resend';

function hashToken(raw: string): string {
  return createHash('sha256').update(raw, 'utf8').digest('hex');
}
function randomToken(n = 32): string {
  return randomBytes(n).toString('base64url');
}
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && email.length <= 200;
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

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  try {
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    if (req.method !== 'POST') {
      res.status(405).json({ ok: false, error: 'Method not allowed.' });
      return;
    }

    const url = dbUrl();
    if (!url) {
      res.status(503).json({
        ok: false,
        error: 'no_db',
        message: 'Database not linked (dunjunz_DATABASE_URL missing).',
      });
      return;
    }

    const body =
      typeof req.body === 'string'
        ? (JSON.parse(req.body || '{}') as { email?: string })
        : ((req.body || {}) as { email?: string });
    const email = String(body.email ?? '').trim();
    if (!isValidEmail(email)) {
      res.status(400).json({ ok: false, error: 'Valid email required.' });
      return;
    }

    const mod = await import('postgres');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const postgres = (mod as any).default ?? mod;
    const sql = postgres(url, {
      ssl: 'require',
      max: 1,
      prepare: false,
      connect_timeout: 10,
    });

    try {
      const norm = email.toLowerCase();
      let userId: string;
      const existing = await sql`
        SELECT id FROM users WHERE email_normalized = ${norm} LIMIT 1
      `;
      if (existing.length) {
        userId = existing[0].id as string;
      } else {
        const created = await sql`
          INSERT INTO users (email) VALUES (${email}) RETURNING id
        `;
        userId = created[0].id as string;
      }

      // Ensure 3 empty slots
      for (let i = 0; i < 3; i++) {
        await sql`
          INSERT INTO save_slots (user_id, slot_index, name, is_empty)
          VALUES (${userId}, ${i}, ${`Slot ${i + 1}`}, true)
          ON CONFLICT (user_id, slot_index) DO NOTHING
        `;
      }

      const raw = randomToken(32);
      const th = hashToken(raw);
      const xf = req.headers['x-forwarded-for'];
      const ip =
        typeof xf === 'string' ? xf.split(',')[0]!.trim() : 'unknown';

      await sql`
        INSERT INTO magic_links (user_id, token_hash, expires_at, request_ip)
        VALUES (${userId}, ${th}, now() + interval '15 minutes', ${ip})
      `;

      const base =
        process.env.AUTH_BASE_URL?.replace(/\/$/, '') ||
        'https://www.dunjunz.com';
      const link = `${base}/api/auth/callback?token=${encodeURIComponent(raw)}`;

      const key = process.env.RESEND_API_KEY?.trim();
      if (key) {
        const resend = new Resend(key);
        const from =
          process.env.AUTH_FROM?.trim() ||
          process.env.RESEND_FROM?.trim() ||
          'DUNJUNZ <support@neasemedia.com>';
        await resend.emails.send({
          from,
          to: [email],
          subject: 'Your DUNJUNZ sign-in link',
          text: `Sign in to DUNJUNZ (expires in 15 minutes):\n\n${link}\n\nIf you did not request this, ignore this email.`,
          html: `<p>Sign in to DUNJUNZ (15 min):</p><p><a href="${link}">${link}</a></p>`,
        });
      }

      await sql.end({ timeout: 2 });
      res.status(200).json({ ok: true });
    } catch (e) {
      try {
        await sql.end({ timeout: 1 });
      } catch {
        /* ignore */
      }
      throw e;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[auth/magic-link]', msg);
    res.status(500).json({
      ok: false,
      error: 'Server error.',
      detail: msg.slice(0, 240),
    });
  }
}
