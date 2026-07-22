# Surface sun + cast shadows + cloud masks (v1)

**Status:** design lock (Hexis) · pure math only  
**Date:** 2026-07-22  
**Extends:** `docs/lighting-v2-model.md`, `src/systems/lighting.ts`  
**Does not change:** B2+ survival dark, fuel, place, ambush, `sampleBrightness` cookie model indoors/underground.

---

## Verdict

**Hybrid invert for outdoor surface only:**

| Zone | Base | Stamp mode |
| --- | --- | --- |
| Outdoor surface | high ambient (`AMBIENT_SURFACE` 0.9) + soft sun vignette α≈0.01 | **subtractive dark blobs** (tree + cloud) |
| Indoor surface / kingdom | `AMBIENT_INDOOR_SURFACE` 0.78 | light cookies (current erase path) |
| B1 / B2+ / `dark` | existing ambient ladder | light cookies (current erase path) |

**Law:** outdoor = bright day with moving shade, not dark room with light holes. Floor silhouettes always readable. Cap total outdoor shadow α at **0.42**.

Presentation note (Phaser later): outdoor `lightRt` keeps thin ambient fill, then **stamps** soft dark cookies (fill/add dark), **does not** erase light cookies. Survival erase path stays for non-outdoor rooms.

---

## 1. `isOutdoorSurface(room)`

```ts
/** Lands that can host open-sky outdoor crawl. */
export const OUTDOOR_SURFACE_LANDS = [
  'surface',
  'woodz',
  'dezertz',
] as const;

export function isOutdoorSurface(room: {
  floor?: number;
  dark?: boolean;
  land?: string;
  indoor?: boolean; // optional future tag; default outdoor when land matches
}): boolean {
  if (room.dark === true) return false;
  if ((room.floor ?? 0) < 0) return false;
  if (room.indoor === true) return false;
  const land = room.land ?? 'surface';
  // kingdomz / village / shops stay indoor path even at floor 0
  if (land === 'kingdomz' || land === 'kingdom' || land === 'village') {
    return false;
  }
  if (land === 'dunjunz' || land === 'sewerz') return false;
  return (
    land === 'surface' ||
    land === 'woodz' ||
    land === 'dezertz' ||
    // authored surface path without land still outdoor if floor>=0 & !dark
    land === ''
  );
}
```

| Room | Result |
| --- | --- |
| woodz path `floor:0` | **true** |
| surface hub `floor:0` | **true** |
| dezertz field `floor:0` | **true** |
| woodz B1 `floor:-1` | false |
| `dark:true` surface dungeon | false |
| kingdomz hall | false |
| dunjunz B1 | false |

`roomIsDark` / fuel / place / ambush: **unchanged**. Outdoor never enters survival dark path.

---

## 2. Sun + tree cast offset

Units: world px. `CELL = 48`.

```ts
/** Unit vector: direction shadow is cast on the ground (away from sun). */
export type SunDir = { x: number; y: number };

/** Default outdoor sun: afternoon, NW light → SE ground cast. */
export const SUN_DIR_DEFAULT: SunDir = normalize({ x: 0.62, y: 0.38 });

/** Shadow length as multiple of canopy height. */
export const CAST_LEN = 0.72;

/**
 * Ground-shadow center from tree base (sprite feet).
 * treeHeightPx ≈ canopy height in world px (default ~1.35 * CELL ≈ 65).
 */
export function castShadowOffset(
  treeX: number,
  treeY: number,
  sunDir: SunDir,
  treeHeightPx: number,
): { x: number; y: number } {
  const h = Math.max(0, treeHeightPx);
  const d = normalize(sunDir);
  return {
    x: treeX + d.x * h * CAST_LEN,
    y: treeY + d.y * h * CAST_LEN,
  };
}

export function normalize(v: { x: number; y: number }): SunDir {
  const len = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / len, y: v.y / len };
}
```

### Soft ellipse darkness for one tree

