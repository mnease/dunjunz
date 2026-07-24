# Dunjunz Graphics-v2 Style Bible

**Status:** LOCKED design law (EMA Council 2026-07-23)  
**Aesthetic north star:** Core Keeper — top-down 2D pixel, high density, organic shores, soft torch light, detailed props.  
**Scope:** Render path + art rules only. Fellowship, lands, collision grid, rooms, combat stay.  
**Branch:** `graphics-v2` · Preview: https://graphics.dunjunz.com · https://dunjunz-graphics-v2.vercel.app  
**Companion docs:** [`graphics-v2-rebuild-plan.md`](./graphics-v2-rebuild-plan.md) · [`graphics-system-v2-architecture.md`](./graphics-system-v2-architecture.md)

---

## Council seal

| Agent | Focus | Verdict |
| --- | --- | --- |
| **EMA** | Unify style + systems + phases under one law | LOCK |
| **Scout** | Core Keeper craft: 16×16 tiles, discrete tile IDs, 17-tile blob → adaptive 8-bit masks, soft bounce lighting, prop density | Facts |
| **Hexis** | Grid truth → autotile masks → solid fluid cells + shore ring; no SDF material rewrite | Math LOCK |
| **Mason** | Phaser discrete tile path, procedural atlas keys, vitest masks, strip dead continuous path | Ship plan |
| **Waggle** | Critical: do not reintroduce continuous-ground or “skin smaller pixels”; scope creep into content is a fail | Critical guard |
| **Pollen** | Limited palettes, tan shores, mid-blue water, warm torch, cool cave ambient, readable silhouettes | Aesthetic LOCK |
| **Comb** | Structure props + UI chrome always readable; light never kills combat clarity on outdoor rooms | UX LOCK |
| **Forager** | Discrete autotile ports to future mobile / sheet art; continuous room canvases do not | Future-proof |

---

## 0. One-sentence law

**Every ground pixel belongs to exactly one autotile frame chosen from the logic grid; light and props sit on top; nothing reclassifies material with noise.**

---

## 1. What “Core Keeper feel” means (for Dunjunz)

Core Keeper reads as *almost realistic while pixelated* because of **systems stacking**, not because of blur or SDF:

| Ingredient | Core Keeper | Dunjunz Graphics-v2 |
| --- | --- | --- |
| Tile truth | Discrete tile types (ground, wall, pit, water, …) | Keep `TileKind` logic grid |
| Edges | Blob / adaptive neighbor masks (compact 17-tile craft → runtime frames) | 4-bit edge first; 8-bit blob for shores/grass |
| Native craft | ~**16×16** tile art (community maps / mod tools) | Author at 16 or 32; NN upscale to `ART_RES=64` |
| Camera | Large readable pixels; integer scaling option | `TILE=16`, `SCALE=3` → **48 world px/cell**; nearest neighbor only |
| Water | Water **type** cells + shore/transition frames | Full-cell fluid + 1-cell land shore ring |
| Light | Ambient dark caves + colored local lights; soft bounce (engine is 3D internally) | Ambient ladder + warm torch cookies; **no pure black** |
| Density | Many props, ore, furniture, plants per screen | Structure props + ambient sprites; not empty floors |
| Entities | Separate sprites; readable on lit ground | Procedural entities; restrained outline + drop shadow |
| Palette | Earthy browns, saturated biome accents, mid blues | Land-locked 3–6 color ramps per material |

**We are not cloning Core Keeper’s 3D light engine.** We clone the *read*: dense pixel craft, clean material edges, soft local light over a dark ambient floor, and organic shores built from **tiles**, not paint fields.

### References (research)

- Tile type IDs (ground / wall / water / pit / wateredGround / bridge) — Core Keeper Wiki Tile IDs.
- Blob tileset expansion (17-tile compact → adaptive masks) — community CoreKeeperTilesetGenerator.
- Lighting overhaul: soft, saturated, surface-aware bounce; lights have intensity + color — wiki Light sources.
- Community palette extractions (earth browns `#7f5f32`, water `#1e3d81` / `#3d5587`, sea `#34d0ff`, beach ground `#ebc0be`).

---

## 2. Non-negotiable rules (break = reject PR)

### 2.1 Grid truth

1. **Logic grid is sole material authority.** `TileKind[][]` decides collision and base material. Paint never invents water holes or land islands that disagree with the cell.
2. **No domain warp that reassigns kind** for terrain. Optional grit lives *inside* a frame (or a variant index), never as a second material field.
3. **No SDF / continuous-field shores.** Organic shape comes from neighbor masks + authored shore frames + optional half-tile foam overlays later.
4. **Fluids are solid cell fills.** Interior water/lava pixels are 100% fluid for that cell. Holes are bugs, not style.

