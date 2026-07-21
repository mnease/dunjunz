# Changelog

All notable changes to **DUNJUNZ** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project aims to follow [Semantic Versioning](https://semver.org/).

Live: [dunjunz.com](https://dunjunz.com) · Play: [dunjunz.com/play](https://dunjunz.com/play) · Repo: [mnease/dunjunz](https://github.com/mnease/dunjunz)

---

## [Unreleased]

### Changed

- **Buddy combat animations** — Best Buds stretch, grab, claw, spit, blink, coil, and heal with unique poses + elastic limb trails. Idle stretch yawns; grab toward chests/loot; attacks lash toward creeps (Gloop stretch is extra elastic). Honors reduce-motion.
- **Unique equipped gear on avatar** — every slot paints a distinct look on the hero (and inventory doll): swords vs iron vs saber vs cleaver vs honk, phaser / bow / staff, wood / iron / tower shields, leather vs reinforced armor, greaves, boots of apology, gloves, gold / bauble / cube amulets, copper / silver / luck rings, key on belt. Loadout textures generate on demand.
- **16:9 canvas** — game is now **1280×720** (was 768×576 / 4:3). Shell aspect-ratio + max width updated so the playfield fills widescreen without letterbox crush.
- **UI anti-overlap** — HUD vitals reflow after hearts; room title wraps short of hints; dialog docked to bottom; inventory paper-doll / bag / pager / detail / help stacked with fixed bands; title/Army/Village use height-relative layout.
- **Inventory bag sort + pagination** — **T** or **SORT:** cycles DEFAULT → NAME → TYPE → EQUIPPED → RARITY; 8×3 pages with **◀ PREV / NEXT ▶**, wheel, **[ ]** / **PgUp/PgDn**.

### Added

- **New-player email to support** — when a brand-new account is created (guest or first magic-link), Resend notifies `support@neasemedia.com` (or `SIGNUP_NOTIFY_TO`). Signup never fails if mail is down.
- **Creep respawn clock** — common creeps return after ~55–75s a bit tougher (scales with player level + respawn generation). Bosses/quest kills stay permanent.
- **Auto vs manual stats** — Settings → Level-up stats: auto-assign packages (+2 lowest / +1 2nd-lowest; class focus every 5 levels) or keep manual inventory spend.
- **Google Analytics** (`G-P8ZG98HDSC`) on landing + play via deferred `/analytics.js` (idle load; play page delays so Phaser boots first; beacon transport). Not ads.

### Changed

- **Slogan** — "The ultimate top down RPG" · **No ads ever** (landing, play shell, title).
- **World between dungeons** — woodz path full of trees; dezertz dunes with tumbleweeds, stationary spine cacti (bump = ouch), scorpions, tarantulas, hornets.

### Added

- **Army Mode** — graduate crawl heroes at **Lv20+** (`P` in-game or barracks `G`) into an **unlimited roster** (party size = how many you develop). Personalities (berserk, polite murder, sleepy…). Barracks mass level-up: **AUTO** (+2 lowest / +1 2nd-lowest; every 5th level uses focus stats) or **MANUAL** (+2/+1 you pick). Deploy the whole army in over-the-top wave brawls. Title mode **3**.

### Changed

- **Class-weighted weapon loot** — once a class is set, enemy drops and chests bias weapons toward that class (and secondary at multiclass), not always — e.g. wizard → staves, ranger → bows, fighter → blades.
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