```ts
export const TREE_SHADOW_PEAK = 0.30;   // center darkness 0..1
export const TREE_RX_MUL = 0.55;       // semi-major / height
export const TREE_RY_MUL = 0.28;       // semi-minor / height

/** Darkness contrib of one tree at (px,py). Smoothstep ellipse. */
export function treeShadowDarkness(
  px: number,
  py: number,
  treeX: number,
  treeY: number,
  sunDir: SunDir,
  treeHeightPx: number,
  peak = TREE_SHADOW_PEAK,
): number {
  const c = castShadowOffset(treeX, treeY, sunDir, treeHeightPx);
  const h = Math.max(1e-6, treeHeightPx);
  const rx = h * TREE_RX_MUL;
  const ry = h * TREE_RY_MUL;
  // Align major axis with sunDir
  const d = normalize(sunDir);
  const dx = px - c.x;
  const dy = py - c.y;
  const localX = dx * d.x + dy * d.y;          // along cast
  const localY = -dx * d.y + dy * d.x;         // perpendicular
  const u = (localX * localX) / (rx * rx) + (localY * localY) / (ry * ry);
  if (u >= 1) return 0;
  const t = 1 - Math.sqrt(u);                  // 1 center → 0 rim
  return peak * smoothstepFalloff(t);          // reuse lighting.ts
}
```

Default `treeHeightPx`:

| Prop | Height |
| --- | ---: |
| woodz `tree` | `1.35 * CELL` (65) |
| large/boss tree | `1.8 * CELL` (86) |
| cactus (optional P2) | `0.9 * CELL` (43), peak 0.18 |

---

## 3. `cloudShadowSample(x, y, timeMs, seed) → 0..1`

Sum of soft circles with deterministic hash params. Drift wraps on a large period so the field feels infinite.

```ts
export const MAX_CLOUD_BLOBS = 6;
export const CLOUD_PERIOD_PX = 1400;     // wrap domain
export const CLOUD_STRENGTH_DEFAULT = 0.55;
export const CLOUD_PEAK_RANGE: [number, number] = [0.12, 0.28];
export const CLOUD_R_RANGE: [number, number] = [90, 220]; // world px

/** 0..1 deterministic hash (seed + index). */
export function hash01(seed: number, i: number): number {
  // mulberry32-ish single sample
  let t = (seed + i * 0x9e3779b9) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Cloud darkness at world pixel. Pure; no Phaser.
 * timeMs drives drift; seed pins blob layout per room/land.
 */
export function cloudShadowSample(
  x: number,
  y: number,
  timeMs: number,
  seed: number,
): number {
  const tSec = Math.max(0, timeMs) * 0.001;
  let dark = 0;
  for (let i = 0; i < MAX_CLOUD_BLOBS; i++) {
    const u0 = hash01(seed, i * 5 + 0);
    const u1 = hash01(seed, i * 5 + 1);
    const u2 = hash01(seed, i * 5 + 2);
    const u3 = hash01(seed, i * 5 + 3);
    const u4 = hash01(seed, i * 5 + 4);

    const r = lerp(CLOUD_R_RANGE[0], CLOUD_R_RANGE[1], u0);
    const peak = lerp(CLOUD_PEAK_RANGE[0], CLOUD_PEAK_RANGE[1], u1);
    // base positions + slow drift (different per blob)
    const speedX = lerp(8, 28, u2);   // px/s
    const speedY = lerp(-6, 10, u3);
    const baseX = u4 * CLOUD_PERIOD_PX;
    const baseY = hash01(seed, i * 5 + 6) * CLOUD_PERIOD_PX;

    const cx =
      ((baseX + speedX * tSec) % CLOUD_PERIOD_PX + CLOUD_PERIOD_PX) %
      CLOUD_PERIOD_PX;
    const cy =
      ((baseY + speedY * tSec) % CLOUD_PERIOD_PX + CLOUD_PERIOD_PX) %
      CLOUD_PERIOD_PX;

    // sample in wrap space: min distance on torus
    const dx = wrapDelta(x - cx, CLOUD_PERIOD_PX);
    const dy = wrapDelta(y - cy, CLOUD_PERIOD_PX);
    const dist = Math.hypot(dx, dy);
    if (dist >= r) continue;
    const fall = 1 - dist / r;
    dark += peak * smoothstepFalloff(fall);
  }
  return clamp01(dark);
}

function wrapDelta(d: number, period: number): number {
  const half = period * 0.5;
  return ((((d + half) % period) + period) % period) - half;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
```

