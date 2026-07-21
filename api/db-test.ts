import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Isolated DB connectivity test with full error body (no shared lib).
 */
export default async function handler(
  _req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  try {
    const keys = Object.keys(process.env)
      .filter((k) => /postgres|database|neon/i.test(k))
      .sort();
    const url =
      process.env.dunjunz_DATABASE_URL?.trim() ||
      process.env.dunjunz_POSTGRES_URL?.trim() ||
      process.env.DATABASE_URL?.trim() ||
      process.env.POSTGRES_URL?.trim() ||
      '';

    if (!url) {
      res.status(503).json({ ok: false, error: 'no url', keys });
      return;
    }

    // Dynamic import to see if package load is the crash
    let postgres: typeof import('postgres').default;
    try {
      postgres = (await import('postgres')).default;
    } catch (e) {
      res.status(500).json({
        ok: false,
        stage: 'import_postgres',
        error: e instanceof Error ? e.message : String(e),
        keys,
      });
      return;
    }

    const sql = postgres(url, {
      ssl: 'require',
      max: 1,
      prepare: false,
      connect_timeout: 10,
    });

    try {
      const r = await sql`SELECT 1::int AS n`;
      await sql.end({ timeout: 2 });
      res.status(200).json({
        ok: true,
        result: r,
        urlHost: safeHost(url),
        keys,
      });
    } catch (e) {
      try {
        await sql.end({ timeout: 1 });
      } catch {
        /* ignore */
      }
      res.status(500).json({
        ok: false,
        stage: 'query',
        error: e instanceof Error ? e.message : String(e),
        urlHost: safeHost(url),
        keys,
      });
    }
  } catch (e) {
    res.status(500).json({
      ok: false,
      stage: 'outer',
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

function safeHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return 'unparseable';
  }
}
