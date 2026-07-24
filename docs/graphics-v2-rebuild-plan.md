# Dunjunz Graphics-v2 Rebuild Plan

**Status:** Design LOCK + **Phase S + A + B + C shipped** on `graphics-v2`.  
**North star:** Core Keeper–inspired discrete autotile world on clean-slate render path  
**Style law:** [`graphics-v2-style-bible.md`](./graphics-v2-style-bible.md)  
**Architecture detail:** [`graphics-system-v2-architecture.md`](./graphics-system-v2-architecture.md) (refined by this doc)  
**Branch:** `graphics-v2` = **staging** · **`main`** = production only on promote  
**Next implement:** Phase D entity polish + optional fluid anim  
**Deploy law:** [`STAGING.md`](./STAGING.md)

| Environment | Branch | URL |
| --- | --- | --- |
| Production | `main` | https://www.dunjunz.com |
| Staging | `graphics-v2` | https://graphics.dunjunz.com · https://dunjunz-graphics-v2.vercel.app |

---

## 1. Executive decision

| Decision | Value |
| --- | --- |
| Model | **Discrete logic grid → autotile visual frames → entities → lighting → weather** |
| Rejected model | Continuous-ground SDF + terraria full-room paint |
| Scope | **Render-only** rebuild preferred; keep fellowship, lands, collision, rooms, combat |
| Art pipeline P0 | Procedural canvas frames at `ART_RES` (16/32 author → NN 64) |
| Art pipeline later | Optional hand-pixel 16×16 sheets |
| Live policy | Do **not** merge unfinished v2 to `main` |
| Archive | Tag `archive/continuous-ground-2026-07-23` (already noted in arch doc) |

---

## 2. Graphics System Spec

Named subsystems. Only the **visual terrain pipeline** is replaced; content and pure gameplay stay.

```
LogicGrid ──► ShoreBorder ──► Autotile / VisualTilemap ──► StructureProps
                                                              │
EntitySprites ────────────────────────────────────────────────┤
                                                              ▼
                                                         LightingRT
                                                              │
                                                         WeatherFX
                                                              │
                                                            HUD
```

### 2.1 `LogicGrid` — KEEP

| Item | Detail |
| --- | --- |
| Responsibility | Collision + gameplay material authority |
| Types | `TileKind` in `src/types.ts` |
| Inputs | ASCII rooms, `CHAR_TO_TILE`, `expandRoomTiles`, door unlocks |
| Solids | `SOLID`: wall, water, void, locked (unchanged unless gameplay asks) |
| Files | `GameScene.parseTiles`, `room-expand`, `room-validate`, `water-bodies` (gameplay classification) |
| Tests | Existing room / water-body pure tests |

**Non-goals:** Do not change room ASCII content for “prettier shores” in P0–P3.

### 2.2 `VisualTilemap` — NEW (primary terrain)

| Item | Detail |
| --- | --- |
| Responsibility | For each logic cell, choose texture key (+ flip), place Phaser Image (or later batch) |
| Depth | 0 |
| Scale | `SPRITE_SCALE` covering one cell |
| Tag | `mapTile: true` for clear/destroy on room exit |
| Resolve order | structure prop? → fluid autotile → shore override land → land/wall autotile → solid fill + variant |

```ts
// Conceptual API — implement when operator says go
visualFrame(grid, shoreGrid, x, y, ctx) → { key: string; flipX?: boolean; tint?: number }
```

**Phaser wiring sketch:**

```
clearMapTiles()
shoreGrid = expandShore(tileGrid, landRules)
for y,x:
  key = resolveVisualTile(...)
  img = add.image(tileToWorld).setScale(SPRITE_SCALE).setDepth(0)
  tag mapTile; apply season/depth tint
  if SOLID: addWallAt (collision; wall sprite visible preferred)
  if water|lava and anim enabled: ambientTiles.push
```

**Baseline today (`graphics-v2` tip):** `placeRoomTiles` already restored discrete per-cell images with fractal **variants** (fill diversity). Autotile masks + shore are the missing Core Keeper step.

### 2.3 `Autotile` — NEW

