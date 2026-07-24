# Graphics-v2 Density Plan — Terraria-level craft detail

**Status:** **Dn0–Dn3 shipped on `graphics-v2`** (procedural denser craft + prop density + entity craft). Phase M still operator-gated.  
**Branch:** `graphics-v2` until promote  
**Does not replace:** Phase M (promote).  
**North star:** Core Keeper systems + **Terraria craft density** (internal tile detail, clutter, readable sprites).  
**Style law still binds:** discrete autotile truth, no continuous-ground, no pure-black ambient, combat clarity.

---

## 1. Why this exists

Phases **S–E** shipped the **render architecture**:

| Done | Still thin vs Terraria |
| --- | --- |
| Discrete fluid/land autotile | Tile **internals** are procedural / sparse |
| Shore ring | Few blend variants |
| Soft entity polish | Entities are silhouette-first |
| Warm lighting + weather gates | Rooms feel empty chessboards |

Terraria (and Core Keeper) read “dense” because of **many authored pixels + many props per screen**, not because of blur or SDF. This plan closes that gap without undoing autotile law.

---

## 2. Goals

1. **Floor/wall/fluid frames** look hand-crafted: cracks, grass blades, bark, stone chips, foam nicks — still one cell per logic tile.
2. **Rooms feel inhabited:** 1–3 small ground details per open 3×3 walkable (Style Bible §2.8) in key lands.
3. **Entities/weapons** gain internal shading and kit detail without zebra cages or sticker outlines.
4. **Ship safely** on staging only until operator go/no-go (same as M).

### Non-goals

- Continuous-ground paint / domain-warped materials  
- Full 3D bounce lighting  
- Rewriting fellowship / combat systems  
- Promoting to `main` without bake (that’s Phase M)

---

## 3. Phase ladder (new letters — density track)

Use **Dn** (Density n) so we never confuse with old F–L (which never existed).

### Dn0 — Audit + density law (0.5 day) — **DONE**

| | |
| --- | --- |
| Goal | Freeze what “Terraria-level” means for Dunjunz screenshots |
| Work | Density plan + QA matrix §6; Style Bible depth/combat FX laws |
| Acceptance | Written QA list in this doc §6 |

### Dn1 — Tile craft v1 (2–4 days) — **DONE on graphics-v2**

| | |
| --- | --- |
| Goal | Richer **internal** detail on land + fluid + wall frames |
| Work | Denser `drawAutotileLandFrame` / `drawAutotileFluidFrame` grit, blades, ruts, brick chips, foam nicks on open edges only |
| Files | `textures.ts` |
| Acceptance | Solid fluid bodies; open-edge foam only; autotile/shore/solidity green |
| Tests | Existing autotile / shore / solidity suites |

### Dn2 — Prop density content (2–3 days) — **DONE on graphics-v2**

| | |
| --- | --- |
| Goal | Rooms stop feeling empty |
| Work | `prop-density.ts` pure placement 1–3 per open 3×3; `deco_*` textures; GameScene `spawnFloorDecorations` (skip guild/shop/throne) |
| Files | `prop-density.ts`, `prop-density.test.ts`, `textures.ts`, `GameScene.ts` |
| Acceptance | Pure tests enforce band + forbidden cells; sprites only (mapTile cleanup) |
| Tests | `prop-density.test.ts` |

### Dn3 — Entity & weapon craft (2–3 days) — **DONE on graphics-v2**

| | |
| --- | --- |
| Goal | Characters/weapons closer to Terraria kit readability |
| Work | Denser **player** body (`drawBodyBase` folds/boots/belt); **weapons** mild sword / iron / lightning staff avatar+icon; denser slime / skeleton / redshirt; deco keys skip entity outline; soft ambient / foliage laws preserved |
| Files | `body-visuals.ts`, `weapon-visuals.ts`, `textures.ts`, `terraria-style.ts` |
| Acceptance | Player + ≥3 weapon looks denser on real draw path; 3 creeps denser; soft ambient outline false; foliage rim; deco no outline |
| Tests | `density-craft.test.ts`, `terraria-style.test.ts` |

### Dn4 — Bake + optional Phase M (0.5–1 day)

| | |
| --- | --- |
| Goal | Operator go/no-go: promote density + systems together, or density-only after M |
| Work | Full QA matrix §6; CHANGELOG; then either stay on staging or run Phase M promote script |
| Acceptance | Style Bible rooms + density checklist green |

---

## 4. Craft rules (extend Style Bible)

1. **Grid truth first** — detail lives *inside* autotile frames, never reclassifies material.
2. **Author 16/32, present 64** — silhouette decisions at low res; grit after NN upscale only on opaque body.
3. **Limited palettes** — 3–6 colors per material ramp; no photo gradients.
4. **Props are sprites** — not noise paint on the ground layer.
5. **Combat FX above light veil** — `DEPTH.combatFx > DEPTH.lightVeil` (lightning arcs, slashes, projectiles).
6. **Emerald staff ≠ lightning** — `wizard_staff` projectile is green **bolt**; `staff_lightning` is **arc**. Density work must not reintroduce slow `proj-lightning` ball for the lightning staff.

---

## 5. Suggested order vs Phase M

| Strategy | When | Why |
| --- | --- | --- |
| **A (recommended)** | Dn0–Dn2 on staging → bake → **Phase M** | Players get systems + density together |
| **B** | Phase M now (systems only) → Dn* on next branch | Faster production ship; density as follow-up |
| **C** | Full Dn0–Dn3 then M | Maximum visual quality before promote |

Default recommendation: **A** if bake time allows 1–2 weeks; **B** if you want live systems ASAP.

---

## 6. Screenshot QA matrix (density)

| Room | Pass if |
| --- | --- |
| Training guild | Torch pools + **lightning arc fully visible** over gloom; hall not empty of furniture (already dense) |
| Beach / meadow | Grass/sand micro-detail; shore foam; props sparse OK |
| Woodz pond | Solid water, shore ring, trees, **floor clutter** near path |
| B2 torch hall | Warm cookies; wall/floor grit; arc/slash readable above veil |
| Lava pocket | Orange body + crust; no muddy red-brown |
| Overworld path | Outdoor clear ambient; weather tint only outdoor |

---

## 7. Lightning staff note (related regression)

**Code path:** `staff_lightning` → `projectile: 'lightning'` → `castLightningArc` + `drawLightningArc` (not `proj-lightning` ball).  
**Emerald staff** (`wizard_staff`) still fires green **bolt** projectile by design.

**Bug seen on staging:** arcs drawn at depth 18 sat **under** light veil (depth 90) in dark rooms → looked like a spark ball near the player. Fix: combat FX at `DEPTH.combatFx` (95).

---

## 8. Effort rollup

| Phase | Effort |
| --- | --- |
| Dn0 Audit | 0.5 d |
| Dn1 Tile craft | 2–4 d |
| Dn2 Prop density | 2–3 d |
| Dn3 Entity craft | 2–3 d |
| Dn4 Bake / M | 0.5–1 d |
| **Total** | **~7–12 engineer-days** |

---

## 9. Related docs

- [`graphics-v2-rebuild-plan.md`](./graphics-v2-rebuild-plan.md) — S–E done; M promote  
- [`graphics-v2-style-bible.md`](./graphics-v2-style-bible.md) — aesthetic law  
- [`STAGING.md`](./STAGING.md) — branch deploy law  
