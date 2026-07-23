# DUNJUNZ

**The ultimate top down RPG.**

A free, humorous retro top-down RPG in the spirit of the original *Legend of Zelda*, stuffed with affectionate parody of classic dungeon tropes, D&D table energy, original *Star Trek* away-team misfortune, and fantasy door riddles that were never subtle.

**No ads ever.** Built for the browser. Hosted under **NeaseMedia**.

- **Landing:** [https://dunjunz.com](https://dunjunz.com)
- **Play free:** [https://dunjunz.com/play](https://dunjunz.com/play)
- **Changelog:** [`CHANGELOG.md`](./CHANGELOG.md)

## Play (local)

```bash
npm install
npm run dev
```

- Landing: `http://localhost:5173/`
- Game: `http://localhost:5173/play/`

```bash
npm run build
npm run preview
```

## Support

Dunjunz is free. **No ads ever.** Optional tips: [Ko-fi](https://ko-fi.com/neasemedia) (“Tip the bard”). Tips never buy power. Bugs & vibes: support@neasemedia.com.

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
3. **Woodz** (trail north) — wolves, Wolf Lord, forje, wood shardz; **Best Bud Hollow** east after Princess Prizella
4. **Dezertz** (trail south) — cacti, forje, Sand Wraith, **Princess Prizella**
5. **Champion job #1** — find your randomized non-human **Best Bud**, report back to Princess Prizella
6. **Kingdomz** (trail east after rescue) — throne hub; Princess Prizella assigns more jobs
7. **Sewerz** (Job #2) — Royal Goose, meaner creeps, Honk Blade

Intentional spellings: Dunjunz, woodz, dezertz, mapz, forjing, Princess Prizella.

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
- Dezertz + Sand Wraith + Princess Prizella
- Best Bud companion (6 randomized non-human friends) — **fights with you** (stretch, claws, fog, roast, blink, guard)
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

## Accounts + cloud saves (optional)

Local play needs **no account**. Optional cloud identity:

| Mode | Email | How | Slots |
| --- | --- | --- | --- |
| Local | No | Always works | Browser `localStorage` only |
| Guest | **Required** | Footer **Account** → guest | **3** cloud slots (device token) |
| Account | Yes | Magic link email | **3** slots, multi-device |

**Setup**

1. **Vercel → Storage → Create Database → Neon** (or link existing).  
   Integration injects `POSTGRES_URL` (and related keys). The app accepts  
   `DATABASE_URL` **or** `POSTGRES_URL` / `POSTGRES_PRISMA_URL` / etc.
2. Run [`sql/001_auth_slots.sql`](./sql/001_auth_slots.sql) in the **Neon SQL editor**.
3. Also set (Production + Preview), then **redeploy**:

| Key | Value |
| --- | --- |
| `AUTH_BASE_URL` | `https://dunjunz.com` (or your primary domain, no trailing slash) |
| `RESEND_API_KEY` | already used for feedback; also sends magic links |

4. Confirm: `/api/health` shows `"hasDatabaseUrl": true` and `"databaseUrlSource": "POSTGRES_URL"` (or similar).  
   `/api/db-health` should show `"usersTable": true`.
5. Footer **Account** → guest or magic link; title screen **↑↓** select slot, **Enter** load/new, **R** wipe.

Design notes: [`docs/auth-slots-design.md`](./docs/auth-slots-design.md).

## Feedback + email (Resend)

The page footer includes **© 2026 NeaseMedia** and a **Feedback** button. The modal posts to **`/api/feedback`**, which emails **support@neasemedia.com**.

**Preferred transport: [Resend](https://resend.com)** (NeaseMedia account). SMTP remains a fallback if no Resend key is set.

### Vercel env vars

**Project → Settings → Environment Variables** (Production + Preview), then redeploy:

| Field in Vercel | Example |
| --- | --- |
| **Key / Name** | `RESEND_API_KEY` only (no `@`, no spaces, no `=`) |
| **Value** | `re_...` your Resend API key |

Optional (defaults are already set in code):

| Key / Name | Value (example) |
| --- | --- |
| `FEEDBACK_TO` | `support@neasemedia.com` |
| `RESEND_FROM` | `DUNJUNZ Feedback <support@neasemedia.com>` |

**Name** = variable identifier. **Value** = secret or email. Putting `support@neasemedia.com` in **Name** causes Vercel’s “invalid characters” error (`@` is not allowed in names).

Default From in code: `DUNJUNZ Feedback <support@neasemedia.com>` — so you often only need **`RESEND_API_KEY`**. Domain must be verified in Resend.

See [`.env.example`](./.env.example). Local `vite` does not run `/api/*` — use `vercel dev` or a Preview deploy to test.

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

Production: `https://dunjunz.com` (landing) and `https://dunjunz.com/play` (game).

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
- ~~Mobile virtual pad~~ (shipped: touch D-pad + actions on `/play`)

## License

Private / all rights reserved unless otherwise noted by NeaseMedia.

## Staging vs production

See [docs/STAGING.md](docs/STAGING.md). Work on `graphics-v2`; promote to `main` on release schedule only.