| Item | Detail |
| --- | --- |
| File (planned) | `src/systems/autotile.ts` |
| P0 | 4-bit edge mask → 16 frames per material set |
| P1 | 8-bit blob for water/land and grass/dirt corners |
| Connect rules | `connects(a,b)` table per set |
| Generation | Procedural in `textures.ts` / dedicated generators: full fill + dark open edges + foam |
| Keys | `at-{material}-{mask}` e.g. `at-water-5`, `at-sand-shore-10` |
| Tests | Vitest 3×3 ponds, corridors, diagonals, isolated cells, full-interior water solid |

```ts
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

### 2.4 `ShoreBorder` — NEW

| Item | Detail |
| --- | --- |
| Goal | Thin tan / sand ring around water (Core Keeper beach read) |
| Width | **1** logic cell |
| Placement | Land cells with N/E/S/W water neighbor |
| Water cells | Stay full water |
| Walls/doors | Skip |
| Collision | Unchanged (shore still walkable land) |
| Land-aware material | Beach → sand; meadow/woodz → warm dirt; cave → packed dirt; snow → gravel-dirt |

Optional dual-layer later: half-transparent wet-edge overlay on water-facing side only — **not P0**.

### 2.5 `FluidLayer` — NEW (replaces continuous water overlay)

| Item | Detail |
| --- | --- |
| Default | Static full-cell water/lava from autotile set |
| Palette | `water-bodies` → ocean / pond / river / koi hue family |
| Animation | Off until Phase polish; then 2-frame key swap **without silhouette change** |
| Banned | `paintContinuousWaterOverlay`, multi-phase full-room shimmer |

### 2.6 `EntitySprites` — KEEP + thin

| Item | Detail |
| --- | --- |
| Keep | `textures.ts`, `pixel-art.ts`, appearance / body / weapon pipelines |
| Outline | Restrained entity outline + drop shadow (Style Bible) |
| Drop / defer | Jagged grow on soft ambient; any full-scene terraria post that cages koi |
| File status | `terraria-style.ts` may be deleted, slimmed, or renamed to `entity-polish.ts` after strip |

### 2.7 `LightingRT` — KEEP

| Item | Detail |
| --- | --- |
| Files | `lighting.ts`, surface-sun, GameScene light RT |
| Math | `lighting-v2-model.md` still applies |
| Look | Soft warm torch; ambient ladder; no pure black; outdoor combat-clear |
| Order | After entities; before weather particles |

### 2.8 `WeatherFX` — KEEP

| Item | Detail |
| --- | --- |
| Particles | Pixel streaks/flakes |
| Ground | `setTint` on VisualTilemap images |
| reduceMotion | Mandatory gate |

### 2.9 `StructureProps` — KEEP idea, unify

| Item | Detail |
| --- | --- |
| Doors / cave mouths / stairs | Discrete props or special tile frames |
| Pads | Dark readable pads under mouths |
| Merge path | Structure branch of VisualTilemap resolve order |

### 2.10 Supporting pure systems

| System | Role in v2 |
| --- | --- |
| `water-bodies.ts` | Gameplay body class + palette hint |
| `fractal-noise.ts` | Fill grit **inside** frames only |
| `floor-depth.ts` | Depth tint on dungeon tiles |
| `seasons-weather.ts` | Season tint + particle weather |
| `vfx.ts` | Combat/motion (orthogonal to terrain) |
| `pixel-art.ts` | Drawing primitives for frame generators |

---

## 3. Strip plan (what dies first on `graphics-v2`)

Goal: **clean-slate render path** — no half-dead continuous path that can be re-imported by mistake.

### 3.1 Already true on tip (as of 2026-07-23 research)

- `GameScene` uses **`placeRoomTiles`** (discrete per-cell images).
- No live imports of `paintContinuousGround` / `paintContinuousWaterOverlay` from scenes (orphan module + tests).
- Full graphics revert commit present: pre-terraria sprites/light on branch history.

### 3.2 Kill order (first implementation PR after plan approval)

| Order | Target | Action |
| --- | --- | --- |
| K0 | Call-site hygiene | Confirm zero imports of continuous paint from `GameScene` / Boot / textures entry |
| K1 | `src/systems/continuous-ground.ts` | Move to `src/legacy/` **or** delete; remove from bundle |
| K2 | `src/systems/continuous-ground.test.ts` | Delete or move with legacy |
| K3 | `paintContinuousWaterOverlay` / shimmer phases | Gone with continuous-ground |
| K4 | Domain warp / `fluidSignedDistance` / `resolveVisualKind` | Gone with continuous-ground |
| K5 | `TERRARIA_PIXEL` constant & micro-paint loop | Gone |
| K6 | Style law in `terraria-visual-system-v1.md` continuous mandate | Mark **SUPERSEDED**; do not re-implement |
| K7 | `terraria-style.ts` jagged grow defaults | Strip from soft ambient keys; keep outline/shadow helpers or rename |
| K8 | Texture keys only used by continuous path | Audit `generateTextures` for dead keys; remove in same PR if safe |
| K9 | Docs index | Point Style Bible + this plan as canonical; update arch doc status |

### 3.3 KEEP through strip

- Discrete `placeRoomTiles` loop (scaffold for VisualTilemap).
- `TEX[]` map and existing `tile-*` generators (seed for autotile fills).
- Fractal **variant** selection that only picks alternate fills (no kind rewrite).
- Lighting, weather, fellowship, combat, save, mapz, forjing.
- Collision `addWallAt` / `SOLID`.

### 3.4 Texture path inventory (strip vs repurpose)

| Path / key family | Fate |
| --- | --- |
| `tile-floor`, `tile-wall`, `tile-grass`, `tile-dirt`, `tile-sand`, `tile-snow` | KEEP as fill bases; evolve into `at-*` sets |
| `tile-water*`, `tile-lava*` | KEEP static frames; wire to FluidLayer; drop continuous overlay |
| `tile-*-{variant}` fractal variants | KEEP until autotile variants replace |
| Continuous room canvas keys (`continuousGroundKey`, water shimmer keys) | **DELETE** |
| Structure prop keys (door, cave mouth) | KEEP |
| Entity / player / buddy / weapon keys | KEEP |
| `precip_rain` / `precip_snow` | KEEP |

---

## 4. Phased PR plan

**Rule:** each phase ships to `graphics-v2` only; production stays classic until Phase M (merge).

### Phase S — Strip clean (0.5 day) — **DONE on graphics-v2**

| Field | Content |
| --- | --- |
| Goal | Zero continuous-ground in active tree; docs supersede terraria continuous law |
| Work | Hard-delete `continuous-ground.ts` + tests; hygiene vitest `graphics-v2-phase-s.test.ts` |
| Acceptance | `rg paintContinuous src` empty; `npm test` green; `placeRoomTiles` only terrain path |
| Playtest rooms | beach_start, first dunjunz room |
| Risks | Accidental delete of shared pixel helpers — review diff carefully |
| Rollback | Revert strip commit on branch |

### Phase A — Autotile core (2–3 days) — **DONE on graphics-v2**

| Field | Content |
| --- | --- |
| Goal | `autotile.ts` + 16-frame procedural fluid sets (water + lava); land still TEX[kind] |
| Work | 4-bit mask + vitest; `at-water-*` / `at-lava-*` boot generation; `placeRoomTiles` resolves fluids via autotile |
| Acceptance | 3×3 pond interiors 100% `at-water-*` frames; center mask 15 full-fill; no continuous paint |
| Playtest | beach_start water line; woodz pond; lava room |
| Risks | Wrong connect rules → checkerboard edges; performance if over-generating textures at boot |
| Mitigate | Generate once in Boot; atlas keys stable; tests first |

### Phase B — ShoreBorder (1–2 days) — **DONE on graphics-v2**

| Field | Content |
| --- | --- |
| Goal | Land-aware 1-cell tan/dirt shore ring |
| Work | `shore.ts` N4 adjacency + land-aware materials; `at-shore-*` boot textures; `placeRoomTiles` override |
| Acceptance | Rim land → shore keys; water stays `at-water-*`; walls/doors never shore; 4-neigh only |
| Playtest | beach_start, woodz healing waters, any river room |
| Risks | Shore on doors/stairs; double-wide ring from 8-neigh too early |
| Mitigate | 4-neigh only P0; structure skip list |

### Phase C — Land autotile + structure unify (2–4 days) — **DONE on graphics-v2**

| Field | Content |
| --- | --- |
| Goal | Grass/dirt/snow/floor/wall/sand edges + structure short-circuit in one resolve path |
| Work | `landAutotileKey` + 16 frames per land material; `structureTextureKey`; placeRoomTiles order structure→fluid→shore→land |
| Acceptance | Interior land full-fill; grass–dirt open edges; wall corridors edged; doors use tile-door |
| Playtest | surface meadow, dunjunz corridor, dwarvez approach, kingdom carpet room |
| Risks | Palette bleed across lands; over-tint fighting autotile dark edges |
| Mitigate | Tint only fill variants; land palette tables in Style Bible |

### Phase D — Entity polish + fluid anim (1–2 days)

| Field | Content |
| --- | --- |
| Goal | Entity outline/shadow restrained; optional 2-frame water/lava |
| Work | Slim entity polish; ambientTiles key swap; no jagged on soft ambient |
| Acceptance | Koi free of cages; player readable on dark; water anim silhouette-fixed |
| Playtest | pond with koi; combat room with 3+ enemies; dark B2 torch room |
| Risks | Outline stacking too thick at ART_RES; anim reintroduces flicker holes |
| Mitigate | Static default; anim flag off until QA pass |

### Phase E — Lighting / weather visual pass (1–2 days)

| Field | Content |
| --- | --- |
| Goal | Soft Core Keeper–ish torch read on new terrain |
| Work | Cookie warmth, optional stepped rings, vignette check, weather tint on new tiles |
| Acceptance | Style Bible lighting rules; outdoor clear; dark survival still threatening but not pure black |
| Playtest | outdoor day, indoor guild, B1, B2+, boss ambient |
| Risks | Over-dark after denser dark edges on tiles |
| Mitigate | Ambient ladder floors; Comb veto if combat clarity drops |

### Phase M — Merge to main (0.5–1 day after bake)

| Field | Content |
| --- | --- |
| Goal | Production Core Keeper–inspired look |
| Work | Delete legacy quarantine if any; CHANGELOG; version bump; update supersede notes |
| Acceptance | All Style Bible screenshot QA rooms pass; full `npm test`; fellowship path smoke |
| Playtest | beach → meadow → dunjunz → woodz pond → one lava → princess path smoke |
| Risks | Main players surprised by look change |
| Mitigate | Preview bake period on graphics.dunjunz.com; operator go/no-go |

### Effort rollup (Mason)

| Phase | Effort |
| --- | --- |
| S Strip | 0.5 d |
| A Autotile core | 2–3 d |
| B Shore | 1–2 d |
| C Land + structure | 2–4 d |
| D Entity + fluid anim | 1–2 d |
| E Light/weather polish | 1–2 d |
| M Merge | 0.5–1 d |
| **Total** | **~8–15 engineer-days** |

---

## 5. Reference table — Core Keeper → Dunjunz

| Core Keeper feature | How CK does it (research) | Dunjunz implementation |
| --- | --- | --- |
| Discrete tile types | IDs: ground, wall, pit, water, wateredGround, bridge, roof… | `TileKind` logic grid; visual materials map 1:1 + shore override |
| Autotile / blob | Compact **17-tile** craft expanded to adaptive **8-bit** neighbor masks (mod tools / runtime) | P0 **4-bit/16**; P1 **blob ≤47**; procedural then optional hand sheets |
| Native tile craft | ~**16×16** art | Author 16/32 → NN `ART_RES=64`; cell display 48px |
| Camera / scale | Large readable pixels; integer scaling option | `TILE=16` `SCALE=3`; nearest neighbor; no bilinear |
| Water as type | Water tile type + shores | Full-cell fluid frames + land shore ring |
| Beach / sea palette | Beach ground `#ebc0be`, sea water `#34d0ff`, dirt `#7f5f32` | Land-aware palettes in Style Bible |
| Organic shores | Transition frames, not SDF | `ShoreBorder` + autotile open-edge foam |
| Prop density | Furniture, ore, plants, crates everywhere | StructureProps + ambient sprites; content density later |
| Soft torch light | Colored local lights; soft bounce (3D engine internals) | Soft RT cookies + warm peak; ambient ladder; no pure black |
| Dark caves | Low ambient + local lights essential | Existing survival dark + fuel torches |
| Object shadows | Optional object shadows in display settings | 1–2px entity drop shadow; no full AO pass P0 |
| Reflections / bloom | Engine features (expensive) | **Out of scope** P0–E; never required for style pass |
| Pit / hole tiles | Explicit pit type | Map to `void` / special frames if content needs; no continuous holes |
| Watered ground | Farm tile type | Defer; not in current Dunjunz content |
| Bridge tiles | Explicit type | Optional later; doors/stairs cover traversal fantasy now |
| Emissive layers | Circuit / special tilesets | Defer; torch sprites + light RT only |
| Weather | Biome atmosphere | `seasons-weather` particles + tint |
| UI | Separate from world tiles | CRT HUD unchanged |

