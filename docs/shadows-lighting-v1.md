# Shadows & lighting — EMA council design v1

**Status:** Design locked. Implementation not started (math model draft lives in `docs/lighting-v2-model.md`).  
**Date:** 2026-07-22  
**Council:** Hexis (math/model), Pollen (visual tokens), Comb (UX/a11y/copy), Waggle (red team)  
**Constraint (locked):** Game **modes** (Hard, Army) stay frozen. World lighting, creeps, loot, and shop **may** change.

---

## 1. Problem

Shipped lighting (v1) is a **full-screen alpha ladder** in dark rooms (B2+):

| State | Overlay α |
| --- | ---: |
| no light | 0.88 |
| torch | 0.48 |
| lantern | 0.30 |
| flashlight | 0.14 |
| any authored wall torch | **0** (whole room lit) |

Invariant today: dark rooms ship with **zero** `torch_wall`. Fuel burns while carried light is active. Starter 3 torches; dungeon chests ~40% TORCH×2; **tinkerer sells no light**.

That is readable gloom, not **positional light**. The player cannot claim a corner, leave a permanent sconce, or fear what sits outside the pool. Shadows have no gameplay job beyond “re-light when fuel dies.”

---

## 2. Player fantasy (north star)

**Carried light burns while you hold it; place a torch on a wall to light that side forever; shadows keep corners dangerous until you claim them.**

- Torch is a **limited warm pool** with soft gradient (not a flat room dimmer).
- One wall torch benefits **that side** of the room; far side stays dim.
- Things can hide in deep shadow and spring when you get close (with fair telegraph).
- Magical gear glows weakly; it does not replace the fuel ladder.
- Torches are common enough that place + carry never feel like a softlock tax.

Tone: Adventure Time–adjacent crawl, **not** Dark Souls pure black. CRT gold/green stays legible.

---

## 3. Council verdict matrix

| Topic | Hexis | Pollen | Comb | Waggle | **Consensus** |
| --- | --- | --- | --- | --- | --- |
| Radial / gradient light | Smoothstep cookies + ambient floor **0.12** | Soft warm/cool/magic cookies; never pure black/white | Radial replaces flat α; α floor ≤0.90 | **Kill hard FoW**; soft vignette only | **Ship soft cookies on ambient floor** — never hard black FoW |
| Place wall torch permanent | Yes, max **2**/room, half-disc, separate kind | Brighter prop + floor bloom | **`T` crawl** / long-press USE; permanent | **Kill permanent** (trivializes) | **Ship permanent with guards** (max 2, local half-disc, fuel pause only in pool) |
| Shadow ambush creeps | Hysteresis 0.22/0.36 + 550ms telegraph | α 0.08 hide; reveal ramp; optional red-eye | No contact until telegraph ends; multi-cue | **Kill full invis packs** | **Elite dens only**, telegraphed, never pure one-shot invis |
| Gear emit light | Peak ≤0.45 (weaker than torch) | Violet amulet / ember sword distinct | Passive while equipped; blurb GLOWS | Gear sun kills economy | **Weak passive only**; optional swing afterglow later |
| More torches loot/shop | Pack×3 @12c; loot 0.40→0.48 | n/a | Torch pack SKU; teach signs | Flood kills forje | **Modest shop pack + slight loot bump**, not flood |
| Authored lit rooms | Stay full ambient B=1 | Dimmer “architecture” torch art | Unchanged B1 feel | Preserve invariant | **Keep invariant**: dark ⇒ no authored `torch_wall` |

**Waggle’s fatal package** (permanent place + free gear sun + full-invis packs + hard FoW + torch flood) is **rejected as a simultaneous big bang**. Each piece ships only with the guards above.

**Overall call:** **Ship-with-guards** (not redesign-kill, not unrestricted ship).

---

## 4. Load-bearing design laws

1. **Never pure black, never pure white.** Ambient dark floor B ≥ **0.12**; overlay α ≤ **0.88**. Floor silhouette always readable.
2. **Soft gradient cookies only.** Falloff = smoothstep on linear distance. Soft edge ≥ ~20% of radius. No hard disc cutouts.
3. **One brightness model for VFX and AI.** `sampleBrightness(px, py, sources)` is pure; ambush and overlay both sample it.
4. **Authored wall torches ≠ player placed.**  
   - `torch_wall` = ambient full-room light (lit rooms only).  
   - `torch_placed` = player sconce, local half-disc, dark rooms only, max 2 per room.
