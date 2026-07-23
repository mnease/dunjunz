# Dunjunz Graphics System v2 — Architecture Plan

**Status:** Council plan LOCKED + **P0 live restore shipped** (2026-07-23).  
**Trigger:** Continuous ground + Terraria post-process still fails Core Keeper quality; blotchy water, no clean tan shores.  
**North star:** Discrete autotile truth (Terraria / Core Keeper), not noise-skinned continuous paint.  
**Live `main`:** full graphics revert — discrete tiles + pre-terraria sprites/light (no entity outline pass, soft radial light cookie).  
**Archive tag:** `archive/continuous-ground-2026-07-23`  
**Rebuild branch:** `graphics-v2` (autotile + land-aware shore rings next).

---

## A. How reference games build graphics (ground-up)

### A1. Terraria (side-view digger)

| Layer | What it is | Notes |
| --- | --- | --- |
| **World grid** | Dense 2D array of tile structs (world ~8400×2400 max) | Collision + type live on the cell |
| **Solid tiles** | Block type + **frame/style** from neighbors | Autotile frames, not painted blobs |
| **Liquids** | **Separate fields** on the cell: `liquidType` + `liquidAmount` (0–255) | Water is not “replace tile with water texture forever” in isolation; fill height is amount-driven |
| **Render** | SpriteBatch only **in-view** tiles; update **dirty rects** when blocks/liquids change | Never re-rasterize entire world as one noise canvas |
| **Seams** | Bitmask / multi-frame corners so dirt/stone/grass connect | Bitmasking is industry standard (4-bit edge → 16 frames, or 8-bit blob → ≤47/256) |
| **Entities** | Separate sprites (player, NPC, item) with outlines/shadows as art | Not post-processed whole-room bitmaps |
| **Lighting** | Tile lighting grid (separate from sprite art) | Light is a system, not baked into ground paint |

**Liquids without interior blotches:** settled liquid fills whole or partial cells; frames are drawn from liquid texture + amount. Interior cells that are full liquid look solid because they **are solid tiles of liquid fill**, not per-pixel SDF decisions that can flip interior samples to land/void.

### A2. Core Keeper (top-down digger — closest aesthetic target)

| Layer | What it is | Notes |
| --- | --- | --- |
| **World grid** | Discrete tile IDs (ground, wall, pit, floor, wateredGround, bridge, …) | Type list is explicit (wiki Tile IDs) |
| **Autotile** | Wall/ground **blob / 17-tile** style sets (community tools expand blob sets) | Shore and wall corners come from **neighbor masks**, not continuous morph |
| **Scale** | Native **16×16** tile craft (community maps / art practice) | Camera zooms integer-ish; crisp nearest neighbor |
| **Water** | Water / pit / watered ground as **types**; shores are transition tiles | Clean edges because transitions are authored frames |
| **Props / entities** | Placed objects on top of tile layer | Separate from ground mesh |
| **Lighting** | Ambient + local lights over the tilemap | Again separate system |

### A3. Shared pattern (the law we violated)

```
Logic grid  ──►  Autotile visual frames  ──►  Entity sprites  ──►  Lighting  ──►  Weather/FX
     │                    │
     └── collision only   └── never invent material with per-pixel noise that disagrees with logic
```

**Not:** logic grid → per-micro-pixel SDF/noise re-decide kind → full-room canvas → optional shimmer overlay → hope outlines fix it.

### A4. Autotile mechanics (concrete)

**4-bit edge mask (Wang/edge, 16 frames):**

```
N=1, E=2, S=4, W=8
mask = (N?1:0)|(E?2:0)|(S?4:0)|(W?8:0)
frame = MASK_TO_FRAME[mask]   // 16 sprites
```

Neighbor test: `isSameMaterial(nx,ny)` (same kind or “connects with” set).

**8-bit blob (corners, up to 47 unique tiles in RPG Maker style):**

