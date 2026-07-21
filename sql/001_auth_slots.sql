-- DUNJUNZ auth + multi-slot cloud saves
-- Run once in Neon SQL editor (or any Postgres 15+)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email             TEXT NOT NULL,
  email_normalized  TEXT GENERATED ALWAYS AS (lower(trim(email))) STORED,
  email_verified_at TIMESTAMPTZ NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at     TIMESTAMPTZ NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_normalized_uidx
  ON users (email_normalized);

CREATE TABLE IF NOT EXISTS guest_tokens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash   TEXT NOT NULL,
  label        TEXT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ NULL,
  revoked_at   TIMESTAMPTZ NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS guest_tokens_hash_uidx ON guest_tokens (token_hash);
CREATE INDEX IF NOT EXISTS guest_tokens_user_idx
  ON guest_tokens (user_id) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS magic_links (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ NULL,
  request_ip TEXT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS magic_links_hash_uidx ON magic_links (token_hash);

CREATE TABLE IF NOT EXISTS sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash   TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL,
  revoked_at   TIMESTAMPTZ NULL,
  last_used_at TIMESTAMPTZ NULL,
  user_agent   TEXT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS sessions_hash_uidx ON sessions (token_hash);
CREATE INDEX IF NOT EXISTS sessions_user_idx
  ON sessions (user_id) WHERE revoked_at IS NULL;

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
);

CREATE INDEX IF NOT EXISTS save_slots_user_updated_idx
  ON save_slots (user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS rate_limits (
  bucket_key   TEXT PRIMARY KEY,
  count        INT NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now()
);
