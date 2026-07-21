import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

/** Probe Neon connectivity + users table. */
export default async function handler(
  _req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  try {
    const url = process.env.DATABASE_URL?.trim();
    if (!url) {
      res.status(503).json({ ok: false, error: 'DATABASE_URL missing' });
      return;
    }
    const sql = neon(url);
    const one = await sql`SELECT 1 AS n`;
    let usersTable = false;
    let usersDetail = '';
    try {
      const u = await sql`SELECT COUNT(*)::int AS c FROM users`;
      usersTable = true;
      usersDetail = `count=${(u[0] as { c: number }).c}`;
    } catch (e) {
      usersDetail = e instanceof Error ? e.message : String(e);
    }
    res.status(200).json({
      ok: true,
      select1: one,
      usersTable,
      usersDetail,
      node: process.version,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[db-health]', msg);
    res.status(500).json({ ok: false, error: msg, node: process.version });
  }
}