`seed` recipe (runtime, not pure-required):  
`seed = hashString(room.id) ^ (landByte << 8)` so rooms differ; same room stable across sessions.

`reduceMotion`: freeze `timeMs` at room-enter snapshot (static clouds OK).

---

## 4. Compose `surfaceShadowAlpha`

```ts
export const SURFACE_SHADOW_ALPHA_CAP = 0.42;
export const MAX_TREES_SHADOW = 24;

export type TreeShadowInput = {
  x: number;
  y: number;
  heightPx: number;
};

/**
 * Subtractive outdoor darkness at one pixel (overlay α contribution).
 * treeShadows + cloud * strength, hard-capped.
 */
export function surfaceShadowAlpha(
  px: number,
  py: number,
  trees: TreeShadowInput[],
  sunDir: SunDir,
  timeMs: number,
  seed: number,
  cloudStrength = CLOUD_STRENGTH_DEFAULT,
): number {
  // Additive soft max with hard cap — trees first (local), clouds second (global)
  let treeDark = 0;
  const n = Math.min(trees.length, MAX_TREES_SHADOW);
  for (let i = 0; i < n; i++) {
    const tr = trees[i];
    treeDark += treeShadowDarkness(
      px,
      py,
      tr.x,
      tr.y,
      sunDir,
      tr.heightPx,
    );
  }
  treeDark = clamp01(treeDark);

  const cloudDark = cloudShadowSample(px, py, timeMs, seed);
  const combined = treeDark + cloudDark * clamp01(cloudStrength);
  return Math.min(SURFACE_SHADOW_ALPHA_CAP, combined);
}
```

### Effective outdoor overlay (presentation)

```
baseα  = visionOverlayAlpha(AMBIENT_SURFACE)     // ~0.01 soft sun veil
blobα  = surfaceShadowAlpha(...)                 // 0..0.42
// RT: fill baseα, then stamp dark cookies so local α ≈ min(cap, baseα + blobα)
// Do NOT call erase light cookies on outdoor surface (unless rare env glow later)
```

Optional future bridge to brightness model (AI unused outdoor):

```
B_outdoor = clamp(AMBIENT_SURFACE - surfaceShadowAlpha(...), 0.5, 1)
```

Ambush still dark-only — no outdoor stalkers.

---

## 5. Performance budget

| Budget | Value | Rationale |
| --- | ---: | --- |
| Max trees casting | **24** | rooms today ~6–8; deep woodz packs still under 24 |
| Max cloud blobs | **6** | enough mottling; O(6) per sample |
| Tree shadow update | **on room enter** (+ if tree moves; none do) | static offsets |
| Cloud field update | **every 100 ms** (10 Hz) or every 3rd frame | slow drift; no need 60 Hz |
| Pixel samples / frame | **0 CPU full-grid** | stamp ≈N dark cookies on RT (trees + clouds), not per-pixel JS |
| RT stamps / frame | ≤ **24 tree + 6 cloud** = 30 soft cookies | same order as lava light erase |
| Fullscreen JS sample | **tests + optional AI only** | never per-pixel in update |
| `reduceMotion` | freeze cloud `timeMs`; keep static tree casts | |

**Runtime path (P1+):** precompute tree shadow centers on enter; each cloud refresh, stamp 6 soft dark discs at drifted positions (screen-space like light cookies). Do **not** call `surfaceShadowAlpha` for every screen pixel in JS.

---

## 6. Ship order

| Phase | Deliver | Gate |
| --- | --- | --- |
| **P0** | Pure helpers in `lighting.ts` (or `surface-shadows.ts`): `isOutdoorSurface`, `castShadowOffset`, `treeShadowDarkness`, `cloudShadowSample`, `surfaceShadowAlpha` + vitest | tests green; no Phaser |
| **P1** | GameScene outdoor branch: if `isOutdoorSurface` → thin veil + stamp tree dark cookies (woodz/surface trees); skip light erase | woodz path reads day-with-shade |
| **P2** | Drifting cloud stamps (10 Hz), dezertz optional cactus casts, room seed, `reduceMotion` freeze; land-tinted shadow color (cool woodz / warm dezertz) | polish |