5. **Carry burns; place is permanent and free of fuel.** Placing consumes **1 torch stack**, does not start `activeLight`.
6. **Fuel pauses when the hero is already bright without carried light** (`nonCarriedB ≥ 0.55`) — standing in your sconce does not babysit the meter.
7. **One placed torch does not full-bright the room.** Far corners stay dim enough for ambush / dread.
8. **Ambush never deals contact in `hidden` or `telegraph`.** First strike after reveal at **0.7×** contact damage. Min revealed **2s**. Prefer **one elite per dens**, not packs. Hard/Army flag off until modes unfrozen.
9. **Gear light never replaces torch.** Max amulet peak **0.45** / R **3 tiles**. Flame sword weaker still unless short afterglow on swing.
10. **Modes frozen.** No Hard/Army light variants this pass.

---

## 5. Numbers (locked — see `lighting-v2-model.md` for formulas)

### 5.1 Sources

| Source | R (tiles) | Peak I | Shape |
| --- | ---: | ---: | --- |
| Carried torch | 4.0 | 0.85 | isotropic |
| Carried lantern | 5.5 | 0.90 | isotropic |
| Carried flashlight | 7.0 | 0.95 | isotropic (cone polish later) |
| Placed wall torch | 5.0 | 0.88 | half-disc into room |
| Authored ambient wall | ∞ | 1.0 | full room |
| Gear flame / amulet / minor | 2.5 / 3.0 / 2.0 | 0.40 / 0.45 / 0.30 | isotropic |

CELL = TILE×SCALE = **48 px**. Torch diameter ~8 tiles ≈ half a 16-wide room.

### 5.2 Ambush

| Param | Value |
| --- | --- |
| hideThreshold | 0.22 |
| revealThreshold | 0.36 |
| ambushRadius | 2.0 tiles |
| telegraphMs | 550 |
| minRevealedMs | 2000 |
| firstStrikeDamageMul | 0.7 |

### 5.3 Place rules

- Dark room only · orthogonal wall adjacency (prefer facing) · max **2** per room · no pickup (P0–P4) · kind `torch_placed`.
- Desktop: **`T`** while crawl (bag `T` stays sort). Mobile: **long-press USE ≥ 450 ms**.

### 5.4 Economy

| SKU | Spec |
| --- | --- |
| Starter | keep 3 torches |
| Loot chest TORCH×2 | **0.40 → 0.48** |
| Bonus TORCH×1 deep | **0.10** chance (optional) |
| Tinkerer L1 `buy_torch_pack` | **3 torches / 12c** |
| Tinkerer L5 lantern | **50c** (1 stack) |
| Tinkerer L10 flashlight | **100c** (1 stack) |

Forje light ladder stays; shop supports survival without drowning it.

---

## 6. Visual language (Pollen)

| Token | Value |
| --- | --- |
| Dark base | `#02040a` |
| Fully dark α | 0.86–0.90 |
| Penumbra α | 0.55–0.68 |
| Core light α | 0.00–0.10 |
| Torch/lantern/wall | warm gold `#ffc857` → `#e89a3a` → rim `#7a4a18` |
| Flashlight | cool blue `#a8d4ff` |
| Magic amulet | violet + neon tip |
| Flame sword | ember `#ff8a4c` |
| Flame flicker | 380–520 ms, ≤ ~2–3 Hz; `reduceMotion` freezes |
| Ambush hide α | 0.06–0.12 body |
| Reveal | 120–180 ms ramp, no flashbang |

**Hierarchy every frame:** player + light pool → exits → creeps in light → loot → placed props → ambush silhouettes → floor atmosphere.

**HUD fuel** lives **above** the veil (HUD_H). Critical fuel: slow pink pulse (~1 Hz), not strobe.

---

## 7. UX & copy (Comb)

**Mental model one-liner:**  
*Carried light burns while you hold it; place a torch on a wall to light that corner forever.*

### Toasts

| Key | String |
| --- | --- |
| PLACE_OK | `PLACE TORCH` |
| PLACE_OK_FIRST | `WALL TORCH SET — STAYS LIT` |
| NO_WALL | `NO WALL NEAR` |
| WALL_BUSY | `WALL ALREADY LIT` |
| NO_TORCH | `TORCH OUT` |
| LIGHT_DIED | `YOUR LIGHT DIED — LIT ANOTHER` |

### Signs

| Where | Copy |
| --- | --- |
| B2 foyer (keep) | `DARK. CARRY A TORCH. U = UP. N = HALL.` |
| B2 hall (new place teach) | `HALL OF SHADOWS.` / `T = PLACE TORCH ON WALL.` / `PLACED LIGHT STAYS. CARRIED LIGHT BURNS.` |
| Dark side rooms | `NO WALL LIGHTS. [U] CARRY · [T] PLACE ON WALL.` |

