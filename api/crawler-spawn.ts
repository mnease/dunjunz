/**
 * POST /api/crawler-spawn
 * Atomically allocate the next global crawler ordinal (beach wake numbers).
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSql } from './lib/db';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.status(405).json({ ok: false, error: 'POST or GET only' });
    return;
  }

  try {
    const sql = await getSql();

    await sql`
      CREATE TABLE IF NOT EXISTS crawler_spawns (
        id         BIGSERIAL PRIMARY KEY,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;

    if (req.method === 'GET') {
      const rows = await sql<{ n: string }[]>`
        SELECT COALESCE(MAX(id), 0)::text AS n FROM crawler_spawns`;
      const last = Number(rows[0]?.n ?? 0);
      res.status(200).json({ ok: true, lastCrawlerId: last });
      return;
    }

    const rows = await sql<{ id: string }[]>`
      INSERT INTO crawler_spawns DEFAULT VALUES
      RETURNING id::text AS id`;
    const crawlerId = Number(rows[0]?.id ?? 0);
    if (!Number.isFinite(crawlerId) || crawlerId < 1) {
      res.status(500).json({ ok: false, error: 'allocate_failed' });
      return;
    }
    res.status(200).json({ ok: true, crawlerId });
  } catch (e) {
    // Don't hard-fail the client beach wake — local fallback handles 5xx.
    const msg = e instanceof Error ? e.message : 'error';
    res.status(200).json({
      ok: false,
      error: 'db',
      detail: msg,
      fallback: true,
    });
  }
}
