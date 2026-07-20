# DUNJUNZ

**An epic of questionable questing.**

A humorous retro top-down dungeon crawler in the spirit of the original *Legend of Zelda*, stuffed with affectionate parody of classic dungeon tropes, D&D table energy, original *Star Trek* away-team misfortune, and fantasy door riddles that were never subtle.

Built for the browser. Hosted under **NeaseMedia** on Vercel.

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
| E | Talk / read / open chest |
| B | Buy featured item from nearby merchant |
| I | Open / close inventory + character sheet |
| U | Use a healing potion from the bag |
| W H C L F G N K | *(inventory open)* Cycle equip slots |
| 1–5 | *(inventory open)* Spend STR DEX VIT INT LCK |
| Enter / Space | Advance dialog (does not re-open) |
| Esc | Close inventory, or pause |
| M (while paused) | Return to title |
| R (on title) | New game (clears save) |

Progress is stored in `localStorage` (`dunjunz-save-v1`).

## RPG systems (v0.4)

- **XP curve** — formula `6 + 4L + 0.5L²` per level band; harder as you climb
- **Attributes** — STR DEX VIT INT LCK; **+2 points per level**; spend in inventory with **1–5**
- **8 equip slots** — weapon, helmet, breastplate, greaves, shoes, gloves, amulet, key
- **Rarity + enhancement** — common→legendary; gear rolls on chest open (LCK helps)
- **Key item** — shows on paper-doll + bag; must equip to open locked doors
- **Avatar** — layered look for breastplate, helmet, amulet, hip weapon, belt key
- Pure modules under `src/systems/` with `npm test`

## Vertical slice (v0.1+)

- Title screen + continue / new game
- Overworld meadow with the obligatory old man and starter sword
- Multi-room dungeon:
  - Entrance skeletons
  - The apologetic gelatinous cube
  - “Speak friend and enter” key door
  - USS Plot Hole (redshirts + captain’s log)
  - Hall of Bad Ideas
  - Boss: the Dungeon Master
- Chests + tinkerer merchants on the trail and near the throne
- Hearts, key, combat, lava hazard, malfunctioning transporter pads
- CRT chrome UI, pixel-art textures generated at runtime (no external sprite pack required)

## Stack

- **Phaser 3** — 2D game runtime
- **Vite + TypeScript** — build tooling
- **Vercel** — static hosting (`vercel.json` included)

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