### 2.2 Autotile language

5. **Terrain is frames, not stamps of random noise.** Every edge and corner has a named frame (or generated equivalent).
6. **4-bit edge mask is default** (`N=1 E=2 S=4 W=8` → 16 frames). Use **8-bit blob** when diagonal corners matter (water/land, grass/dirt).
7. **Shore is a land visual override**, 1 logic cell wide, on land adjacent (4-neigh) to water — not a nibble of the water cell.
8. **Walls and doors never receive shore paint.** Structure kinds keep structure frames / props.

### 2.3 Pixel density & scale

9. **Logic step stays `TILE = 16`.** Display stays `SCALE = 3` (48 world px per cell) unless operator reopens camera later.
10. **Textures stay nearest-neighbor.** No bilinear on world tiles/sprites. CRT shell may soft the final canvas chrome only, not the world atlas.
11. **Author detail at 16 or 32, present at 64.** Prefer drawing silhouette decisions at true 16×16 (or ART_BASE 32), then NN upscale to `ART_RES`. Micro grit after upscale is allowed only if it **does not change silhouette**.
12. **`TERRARIA_PIXEL` full-room ImageData is banned** for terrain. Density comes from tile art craft, not micro-reclassification.

### 2.4 Palette discipline

13. **3–6 hard colors per material frame** (base, shade, deep shade, optional highlight, optional accent). No smooth gradients larger than 2px steps inside a tile.
14. **Land locks palette family.** Meadow grass ≠ desert sand ≠ dungeon stone ≠ beach ≠ snow. Cross-land tint is season/weather only.
15. **Water is mid-blue and readable.** Never near-black pond interiors. Depth = darker edge / center band inside the **same blue family**, not purple-black soup.
16. **Shore is warm tan / sand**, land-aware:
    | Land / room | Shore ramp |
    | --- | --- |
    | Beach / ocean edge | Sand `#e8d4a8` / `#c9b080` / wet `#a89068` |
    | Meadow / woodz ponds | Warm dirt tan `#b8946a` / `#8d663d` |
    | Dunjunz / cave | Packed earth `#7f5f32` / `#604926` |
    | Dwarvez / snow | Gravel-dirt `#8f7c77` or dirty snow rim |
17. **Lava is orange-red with hard crust**, never muddy brown-red. Palette separate from water forever.

### 2.5 Outlines, shadows, depth

18. **Entities:** Dense sprites get 1px dark outline (`#1a1420` family) + 1–2px drop shadow. Soft ambient (koi, signs, crabs, palms) gets **no** outline/jagged/shadow — outlining sparse silhouettes or micro flecks reads as zebra hatch. **Foliage** (tree, redwood, cactus) gets a soft dark-green cardinal rim (`#163828`) only — no purple-black sticker stroke and no extra drop shadow (author art already shades lobes + ground). Micro-detail only mutates already-opaque body pixels.
19. **Terrain frames** may include **internal** dark edge pixels where the mask says “open to other material.” Do not run entity outline pass on full-room ground.
20. **Depth order (law):**
    ```
    0   VisualTilemap ground / fluid / shore
    1   Structure props (doors, cave mouths, pillars)
    2   Floor decorations / smashables / loot
    3   Entities (player, buddies, enemies, NPCs)
    4   Weapon swings / combat VFX
    5   Lighting veil / cookies
    6   Weather particles
    7   HUD / UI chrome
    ```
21. **Vignette is light-system territory**, not baked into every tile. Soft corner darkening via ambient / RT, not per-tile black.

### 2.6 Lighting (Core Keeper soft torch)

22. **Ambient is a ladder, never pure black.** Survival dark floors still leave silhouette floor (`AMBIENT_LADDER_DESC` / `AMBIENT_*` in `lighting.ts`). Outdoor `AMBIENT_SURFACE` (0.9) > indoor > lit dungeon > guild ≥ dark (0.12) > 0.
23. **Torches are warm** (gold peak `#ffc857` / mid `#f6ba6c`). Cookie texture from `drawWarmLightCookie`; veil fill `LIGHT_VEIL_RGB` warm near-black; soft gold stamp after erase. Cool blue fill light only for magic / ice setpieces.
24. **Local lights soft-falloff** (`lightCookieIntensity` smooth+step blend) — never hard white flashlight cones on outdoor day.
25. **Outdoor ambient stays combat-clear** without a torch. Cookies add depth; they are not required for fairness outside survival dark.
26. **UI / inventory / journal never dim under crawl veil** (`panelOpen()` clears light RT).

### 2.7 Water, fluids, animation

