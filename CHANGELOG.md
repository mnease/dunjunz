# Changelog

All notable changes to **DUNJUNZ** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project aims to follow [Semantic Versioning](https://semver.org/).

Live: [dunjunz.com](https://dunjunz.com) · Play: [dunjunz.com/play](https://dunjunz.com/play) · Repo: [mnease/dunjunz](https://github.com/mnease/dunjunz)

---

## [Unreleased]

### Added

- **Mid-boss wardens (P0 + P1)** — new `miniboss` combat tier (HP 36 / contact 3 / XP 18, between elite and land boss). Permanent kills only; never sets `bossDefeated`, land clear, or exit portals. **Floor Captain** on Dunjunz `b4_side` (BADGE CHECK, base HP 40) — soft mid (hall → descent stairs stay free).
- **Mobile play (EMA council)** — on-screen D-pad + ATK / TALK / BAG / MAP / USE / MENU on `/play` for touch devices. DOM pad (not Phaser joystick) ORs into GameScene input.

### Added

- **Mobile mode (explicit)** — force on-screen D-pad + buttons via **MOBILE** topbar toggle, Settings checkbox, or `/play?mobile=1` (persists in browser). Auto-detect still works; forced mode no longer depends on flaky pointer media queries.
- **Title menu touch path** — big **PLAY / CONTINUE** and **NEW GAME / MODES** buttons; tap mode rows to start; pad ATK/TALK confirms, ↑↓ moves, MENU back. No keyboard required to leave the title screen.

### Fixed

- **ESC → Main Title freeze** — `scene.start('Title')` mid-`update` after pause could hang Phaser. Title exit is deferred one tick, Game+UI fully stopped, pause overlay has tappable **RESUME** / **MAIN MENU**.

### Changed

- **Mobile full-screen overlay controls** — game fills the viewport; D-pad (left) and actions (right) sit as a translucent HUD on the playfield (no dock that squishes the canvas).
- **Larger inventory icons** — bag cells ~68px with ~2× icon scale; equip-slot frames/icons enlarged so gear silhouettes are readable.

### Fixed

- **Class-mismatched gear greyed out** — once you have a class, bag icons for wrong armor type / class sets grey out. Detail + equip toast use notices like **MUST BE A BARBARIAN TO WEAR THIS**. Pre-class and buddy gear mode unchanged.
- **Room-exit freeze (buddy strike)** — Best Bud delayed lash could call `setVelocity` after the target sprite was destroyed on room transition (`budStrike` crash). Now marks actors dead on clear, bumps a room epoch for in-flight hits, and guards live body before knockback.
- **iPhone layout** — pad docks **under** the canvas (not over a short 16:9 frame). Full-viewport `touch-play` shell, safe-area insets, rubber-band lock, Phaser scale refresh on dock/orientation. Pointer-only pad input with `setPointerCapture` (no pointer+touch double-fire). Site chrome hidden while crawling so the playfield + dock fit.

### Changed

- **Buddy shows equipped gear** — Best Bud world sprite + inventory doll paint weapon, armor, helm, shield, amulet, ring, gloves, greaves, and shoes from `budEquipped` (same look IDs as the hero, fitted to the critter). Pose swaps keep gear via on-demand pose+loadout textures.
- **Readable gear silhouettes** — breastplates (cuirass + pauldrons), helmets (visor, horns, brimmed mage hat), boots (shaft + toe + sole), gloves (fingers, not boot blocks), greaves (knee/shin), and kite/heater shields. Inventory icons match.
- **Depth personality** — each basement floor darkens (tile tint + void), gains cramped/maze layouts, more lava/water/clutter, denser/meaner creeps, and a first-visit toast (`B3 · COLD STONE · THREAT T…`). Threat scales steeper with depth so B7 hits harder than B2.

### Fixed

- **Hero foot walk cycle** — while moving, left/right plant frames on greaves and boots (on-demand textures for current loadout). Idle returns to plant; honors reduce-motion; left/right flipX.
- **ESC → title freeze** — pause **M** (main title) stopped Game but left the UI HUD scene running over the title (looked frozen / unresponsive). Now stops UI, clears pause/pad state, and removes a leaked save listener before starting Title.
- **Single doorways** — room stretch no longer paints three D tiles in a row; each authored door is one rim tile with wall flanks.
- **Tinkerer shop pagination** — shop stock and player bag grids paginate (3×4 / 4×4). Labels show range + page; `[` `]` / Page Up·Down / on-screen ◀▶ flip pages on the focused pane.
- **Level-scaled tinkerer stock** — shop listings unlock with hero level (L1 basics → L15 endgame). Better armor/weapons/mats appear as you grow.
- **Buddy-only gear** — critter kit (collar, sash, paws, booties, spike hat, claw, shell, mail, fang…) sells with a **BUD** tag. Heroes cannot equip it; Best Buds can (inventory **Y**).
- **32-bit craft graphics (EMA council)** — stay ART_RES 32; shared face/hair/blade helpers. Hero cartoon eyes + hair mass + bangs; sharper weapon edges/tips/hilts; buddy tufted ears + cartoon face; slime/skeleton/redshirt face pass. No ART_RES bump (world scale stable).
- **Room flow audit (EMA council)** — halls open east to side chambers (not west); foyers/boss arenas seal orphan edge mouths; wood/sand/sewer templates match N/S/E/W links. `validateRooms` CI guard keeps doors, stairs, bidirectional links, and map coords honest.
- **Map tile detail (16-bit)** — dungeon floors (irregular cobbles, cracks, moss), walls (3-row staggered brick + grit), grass (dense blades + flowers), dirt ruts, water/lava frames, doors/stairs/pads, and mapz cells/links all redrawn to match avatar/weapon density.

- **Class clothing & D&D armor categories** — gear is **cloth / light / medium / heavy**. Class proficiency (primary *or* secondary) keeps full DEF; wrong category soft-nerfs DEF (×0.65). Affinity pieces (wizard cloak, ranger cloak/sheath, fighter plate, cleric vestments, barbarian hide…) grant **+1 DEF** when you have that class. Loot biases armor by class.
- **Equip compare arrows** — bag gear shows **green ▲** if ATK/DEF beats the piece in that slot (hero or buddy mode), **red ▼** if worse. Detail line: e.g. `ATK 4 ▲ (+2 vs equipped 2)`.
- **4× dungeon depth** — each dunjun land is much deeper: **Dunjunz B1–B8** (throne on B8), **Woodz / Dezertz B1–B3** under deep/tower, **Sewerz B1–B4** (goose on B4). Stairs chain + mapz floors; old `b2_boss` saves alias to `b8_boss`.
- **16-bit graphics pass** — art resolution **32×32** (was 16×16) with shading, outlines, dither, and gradients across tiles, avatar gear layers, inventory icons, enemies, props, and buddies. World layout unchanged (`SPRITE_SCALE` keeps footprint); inventory doll scaled up to show detail.
- **Dungeon fills 16:9 (playable stretch)** — rooms are **26×13** with the **walkable interior stretched** across the widescreen (not brick padding around a 16×11 box). Entities map proportionally.
- **Door rims sealed** — stretch no longer leaves floor holes beside doors; single doors become a short multi-tile mouth (`DDD`) with solid wall flanks.
- **Readable unique weapons** — every weapon has a distinct silhouette on hip, inventory icon, and swing FX (short sword · iron broadsword · sand saber · cleaver · honk blade · bow · **hunter crossbow** · phaser · staff). Bow ≠ crossbow ≠ phaser at a glance.
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
