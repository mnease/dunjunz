# Terraria visual system — LOCKED design v1

**Status:** LOCKED (EMA Council 2026-07-23).  
**Goal:** Entire crawl reads like **Terraria-style small pixels**: hard edges, limited palettes, jagged organic silhouettes, stepped light/shadow — **not** soft gradients or giant stamped tiles.

## Council seal

| Agent | Focus | Verdict |
| --- | --- | --- |
| **EMA** | Unify ground + sprites + weather + light under one style law | LOCK |
| **Scout** | Shipped continuous ground, structure props, light cookies, weather particles, pixel-art entity draws | Facts |
| **Hexis** | Micro-pixel = `TERRARIA_PIXEL` (3 world px); 16 micro-cells per logic cell; hard nearest material | Numbers LOCK |
| **Mason** | Central `terraria-style.ts` post-process on `canvasTex`; ground paint rules; weather tex | Ship |
| **Waggle** | Risk: over-outline UI chrome; over-dark rooms | Skip outline on pure UI icons if unreadable; light still soft-min black |
| **Pollen** | Warm torch gold, cool cave shadow, material palettes 3–5 colors | LOCK |
| **Comb** | Doors/cave mouths stay readable structure props | Keep |
| **Wax** | No new scene engines; Phaser canvas textures only | Compliant |

## Style law (all surfaces)

1. **Small pixels only** — no giant cell-sized texture stamps as the main ground look.
2. **Hard material edges** — nearest-cell biomes; no soft blur between dirt/grass.
3. **Jagged organic edges** — 1px nibble on silhouettes (trees, characters, props).
4. **1px dark outline** on characters/props (Terraria entity read).
5. **Drop shadow** — 1–2px offset dark under entities/foliage (not soft blob only).
6. **Stepped light** — light cookies use quantized rings, not pure smooth radial only.
7. **Limited palettes** — 3–5 colors per material; hard shade steps.
8. **Weather** — rain/snow as hard pixel streaks/flakes, not soft circles.

## Systems map

| Surface | Implementation |
| --- | --- |
| Ground / snow / cliffs | `continuous-ground.ts` Terraria micro-pixels + edge darken between kinds |
| Characters / enemies / NPCs | `canvasTex` post: outline + jagged + drop shadow |
| Trees / palms / foliage | Same post + canopy lobe nibble |
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
