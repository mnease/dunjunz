import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  ensureThreeEmptySlots,
  listSlotSummaries,
  resolveAuth,
  summarizeSave,
} from '../lib/auth';
import { dbConfigured, getSql } from '../lib/db';
import { methodGuard, readJson } from '../lib/http';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (!methodGuard(req, res, ['POST'])) return;
  if (!dbConfigured()) {
    res.status(503).json({ ok: false, error: 'Database not configured.' });
    return;
  }

  try {
    const auth = await resolveAuth(req);
    if (!auth) {
      res.status(401).json({ ok: false, error: 'unauthorized' });
      return;
    }
    const body = readJson<{
      data?: Record<string, unknown>;
      slotIndex?: number;
      name?: string;
    }>(req);
    if (!body.data || typeof body.data !== 'object') {
      res.status(400).json({ ok: false, error: 'data required.' });
      return;
    }

    await ensureThreeEmptySlots(auth.userId);
    const slots = await listSlotSummaries(auth.userId);
    let slotIndex =
      typeof body.slotIndex === 'number' ? body.slotIndex : undefined;
    if (slotIndex == null || ![0, 1, 2].includes(slotIndex)) {
      const empty = slots.find((s) => s.isEmpty);
      slotIndex = empty ? empty.slotIndex : 0;
    }
    const name = String(body.name || 'Imported').slice(0, 40);
    const sum = summarizeSave(body.data);
    if (JSON.stringify(body.data).length > 256_000) {
      res.status(413).json({ ok: false, error: 'Save too large.' });
      return;
    }
    const sql = getSql();
    await sql`
      UPDATE save_slots SET
        name = ${name},
        summary_level = ${sum.level},
        summary_room = ${sum.room},
        summary_land = ${sum.land},
        is_empty = false,
        save_version = ${typeof body.data.version === 'number' ? body.data.version : 5},
        data = ${sql.json(body.data as never)},
        updated_at = now()
      WHERE user_id = ${auth.userId} AND slot_index = ${slotIndex}
    `;
    const next = await listSlotSummaries(auth.userId);
    res.status(200).json({
      ok: true,
      slot: next.find((s) => s.slotIndex === slotIndex),
      slots: next,
    });
  } catch (err) {
    console.error('[slots/import-local]', err);
    res.status(500).json({ ok: false, error: 'Server error.' });
  }
}
