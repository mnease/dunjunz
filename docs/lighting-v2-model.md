# Lighting v2 — pure math + data model

**Status:** design lock (Hexis) · extends `src/systems/lighting.ts` (keep burn/fuel/`roomIsDark`)  
**Scope:** pure functions, save schema, thresholds, units. Phaser = API shapes only.  
**Hard/Army:** frozen — no mode-specific lighting work.  
**Absorbs:** Waggle red-team (no pure-black FoW, no free gear sun, ambush telegraph) · Comb UX (place vs carry, α floor, teach beats).  
**v2.1 amendment (2026-07-22):** shadows **everywhere** — ambient ladder + positional cookies on all crawl rooms; survival gates still dark-only.

---

## 0. Units & coordinate contract

| Symbol | Meaning | Value |
| --- | --- | --- |
| `TILE` | logical tile step | `16` |
| `SCALE` | display scale (shipped) | `3` |
| `CELL` | world px per tile | `TILE * SCALE` = **48** |
| design radius | always **tiles** | e.g. `4.0` |
| runtime radius | world px | `R_px = R_tiles * CELL` |
| sample `(px, py)` | **world pixel** centers | one space for VFX + AI |
| wall torch origin | tile center via `tileToWorld` | isotropic math; art may offset sprite |

```ts
export const CELL_PX_DEFAULT = 16 * 3; // 48
export const tilesToPx = (t: number, cell = CELL_PX_DEFAULT) => t * cell;
export const pxToTiles = (px: number, cell = CELL_PX_DEFAULT) => px / cell;
```

**Law:** ambush AI and visuals call the **same** `sampleBrightness`. No parallel AI light model.

---

## 1. Brightness model

### 1.1 Signature

```ts
/** 0 = darkest allowed, 1 = fully lit. Always clamped. */
sampleBrightness(px: number, py: number, sources: LightSource[], ambient = AMBIENT_DARK): number
```

### 1.2 Ambient floors — **full-game ladder** (v2.1)

Shadows apply on **every crawl room**. Ambient is no longer binary 1.0 / 0.12.

```ts
/** Room ambient in [0,1]. Cookies add above this floor. Never pure black. */
export function ambientForRoom(room: {
  floor?: number;
  dark?: boolean;
  land?: string;
  /** shops, castle halls, inns — not open field */
  indoor?: boolean;
  /** boss / mid-boss arena flag */
  boss?: boolean;
}): number {
  // Survival dark wins (explicit or B2+)
  if (room.dark === true) return AMBIENT_DARK; // 0.12
  if (room.dark !== false && (room.floor ?? 0) <= -2) return AMBIENT_DARK;

  if (room.boss) return AMBIENT_BOSS; // 0.36

  const f = room.floor ?? 0;
  // B1 dunjunz / sewerz (and any floor -1 that is not forced dark)
  if (f === -1) return AMBIENT_B1; // 0.50

  // Surface (floor >= 0)
  if (room.indoor) return AMBIENT_INDOOR; // 0.62
  return AMBIENT_OUTDOOR; // 0.78
}
```

| Class | `ambient` | Detect | Feel |
| --- | ---: | --- | --- |
| Surface outdoor (woodz / dezertz / kingdomz / surface field) | **0.78** | `floor>=0`, `!indoor`, `!boss`, not dark | Soft day vignette; cookies = depth only |
| Indoor surface (shops, castle interiors, inns) | **0.62** | `indoor:true` (or room tag) | Cozy gloom; wall torches read as architecture |
| B1 dunjunz / sewerz (was “lit”) | **0.50** | `floor===-1` & not `dark` | Architectural basement; gradient without fuel tax |
| Boss room (any floor) | **0.36** | `boss:true` | Dramatic pool; combat still fair |
| B2+ / `dark:true` | **0.12** | `roomIsDark` | Survival crawl (unchanged threat band) |
| Title playfield only | soft vignette α **~0.18–0.24** | TitleScene art layer | Atmosphere; **not** fuel/ambush model |
| Pause / inventory / shop / forje / journal modals | **no veil** | UI chrome | Full readability — shadows never dim panels |

