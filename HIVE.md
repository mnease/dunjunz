# Dunjunz private Hive Mind

## Why

Primary Elastic Hive memory is full of mesh, Queen, Forge, and platform covenant noise. Dunjunz needs the **same memory machinery** (hybrid search, pins, session writes) without that clutter.

## What you got

| Piece | Value |
| --- | --- |
| CRM tenant | `tenants.slug = dunjunz` |
| Domains | `dunjunz`, `dunjunz-build`, `dunjunz-fact` |
| Default write | `dunjunz-build` |
| MCP token label | `grok-dunjunz-isolated-2026-07-20` |
| Server URL | `https://elastichive.com/mcp/grok` |
| Project MCP | `.grok/config.toml` (gitignored secret; see example) |

**Not** a separate Postgres database (that pattern is for Streams of Mercy / sensitive silos). Same physical `hive_mind.memory` on Forge; isolation is **token scope**.

## Agent workflow

1. Open Grok Build from this repo so project MCP overrides load.
2. Search / pin / write use only `dunjunz*` domains.
3. Old rows that lived under `grok-build:dunjunz-*` were **copied** into `dunjunz-build` on provision day (2026-07-20).

## Rotate / revoke token

```sql
UPDATE hive_mind.mcp_tokens
SET revoked_at = now()
WHERE label = 'grok-dunjunz-isolated-2026-07-20';
```

Re-issue with `issue-mcp-token.js`, update `.grok/config.toml` bearer, restart session / refresh `/mcps`.

## Verify isolation

With the Dunjunz bearer, `memory_search` for "Queen mesh RAID" should return empty or only accidental game copy — not platform rows. `memory_pinned` should show Dunjunz fact pins only.
