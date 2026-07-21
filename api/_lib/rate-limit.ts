import { getSql } from './db';

/** Sliding fixed window counter. Returns true if under limit. */
export async function rateLimit(
  bucket: string,
  limit: number,
  windowMs: number,
): Promise<boolean> {
  const sql = getSql();
  const rows = await sql`
    SELECT count, window_start FROM rate_limits WHERE bucket_key = ${bucket}
  `;
  const now = Date.now();
  if (!rows.length) {
    await sql`
      INSERT INTO rate_limits (bucket_key, count, window_start)
      VALUES (${bucket}, 1, now())
      ON CONFLICT (bucket_key) DO UPDATE SET count = 1, window_start = now()
    `;
    return true;
  }
  const row = rows[0] as { count: number; window_start: string };
  const start = new Date(row.window_start).getTime();
  if (now - start > windowMs) {
    await sql`
      UPDATE rate_limits SET count = 1, window_start = now()
      WHERE bucket_key = ${bucket}
    `;
    return true;
  }
  if (row.count >= limit) return false;
  await sql`
    UPDATE rate_limits SET count = count + 1 WHERE bucket_key = ${bucket}
  `;
  return true;
}