```
bits: NW N NE W E SW S SE
```

Use blob for grass/dirt/water shores where diagonal corners matter.

**Marching squares** is the same idea as 4-corner masks; optional for smooth vector shores — **not recommended** for Dunjunz v2 (more code, less “pixel game”).

---

## B. Root cause: why “skin smaller pixels” fails

### B1. What we built (current stack)

| Piece | Role |
| --- | --- |
| `TileKind[][]` | Still drives collision (`SOLID`, `addWallAt`) |
| `paintContinuousGround` | Full-room ImageData at `TERRARIA_PIXEL=2` (~24×24 micro-px per logic cell) |
| `resolveVisualKind` | Domain warp land + **SDF+noise fluid shore** reclassifies each micro-pixel |
| `paintContinuousWaterOverlay` | Multi-phase shimmer canvas on top |
| `terraria-style.ts` | Outline / jagged / drop-shadow on entity `canvasTex` |
| `textures.ts` | Still generates `tile-*` stamps (mostly unused for ground) |

### B2. Failure modes (evidence-linked)

1. **Material is no longer a function of the cell.** Collision says “water”; paint may nibble rim to dirt, spill fluid onto grass, or (historically) punch holes when SDF/noise disagreed with `sampleKind`. Interior solid-body fix (`FLUID_SHORE_BAND`) is a band-aid on a wrong model.
2. **No autotile language.** Core Keeper shores look good because **edge frames exist**. We only have palette noise + crust heuristics (`fluidShore` foam), so edges look “organic” but **not designed**.
3. **Resolution cosplay.** `TERRARIA_PIXEL=2` + nearest upscale mimics density but not **authored pixel decisions**. Noise at 2px grain still reads as blotchy soup, not tileset craft.
4. **Two water systems.** Discrete `tile-water-*` anim keys + continuous overlay phases fight each other; animation amplifies surface holes.
5. **Post-process on entities ≠ terrain system.** Outlines on slimes do not fix pond topology.
6. **Performance / complexity tax.** Room enter regenerates large canvases; every shore tweak reopens fractal/SDF knobs. Autotile is O(cells) frame pick — cheap and deterministic.

### B3. Blotchy water (user pain) in one sentence

We tried to **synthesize** pond silhouettes with continuous fields; reference games **compose** ponds from solid fluid cells + **shore transition tiles**. Holes appear whenever the continuous field is not identically “fluid” for every interior sample — animation then makes holes shimmer.

---

## C. Proposed Dunjunz Graphics System v2

Named subsystems. Logic stays room-based (16×11 authored → expand to `VIEW_TILES_*`); only the **visual terrain pipeline** is replaced.

### C0. Style law (replaces terraria-visual-system continuous-ground mandate)

1. **Every ground pixel belongs to exactly one visual tile frame** chosen by autotile rules from the logic grid (+ optional shore ring expansion).
2. **No domain warp that reassigns kind** for paint. Optional grit is **inside** a frame (or variant index), not a second material field.
3. **Fluids are solid cell fills** + **shore border tiles**; no SDF morph.
4. **Animation optional and late** — static water first.
5. **Entities keep** outline/shadow entity pass if it still reads; do not run jagged grow on UI.

### C1. `LogicGrid` (KEEP)

- `TileKind`, ASCII parse (`CHAR_TO_TILE`), room expand, collision solids, hazards, doors, stairs.
- Pure systems: `water-bodies.ts` classification for **gameplay** (pond koi, ocean, river) stays; visual shore does not depend on continuous paint.

### C2. `VisualTilemap` (NEW — primary terrain)

**Responsibility:** For each logic cell, choose texture key + optional flip, place Phaser Image (or single batched texture later).

```
visualFrame(x,y) =
  structureProp? → prop sprite
  fluid?         → fluidAutotile(mask) + depth variant
  land?          → landAutotile(mask) or solid fill + variant
```