27. **Static water ships first.** Silhouette-stable 2-frame palette swap is Phase-late polish only.
28. **No multi-phase full-room water shimmer canvases.** Animation is per-tile texture key swap or tint pulse.
29. **`water-bodies` classification** (ocean / pond / river / koi) drives **palette + gameplay**, not topology. Topology = grid + shore.
30. **Foam is a frame feature** (1px on open edges), not a second continuous layer that can punch holes.

### 2.8 Characters, props, density

31. **Player / buddy / enemy scale** remains one logic cell footprint (`SPRITE_SCALE`). Bosses may scale up but keep collision honesty.
32. **Prop density target:** rooms should not feel like empty chessboards. Prefer 1–3 small ground details per open 3×3 of walkable floor when content allows (pebbles, roots, mushrooms, crates) — **as sprites or decoration kinds**, not noise paint.
33. **Doors, stairs, cave mouths** are **structure props** with clear dark pads and readable silhouettes (Comb veto if unreadable).
34. **Tone:** Dunjunz humor stays. Core Keeper is the *visual craft* reference, not a grim survival rebrand. Adventure Time–adjacent bounce + Core Keeper density.

### 2.9 UI

35. **HUD / panels stay CRT + Press Start 2P language.** World style does not force pixel outlines on every HTML overlay control.
36. **Mapz** stays graphic land-colored rooms (existing graphic mapz). Do not regress to pure ASCII.
37. **Icons / loot** use the same hard palette discipline and optional 1px outline; no soft photo gradients.

### 2.10 Forbidden (explicit ban list)

| Forbidden | Why |
| --- | --- |
| Continuous-ground / full-room ImageData terrain | Wrong model; blotchy water |
| Domain-warped `sampleKind` for materials | Grid lies |
| SDF fluid shore morph | Holes + non-tile edges |
| Multi-phase continuous water overlay | Amplifies blotch |
| “Skin smaller pixels” as quality strategy | Density cosplay |
| Bilinear world filtering | Soft mush |
| Pure black ambient FoW | Unreadable combat |
| Near-black water interiors | Muddy ponds |
| Jagged grow / outline on soft ambient | Black cages / zebra hatch |
| Micro flecks into transparent then outline | Zebra hatch around crabs/characters |
| Merging unfinished v2 to `main` | Live classic tiles stay clean |
| Content redesign disguised as graphics | Render-only rebuild |

---

## 3. Canonical scale sheet

| Constant | Value | Role |
| --- | ---: | --- |
| `TILE` | 16 | Logic step |
| `SCALE` | 3 | Display multiplier |
| Cell world px | **48** | `TILE * SCALE` |
| `ART_BASE` | 32 | Author unit for many draws |
| `ART_RES` | 64 | Texture canvas output |
| `SPRITE_SCALE` | `(TILE*SCALE)/ART_RES` = **0.75** | World sprite scale |
| Authored room | 16×11 | Content grid |
| Expanded view | `VIEW_TILES_W/H` | Playfield fill |
| Shore width | **1** logic cell | Land-only ring |
| Autotile P0 | 16 edge frames | Per material set |
| Autotile P1 | ≤47 blob frames | Shores / grass corners |

**Optional later (operator decision):** true 16×16 source atlas + integer camera zoom 3 or 4 for mobile parity. Does **not** change logic `TILE`.

---

## 4. Material palette ramps (procedural defaults)

Hex targets for generators and future hand art. Adjust only inside the family.

### 4.1 Shared neutrals

| Role | Hex | Use |
| --- | --- | --- |
| Outline | `#1a1420` | Entity outline |
| Deep shadow | `#0a0c10` | Drop shadow alpha base |
| Highlight chalk | `#f4f0ff` | Rare specular fleck (1px) |

### 4.2 Meadow / surface grass

| Step | Hex |
| --- | --- |
| Deep | `#1c5d2e` |
| Shade | `#2f6b45` |
| Base | `#3a7d52` |
| Blade | `#55b626` |
| Speck | `#9be678` |

### 4.3 Dirt / path

| Step | Hex |
| --- | --- |
| Deep | `#604926` |
| Shade | `#7f5f32` |
| Base | `#8d663d` |
| Light | `#b47f49` |
| Dry fleck | `#c7944f` |

### 4.4 Beach sand + shore

| Step | Hex |
| --- | --- |
| Wet | `#a89068` |
| Shade | `#c9b080` |
| Base | `#e8d4a8` |
| Light | `#f0e4c4` |

### 4.5 Water (pond default)

| Step | Hex |
| --- | --- |
| Deep edge | `#1c3d81` |
| Body | `#2a5f8f` |
| Mid | `#3d5587` |
| Highlight | `#5a9cba` |
| Foam | `#b2cee9` |

Ocean / river may hue-shift via `water-bodies` (± cyan for ocean, ± teal for river) **without** leaving the blue family or going near-black.

### 4.6 Lava

