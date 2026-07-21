import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHash, randomBytes } from 'node:crypto';

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
        message: 'Database not linked.',
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
      const existing = await sql`
        SELECT id, email_verified_at FROM users
        WHERE email_normalized = ${norm} LIMIT 1
      `;
      if (existing.length && existing[0].email_verified_at) {
        await sql.end({ timeout: 1 });
        res.status(409).json({
          ok: false,
          error: 'email_has_account',
          message: 'This email already has an account. Use magic link.',
        });
        return;
      }

      let userId: string;
      if (existing.length) {
        userId = existing[0].id as string;
      } else {
        const created = await sql`
          INSERT INTO users (email) VALUES (${email}) RETURNING id
        `;
        userId = created[0].id as string;
      }

      for (let i = 0; i < 3; i++) {
        await sql`
          INSERT INTO save_slots (user_id, slot_index, name, is_empty)
          VALUES (${userId}, ${i}, ${`Slot ${i + 1}`}, true)
          ON CONFLICT (user_id, slot_index) DO NOTHING
        `;
      }

      const raw = randomToken(32);
      const th = hashToken(raw);
      const ua = String(req.headers['user-agent'] || '').slice(0, 200);
      await sql`
        INSERT INTO guest_tokens (user_id, token_hash, label)
        VALUES (${userId}, ${th}, ${ua || null})
      `;

      const slots = await sql`
        SELECT id, slot_index, name, summary_level, summary_room, summary_land,
               is_empty, save_version, updated_at
        FROM save_slots WHERE user_id = ${userId}
        ORDER BY slot_index ASC
      `;

      await sql.end({ timeout: 2 });
      res.status(200).json({
        ok: true,
        mode: 'guest',
        userId,
        email,
        guestToken: raw,
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
    console.error('[auth/guest]', msg);
    res.status(500).json({
      ok: false,
      error: 'Server error creating guest.',
      detail: msg.slice(0, 240),
    });
  }
}