**Implementation sketch:**

```ts
// src/systems/autotile.ts
export type AutotileSet = {
  /** 16 edge frames or 47 blob frames keyed by mask */
  frames: Record<number, string>; // mask → texture key
  connects: (a: TileKind, b: TileKind) => boolean;
};

export function edgeMask4(
  grid: TileKind[][],
  x: number,
  y: number,
  isMatch: (k: TileKind) => boolean,
): number {
  const n = isMatch(grid[y - 1]?.[x] ?? 'void') ? 1 : 0;
  const e = isMatch(grid[y]?.[x + 1] ?? 'void') ? 2 : 0;
  const s = isMatch(grid[y + 1]?.[x] ?? 'void') ? 4 : 0;
  const w = isMatch(grid[y]?.[x - 1] ?? 'void') ? 8 : 0;
  return n | e | s | w;
}
```

**Texture generation (procedural first, art later):**

- For each material, generate **16 edge frames** at `ART_RES` (or native 16 then upscale 4× to 64) via canvas: full fill + dark edge where bit says “open to other material”.
- Water: mid-blue fill + darker bottom edge + optional 1px foam on open sides.
- Variants: 2–4 fill noise patterns **that never change silhouette** (hash from `tx,ty` only for fill flecks).

### C3. `ShoreBorder` (NEW — user tan ring)

**Goal:** Thin tan sand/dirt border around water.

**Algorithm (deterministic, grid-native):**

```
// Pass 1 — mark shore candidates on LAND cells adjacent to water (4-neigh)
for each cell (x,y):
  if isWater(grid[y][x]): continue
  if isSolidWall(grid[y][x]): continue  // optional: skip walls
  if any 4-neighbor is water:
    visualOverride[y][x] = 'sand'   // or 'dirt' inland, 'sand' on beach

// Pass 2 — optional 8-neigh for diagonal pockets (thinner look: use 4 only first)

// Pass 3 — autotile sand frames against water/land neighbors
// Sand cells that touch water get "wet edge" frame variant
```

**Exact rules (recommended default):**

| Rule | Value |
| --- | --- |
| Shore material | Beach land → `sand`; meadow/woodz → warm `dirt` tan palette; dwarvez → packed dirt/snow-dirt |
| Width | **1 logic cell** only (thin) |
| Placement | Land cells with N/E/S/W water neighbor |
| Water cells | Stay full water (no holes); do **not** replace water with sand |
| Walls/doors | No shore paint over structure kinds |
| Collision | Unchanged — sand/dirt still walkable; water still solid |

**Optional dual-layer look (Core Keeper-ish):** keep land tile under a **half-transparent shore overlay sprite** only on the water-facing edge (advanced; not P0).

### C4. `FluidLayer` (NEW — replaces continuous water overlay)

- Full-cell water/lava images from autotile set.
- **Static by default** (kill shimmer phases until autotile reads clean).
- Later: 2-frame palette swap **without silhouette change** (old `tile-water` / `tile-water-b` style).
- `water-bodies` still picks ocean/pond/river **palette** (hue), not topology.

### C5. `EntitySprites` (KEEP + thin)

- Keep procedural `textures.ts` / `pixel-art.ts` / appearance pipeline.
- Keep light `terraria-style` outline + drop shadow on **characters/props only**.
- Drop jagged grow on ambient if it cages koi again.

### C6. `LightingRT` (KEEP)

- `lighting.ts`, surface sun, cookies — independent of tile strategy.
- May need depth order: ground tiles depth 0, entities higher (already true).

### C7. `WeatherFX` (KEEP)

- Rain/snow particles; season tint on **tile images** (re-apply setTint on map tiles like pre-continuous code).

### C8. `StructureProps` (KEEP idea, simplify)

- Doors / cave mouths / stairs as discrete props or special tile frames — already had `placeStructureProps`; can merge back into VisualTilemap structure branch.

