import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHash } from 'node:crypto';

function hashToken(raw: string): string {
  return createHash('sha256').update(raw, 'utf8').digest('hex');
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
function parseCookies(req: VercelRequest): Record<string, string> {
  const header = req.headers.cookie;
  if (!header) return {};
  const out: Record<string, string> = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  try {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    if (req.method !== 'GET') {
      res.status(405).json({ ok: false, error: 'Method not allowed.' });
      return;
    }

    const url = dbUrl();
    if (!url) {
      res.status(200).json({
        ok: true,
        authenticated: false,
        reason: 'no_db',
      });
      return;
    }

    const cookies = parseCookies(req);
    const authz = req.headers.authorization;
    const bearer =
      typeof authz === 'string' && authz.startsWith('Bearer ')
        ? authz.slice(7).trim()
        : '';
    const sessionRaw = cookies.dunjunz_session || (bearer.startsWith('sess_') ? bearer : '');
    const guestRaw = bearer && !bearer.startsWith('sess_') ? bearer : '';

    if (!sessionRaw && !guestRaw) {
      res.status(200).json({ ok: true, authenticated: false });
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
      let userId = '';
      let email = '';
      let verified = false;
      let mode: 'guest' | 'account' = 'guest';

      if (sessionRaw) {
        const h = hashToken(sessionRaw);
        const rows = await sql`
          SELECT s.user_id, u.email, u.email_verified_at
          FROM sessions s JOIN users u ON u.id = s.user_id
          WHERE s.token_hash = ${h}
            AND s.revoked_at IS NULL
            AND s.expires_at > now()
          LIMIT 1
        `;
        if (rows.length) {
          userId = rows[0].user_id as string;
          email = rows[0].email as string;
          verified = !!rows[0].email_verified_at;
          mode = 'account';
        }
      }

      if (!userId && guestRaw) {
        const h = hashToken(guestRaw);
        const rows = await sql`
          SELECT g.user_id, u.email, u.email_verified_at
          FROM guest_tokens g JOIN users u ON u.id = g.user_id
          WHERE g.token_hash = ${h} AND g.revoked_at IS NULL
          LIMIT 1
        `;
        if (rows.length && !rows[0].email_verified_at) {
          userId = rows[0].user_id as string;
          email = rows[0].email as string;
          verified = false;
          mode = 'guest';
        }
      }

      if (!userId) {
        await sql.end({ timeout: 1 });
        res.status(200).json({ ok: true, authenticated: false });
        return;
      }

      const slots = await sql`
        SELECT id, slot_index, name, summary_level, summary_room, summary_land,
               is_empty, save_version, updated_at
        FROM save_slots WHERE user_id = ${userId}
        ORDER BY slot_index ASC
      `;
      await sql.end({ timeout: 2 });

      res.status(200).json({
        ok: true,
        authenticated: true,
        mode,
        email,
        verified,
        userId,
        slots: slots.map(
          (r: {
            id: string;
            slot_index: number;
            name: string;
            summary_level: number;
            summary_room: string;
            summary_land: string | null;
            is_empty: boolean;
            save_version: number;
            updated_at: string;
          }) => ({
            id: r.id,
            slotIndex: r.slot_index,
            name: r.name,
            level: r.summary_level,
            roomId: r.summary_room,
            land: r.summary_land,
            isEmpty: r.is_empty,
            saveVersion: r.save_version,
            updatedAt: r.updated_at,
          }),
        ),
      });
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
    console.error('[auth/me]', msg);
    res.status(500).json({ ok: false, error: 'Server error.', detail: msg.slice(0, 240) });
  }
}