### Item blurbs

| Id | Blurb |
| --- | --- |
| torch | `Stick on fire. [U] carry ~90s. [T] hang forever.` |
| lantern | `Glass + oil. Long carry light. [U] only.` |
| flashlight | `Electric. Bright carry. Forjed science. [U]` |
| shop pack | `Three sticks. [U] carry light. [T] hang on a wall forever.` |

**Lantern/flashlight are carry-only** this pass (no place).

---

## 8. Shadow creep design (gameplay)

**Not** a full pack archetype. **One dens/elite pattern** (name TBD — working: **Shade Lurker** / **Gloom Skitter**):

| Trait | Spec |
| --- | --- |
| Spawn | Dark rooms only; prefer side dens / quiet corners; never B2 foyer teach room |
| Hide | Near-invisible when B &lt; hideThreshold and far from player |
| Reveal | Brightness, proximity, or enter penumbra → telegraph → full art |
| Combat | Contact only after telegraph; first strike 0.7× |
| Humor | Job-title optional later (“Intern of Shadows”); keep engine verbs simple |

Future pack variants only after one elite feels fair in play.

---

## 9. Ship order

| Phase | Deliverable | Tests |
| --- | --- | --- |
| **P0** | Pure `lighting.ts` expansion: `sampleBrightness`, sources, place predicates, ambush state machine, fuel pause | ~14 unit cases (see model doc) |
| **P1** | Scene: replace flat overlay with player-sampled soft cookie / RT hole; ambient floor | visual smoke + α regression |
| **P2** | Place torch: `T` / long-press USE, save `placedTorches`, sprite `torch_placed`, toasts, B2 hall sign | place rules + save round-trip |
| **P3** | One ambush elite + telegraph VFX/SFX | ambush state + no contact in telegraph |
| **P4** | Gear emit (`emitLight` on templates) + shop torch pack + loot bump | economy + gear peak ≤ torch |

Do **not** ship P3 packs or permanent place without P0/P1 soft floor.

---

## 10. Explicit non-goals (this pass)

- Hard fog-of-war that blacks the room.
- Permanent place without max-2 / local half-disc guards.
- Full-invisible ambush packs with same-frame lethal contact.
- Gear that is a free flashlight.
- Torch loot flood that kills forje.
- Hard/Army lighting variants.
- Pickup / remove placed torches (revisit later if needed).
- Full LOS raycast pathing for every creep.

---

## 11. File map (implementation)

| Area | Path |
| --- | --- |
| Pure model | `src/systems/lighting.ts` |
| Math design detail | `docs/lighting-v2-model.md` |
| Save | `src/types.ts`, `src/systems/save.ts` |
| Overlay / place / ambush scene | `src/scenes/GameScene.ts` |
| Controls / toasts / signs | `UIScene` / world-deep signs / README |
| Shop | `src/systems/shop.ts` |
| Loot | `src/systems/loot.ts` |
| Items / gear flags | `src/systems/items.ts` |
| Tests | `src/systems/rpg-systems.test.ts` |

---

## 12. Success criteria

1. In a dark room with a carried torch, the **near side is bright and the far wall is dim** (gradient reads on CRT).
2. Player can **hang up to 2 wall torches** that stay lit after leaving and re-entering the room.
3. Standing in a placed torch pool **pauses fuel burn**; far dark still burns.
4. At least one dens has a **shadow elite** that telegraphs before first hit.
5. Equipped light amulet or flame sword **helps slightly** but does not delete torch demand.
6. Tinkerer sells a **cheap torch pack**; softlock on 0 torches is rare for careful play.
7. Lit surface / B1 rooms **unchanged** (full bright, authored wall torches still legal).

---

## 13. Open playtest knobs (not blockers)

| Knob | Default | Tune if… |
| --- | --- | --- |
| Torch R | 4.0 tiles | room feels too dark / too bright |
| Max placed | 2 | rooms trivialize or never safe |
| Ambush telegraph | 550 ms | mobile lag / unfair |
| Torch pack price | 12c | gold economy skew |
| Gear amulet R/I | 3.0 / 0.45 | replaces torch too early |

---

**One-line merge:** Soft gold cookies over a never-black floor, permanent sconces capped and local, telegraphed shadow elites, weak gear glow, modest torch supply — darkness as **tactic**, not tax or gotcha.