Out of scope P0–P2: dynamic sun angle by time-of-day clock, player cast shadow, shader SDF clouds, Hard/Army variants.

---

## 7. Pure functions for tests (must ship P0)

| Function | Assertions |
| --- | --- |
| `isOutdoorSurface` | woodz/surface/dezertz floor0 true; B1/dark/kingdomz false |
| `castShadowOffset` | unit sunDir → offset length `≈ height * CAST_LEN`; zero height → origin |
| `treeShadowDarkness` | peak at cast center; 0 outside ellipse; monotonic falloff along axis |
| `cloudShadowSample` | in `[0,1]`; same `(x,y,t,seed)` stable; different seed differs; `t` advances moves mass |
| `surfaceShadowAlpha` | `≤ SURFACE_SHADOW_ALPHA_CAP`; empty trees + cloudStrength 0 → 0; trees alone can exceed single peak via sum then clamp |
| `hash01` | deterministic; spread in (0,1) |

Suggested file: `src/systems/surface-shadows.ts` (keep `lighting.ts` survival-focused) reusing `smoothstepFalloff` from lighting.

Minimal test sketch:

```ts
expect(isOutdoorSurface({ floor: 0, land: 'woodz' })).toBe(true);
expect(isOutdoorSurface({ floor: -1, land: 'woodz' })).toBe(false);
expect(isOutdoorSurface({ floor: 0, land: 'woodz', dark: true })).toBe(false);

const o = castShadowOffset(0, 0, { x: 1, y: 0 }, 100);
expect(o.x).toBeCloseTo(72, 5); // CAST_LEN 0.72
expect(o.y).toBeCloseTo(0, 5);

const c = castShadowOffset(10, 20, SUN_DIR_DEFAULT, 65);
const peak = treeShadowDarkness(c.x, c.y, 10, 20, SUN_DIR_DEFAULT, 65);
const far = treeShadowDarkness(c.x + 500, c.y + 500, 10, 20, SUN_DIR_DEFAULT, 65);
expect(peak).toBeGreaterThan(0.2);
expect(far).toBe(0);

const a0 = cloudShadowSample(0, 0, 0, 1);
const a1 = cloudShadowSample(0, 0, 0, 1);
expect(a0).toBe(a1);
expect(a0).toBeGreaterThanOrEqual(0);
expect(a0).toBeLessThanOrEqual(1);

expect(
  surfaceShadowAlpha(0, 0, [], SUN_DIR_DEFAULT, 0, 1, 0),
).toBe(0);
```

---

## Constants cheat sheet

| Symbol | Value |
| --- | ---: |
| `AMBIENT_SURFACE` (existing) | 0.9 |
| `CAST_LEN` | 0.72 |
| `TREE_SHADOW_PEAK` | 0.30 |
| `TREE_RX_MUL` / `TREE_RY_MUL` | 0.55 / 0.28 |
| `MAX_TREES_SHADOW` | 24 |
| `MAX_CLOUD_BLOBS` | 6 |
| `CLOUD_STRENGTH_DEFAULT` | 0.55 |
| `SURFACE_SHADOW_ALPHA_CAP` | 0.42 |
| Cloud refresh | 100 ms |
| Default tree height | `1.35 * 48` |

---

## Integration sketch (P1, not P0)

```
refreshLighting():
  if panelOpen → hide RT
  if isOutdoorSurface(room):
    baseα = visionOverlayAlpha(ambientForRoom(room))
    RT.fill(0x02040a, baseα)
    for tree in trees[0..24]: stamp dark_cookie @ castShadowOffset (screen)
    every 100ms: stamp 6 cloud dark cookies from cloud centers
    // no erase light cookies
  else:
    // existing ambient fill + erase light cookies
```

Dark cookie texture: reuse radial soft disc, stamp with multiply/add dark alpha (inverse of `light_cookie` erase). Pollen owns color tokens; Hexis locks α math only.
