import type { VercelRequest } from '@vercel/node';
import { getSql } from './db';
import { hashToken } from './crypto';
import { parseCookies } from './http';

export type AuthMode = 'guest' | 'account';

export interface AuthContext {
  userId: string;
  email: string;
  mode: AuthMode;
  verified: boolean;
}

const SESSION_COOKIE = 'dunjunz_session';

export async function resolveAuth(
  req: VercelRequest,
): Promise<AuthContext | null> {
  const sql = getSql();
  const cookies = parseCookies(req);
  const bearer = extractBearer(req);

  // 1) Session cookie
  const sessionRaw = cookies[SESSION_COOKIE] || (bearer?.startsWith('sess_') ? bearer : null);
  if (sessionRaw) {
    const h = hashToken(sessionRaw);
    const rows = await sql`
      SELECT s.user_id, u.email, u.email_verified_at
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ${h}
        AND s.revoked_at IS NULL
        AND s.expires_at > now()
      LIMIT 1
    `;
    if (rows.length) {
      const r = rows[0] as {
        user_id: string;
        email: string;
        email_verified_at: string | null;
      };
      await sql`
        UPDATE sessions SET last_used_at = now() WHERE token_hash = ${h}
      `;
      return {
        userId: r.user_id,
        email: r.email,
        mode: 'account',
        verified: !!r.email_verified_at,
      };
    }
  }

  // 2) Guest bearer
  const guestRaw = bearer && !bearer.startsWith('sess_') ? bearer : null;
  if (guestRaw) {
    const h = hashToken(guestRaw);
    const rows = await sql`
      SELECT g.user_id, u.email, u.email_verified_at
      FROM guest_tokens g
      JOIN users u ON u.id = g.user_id
      WHERE g.token_hash = ${h}
        AND g.revoked_at IS NULL
      LIMIT 1
    `;
    if (rows.length) {
      const r = rows[0] as {
        user_id: string;
        email: string;
        email_verified_at: string | null;
      };
      // Verified accounts should use magic-link session
      if (r.email_verified_at) {
        return null;
      }
      await sql`
        UPDATE guest_tokens SET last_used_at = now() WHERE token_hash = ${h}
      `;
      return {
        userId: r.user_id,
        email: r.email,
        mode: 'guest',
        verified: false,
      };
    }
  }

  return null;
}

function extractBearer(req: VercelRequest): string | null {
  const h = req.headers.authorization;
  if (!h || typeof h !== 'string') return null;
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m?.[1]?.trim() || null;
}

export async function ensureThreeEmptySlots(userId: string): Promise<void> {
  const sql = getSql();
  for (let i = 0; i < 3; i++) {
    await sql`
      INSERT INTO save_slots (user_id, slot_index, name, is_empty)
      VALUES (${userId}, ${i}, ${`Slot ${i + 1}`}, true)
      ON CONFLICT (user_id, slot_index) DO NOTHING
    `;
  }
}

export async function listSlotSummaries(userId: string) {
  const sql = getSql();
  const rows = await sql`
    SELECT id, slot_index, name, summary_level, summary_room, summary_land,
           is_empty, save_version, updated_at
    FROM save_slots
    WHERE user_id = ${userId}
    ORDER BY slot_index ASC
  `;
  return rows.map((r) => {
    const row = r as {
      id: string;
      slot_index: number;
      name: string;
      summary_level: number;
      summary_room: string;
      summary_land: string | null;
      is_empty: boolean;
      save_version: number;
      updated_at: string;
    };
    return {
      id: row.id,
      slotIndex: row.slot_index,
      name: row.name,
      level: row.summary_level,
      roomId: row.summary_room,
      land: row.summary_land,
      isEmpty: row.is_empty,
      saveVersion: row.save_version,
      updatedAt: row.updated_at,
    };
  });
}

export function summarizeSave(data: Record<string, unknown>): {
  level: number;
  room: string;
  land: string | null;
} {
  const level = typeof data.level === 'number' ? data.level : 1;
  const room = typeof data.roomId === 'string' ? data.roomId : 'overworld';
  let land: string | null = null;
  if (typeof data.roomId === 'string') {
    if (data.roomId.startsWith('b1') || data.roomId.startsWith('b2')) land = 'dunjunz';
    else if (data.roomId.startsWith('woodz')) land = 'woodz';
    else if (data.roomId.startsWith('dezertz')) land = 'dezertz';
    else land = 'surface';
  }
  return { level, room, land };
}
