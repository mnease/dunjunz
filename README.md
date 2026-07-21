# DUNJUNZ

**An epic of questionable questing.**

A humorous retro top-down dungeon crawler in the spirit of the original *Legend of Zelda*, stuffed with affectionate parody of classic dungeon tropes, D&D table energy, original *Star Trek* away-team misfortune, and fantasy door riddles that were never subtle.

Built for the browser. Hosted under **NeaseMedia** on Vercel.

**Changelog:** see [`CHANGELOG.md`](./CHANGELOG.md) (kept on GitHub with every notable ship).

## Play

```bash
npm install
npm run dev
```

Open the local URL Vite prints (default `http://localhost:5173`).

```bash
npm run build
npm run preview
```

## Controls

| Input | Action |
| --- | --- |
| Arrow keys / WASD | Move |
| Space / Z | Attack (after you have the sword) |
| E | Talk / read / open chest / mapz / forje / princesz |
| E (near tinkerer) | Open dual-pane shop (buy left / sell right) |
| Arrows / WASD | *(shop / forje open)* Move selection |
| Tab | *(shop open)* Switch buy/sell pane |
| Enter / B | *(shop open)* Buy or sell; *(forje open)* craft |
| B (near merchant) | Open shop (same as E) |
| I | Open / close inventory + character sheet |
| M / Tab | Open / close **graphic mapz** (current land; needs discovered mapz) |
| `[` `]` | *(mapz open)* Switch floor (e.g. B1 / B2 in Dunjunz) |
| `,` `.` | *(mapz open)* Cycle discovered lands |
| F / E | Open **forje grid** when near a forje (inventory open: F = shoes) |
| U | Use a healing potion from the bag |
| W O H C L F G N R K | *(inventory open)* Cycle equip (weapon, shield, armor…, ring, key) |
| 1–5 | *(inventory open)* Spend STR DEX VIT INT LCK |
| 1–9 | *(forje open)* Quick-pick recipe and forge |
| Enter / Space | Advance dialog (does not re-open) |
| Esc | Close inventory / mapz / forjing, or pause |
| M (while paused) | Return to title |
| R (on title) | New game (clears save) |

Progress is stored in `localStorage` (`dunjunz-save-v1`). Save **v5** adds mapz, visited rooms, princesz quest, land clears, best bud fields.

## Quest (v0.6)

1. **Meadow** — old man, starter sword, surface mapz
2. **Dunjunz** (stairs in meadow) — beat the Dunjun Master for **great loot** (Dunjun Cleaver + mapz of woodz/dezertz)
3. **Woodz** (trail north) — wolves, Wolf Lord, forje, wood shardz; **Best Bud Hollow** east after Prizella
4. **Dezertz** (trail south) — cacti, forje, Sand Wraith, **Princesz Prizella**
5. **Champion job #1** — find your randomized non-human **Best Bud**, report back to Prizella

Intentional spellings: Dunjunz, woodz, dezertz, mapz, forjing, Princesz Prizella.

## RPG systems (v0.6)

- **XP curve** — formula `6 + 4L + 0.5L²` per level band; harder as you climb; **no level-10 cap**
- **Attributes** — STR DEX VIT INT LCK; **+2 points per level**; spend in inventory with **1–5**
- **8 equip slots** — weapon, helmet, breastplate, greaves, shoes, gloves, amulet, key
- **Rarity + enhancement** — common→legendary; forjing enhancement 0–3
- **Forjing** — craft weapons, +enhancement, imbue +STR/+DEX/+VIT on weapons with ores/shardz
- **Mapz** — discoverable per land; fog-of-war for visited rooms
- **Key item** — shows on paper-doll + bag; must equip to open locked doors
- **Avatar** — layered look for breastplate, helmet, amulet, hip weapon, belt key
- Pure modules under `src/systems/` with `npm test`

## Content

- Title screen + continue / new game
- Surface meadow + trope trail
- Dunjunz multi-floor (B1–B2): cube, speak-friend key, redshirts, Dunjun Master
- Woodz + Wolf Lord + forje + Best Bud Hollow
- Dezertz + Sand Wraith + Princesz Prizella
- Best Bud companion (6 randomized non-human friends)
- Chests, dual-pane tinkerer, graphic forje, hearts, lava, pads
- CRT chrome UI, procedural pixel textures (no external sprite pack)

## Stack

- **Phaser 3** — 2D game runtime
- **Vite + TypeScript** — build tooling
- **Vercel** — static hosting (`vercel.json` included)

## Project Hive Mind

Dunjunz has an **isolated Hive Mind silo** (domain-scoped MCP token on Forge):

- Domains: `dunjunz-build` (writes), `dunjunz-fact` (pins), `dunjunz` (lore)
- Tenant slug: `dunjunz`
- Setup notes: [`HIVE.md`](./HIVE.md) · agent rules: [`AGENTS.md`](./AGENTS.md)
- Local MCP: copy `.grok/config.toml.example` → `.grok/config.toml` with the project bearer

This is separate from the primary Elastic Hive operator memory so game sessions stay free of platform clutter.

## Deploy (NeaseMedia)

### Option A — Vercel CLI (team `neasemedia`)

```bash
npm i -g vercel
vercel login
vercel link --yes --scope neasemedia
vercel --prod
```

### Option B — GitHub → Vercel

1. Create repo under GitHub user/org of your choice (e.g. `NeaseMedia/dunjunz` or `mnease/dunjunz`).
2. In Vercel → team **neasemedia** → Add Project → import the repo.
3. Framework preset: **Vite**. Output directory: `dist`.
4. Deploy.

Production URL will look like `https://dunjunz.vercel.app` (or a custom domain you attach).

## Project layout

```
src/
  main.ts              # Phaser bootstrap
  config.ts            # Canvas size, colors, constants
  data/world.ts        # Rooms, entities, dialog (content bible for the slice)
  scenes/              # Boot, Title, Game, UI
  systems/             # Save + procedural textures
```

## Content note

All references are **parody / homage**, not licensed IP. Names and beats are twisted on purpose so the game stays in fair-use tribute territory while still reading as “oh yeah, that trope.”

## Roadmap (after the slice)

- More dungeons and overworld hubs
- Inventory screen and gear gags
- Extra boss patterns and item gates
- Optional AI-assisted pixel assets via Imagine pipeline
- Sound (chiptune SFX / stingers)
- Mobile virtual pad

## License

Private / all rights reserved unless otherwise noted by NeaseMedia.
