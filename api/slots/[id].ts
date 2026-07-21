import type { VercelRequest, VercelResponse } from '@vercel/node';
import { resolveAuth, summarizeSave } from '../lib/auth';
import { dbConfigured, getSql } from '../lib/db';
import { methodGuard, readJson } from '../lib/http';
import { rateLimit } from '../lib/rate-limit';
import { defaultSaveJson } from '../lib/default-save';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (!methodGuard(req, res, ['GET', 'PUT', 'DELETE'])) return;
  if (!dbConfigured()) {
    res.status(503).json({ ok: false, error: 'Database not configured (DATABASE_URL).' });
    return;
  }

  const id = String(req.query.id || '');
  if (!id || id.length < 10) {
    res.status(400).json({ ok: false, error: 'Missing slot id.' });
    return;
  }

  try {
    const auth = await resolveAuth(req);
    if (!auth) {
      res.status(401).json({ ok: false, error: 'unauthorized' });
      return;
    }
    const sql = await getSql();

    if (req.method === 'GET') {
      if (!(await rateLimit(`slots:r:${auth.userId}`, 120, 60_000))) {
        res.status(429).json({ ok: false, error: 'rate_limited' });
        return;
      }
      const rows = await sql`
        SELECT id, slot_index, name, is_empty, data, updated_at, save_version
        FROM save_slots
        WHERE id = ${id} AND user_id = ${auth.userId}
        LIMIT 1
      `;
      if (!rows.length) {
        res.status(404).json({ ok: false, error: 'not_found' });
        return;
      }
      const row = rows[0] as {
        id: string;
        slot_index: number;
        name: string;
        is_empty: boolean;
        data: Record<string, unknown>;
        updated_at: string;
        save_version: number;
      };
      res.status(200).json({
        ok: true,
        slot: {
          id: row.id,
          slotIndex: row.slot_index,
          name: row.name,
          isEmpty: row.is_empty,
          updatedAt: row.updated_at,
          saveVersion: row.save_version,
          data: row.is_empty ? defaultSaveJson() : row.data,
        },
      });
      return;
    }

    if (req.method === 'PUT') {
      if (!(await rateLimit(`slots:w:${auth.userId}`, 60, 60_000))) {
        res.status(429).json({ ok: false, error: 'rate_limited' });
        return;
      }
      const body = readJson<{
        data?: Record<string, unknown>;
        name?: string;
        expectedUpdatedAt?: string;
      }>(req);
      if (!body.data || typeof body.data !== 'object') {
        res.status(400).json({ ok: false, error: 'data required.' });
        return;
      }
      if (JSON.stringify(body.data).length > 256_000) {
        res.status(413).json({ ok: false, error: 'Save too large.' });
        return;
      }

      const existing = await sql`
        SELECT updated_at FROM save_slots
        WHERE id = ${id} AND user_id = ${auth.userId}
        LIMIT 1
      `;
      if (!existing.length) {
        res.status(404).json({ ok: false, error: 'not_found' });
        return;
      }
      if (body.expectedUpdatedAt) {
        const cur = String((existing[0] as { updated_at: string }).updated_at);
        if (cur !== body.expectedUpdatedAt) {
          res.status(409).json({
            ok: false,
            error: 'conflict',
            updatedAt: cur,
          });
          return;
        }
      }

      const sum = summarizeSave(body.data);
      const name =
        body.name != null
          ? String(body.name).slice(0, 40)
          : undefined;
      const ver =
        typeof body.data.version === 'number' ? body.data.version : 5;

      if (name != null) {
        await sql`
          UPDATE save_slots SET
            name = ${name},
            summary_level = ${sum.level},
            summary_room = ${sum.room},
            summary_land = ${sum.land},
            is_empty = false,
            save_version = ${ver},
            data = ${sql.json(body.data as never)},
            updated_at = now()
          WHERE id = ${id} AND user_id = ${auth.userId}
        `;
      } else {
        await sql`
          UPDATE save_slots SET
            summary_level = ${sum.level},
            summary_room = ${sum.room},
            summary_land = ${sum.land},
            is_empty = false,
            save_version = ${ver},
            data = ${sql.json(body.data as never)},
            updated_at = now()
          WHERE id = ${id} AND user_id = ${auth.userId}
        `;
      }

      const updated = await sql`
        SELECT updated_at FROM save_slots WHERE id = ${id} LIMIT 1
      `;
      res.status(200).json({
        ok: true,
        updatedAt: (updated[0] as { updated_at: string }).updated_at,
      });
      return;
    }

    // DELETE — soft empty
    await sql`
      UPDATE save_slots SET
        is_empty = true,
        name = ${'Slot'},
        summary_level = 1,
        summary_room = 'overworld',
        summary_land = 'surface',
        data = ${sql.json({} as never)},
        updated_at = now()
      WHERE id = ${id} AND user_id = ${auth.userId}
    `;
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[slots/id]', err);
    res.status(500).json({ ok: false, error: 'Server error.' });
  }
}