```ts
export const AMBIENT_DARK = 0.12;
export const AMBIENT_BOSS = 0.36;
export const AMBIENT_B1 = 0.50;
export const AMBIENT_INDOOR = 0.62;
export const AMBIENT_OUTDOOR = 0.78;
/** @deprecated binary lit — do not use for crawl rooms */
export const AMBIENT_LIT = 1.0;
```

**Law:** floor silhouettes always readable. Outdoor 0.78 means combat clarity without a torch. Cookies never required for fairness outside survival dark.

`roomIsDark` **unchanged** (B2+ / `dark:true` / `dark:false` override) — it gates **survival systems**, not whether shadows draw.

### 1.3 Falloff formula — **smoothstep on linear t**

For source peak `I ∈ (0,1]`, radius `R_px > 0`:

```
d = hypot(px - sx, py - sy)
if d >= R_px: contrib = 0
else:
  t       = 1 - d / R_px              // 1 at center, 0 at rim
  falloff = t² (3 - 2t)               // smoothstep
  contrib = I * falloff * lobe(px,py) // lobe = 1 for isotropic; see wall half-disc
```

**Combine:**

```
B = clamp( ambient + Σ contrib_i , 0, 1 )
```

Additive, hard cap 1. No soft-max.

| Rejected | Why |
| --- | --- |
| Inverse-square | Harsh core / early clip at tile scales |
| Pure linear | Thin mid-band → ambush flicker at rim |
| Multiplicative darken | Breaks “two torches meet” readability |

### 1.4 Wall half-disc lobe (`wall_placed` + authored `torch_wall`)

Placed **and authored** wall fixtures face into the room (v2.1: no full-room ambient short-circuit):

```ts
/** outward = unit normal from wall into walkable space (N/E/S/W). */
function wallLobe(px, py, sx, sy, outward: {x:number;y:number}): number {
  const vx = px - sx, vy = py - sy;
  const len = hypot(vx, vy) || 1;
  const cos = (vx / len) * outward.x + (vy / len) * outward.y;
  // full in forward hemisphere, soft behind wall
  if (cos >= 0) return 1;
  return 0.15; // bleed so adjacent corridor edge isn't hard-cut
}
```

`carried` / `gear_emit`: `lobe ≡ 1` (isotropic).  
`wall_ambient`: **deprecated** — do not emit for world rooms.

### 1.5 Radii & peaks (tiles) — locked

| Source | `kind` | `R_tiles` | `I` | Role |
| --- | --- | ---: | ---: | --- |
| carried torch | `carried` | **4.0** | **0.85** | ~half of 16-wide room |
| carried lantern | `carried` | **5.5** | **0.90** | mid reach |
| carried flashlight | `carried` | **7.0** | **0.95** | long corridor |
| wall placed / authored torch | `wall_placed` | **5.0** | **0.88** | half-disc; strong local, not full-room |
| wall ambient legacy | `wall_ambient` | **∞** | **1.0** | **deprecated** — migrate off |
| gear flame weapon | `gear_emit` | **2.5** | **0.40** | weak — never replaces torch |
| gear light amulet | `gear_emit` | **3.0** | **0.45** | passive fill |
| gear minor enchant | `gear_emit` | **2.0** | **0.30** | cosmetic-ish |
| flame **afterglow** (optional P4) | `gear_emit` temp | **3.5** | **0.55** | 2.5s after swing only |

**Gear law (economy):** max gear contribution at player feet ≈ **0.45** alone → still needs carried/placed for deep crawl. Gear is **not** a free flashlight.

**Room-scale check (CELL=48):** torch diameter 8 tiles ≈ 384 px. Expanded 26-wide rooms: one wall torch lights a lane, not the whole map — ambush corners remain.

### 1.6 Dying fuel (peak only, not radius)

Last **8%** of `lightFuelMs`:

```
u = fuelMs / (0.08 * LIGHT_BURN_MS[tier])   // 0..1 in dying window
I_eff = I * (0.55 + 0.45 * clamp(u, 0, 1))
```

Radius fixed during die-out (stable ambush bands).

### 1.7 Overlay bridge (compat with full-screen α)

Presentation P1 may still be one rectangle; α follows **player sample**:

```ts
export const ALPHA_NONE = 0.88; // shipped floor (darkest overlay)

/** Higher α = darker. Monotonic decreasing in B. */
export function alphaFromBrightness(B: number): number {
  const t = clamp(B, 0, 1);
  // α(0)=0.88, α(1)=0; ease so mid-B stays playable
  return ALPHA_NONE * (1 - t) * (1 - t) * (1 + 0.12 * t);
}

export function visionOverlayAlpha(B: number): number {
  return clamp(alphaFromBrightness(B), 0, 0.88);
}
```

| Condition | ambient | B at feet (no sources) | α target (approx) |
| --- | ---: | ---: | ---: |
| outdoor | 0.78 | 0.78 | **~0.05** soft vignette |
| indoor surface | 0.62 | 0.62 | **~0.14** |
| B1 | 0.50 | 0.50 | **~0.23** |
| boss | 0.36 | 0.36 | **~0.38** |
| dark, no sources | 0.12 | 0.12 | **~0.70** readable gloom |
| torch at feet (dark) | 0.12 | ~1.0 cap | **~0–0.15** |

**P1 visual policy:** soft vignette / cookies **on top of** ambient floor — never hard cut to black. `reduceMotion`: freeze flame; static gradient OK.

**UI chrome policy:** inventory / shop / forje / pause / journal **never** sample this overlay. Title: optional soft vignette on playfield art only (not HUD buttons).

---

## 2. Light source union

```ts
export type LightSourceKind =
  | 'carried'
  | 'wall_placed'
  | 'wall_ambient' // deprecated
  | 'gear_emit';

export type LightSource = {
  kind: LightSourceKind;
  x: number; // world px
  y: number;
  intensity: number; // peak I
  radiusPx: number;  // Infinity only for wall_ambient (legacy)
  id?: string;
  /** Unit normal into room; required for wall_placed half-disc. */
  outward?: { x: number; y: number };
};
```

### 2.1 Catalog

```ts
export const LIGHT_RADIUS_TILES = {
  torch: 4.0,
  lantern: 5.5,
  flashlight: 7.0,
  wall_placed: 5.0,
  gear_flame: 2.5,
  gear_amulet: 3.0,
  gear_minor: 2.0,
  gear_afterglow: 3.5,
} as const;

export const LIGHT_PEAK = {
  torch: 0.85,
  lantern: 0.90,
  flashlight: 0.95,
  wall_placed: 0.88,
  gear_flame: 0.40,
  gear_amulet: 0.45,
  gear_minor: 0.30,
  gear_afterglow: 0.55,
} as const;
```

### 2.2 `buildLightSources` (pure) — v2.1

```ts
export type BuildLightsInput = {
  /** ambientForRoom result — sources always allowed; fuel still dark-gated elsewhere */
  ambient: number;
  darkRoom: boolean; // roomIsDark — survival only
  player: { x: number; y: number };
  activeTier: 'torch' | 'lantern' | 'flashlight' | 'none';
  fuelMs: number;
  /** Authored torch_wall mounts (half-disc, same as placed) */
  authoredWalls: {
    id: string;
    x: number;
    y: number;
    outward: { x: number; y: number };
  }[];
  placed: {
    id: string;
    x: number;
    y: number;
    outward: { x: number; y: number };
  }[];
  gear: {
    id: string;
    x: number;
    y: number;
    spec: 'flame' | 'amulet' | 'minor' | 'afterglow';
  }[];
  cell?: number;
};

export function buildLightSources(input: BuildLightsInput): LightSource[]
```

Rules (v2.1 — **breaking vs v2.0**):

