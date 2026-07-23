# Terraria visual system — LOCKED design v1

**Status:** **SUPERSEDED** (2026-07-23 Graphics-v2 Core Keeper council).  
**Phase S:** `src/systems/continuous-ground.ts` hard-deleted on `graphics-v2` — continuous paint cannot re-enter the live bundle.  
Historical archive of the failed continuous-ground / “skin smaller pixels” experiment.  
**Do not implement new work from this doc.** Canonical law: [`graphics-v2-style-bible.md`](./graphics-v2-style-bible.md) · plan: [`graphics-v2-rebuild-plan.md`](./graphics-v2-rebuild-plan.md).

**Prior status:** LOCKED (EMA Council 2026-07-23) — retained below for provenance only.  
**Goal (historical):** Entire crawl reads like **Terraria-style small pixels**: hard edges, limited palettes, jagged organic silhouettes, stepped light/shadow — **not** soft gradients or giant stamped tiles.

## Council seal

| Agent | Focus | Verdict |
| --- | --- | --- |
| **EMA** | Unify ground + sprites + weather + light under one style law | LOCK |
| **Scout** | Shipped continuous ground, structure props, light cookies, weather particles, pixel-art entity draws | Facts |
| **Hexis** | Micro-pixel = `TERRARIA_PIXEL` (2 world px); 24 micro-cells per logic cell; domain-warped hard materials | Numbers LOCK |
| **Mason** | Central `terraria-style.ts` post-process on `canvasTex`; ground paint rules; weather tex | Ship |
| **Waggle** | Risk: over-outline UI chrome; over-dark rooms | Skip outline on pure UI icons if unreadable; light still soft-min black |
| **Pollen** | Warm torch gold, cool cave shadow, material palettes 3–5 colors | LOCK |
| **Comb** | Doors/cave mouths stay readable structure props | Keep |
| **Wax** | No new scene engines; Phaser canvas textures only | Compliant |

## Style law (all surfaces)

1. **Small pixels only** — no giant cell-sized texture stamps as the main ground look.
2. **Hard material edges** — domain-warped land biomes; **fluids use SDF + noise shores** (Core Keeper pools, not rectangle lava/water). No soft blur.
3. **Jagged organic edges** — 1px nibble on dense silhouettes (trees, characters). Soft ambient (koi/crab/sign) skips jagged grow — it created tile-shaped black cages.
4. **1px dark outline** on characters/props (Terraria entity read).
5. **Drop shadow** — 1–2px offset dark under entities/foliage (not soft blob only; skip underwater ambient).
6. **Stepped light** — light cookies use quantized rings, not pure smooth radial only.
7. **Limited palettes** — 3–5 colors per material; hard shade steps; water depth via world-space fBm.
8. **Weather** — rain/snow as hard pixel streaks/flakes, not soft circles.
9. **Fine density** — `TERRARIA_PIXEL = 2` (24×24 micro-pixels per logic cell) for almost-realistic while pixelated.

## Systems map

| Surface | Implementation |
| --- | --- |
| Ground / snow / cliffs | `continuous-ground.ts` fine micro-pixels + domain-warp + grit flecks |
| Water / lava shores | `fluidSignedDistance` + `FLUID_SHORE_AMP` noise threshold; crust/foam rims |
| Characters / enemies / NPCs | `canvasTex` post: outline + jagged + drop shadow (`terrariaEntityPassOpts`) |
| Soft ambient (koi/crab/sign) | Outline + color snap only — no jagged grow / shadow |
| Trees / palms / foliage | Full entity post + canopy lobe nibble |
| Doors / cave mouths | Structure props + sharp ground pads |
| Torches / light | Pixel-step light cookie; warm peak |
| Rain / snow | Dedicated `precip_rain` / `precip_snow` textures |
| Caves | Dark ambient + jagged basalt palette (existing + edge rules) |

## Non-goals

- Full Terraria engine / world gen
- Smooth PBR / normal maps
- Removing continuous ground in favor of mega-tiles again

## Next

Implement helpers → wire canvasTex + ground edges + weather + light cookie → verify.