---

## 6. Risks & mitigations (Waggle)

| Severity | Risk | Mitigation |
| --- | --- | --- |
| **Critical** | Reintroducing continuous-ground “just for organic shores” | Style Bible ban; strip Phase S; PR checklist |
| **Critical** | Merge to main before shore/water QA | Phase M gate; preview bake |
| High | Autotile connect bugs → cages / checkerboard | Vitest masks before art polish |
| High | Over-dark after denser tile edges | Ambient floors + outdoor combat QA |
| Medium | Boot-time texture explosion (many masks × materials × lands) | Generate shared sets; land recolors via tint tables |
| Medium | Scope creep into room ASCII redesign | Render-only rule; operator approval for content |
| Medium | Entity outline fights humor tone | Restrained pass; Comb readability review |
| Low | Preview DNS for graphics.dunjunz.com | Vercel alias already; DNS CNAME if needed |
| Low | Players prefer classic blocky forever | Keep main classic until explicit merge |

---

## 7. Open questions for operator (Mike)

Resolved defaults in parentheses; confirm or override before implement.

1. **Shore material:** land-aware (sand beach / dirt meadow / packed cave) **(default YES)** or always sand?
2. **Shore width:** strict 1 cell **(default)** vs 1 + diagonal fattening?
3. **Water animation day-one:** static until Phase D **(default)** vs 2-frame immediately after discrete autotile?
4. **Art pipeline:** 100% procedural frames through merge **(default)** vs invest in hand-pixel 16×16 sheets mid-branch?
5. **Entity outline on graphics-v2:** keep restrained outline+shadow **(default)** vs pure blocky entities until terrain done?
6. **Blob vs edge-only:** ship edge-16 first **(default)**; blob only if shores look too stepped?
7. **Success metric rooms:** beach_start + woodz pond + B2 torch + lava **(default list)** — any must-pass extras (guild hall, kingdom throne, dezertz)?
8. **Prop density content pass:** graphics-only first **(default)** vs simultaneous ambient prop placement in key rooms?
9. **Versioning:** treat merge as **minor** bump (0.8.0) when Core Keeper look ships?
10. **Delete vs legacy folder:** hard delete continuous-ground **(default on branch)** vs `src/legacy/` quarantine one release?