| Step | Hex |
| --- | --- |
| Crust | `#5a2a18` |
| Body | `#c44b2b` |
| Hot | `#e88b35` |
| Core | `#ffe82e` |

### 4.7 Dungeon wall / floor

| Step | Hex |
| --- | --- |
| Wall deep | `#3a3150` |
| Wall | `#5c4d7a` |
| Floor deep | `#2b2438` |
| Floor | `#342b45` |
| Rim light | `#7a6a98` |

### 4.8 Torch light (emission, not tile)

| Role | Hex / note |
| --- | --- |
| Peak | warm gold `#ffc857` |
| Mid | `#f6ba6c` |
| Cookie falloff | smoothstep; optional 3–4 quantized rings |
| Ambient cave floor | existing ladder (`AMBIENT_DARK` ≈ 0.12 floor, never 0) |

---

## 5. Autotile visual grammar

### 5.1 Edge mask (P0)

```
N=1, E=2, S=4, W=8
mask = (N?1:0)|(E?2:0)|(S?4:0)|(W?8:0)
frame = MASK_TO_FRAME[mask]   // 16 keys
```

Neighbor match: `connects(a,b)` — same material or declared connect set (e.g. grass connects to grass; water connects to water; sand shore connects to sand).

### 5.2 Blob mask (P1 shores / grass)

8-bit corners when diagonals matter. Prefer RPG Maker–style 47 unique tiles; generate procedurally until hand art arrives.

### 5.3 Shore ring algorithm (law)

```
for each land cell (not wall/door/structure):
  if any 4-neighbor is water:
    visualMaterial = shoreMaterialForLand(landId)
water cells: always fluid frame (never sand)
collision: unchanged
```

### 5.4 Variant index (fill only)

`variant = hash(wx, wy, roomSeed) % N` (N = 2–4). Variants **must share silhouette**. Variants change grit/fleck only.

---

## 6. Character & entity craft

| Rule | Spec |
| --- | --- |
| Readability | Silhouette readable at 48px on dark ambient 0.12 |
| Outline | 1px `#1a1420` on characters / enemies / key props |
| Shadow | 1–2px down-right, α ~0.45–0.55 |
| Soft ambient | Outline optional; **no** jagged grow |
| Motion | Transform-first bob / squash (existing vfx doctrine); not muddy trails |
| Humor | Face dots, exaggerated weapons OK — density ≠ grimdark |

---

## 7. Weather & seasons

| Rule | Spec |
| --- | --- |
| Particles | Hard pixel streaks/flakes, not soft circles |
| Ground tint | `setTint` on tile images; never regenerate materials |
| Icy water | Cool tint only (`#a8d0f0` family) — silhouette fixed |
| reduceMotion | Honors settings; no ambient storms that ignore it |

---

## 8. Acceptance screenshots (style QA)

A PR that claims “Core Keeper feel” must pass **visual QA** on:

1. **Beach start** — continuous sand, clean water, tan shore ring, no blotch.
2. **Woodz pond / healing water** — full blue body, 1-cell warm dirt shore, koi un-caged.
3. **Dunjunz B2 dark room** — soft torch pools, readable floor, warm light, not pure black.
4. **Meadow grass edge to dirt path** — autotile transition, not stamp cage.
5. **Lava room** — solid lava cells, hard crust edge, no water palette bleed.
6. **Door / cave mouth** — structure prop readable at a glance.
7. **Combat clutter** — player + 3 enemies + loot still legible under light veil.

**Fail conditions:** interior water holes, grid-shaped koi cages, mushy bilinear edges, outdoor unreadable dark, UI dimmed by crawl veil.

---

## 9. Doc precedence

| Doc | Role after this LOCK |
| --- | --- |
| **This Style Bible** | Non-negotiable aesthetic + craft law |
| `graphics-v2-rebuild-plan.md` | Strip plan, systems spec, phased PRs, reference table |
| `graphics-system-v2-architecture.md` | Historical + systems detail; **refined by** Style Bible + Rebuild Plan |
| `terraria-visual-system-v1.md` | **SUPERSEDED** for future work (archive of failed continuous experiment) |
| `lighting-v2-model.md` | Still governs pure light math; Style Bible governs look of cookies / ambient |
| `graphics-motion-detail-v1.md` | Motion still valid; terrain animation deferred until autotile clean |

---

## 10. Operator one-liners

- **If it needs a continuous field to look organic, the tileset is incomplete.**
- **If water has holes, the model is wrong — fix grid/autotile, do not add noise.**
- **If a room feels empty, add props, not more fractal grit.**
- **If a torch feels harsh, soften falloff / warm the peak — do not raise outdoor ambient to 1.0.**
- **Live `main` stays classic discrete tiles until Phase merge criteria pass.**