1. **Always** push authored walls as `wall_placed` half-discs (never `wall_ambient` B=1).
2. Always push player `placed` wall_placed.
3. Push carried **only if** `darkRoom && tier+fuel` (survival carry — surface/B1 do not need carried light).
4. Push gear on every crawl room (weak fill / depth).
5. No empty short-circuit when `!darkRoom` — lit rooms still get wall cookies.

### 2.3 Fuel burn (refined)

```ts
/** True when carried fuel should tick down this frame. */
export function shouldBurnCarriedFuel(opts: {
  darkRoom: boolean; // roomIsDark ONLY — not ambient ladder
  hasCarried: boolean;
  /** sampleBrightness(player) using ONLY wall_placed + gear (no carried). */
  nonCarriedB: number;
}): boolean {
  if (!opts.darkRoom || !opts.hasCarried) return false;
  // Pause burn when room investment already lights the hero well
  if (opts.nonCarriedB >= FUEL_PAUSE_B) return false;
  return true;
}

export const FUEL_PAUSE_B = 0.55;
```

| Burns? | When |
| --- | --- |
| **YES** | `roomIsDark` + carried active + `nonCarriedB < 0.55` |
| **NO** | surface / B1 / indoor / outdoor (even with cookies) |
| **NO** | standing in sconce/gear pool with `nonCarriedB ≥ 0.55` |
| **NO** | no carried light |

Authored wall torches **no longer** zero fuel via ambient short-circuit (they contribute to `nonCarriedB` as cookies; dark rooms still have **zero** authored walls by world invariant).

### 2.4 Scene API shapes only

```ts
// ambient = ambientForRoom(room)
// sources = buildLightSources({ ambient, darkRoom: roomIsDark(room), ... })
// Bp = sampleBrightness(player.x, player.y, sources, ambient)
// overlay.setAlpha(visionOverlayAlpha(Bp))  // crawl only — never modals
// Be = sampleBrightness(enemy.x, enemy.y, sources, ambient)
// ambush only if roomIsDark: stepAmbushState(prev, Be, dist)
```

Budget: ≤1 carried + ≤**N authored** + ≤**2** placed + ≤3 gear. Samples: 1 player + ≤20 enemies — trivial.

---

## 3. Place torch rules

### 3.1 Save schema

```ts
// SaveData
placedTorches?: Record<
  string, // roomId
  Array<{
    id: string;     // `pt-${roomId}-${seq}` 
    x: number;      // tile x (mount cell: wall tile OR floor foot — see below)
    y: number;      // tile y
    dir: 0 | 1 | 2 | 3; // 0N 1E 2S 3W — outward into room
  }>
>;
```

Normalize missing → `{}` on load (with `activeLight`).

**Entity kind for sprites:** `torch_placed` (or reuse draw of `torch_wall` with different id prefix). Authored `torch_wall` → runtime `wall_placed` sources (same math as player place). **Never** count player placed toward authored list.

### 3.2 Caps (anti-trivialize)

| Cap | Value | Why |
| --- | --- | --- |
| per room | **`MAX_PLACED_TORCHES_PER_ROOM = 2`** | Waggle: 4 permanent lights per dark room uninstalls fuel |
| global | none | 2/room is the pressure valve |
| pickup | **no** (P0–P4) | permanent investment |

### 3.3 Placement predicates

```ts
export const MAX_PLACED_TORCHES_PER_ROOM = 2;

export type PlaceTorchContext = {
  darkRoom: boolean; // roomIsDark — survival dark only
  tx: number;
  ty: number;
  facing: 0 | 1 | 2 | 3;
  isWall: (x: number, y: number) => boolean;
  isInBounds: (x: number, y: number) => boolean;
  existing: { x: number; y: number }[];
  torchStacks: number;
};

export type PlaceFail =
  | 'no_torch'
  | 'not_dark_room'
  | 'not_wall_adjacent'
  | 'occupied'
  | 'max_per_room'
  | 'oob';

export function canPlaceTorch(ctx: PlaceTorchContext):
  | { ok: true; x: number; y: number; dir: 0|1|2|3 }
  | { ok: false; reason: PlaceFail }
```