### C9. THROW AWAY (fork only until stable)

| Remove from render path | Why |
| --- | --- |
| `paintContinuousGround` as primary | Continuous reclassification |
| Domain warp `sampleKindWarped` for materials | Breaks grid truth |
| `fluidSignedDistance` shore morph | Holes + non-tile edges |
| `paintContinuousWaterOverlay` multi-phase full-room | Amplifies blotch |
| Style law “no visual tiles” from terraria-visual-system-v1 | Explicitly wrong for v2 |
| Fractal terrain as **placement** of square stamps that still look like a grid of random stamps without masks | Variants without autotile = still cages |

**Keep as libraries if useful elsewhere:** `fractal-noise.ts` for fill grit **inside** a frame; `water-bodies` classification; entity post-process helpers.

### C10. Scale conventions (lock)

| Constant | Keep? | Note |
| --- | --- | --- |
| `TILE = 16` | YES | Logic step |
| `SCALE = 3` | YES | 48 world px per cell |
| `ART_RES = 64` | YES short-term | Or generate 16px tiles and upscale 4× NN for cleaner “true 16” look |
| `SPRITE_SCALE` | YES | Entities cover one cell |
| `VIEW_TILES_W/H` | YES | 16:9 playfield |
| Authored rooms 16×11 + expand | YES | Content stays |
| `TERRARIA_PIXEL = 2` full-room paint | **NO** for terrain | Density comes from tile art, not room ImageData |

**Optional later (Forager):** true 16px source art + integer camera zoom 3 or 4 for mobile; keep logical TILE=16.

### C11. Phaser wiring (Mason-facing)

Replace `paintRoomGround` with:

```
clearMapTiles()
shoreGrid = expandShore(tileGrid, landRules)
for y,x:
  key = resolveVisualTile(tileGrid, shoreGrid, x, y, land, roomId)
  img = add.image(tileToWorld).setScale(SPRITE_SCALE).setDepth(0)
  tag mapTile
  if water|lava: ambientTiles.push (only if anim re-enabled)
  if SOLID: addWallAt (collision only; wall sprite may be invisible or matching)
```

Collision walls can stay invisible physics bodies (current continuous path already separates visual ground from wall sprites in places) — prefer **visible wall tiles** again for readability.

---

## D. Live vs fork split

### D1. Revert live (`main` → players on dunjunz.com / Vercel)

| On live | Action |
| --- | --- |
| Ground render | **Discrete tiles** as of **`7a714bd`** (or a clean cherry-pick that restores per-cell `TEX[kind]` loop **without** continuous-ground) |
| Continuous-ground + SDF fluid | **Gone from main** |
| Entity outline pass | Optional keep if it still looks fine on blocky ground; else disable on main |
| Fellowship / combat / save / content | **Unchanged** — pure systems not tied to continuous paint |
| Water animation | Prefer **static or 2-frame tile swap** on discrete tiles (pre-continuous ambientTiles) |

**Minimal live “make water not ugly” without full v2 (optional P0 hotfix on main):**

1. Revert continuous ground path.
2. If staying continuous briefly: **disable water overlay phases**; force interior fluid solid (already partly done in `8b3700f`); **do not** ship more SDF knobs.

Council recommendation: **do not invest further in continuous-ground on main.** Revert tiles; develop v2 in fork/branch.

### D2. Graphics fork only

| Lives only in fork | |
| --- | --- |
| `autotile.ts` + 16/47 frame generators | |
| `ShoreBorder` tan ring | |
| New texture atlas keys `at-water-*`, `at-sand-shore-*` | |
| Docs superseding terraria-visual-system continuous mandate | |
| Experiments with ART_RES native 16 | |
| Any breaking GameScene refactors for batching | |

---

## E. Phased rebuild plan (PR plan)

### Path decision

