/**
 * GET/POST /api/slots — list or start a cloud save slot.
 * Self-contained (no shared lib imports — Vercel path issues).
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
        AND s.revoked_at IS NULL
        AND s.expires_at > now()
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

function mapSlots(
  rows: Array<{
    id: string;
    slot_index: number;
    name: string;
    summary_level: number;
    summary_room: string;
    summary_land: string | null;
    is_empty: boolean;
    save_version: number;
    updated_at: string;
  }>,
) {
  return rows.map((r) => ({
    id: r.id,
    slotIndex: r.slot_index,
    name: r.name,
    level: r.summary_level,
    roomId: r.summary_room,
    land: r.summary_land,
    isEmpty: r.is_empty,
    saveVersion: r.save_version,
    updatedAt: r.updated_at,
  }));
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
    if (req.method !== 'GET' && req.method !== 'POST') {
      res.status(405).json({ ok: false, error: 'Method not allowed.' });
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

      for (let i = 0; i < 3; i++) {
        await sql`
          INSERT INTO save_slots (user_id, slot_index, name, is_empty)
          VALUES (${userId}, ${i}, ${`Slot ${i + 1}`}, true)
          ON CONFLICT (user_id, slot_index) DO NOTHING
        `;
      }

      if (req.method === 'GET') {
        const rows = await sql`
          SELECT id, slot_index, name, summary_level, summary_room, summary_land,
                 is_empty, save_version, updated_at
          FROM save_slots WHERE user_id = ${userId}
          ORDER BY slot_index ASC
        `;
        await sql.end({ timeout: 2 });
        res.status(200).json({ ok: true, slots: mapSlots(rows) });
        return;
      }

      // POST — start/overwrite a slot
      const body =
        typeof req.body === 'string'
          ? (JSON.parse(req.body || '{}') as {
              slotIndex?: number;
              name?: string;
              data?: Record<string, unknown>;
            })
          : ((req.body || {}) as {
              slotIndex?: number;
              name?: string;
              data?: Record<string, unknown>;
            });
      const slotIndex = Number(body.slotIndex);
      if (![0, 1, 2].includes(slotIndex)) {
        await sql.end({ timeout: 1 });
        res.status(400).json({ ok: false, error: 'slotIndex must be 0, 1, or 2.' });
        return;
      }
      const name = String(body.name || `Slot ${slotIndex + 1}`).slice(0, 40);
      const data =
        body.data && typeof body.data === 'object' ? body.data : defaultSave();
      const level = typeof data.level === 'number' ? data.level : 1;
      const room =
        typeof data.roomId === 'string' ? data.roomId : 'overworld';
      let land: string | null = 'surface';
      if (room.startsWith('b1') || room.startsWith('b2')) land = 'dunjunz';
      else if (room.startsWith('woodz')) land = 'woodz';
      else if (room.startsWith('dezertz')) land = 'dezertz';

      await sql`
        UPDATE save_slots SET
          name = ${name},
          summary_level = ${level},
          summary_room = ${room},
          summary_land = ${land},
          is_empty = false,
          save_version = ${typeof data.version === 'number' ? data.version : 5},
          data = ${sql.json(data as never)},
          updated_at = now()
        WHERE user_id = ${userId} AND slot_index = ${slotIndex}
      `;

      const rows = await sql`
        SELECT id, slot_index, name, summary_level, summary_room, summary_land,
               is_empty, save_version, updated_at
        FROM save_slots WHERE user_id = ${userId}
        ORDER BY slot_index ASC
      `;
      await sql.end({ timeout: 2 });
      const slots = mapSlots(rows);
      res.status(200).json({
        ok: true,
        slot: slots.find((s) => s.slotIndex === slotIndex),
        slots,
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
    console.error('[slots]', msg);
    res.status(500).json({ ok: false, error: 'Server error.', detail: msg.slice(0, 240) });
  }
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