**Rules:**

1. **`roomIsDark` only** — surface / B1 / indoor reject (`not_dark_room`). Depth cookies there come from authored walls, not player sconces.
2. Player stands on **floor**; target is **orthogonal wall** — prefer `facing`, else any N/E/S/W wall neighbor.
3. Mount recorded as **wall tile** `(tx,ty)` with `dir` = outward (from wall toward player / into room).
4. No second mount on same wall cell; no exceed max 2.
5. Consume **1** `stacks.torch` (not fuel). Does not ignite carried light.
6. Emission world pos = wall center + 0.55*CELL along outward.

```ts
export function placedEmissionWorld(
  tileX: number,
  tileY: number,
  dir: 0|1|2|3,
  originX: number,
  originY: number,
  cell = 48,
): { x: number; y: number; outward: { x: number; y: number } } {
  const outward = DIR_OUT[dir]; // {0,-1},{1,0},{0,1},{-1,0}
  const cx = originX + (tileX + 0.5) * cell + outward.x * 0.55 * cell;
  const cy = originY + (tileY + 0.5) * cell + outward.y * 0.55 * cell;
  return { x: cx, y: cy, outward };
}
```

### 3.4 World invariant (extended)

| Room | authored `torch_wall` | `placedTorches` | ambient | mode |
| --- | --- | --- | ---: | --- |
| outdoor surface | optional props | ignored | 0.78 | cookies + high floor |
| indoor surface | common | ignored | 0.62 | cookies + medium floor |
| B1 / lit basements | common | ignored | 0.50 | cookies + mid floor |
| boss any floor | sparse OK | ignored unless dark | 0.36 | dramatic cookies |
| dark B2+ | **must be 0** | 0–2 player | 0.12 | survival cookies |

---

## 4. Ambush (shadow creeps)

### 4.0 Spawn gate (decisive)

| Spawns? | When |
| --- | --- |
| **YES** | `roomIsDark(room)` only (B2+ / `dark:true`) |
| **NO** | outdoor, indoor surface, B1, boss-unless-dark, UI |

Ambush uses brightness thresholds against **dark ambient 0.12 + cookies**. Do **not** re-tune hide/reveal for high ambient rooms — those rooms never spawn ambush.

### 4.1 Thresholds

```ts
export const AMBUSH = {
  hideThreshold: 0.22,      // below → may hide (raised vs 0.18: ambient 0.12)
  revealThreshold: 0.36,    // above → force reveal; band width 0.14
  ambushRadiusTiles: 2.0,   // ≥ contact; Comb ≥1.5× — 2.0 tiles ≈ 96 px
  rehideDistMul: 1.2,
  /** Pure time gate before first contact damage after reveal-from-hidden. */
  telegraphMs: 550,
  /** After reveal, stay visible at least this long (no blink cheese). */
  minRevealedMs: 2000,
  /** First ambush hit damage multiplier. */
  firstStrikeDamageMul: 0.7,
} as const;
```

### 4.2 State machine

```ts
export type AmbushPhase = 'hidden' | 'telegraph' | 'revealed';

export type AmbushState = {
  phase: AmbushPhase;
  phaseMs: number; // time in current phase
};

export function stepAmbushState(
  prev: AmbushState,
  brightness: number,
  distPx: number,
  dtMs: number,
  cell = 48,
): AmbushState {
  const r = AMBUSH.ambushRadiusTiles * cell;
  const tooClose = distPx < r;
  const farEnough = distPx >= r * AMBUSH.rehideDistMul;
  let { phase, phaseMs } = prev;
  phaseMs += dtMs;

  if (phase === 'hidden') {
    if (tooClose || brightness > AMBUSH.revealThreshold) {
      return { phase: 'telegraph', phaseMs: 0 };
    }
    return { phase: 'hidden', phaseMs };
  }

  if (phase === 'telegraph') {
    if (phaseMs >= AMBUSH.telegraphMs) {
      return { phase: 'revealed', phaseMs: 0 };
    }
    return { phase: 'telegraph', phaseMs };
  }

  // revealed
  if (
    phaseMs >= AMBUSH.minRevealedMs &&
    farEnough &&
    !tooClose &&
    brightness < AMBUSH.hideThreshold
  ) {
    return { phase: 'hidden', phaseMs: 0 };
  }
  return { phase: 'revealed', phaseMs };
}

/** Contact damage allowed only in revealed (not hidden/telegraph). */
export function ambushCanDealContact(s: AmbushState): boolean {
  return s.phase === 'revealed';
}
```