| Option | When |
| --- | --- |
| **P0 shore-only on live continuous** | **Not recommended** — still fighting wrong architecture |
| **P0 live revert to tiles** + **fork for v2** | **Recommended** |

### Phase 0 — Stabilize live (same day)

1. Tag current tip: `archive/continuous-ground-2026-07-23`.
2. Restore discrete map tile loop from `7a714bd` (or reconstruct from git show of GameScene tile placement).
3. Remove call path to `paintContinuousGround` / water overlay (leave files dead or delete in follow-up).
4. Ship CHANGELOG: “Restore discrete tiles; continuous ground paused for Graphics v2.”
5. Deploy production.

### Phase 1 — Fork scaffold (graphics-v2)

1. Branch/fork (see F).
2. Add `src/systems/autotile.ts` + vitest mask fixtures (3×3 ponds, corridors, diagonals).
3. Generate 16-frame water + sand-shore + grass + dirt + wall sets procedurally in `textures.ts`.
4. Feature-flag `GRAPHICS_V2=1` in GameScene: old tiles vs autotile path.

### Phase 2 — Shore + water truth

1. Implement `expandShore` (tan ring).
2. Water full-cell + shore autotile; **static**.
3. Visual golden tests: snapshot mask tables; optional canvas hash for pond rooms.
4. Playtest beach_start, woodz healing waters, lava rooms.

### Phase 3 — Land autotile + structure

1. Grass/dirt/snow/floor/wall edge frames.
2. Structure props unified.
3. Season tint reattach.

### Phase 4 — Entity polish (only after terrain reads)

1. Re-enable restrained entity outline/shadow.
2. Optional 2-frame water shimmer (silhouette-fixed).
3. Lighting cookie alignment check.

### Phase 5 — Merge to main

1. Delete continuous-ground from tree (or quarantine under `legacy/`).
2. Update `docs/terraria-visual-system-v1.md` → **superseded by graphics-system-v2**.
3. Cut version bump; deploy.

### Effort guess (Mason)

| Phase | Scope |
| --- | --- |
| P0 live revert | 0.5–1 day |
| P1 scaffold + water/sand autotile | 2–4 days |
| P2–3 land sets | 3–5 days |
| P4–5 polish merge | 1–2 days |

---

## F. Git strategy

### Recommendation: **branch first**, fork only if you want a separate GitHub repo for wild experiments

| Strategy | Pros | Cons |
| --- | --- | --- |
| **`graphics-v2` branch on `mnease/dunjunz`** | One remote, easy PR, Vercel preview deploys | Pollutes branch list slightly |
| **GitHub fork `mnease/dunjunz-graphics`** | Hard isolation; public experiment | Dual remotes, double CI, merge friction |
| **Branch + archive tag** | Best default | — |

**Recommended naming:**

```
tag:    archive/continuous-ground-2026-07-23   # tip before revert
tag:    restore/discrete-tiles-7a714bd         # optional pointer
branch: fix/restore-discrete-tiles             # P0 live
branch: graphics-v2                            # long-running redesign
# optional later:
repo:   mnease/dunjunz-gfx-lab                 # only if branch proves too noisy
```

**Deploy targets:**

| Target | Branch |
| --- | --- |
| Production `dunjunz.com` / Vercel production | `main` (after P0 revert) |
| Preview | Vercel preview on `graphics-v2` PRs |
| Do **not** point production at graphics-v2 until Phase 5 |

**P0 revert options (pick one):**

1. **Hard reset main to `7a714bd`** — **dangerous** (loses fellowship / later content after that commit). **Reject** unless git log shows no valuable commits after except graphics.  
   Reality: many graphics commits after `7a714bd` **and** earlier content is already in history; but commits **after** continuous may include water blotch fixes only. Check `git log 7a714bd..HEAD --oneline` before any reset.
2. **Surgical restore** — bring back tile placement code from `7a714bd` GameScene hunk; keep all non-graphics commits. **Prefer this.**
3. **Revert commits** `git revert` range `f6ef00c..HEAD` graphics-only — may conflict; still prefer surgical.

