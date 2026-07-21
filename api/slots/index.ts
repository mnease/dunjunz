import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  ensureThreeEmptySlots,
  listSlotSummaries,
  resolveAuth,
  summarizeSave,
} from '../lib/auth';
import { dbConfigured, getSql } from '../lib/db';
import { methodGuard, readJson } from '../lib/http';
import { rateLimit } from '../lib/rate-limit';
import { defaultSaveJson } from '../lib/default-save';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (!methodGuard(req, res, ['GET', 'POST'])) return;
  if (!dbConfigured()) {
    res.status(503).json({ ok: false, error: 'Database not configured (DATABASE_URL).' });
    return;
  }

  try {
    const auth = await resolveAuth(req);
    if (!auth) {
      res.status(401).json({ ok: false, error: 'unauthorized' });
      return;
    }

    if (req.method === 'GET') {
      await ensureThreeEmptySlots(auth.userId);
      const slots = await listSlotSummaries(auth.userId);
      res.status(200).json({ ok: true, slots });
      return;
    }

    // POST — start / reset a slot with optional name and seed data
    if (!(await rateLimit(`slots:w:${auth.userId}`, 60, 60_000))) {
      res.status(429).json({ ok: false, error: 'rate_limited' });
      return;
    }

    const body = readJson<{
      slotIndex?: number;
      name?: string;
      data?: Record<string, unknown>;
    }>(req);
    const slotIndex = Number(body.slotIndex);
    if (![0, 1, 2].includes(slotIndex)) {
      res.status(400).json({ ok: false, error: 'slotIndex must be 0, 1, or 2.' });
      return;
    }
    const name = String(body.name || `Slot ${slotIndex + 1}`).slice(0, 40);
    const data = body.data && typeof body.data === 'object'
      ? body.data
      : defaultSaveJson();
    const sum = summarizeSave(data);
    const sql = await getSql();

    await ensureThreeEmptySlots(auth.userId);
    await sql`
      UPDATE save_slots SET
        name = ${name},
        summary_level = ${sum.level},
        summary_room = ${sum.room},
        summary_land = ${sum.land},
        is_empty = false,
        save_version = ${typeof data.version === 'number' ? data.version : 5},
        data = ${sql.json(data as never)},
        updated_at = now()
      WHERE user_id = ${auth.userId} AND slot_index = ${slotIndex}
    `;

    const slots = await listSlotSummaries(auth.userId);
    const slot = slots.find((s) => s.slotIndex === slotIndex);
    res.status(200).json({ ok: true, slot, slots });
  } catch (err) {
    console.error('[slots]', err);
    res.status(500).json({ ok: false, error: 'Server error.' });
  }
}