**Visual policy (scene):**  
- `hidden`: α = 0 **or** 0.08 mass (impl choice); **no** contact.  
- `telegraph`: eyes / outline / dust — must be non-color-only (outline + motion + SFX).  
- `revealed`: full sprite.

**Spawn:** dark rooms only; Hard/Army = flag off until unfrozen. Prefer **one** ambush elite per dens, not full packs (Waggle).

**Shared sample:** `brightness = sampleBrightness(enemy.x, enemy.y, sources, ambientForRoom(room))`.

---

## 5. Economy numbers

### 5.1 Shipped baseline

Starter 3 torch · chest 40% ×2 · forje 5c torch×2 / 25c lantern / 80c flashlight · tinkerer **no** light SKUs.

### 5.2 v2 targets

**Tinkerer:**

| SKU | minLvl | price | qty | Notes |
| --- | --- | ---: | ---: | --- |
| TORCH PACK | 1 | **12** | ×3 | 4c/ea survival (Comb) |
| LANTERN | 5 | **50** | ×1 | convenience vs forje |
| FLASHLIGHT | 10 | **100** | ×1 | late convenience |

No single torch@12 flood — pack only at L1. Sell = half.

**Loot (moderate, not flood):**

| Source | Rate |
| --- | --- |
| Dungeon chest TORCH×2 | **0.40 → 0.48** |
| Independent TORCH×1 | **0.10** |
| Deep enemy (floor ≤ −2) | **0.06** TORCH×1 |
| Boss / mid-boss | **0.65** TORCH×2 · **0.20** lantern |

**Place vs carry:**

| | Cost | Benefit |
| --- | --- | --- |
| Ignite | 1 stack → 90s mobile R=4 | explore dark |
| Place | 1 stack permanent, max 2/room, **dark only** | lane light + fuel pause in pool |
| Gear | slot | weak fill; afterglow on swing (P4) |

**Fuel job after ship:** still required for unscoped dark rooms, long runs past 2 sconces, and any dark room you haven't invested in. Gear alone never finishes the job. Surface/B1 never tax fuel.

---

## 6. Ship order P0–P4

### P0 — Pure math + vitest (no scene)

Extend `lighting.ts` + tests only.

**Functions:** `smoothstep01`, `sampleBrightness`, `wallLobe`, `ambientForRoom`, `alphaFromBrightness` / `visionOverlayAlpha`, `buildLightSources`, `shouldBurnCarriedFuel`, `canPlaceTorch`, `placedEmissionWorld`, `stepAmbushState`, `ambushCanDealContact`, constants tables.

**Keep:** `roomIsDark`, `LIGHT_BURN_MS`, `igniteLight`, `tickLightFuel`, `visionDarkAlpha` (wrapper → continuous).

**Test cases:**