**Verify before P0:**

```bash
git log --oneline 7a714bd..HEAD
# classify each commit: content vs graphics-only
```

As of 2026-07-23 research, `7a714bd..HEAD` is dominated by continuous/terraria ground work — surgical tile restore or revert-range is viable; **do not wipe fellowship** (that landed before this range: `37fc1378` etc.).

---

## G. Open questions for Mike (operator)

1. **Live P0:** Prefer **surgical discrete-tile restore on main this week**, or keep continuous live while fork cooks (not recommended)?
2. **Shore material:** Always tan **sand**, or **land-aware** (sand beach / dirt meadow / dark dirt cave)?
3. **Shore width:** Strict **1 cell**, or 1 cell + diagonal corners (fatter)?
4. **Water animation:** Accept **static water** until autotile lands, or need 2-frame shimmer on day one of discrete restore?
5. **Art pipeline:** Stay **100% procedural canvas** frames, or invest in hand-pixel 16×16 sheets later?
6. **Entity terraria outline:** Keep on live after tile restore, or strip for pure blocky?
7. **Repo shape:** OK with **`graphics-v2` branch** (recommended), or do you want a **separate GitHub repo** for the experiment?
8. **Success metric:** “Looks like Core Keeper shores in beach + woodz pond screenshots” — any other rooms that must pass before merge?
9. **Scope creep guard:** Confirm Graphics v2 is **render-only** (no room ASCII redesign, no collision changes) unless shore ring later becomes walkable beach gameplay.

---

## Council notes (short)

| Agent | Take |
| --- | --- |
| **Scout** | Terraria = grid + liquid fields + dirty rects; Core Keeper = discrete tile IDs + blob autotile; Dunjunz continuous paint is non-idiomatic for both |
| **Hexis** | Shore = land cells with 4-neigh water → sand override; water mask 4-bit; interior water always full fill → zero holes by construction |
| **Waggle** | **Critical:** more SDF/noise knobs will not hit quality bar; live should not stay on continuous; hard reset to old SHA risks content if range misread — surgical only |
| **Mason** | Implement `autotile.ts` + GameScene flag; restore tile loop from `7a714bd`; vitest masks |
| **Pollen** | Limited 3–5 color palettes **per frame**; tan shore `#c9b080` / `#e8d4a8` band; water mid-blue solid; no near-black pond interiors |
| **Forager** | Discrete autotile ports cleanly to future engines/mobile; continuous room canvases do not |

---

## KEEP vs THROW (checklist)

### KEEP

- Phaser 3 + Vite + TS  
- `TILE=16`, `SCALE=3`, `ART_RES`/`SPRITE_SCALE` short-term  
- 16×11 logic rooms + expand  
- `TileKind` collision grid  
- Fellowship content, combat, save, mapz, forjing  
- `water-bodies` classification for koi/ocean/river gameplay  
- Lighting + weather systems  
- Entity procedural sprites (+ optional outline)  
- `textures.ts` infrastructure (repurpose for autotile frames)

### THROW (render path)

- Continuous room ground as primary visual  
- Domain-warped material sampling for terrain  
- SDF fluid morph / spill as shore model  
- Full-room water shimmer canvases  
- “Skin smaller pixels” as the quality strategy  
- Style lock that forbids visual tiles

---

## Memory / provenance

- Code paths: `src/systems/continuous-ground.ts`, `terraria-style.ts`, `textures.ts`, `water-bodies.ts`, `GameScene.paintRoomGround`  
- Discrete baseline: `7a714bd` GameScene per-cell images + `TEX[]`  
- Continuous introduction: `f6ef00c`  
- Doc supersedes continuous mandate in `docs/terraria-visual-system-v1.md` for future work (that doc remains historical LOCK for the failed experiment)
