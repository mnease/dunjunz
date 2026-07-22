/**
 * One-shot schema bootstrap — self-contained (no shared lib imports).
 * POST /api/migrate  { "secret": "bootstrap-dunjunz" } when MIGRATE_ALLOW_OPEN=1
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ ok: false, error: 'POST only' });
      return;
    }

    const body =
      typeof req.body === 'string'
        ? (JSON.parse(req.body || '{}') as { secret?: string })
        : ((req.body || {}) as { secret?: string });
    const provided = String(body.secret || '');
    const secret = process.env.MIGRATE_SECRET?.trim();
    const openOk =
      process.env.MIGRATE_ALLOW_OPEN === '1' &&
      provided === 'bootstrap-dunjunz';
    if (!openOk && (!secret || provided !== secret)) {
      res.status(401).json({
        ok: false,
        error: 'unauthorized',
        hint: 'POST { "secret": "bootstrap-dunjunz" } with MIGRATE_ALLOW_OPEN=1',
      });
      return;
    }

    const url =
      process.env.dunjunz_DATABASE_URL?.trim() ||
      process.env.dunjunz_POSTGRES_URL?.trim() ||
      process.env.DATABASE_URL?.trim() ||
      process.env.POSTGRES_URL?.trim() ||
      '';
    if (!url) {
      res.status(503).json({ ok: false, error: 'no database url' });
      return;
    }

    const mod = await import('postgres');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const postgres = (mod as any).default ?? mod;
    const sql = postgres(url, {
      ssl: 'require',
      max: 1,
      prepare: false,
      connect_timeout: 10,
    });

    const steps: string[] = [];
    try {
      await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;
      steps.push('pgcrypto');

      await sql`
        CREATE TABLE IF NOT EXISTS users (
          id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email             TEXT NOT NULL,
          email_normalized  TEXT GENERATED ALWAYS AS (lower(trim(email))) STORED,
          email_verified_at TIMESTAMPTZ NULL,
          created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
          last_login_at     TIMESTAMPTZ NULL
        )`;
      steps.push('users');

      await sql`CREATE UNIQUE INDEX IF NOT EXISTS users_email_normalized_uidx ON users (email_normalized)`;
      steps.push('users_idx');

      await sql`
        CREATE TABLE IF NOT EXISTS guest_tokens (
          id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token_hash   TEXT NOT NULL,
          label        TEXT NULL,
          created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
          last_used_at TIMESTAMPTZ NULL,
          revoked_at   TIMESTAMPTZ NULL
        )`;
      steps.push('guest_tokens');

      await sql`CREATE UNIQUE INDEX IF NOT EXISTS guest_tokens_hash_uidx ON guest_tokens (token_hash)`;
      await sql`CREATE INDEX IF NOT EXISTS guest_tokens_user_idx ON guest_tokens (user_id) WHERE revoked_at IS NULL`;

      await sql`
        CREATE TABLE IF NOT EXISTS magic_links (
          id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token_hash TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          expires_at TIMESTAMPTZ NOT NULL,
          used_at    TIMESTAMPTZ NULL,
          request_ip TEXT NULL
        )`;
      steps.push('magic_links');

      await sql`CREATE UNIQUE INDEX IF NOT EXISTS magic_links_hash_uidx ON magic_links (token_hash)`;

      await sql`
        CREATE TABLE IF NOT EXISTS sessions (
          id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token_hash   TEXT NOT NULL,
          created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
          expires_at   TIMESTAMPTZ NOT NULL,
          revoked_at   TIMESTAMPTZ NULL,
          last_used_at TIMESTAMPTZ NULL,
          user_agent   TEXT NULL
        )`;
      steps.push('sessions');

      await sql`CREATE UNIQUE INDEX IF NOT EXISTS sessions_hash_uidx ON sessions (token_hash)`;
      await sql`CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id) WHERE revoked_at IS NULL`;

      await sql`
        CREATE TABLE IF NOT EXISTS crawler_spawns (
          id         BIGSERIAL PRIMARY KEY,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )`;
      steps.push('crawler_spawns');

      await sql`
        CREATE TABLE IF NOT EXISTS save_slots (
          id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          slot_index    SMALLINT NOT NULL CHECK (slot_index BETWEEN 0 AND 2),
          name          TEXT NOT NULL DEFAULT 'Hero',
          summary_level INT NOT NULL DEFAULT 1,
          summary_room  TEXT NOT NULL DEFAULT 'overworld',
          summary_land  TEXT NULL,
          is_empty      BOOLEAN NOT NULL DEFAULT true,
          save_version  INT NOT NULL DEFAULT 5,
          data          JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE (user_id, slot_index)
        )`;
      steps.push('save_slots');

      await sql`CREATE INDEX IF NOT EXISTS save_slots_user_updated_idx ON save_slots (user_id, updated_at DESC)`;

      await sql`
        CREATE TABLE IF NOT EXISTS rate_limits (
          bucket_key   TEXT PRIMARY KEY,
          count        INT NOT NULL DEFAULT 0,
          window_start TIMESTAMPTZ NOT NULL DEFAULT now()
        )`;
      steps.push('rate_limits');

      const u = await sql`SELECT COUNT(*)::int AS c FROM users`;
      await sql.end({ timeout: 2 });
      res.status(200).json({
        ok: true,
        steps,
        usersCount: u[0]?.c ?? 0,
      });
    } catch (e) {
      try {
        await sql.end({ timeout: 1 });
      } catch {
        /* ignore */
      }
      throw e;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[migrate]', msg);
    res.status(500).json({ ok: false, error: msg.slice(0, 400) });
  }
}