1. `roomIsDark` regression (B2+, overrides).
2. `ambientForRoom`: outdoor 0.78, indoor 0.62, B1 0.50, boss 0.36, dark 0.12; `dark:false` on B2 → not 0.12 unless boss/indoor rules apply.
3. Falloff: d=0 → I; d=R → 0; d=R/2 → I * 0.5 (smoothstep(0.5)=0.5).
4. Additive two sources same point → min(1, ambient+2I).
5. Empty sources + ambient 0.12 → 0.12; ambient 0.78 → 0.78.
6. Authored wall → `wall_placed` contrib, **not** B=1 short-circuit.
7. Radii order flashlight > lantern > torch > gear_amulet; peaks ordered.
8. `visionOverlayAlpha(1)=0`; monotonic decrease; bare ambient maps &lt; 0.88.
9. Wall lobe: forward cos≥0 → 1; behind → 0.15.
10. Ambush: B in (0.22, 0.36) preserves phase; B&gt;0.36 → telegraph; dist&lt;2 tiles → telegraph; telegraph → revealed after 550ms; no contact in hidden/telegraph; rehide only after minRevealedMs + far + B&lt;0.22.
11. `canPlaceTorch`: wall adj ok; center fail; max 2; no stack; lit/surface/B1 fail.
12. `shouldBurnCarriedFuel`: false when !darkRoom; false when nonCarriedB≥0.55; true when dark+carried+dark corner.
13. `buildLightSources`: dark+torch → carried; authored walls always wall_placed; !darkRoom still returns wall cookies (not `[]`).
14. Dying fuel: at 4% remaining, I_eff ∈ [0.55I, I).

### P1 — Carried gradient / player-sampled overlay **all crawl rooms**

Scene: `ambientForRoom` + sources every room; `visionOverlayAlpha(sample player)`. Soft vignette preferred. Fuel via `shouldBurnCarriedFuel` (dark only).

### P2 — Place torch

`T` crawl / long-press USE (Comb). Save `placedTorches`. Kind `torch_placed`. Max 2. Dark only. Teach on B2 hall sign.

### P3 — Ambush elite

One species, **dark-only**, `stepAmbushState`; telegraph VFX; Hard/Army off.

### P4 — Gear emit + economy

Template tags → gear sources (all crawl rooms); swing afterglow; tinkerer pack + loot bumps; changelog.

---

## 7. Breaking change: wall_ambient → always cookies

### Decision: **positional half-disc everywhere; ambient ladder for fairness**

| Case | Behavior |
| --- | --- |
| every crawl room | `ambient = ambientForRoom(room)` + wall/carried/gear cookies |
| authored `torch_wall` | **`wall_placed` half-disc** (R=5, I=0.88) — **not** B=1 |
| dark + player `torch_placed` | cookies, ambient 0.12 |
| dark + carried/gear | cookies |
| UI modals | no lighting veil |

**Why:** user wants “another level of depth” on surface and B1. High ambient keeps combat fair; cookies supply gradient.

**Semantic split:**

| kind | Meaning |
| --- | --- |
| `torch_wall` entity | authored architecture → runtime `wall_placed` source |
| `torch_placed` / save `placedTorches` | player permanent cookie (dark only) |
| `wall_ambient` kind | **deprecated** — tests may keep one legacy path |

```ts
export function visionDarkAlpha(save, opts: {
  darkRoom: boolean;
  playerB?: number;
}): number {
  if (opts.playerB !== undefined) return visionOverlayAlpha(opts.playerB);
  if (!opts.darkRoom) {
    // legacy callers without continuous sample: no flat blackout on lit
    return 0;
  }
  return LIGHT_DARK_ALPHA[activeLightTier(save)];
}
```

---

## 8. Constants dump

