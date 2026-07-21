/**
 * GET/PUT/DELETE /api/slots/:id
 * Self-contained for Vercel.
 */
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
function bearer(req: VercelRequest): string {
  const a = req.headers.authorization;
  if (typeof a === 'string' && a.startsWith('Bearer ')) return a.slice(7).trim();
  return '';
}
async function openSql() {
  const url = dbUrl();
  if (!url) throw new Error('no_db');
  const mod = await import('postgres');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const postgres = (mod as any).default ?? mod;
  return postgres(url, {
    ssl: 'require',
    max: 1,
    prepare: false,
    connect_timeout: 10,
  });
}
async function resolveUserId(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sql: any,
  req: VercelRequest,
): Promise<string | null> {
  const cookies = parseCookies(req);
  const b = bearer(req);
  const sessionRaw =
    cookies.dunjunz_session || (b.startsWith('sess_') ? b : '');
  const guestRaw = b && !b.startsWith('sess_') ? b : '';
  if (sessionRaw) {
    const h = hashToken(sessionRaw);
    const rows = await sql`
      SELECT s.user_id FROM sessions s
      WHERE s.token_hash = ${h}
        AND s.revoked_at IS NULL AND s.expires_at > now()
      LIMIT 1
    `;
    if (rows.length) return rows[0].user_id as string;
  }
  if (guestRaw) {
    const h = hashToken(guestRaw);
    const rows = await sql`
      SELECT g.user_id, u.email_verified_at
      FROM guest_tokens g JOIN users u ON u.id = g.user_id
      WHERE g.token_hash = ${h} AND g.revoked_at IS NULL
      LIMIT 1
    `;
    if (rows.length && !rows[0].email_verified_at) {
      return rows[0].user_id as string;
    }
  }
  return null;
}

function defaultSave() {
  return {
    version: 5,
    roomId: 'overworld',
    hp: 6,
    maxHp: 6,
    hasSword: false,
    hasKey: false,
    bossDefeated: false,
    flags: {},
    killed: [],
    collected: [],
    xp: 0,
    level: 1,
    coins: 0,
    stacks: {},
    bag: [],
    nextItemUid: 1,
    equipped: {
      weapon: null,
      shield: null,
      helmet: null,
      breastplate: null,
      greaves: null,
      shoes: null,
      gloves: null,
      amulet: null,
      ring: null,
      key: null,
    },
    attrs: { str: 1, dex: 1, vit: 1, int: 1, lck: 1 },
    attrPoints: 0,
    armor: 0,
    discoveredMapz: ['surface'],
    visitedRooms: [],
    princessSaved: false,
    landsCleared: [],
    runSeed: (Math.floor(Math.random() * 0xffffffff) >>> 0) || 1,
    bestBudId: null,
    bestBudStage: 'none',
  };
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  try {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization',
    );
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    if (!['GET', 'PUT', 'DELETE'].includes(req.method || '')) {
      res.status(405).json({ ok: false, error: 'Method not allowed.' });
      return;
    }

    const id = String(req.query.id || '');
    if (!id || id.length < 10) {
      res.status(400).json({ ok: false, error: 'Missing slot id.' });
      return;
    }
    if (!dbUrl()) {
      res.status(503).json({ ok: false, error: 'no_db' });
      return;
    }

    const sql = await openSql();
    try {
      const userId = await resolveUserId(sql, req);
      if (!userId) {
        res.status(401).json({ ok: false, error: 'unauthorized' });
        return;
      }

      if (req.method === 'GET') {
        const rows = await sql`
          SELECT id, slot_index, name, is_empty, data, updated_at, save_version
          FROM save_slots
          WHERE id = ${id} AND user_id = ${userId}
          LIMIT 1
        `;
        if (!rows.length) {
          await sql.end({ timeout: 1 });
          res.status(404).json({ ok: false, error: 'not_found' });
          return;
        }
        const row = rows[0];
        await sql.end({ timeout: 2 });
        res.status(200).json({
          ok: true,
          slot: {
            id: row.id,
            slotIndex: row.slot_index,
            name: row.name,
            isEmpty: row.is_empty,
            updatedAt: row.updated_at,
            saveVersion: row.save_version,
            data: row.is_empty ? defaultSave() : row.data,
          },
        });
        return;
      }

      if (req.method === 'PUT') {
        const body =
          typeof req.body === 'string'
            ? (JSON.parse(req.body || '{}') as {
                data?: Record<string, unknown>;
                name?: string;
              })
            : ((req.body || {}) as {
                data?: Record<string, unknown>;
                name?: string;
              });
        if (!body.data || typeof body.data !== 'object') {
          await sql.end({ timeout: 1 });
          res.status(400).json({ ok: false, error: 'data required.' });
          return;
        }
        if (JSON.stringify(body.data).length > 256_000) {
          await sql.end({ timeout: 1 });
          res.status(413).json({ ok: false, error: 'Save too large.' });
          return;
        }
        const own = await sql`
          SELECT id FROM save_slots WHERE id = ${id} AND user_id = ${userId} LIMIT 1
        `;
        if (!own.length) {
          await sql.end({ timeout: 1 });
          res.status(404).json({ ok: false, error: 'not_found' });
          return;
        }
        const data = body.data;
        const level = typeof data.level === 'number' ? data.level : 1;
        const room =
          typeof data.roomId === 'string' ? data.roomId : 'overworld';
        let land: string | null = 'surface';
        if (room.startsWith('b1') || room.startsWith('b2')) land = 'dunjunz';
        else if (room.startsWith('woodz')) land = 'woodz';
        else if (room.startsWith('dezertz')) land = 'dezertz';
        const name =
          body.name != null ? String(body.name).slice(0, 40) : null;
        const ver = typeof data.version === 'number' ? data.version : 5;

        if (name != null) {
          await sql`
            UPDATE save_slots SET
              name = ${name},
              summary_level = ${level},
              summary_room = ${room},
              summary_land = ${land},
              is_empty = false,
              save_version = ${ver},
              data = ${sql.json(data as never)},
              updated_at = now()
            WHERE id = ${id} AND user_id = ${userId}
          `;
        } else {
          await sql`
            UPDATE save_slots SET
              summary_level = ${level},
              summary_room = ${room},
              summary_land = ${land},
              is_empty = false,
              save_version = ${ver},
              data = ${sql.json(data as never)},
              updated_at = now()
            WHERE id = ${id} AND user_id = ${userId}
          `;
        }
        const updated = await sql`
          SELECT updated_at FROM save_slots WHERE id = ${id} LIMIT 1
        `;
        await sql.end({ timeout: 2 });
        res.status(200).json({
          ok: true,
          updatedAt: updated[0]?.updated_at,
        });
        return;
      }

      // DELETE soft-empty
      await sql`
        UPDATE save_slots SET
          is_empty = true,
          name = ${'Slot'},
          summary_level = 1,
          summary_room = 'overworld',
          summary_land = 'surface',
          data = ${sql.json({} as never)},
          updated_at = now()
        WHERE id = ${id} AND user_id = ${userId}
      `;
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
    console.error('[slots/id]', msg);
    res.status(500).json({
      ok: false,
      error: 'Server error.',
      detail: msg.slice(0, 240),
    });
  }
}
