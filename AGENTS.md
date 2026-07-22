# Dunjunz — agent instructions

Retro Zelda-like humorous crawler. Repo: `mnease/dunjunz`. Live: https://dunjunz.com (game: https://dunjunz.com/play)

## Isolated Hive Mind (mandatory)

This project has its **own Hive Mind silo**, separate from Elastic Hive platform memory.

| Domain | Purpose |
| --- | --- |
| `dunjunz-build` | Session notes, ship logs, design (default write domain) |
| `dunjunz-fact` | Pinned durable game facts / conventions |
| `dunjunz` | Lore / worldbuilding catalogs |

**Tenant:** `public.tenants.slug = dunjunz`  
**id:** `00000000-0000-0000-0000-0000000000d1`  
**MCP token label:** `grok-dunjunz-isolated-2026-07-20`  
**Isolation model:** domain-scoped MCP token (not a separate Postgres DB). Same Forge `hive_mind.memory` table, hard allow-list on domains so search/pinned never surface mesh/platform clutter.

### Session start

1. Prefer MCP `memory_pinned` + `memory_search` under the project token (see `.grok/config.toml`).
2. Ignore or deprioritize `~/.grok/cache/hive-mind-context.md` platform prefetch when it is mesh/Queen noise.
3. Do **not** write Dunjunz progress to `grok-build` or `platform-*` — use **`dunjunz-build`**.

### Session / task complete

Write a status row (via MCP `memory_write` when the project token is active — lands in `dunjunz-build`).

Key pattern: `YYYY-MM-DD-<topic-kebab>` or `dunjunz-<topic>-YYYY-MM-DD`.

### Changelog (mandatory for player-facing ships)

Keep **[`CHANGELOG.md`](./CHANGELOG.md)** current on GitHub:

1. For any notable player-facing feature, fix, or balance change: add a bullet under `## [Unreleased]` (or under a dated version section when cutting a release).
2. Ship **code + CHANGELOG in the same commit/push** when practical.
3. On release cuts: move Unreleased into `## [X.Y.Z] — YYYY-MM-DD`, bump `package.json` version, push to `main`.
4. Format: [Keep a Changelog](https://keepachangelog.com/) — Added / Changed / Fixed / Removed.

### Misspellings (player-facing)

Dunjunz, woodz, dezertz, mapz, forjing, Princess Prizella — intentional.

## Stack

- Phaser 3 + Vite + TypeScript
- Pure logic in `src/systems/` (vitest)
- Procedural pixel textures + CRT UI
- Save v5: mapz, forjing, multi-land, princess quest

## Hard rules

1. Commit and push after meaningful game changes.
2. Keep pure systems testable without Phaser.
3. Do not reset or invent player credentials (N/A for this browser game; localStorage only).