---

## 8. Council synthesis (short)

| Agent | Contribution |
| --- | --- |
| **Scout** | CK uses discrete tile IDs, blob/adaptive autotile, ~16px craft, soft colored lights; continuous paint is non-idiomatic |
| **Hexis** | Shore = land∩N4(water); interior fluid always full fill → zero holes by construction; mask math O(cells) |
| **Mason** | Strip orphans → autotile.ts → shore → land sets → polish; flag optional; vitest first |
| **Waggle** | Critical ban on continuous reentry; surgical scope; preview before main |
| **Pollen** | Palette ramps, tan shores, mid-blue water, warm torch, depth order |
| **Comb** | Structure readability, outdoor combat clarity, UI never veiled |
| **Forager** | Discrete frames port to mobile/sheets; continuous room canvases do not |

---

## 9. Next action when Mike says implement

1. Confirm open questions (or accept defaults in §7).
2. On `graphics-v2`: **Phase S strip** → commit/push → verify preview.
3. **Phase A** autotile core + tests → water first visual win.
4. **Phase B** shore ring → screenshot QA vs Style Bible.
5. Continue C→E; bake on graphics.dunjunz.com; operator go/no-go for **Phase M**.

**Do not implement until explicit implement order.** This document is the execution backlog.

---

## 10. Provenance

| Item | Ref |
| --- | --- |
| Repo | `mnease/dunjunz` |
| Branch | `graphics-v2` |
| Failed experiment | continuous-ground + terraria post (`f6ef00c`…); archived conceptually |
| Discrete restore | `placeRoomTiles` on branch tip |
| Stack | Phaser 3 + Vite + TS · `TILE=16` `SCALE=3` `ART_RES=64` |
| Memory key | `dunjunz-graphics-v2-core-keeper-design-plan` |
