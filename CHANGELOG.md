# Changelog

All notable changes to **DUNJUNZ** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project aims to follow [Semantic Versioning](https://semver.org/).

Live: [dunjunz.com](https://dunjunz.com) · Play: [dunjunz.com/play](https://dunjunz.com/play) · Repo: [mnease/dunjunz](https://github.com/mnease/dunjunz)

---

## [Unreleased]

### Changed

- **Level-up stats** — each level grants one package: **+2 to one stat of your choice**, then **+1 to a different stat** (inventory 1–5). No hard cap on level or stat totals.

### Fixed

- **Hard mode Throne of Meta eject** — boss exit portal no longer spawns on entry during a hard run (only after the hard boss kill). Portal also moved off the south door path; short entry grace avoids walk-on whoosh.

### Added

- **Humanz & Villagez mode** — at new game, pick **Dunjunz** (classic crawl) or **Humanz & Villagez** (you are the dragon; villagers loot your gold). Turn-based waves: Claw / Flame / Roar / Guard / Hoard. Progress saves separately; title Continue uses last mode.
- **Hard mode dungeons** — after clearing a land, step on the **hard gate** at the dungeon mouth to replay with tougher shooting creeps (skeletons→arrows, redshirts→phasers, Dungeon Master→fireballs). Soft exit portal to leave hard mode.
- **Hard captain boss** — clear hard redshirts in USS Plot Hole; the Captain engages. Rewards: **Phaser** + **Beam Me Up** (teleport to mouth).
- **Hard king loot** — beat the Dungeon Master on hard for **Short Bow**, **Arrows**, and **Wizard Staff** (ranged / magic combat).
- **Classes & races (D&D)** — at **Lv 5** pick a class; **Lv 15** multiclass; **Lv 25** choose a common race. Bonuses feed damage/armor/HP.
- **Graphics motion pass (EMA)** — richer tiles (floor grout, brick walls, water/lava 2-frame shimmer, forje embers, portal sparkles, bud silhouette); player/companion idle & walk bob; enemy squash/wobble + 2-frame slime; sword slash arc + hit sparks; kind-tinted death particles; portal/forje ambient pulse; companion combat accents (heal/block/blink/strike). All decorative motion gated by Settings → Reduce motion.
- **Landing page at /** — welcome, what/how/why, support (Ko-fi tip jar); game at **`/play`** (MPA Vite + Vercel rewrites). Live: [dunjunz.com](https://dunjunz.com) · [dunjunz.com/play](https://dunjunz.com/play)
- **Journal (J / top bar)** — quest list with progress (main path, champion jobs, side bits) + **Brags** achievement board (22 unlocks, `NEW BRAG:` toasts). Tone stays bard-weird, not corporate.
- **Best Bud XP + gear** — buddies gain XP on kills and level up; inventory **Y** toggles buddy gear mode (shared bag, separate slots; no keyring). Weapon/armor boost strike damage.
- **Progressive creep threat** — HP / contact damage / XP scale by land tier, floor depth, and world progress (later zones hurt more)
- **Prizella's Kingdomz** (east of Trope Trail after rescue) — gate, courtyard, throne hub
- **Champion quest board** — after Best Bud, throne assigns **Royal Sewerz** (Job #2)
- **Sewerz dungeon** — mouth / pipe hall / overflow / Honk Chamber (Royal Goose boss) + exit portal + Honk Blade turn-in
- **Best Bud combat** — companions fight with Jake-energy magic (not vibe-only)
  - Gloop stretch lash, Nub claws, Whisp fog bite + heal, Tater roast spit, Zorp pocket hop, Pebbo coil slam + hit block
  - Auto-aggro creeps near you; damage scales lightly with level
- **Boss exit portal** — after clearing a land boss, a cyan portal appears in the arena; step on it (or E) to zip back to that dungeon's mouth (`b1_entrance` / Woodz Edge / Dezertz Edge)

### Changed

- **Shell design + ADA pass (EMA council)** — top menubar (not center-only stack); IBM Plex Mono body + Press Start display; larger type / looser line-height; AA-friendlier muted colors; focus rings; skip link; controls side panel; auth/feedback shared form styles; in-game dialog/HUD/inventory type floors raised

### Fixed

- **Kingdomz exit / map UX** — Royal Road & courtyard mid-band widened (3 tiles) so west trail exit is not a one-tile needle; mapz opens on current land (not always surface)
- **HUD clutter / overlap** — two-row chrome (vitals | place + controls); hearts cap to numeric when many; controls no longer share a line with room titles
- **Best Bud Hollow softlock** — continue-save default spawn was `(8,5)` inside a sealed pen (and on water). Hollow layout opened; continue spawn prefers room entrance / walkable tiles.
- **Best Bud den empty** — den creature only spawned at stage `accepted`, but Prizella's first talk left you on `offered`, so the hollow looked empty. Bud always waits until recruited; den or one Prizella talk can start the friendship.
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

- **Landing at `/` + game at `/play`** — marketing welcome, how-to, philosophy, Ko-fi tip jar; see [`docs/landing-support-v1.md`](./docs/landing-support-v1.md)
- Secondary champion quests
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
