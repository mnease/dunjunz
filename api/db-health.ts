import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  dbConfigured,
  getSql,
  resolveDatabaseUrlSource,
} from './_lib/db';

export default async function handler(
  _req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  try {
    if (!dbConfigured()) {
      res.status(503).json({
        ok: false,
        error: 'No POSTGRES/DATABASE URL in env',
        hint: 'Vercel Neon Storage should set dunjunz_POSTGRES_URL',
      });
      return;
    }
    const sql = getSql();
    const one = await sql`SELECT 1 AS n`;
    let usersTable = false;
    let usersDetail = '';
    try {
      const u = await sql`SELECT COUNT(*)::int AS c FROM users`;
      usersTable = true;
      usersDetail = `count=${u[0]?.c ?? 0}`;
    } catch (e) {
      usersDetail = e instanceof Error ? e.message : String(e);
    }
    res.status(200).json({
      ok: true,
      select1: one,
      usersTable,
      usersDetail,
      databaseUrlSource: resolveDatabaseUrlSource(),
      node: process.version,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[db-health]', msg);
    res.status(500).json({
      ok: false,
      error: msg,
      source: resolveDatabaseUrlSource(),
      node: process.version,
    });
  }
}