```ts
export const CELL_PX_DEFAULT = 48;
export const AMBIENT_DARK = 0.12;
export const AMBIENT_BOSS = 0.36;
export const AMBIENT_B1 = 0.50;
export const AMBIENT_INDOOR = 0.62;
export const AMBIENT_OUTDOOR = 0.78;
export const AMBIENT_LIT = 1.0; // deprecated for crawl
export const ALPHA_NONE = 0.88;
export const FUEL_PAUSE_B = 0.55;
export const MAX_PLACED_TORCHES_PER_ROOM = 2;

export const LIGHT_RADIUS_TILES = {
  torch: 4.0,
  lantern: 5.5,
  flashlight: 7.0,
  wall_placed: 5.0,
  gear_flame: 2.5,
  gear_amulet: 3.0,
  gear_minor: 2.0,
  gear_afterglow: 3.5,
} as const;

export const LIGHT_PEAK = {
  torch: 0.85,
  lantern: 0.9,
  flashlight: 0.95,
  wall_placed: 0.88,
  gear_flame: 0.4,
  gear_amulet: 0.45,
  gear_minor: 0.3,
  gear_afterglow: 0.55,
} as const;

export const AMBUSH = {
  hideThreshold: 0.22,
  revealThreshold: 0.36,
  ambushRadiusTiles: 2.0,
  rehideDistMul: 1.2,
  telegraphMs: 550,
  minRevealedMs: 2000,
  firstStrikeDamageMul: 0.7,
} as const;

export const ECONOMY_LIGHT = {
  shopTorchPack3Price: 12,
  shopLanternPrice: 50,
  shopFlashlightPrice: 100,
  chestTorch2Chance: 0.48,
  chestTorch1BonusChance: 0.1,
  enemyTorchChanceDeep: 0.06,
} as const;
```

---

## 9. Worked examples

**A — dark, torch at player, enemy 6 tiles east**  
R=4 tiles, d=6 → enemy contrib 0 → B_e=0.12 &lt; hide → can start hidden.  
Player B_p≈1 → bright overlay.

**B — one wall torch west, player far east (dark)**  
Near wall: B high, fuel pause if ≥0.55.  
Far side: B≈0.12 → ambush viable. Room not “solved.”

**C — B1 hall with two authored wall torches**  
ambient 0.50 + half-discs → near sconces ~1.0, mid-room ~0.55–0.70. No fuel burn. No ambush. Depth without tax.

**D — woodz outdoor**  
ambient 0.78, optional prop cookies → soft vignette only. Combat full-fair.

**E — gear only (dark)**  
Amulet I=0.45 R=3 → at feet B≈0.12+0.45=0.57 — dim crawl, still wants torch for radius.

**F — hysteresis**  
B oscillates 0.25–0.33 at rim: phase sticky.  
Walk within 2 tiles: telegraph 550ms → revealed; min 2s visible.

---

## 10. Design tensions (acknowledged, resolved)

| Risk | Resolution in this model |
| --- | --- |
| Permanent place uninstalls fuel | Max **2**/room, half-disc local, fuel only pauses in pool (B≥0.55), not whole floor |
| Full-invis one-shot | `telegraphMs` + no contact until `revealed`; firstStrike 0.7 |
| Hard FoW / nausea | Ambient ladder ≥0.12; soft smoothstep; no pure black |
| Gear sun | Peaks ≤0.45; afterglow temporary |
| Torch flood | Pack×3@12; chest 0.48 not 0.55+; no L1 single-spam SKU |
| Surface too dark for combat | Outdoor 0.78 / indoor 0.62 / B1 0.50 floors |
| Lit rooms flat / no depth | Authored walls = cookies, not B=1 |
| UI unreadable | **No** shadow veil on modals |

---

## 11. Out of scope

- Wall occlusion rays  
- Flashlight cone (isotropic until proven)  
- Hard/Army ambush  
- Picking up sconces  
- Multiplayer  
- Player place-torch on surface/B1 (revisit only if art pass demands)  

---

## 12. Survival vs atmosphere (cheat sheet)

| System | Gate |
| --- | --- |
| Draw cookies / vignette | **always** on crawl rooms (`ambientForRoom` + sources) |
| Fuel burn | `roomIsDark` ∧ carried ∧ `nonCarriedB < 0.55` |
| Place torch | `roomIsDark` ∧ wall adj ∧ cap ∧ stacks |
| Ambush spawn / step | `roomIsDark` only |
| Carried light sources | `roomIsDark` ∧ fuel (optional: allow ignite anywhere but only burn dark — ship: burn gate is enough) |
| UI modals | never |

---

*Numbers locked for implementers. Change via constant tables only; keep smoothstep + additive + ambush phase machine.*
