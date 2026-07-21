# Changelog

All notable changes to **DUNJUNZ** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project aims to follow [Semantic Versioning](https://semver.org/).

Live build: [dunjunz.vercel.app](https://dunjunz.vercel.app) · Repo: [mnease/dunjunz](https://github.com/mnease/dunjunz)

---

## [Unreleased]

### Added

- **Boss exit portal** — after clearing a land boss, a cyan portal appears in the arena; step on it (or E) to zip back to that dungeon's mouth (`b1_entrance` / Woodz Edge / Dezertz Edge)

### Fixed

- **Dezertz Sand Tower seal** — north link to Edge existed but top row was solid wall and south door had no exit; you could not leave after rescuing Prizella. North door restored; portal near north exit.
- **Game settings** (footer **Settings** modal, `localStorage`)
  - Master mute, music/SFX toggles + volume sliders
  - Reduce motion (skips camera shake)
  - Live apply + Test SFX button
- **Procedural audio** (Web Audio API, no asset files)
  - Music beds: title / overworld / dungeon (arpeggio loops)
  - SFX: attack, hits, death, level-up, loot, door, stairs, shop, coin, heal, dialog, UI
  - Browser unlock on first pointer/key gesture
- **Footer copyright** — © 2026 NeaseMedia
- **Feedback form** modal → `POST /api/feedback` → **support@neasemedia.com**
- Mail: **Resend** preferred (`RESEND_API_KEY` / `RESEND_FROM`); SMTP nodemailer fallback
- **Optional accounts (Ema council design)**
  - Local play still works with no email
  - **Guest**: email required + device `guest_token` → **3 cloud slots**
  - **Account**: magic link (Resend) → HttpOnly session → same 3 slots
  - Title screen slot picker (↑↓ ENTER / R wipe)
  - Import local save → first empty cloud slot
  - Schema: `sql/001_auth_slots.sql` (Neon Postgres)
  - APIs under `/api/slots/*` and `/api/auth/*`
- Env template: `.env.example` (`DATABASE_URL`, `AUTH_BASE_URL`, Resend)

### Planned

- Best Bud combat abilities / secondary champion quests
- Blacksmith merchant: destroy gear for parts, optimize / craft
- More lands / champion jobs from Prizella

---

## [0.6.0] — 2026-07-20

Champion quests, dual-pane UI, stronger creeps, Adventure Time voice.

### Added

- **Best Bud champion quest** after saving Prizella
  - Talk Prizella (offer → accept) → **Woodz Hollow** (east of Woodz Edge) → meet bud → report back
  - Six non-human best friends rolled once per playthrough (`runSeed`): Gloop, Nub, Whisp, Tater, Zorp, Pebbo
  - Companion follows the player (talk/vibe only; no combat pet in v1)
  - Design via Ema council (Scout / Waggle / Hexis)
- **Dual-pane tinkerer shop**: stock left, player bag + equipped right; sell items (~half price)
- **Graphic dual-pane forje UI**: recipes left, materials right; arrows / click / Enter / 1–9
- **Species-specific creep loot** (occasional): slime gel, bones, wolf pelts, cactus spines, ensign badges
- Inventory **bag as graphic item grid**
- Shield + ring equip slots; richer enemy loot tables
- Graphic **mapz** (floors, lands, fog of visited rooms)
- Multi-land content: surface, Dunjunz, Woodz, Dezertz, Princesz Prizella

### Changed

- Dialogue rewritten in an **Adventure Time–ish** voice (earnest, weird, cooler)
- Post-rescue Prizella: kingdom duty + **champion hero** pitch (not “personal hero”)
- Land / trail creeps **tougher** (higher base HP); contact damage by kind
- Tinker open/close no longer same-frame double-fires on E
- Single-tile doors/stairs with wider art (no double-door tiles)
- Captain wears gold command tunic
- Cube: open room for talk; split apology boots vs kill core rewards

### Fixed

- Meadow **east exit** sealed: tile rows were 15-wide, padded as wall (trail unreachable)
- B1 friend-door re-locked after death without key (now persists `door-unlocked`)
- Cube combat hitboxes / sword body
- B2 foyer sealed stair trap
- Room-door spawn orientation (enter opposite edge)

---

## [0.5.0] — 2026-07

Multi-land quest foundation (mapz, forjing, princesz).

### Added

- Save **v5**: mapz, visited rooms, `princessSaved`, `landsCleared`
- Lands: surface meadow + trail, Dunjunz B1–B2, Woodz, Dezertz
- Forjing system (craft / enhance / imbue) at forje stations
- Mapz pickups and panel
- Dunjun Master, Wolf Lord, Sand Wraith bosses
- Princesz Prizella rescue as main quest arc
- Isolated Dunjunz Hive Mind tenant wiring (`HIVE.md`)

### Changed

- XP formula continues past soft level caps (no level-10 ceiling)
- Compass doors and multi-level stairs for consistent dungeon maps

---

## [0.1.0] — 2026-06

Initial browser ship.

### Added

- Phaser 3 + Vite + TypeScript browser game
- Meadow, first dunjun loop, old man + mild sword
- Combat, inventory, attributes, chests, merchants
- CRT chrome UI, procedural pixel textures
- Vercel deploy under NeaseMedia

---

## Versioning notes

| Field | Meaning |
| --- | --- |
| `package.json` `version` | npm/package semver for the game build |
| Save `version: 5` | Save schema generation (localStorage); not the same as package version |
| This file | Human-readable product changelog for GitHub |

When shipping a player-facing feature set, **update this file in the same PR/commit** as the code, then push to `main`.
