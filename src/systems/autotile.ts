/**
 * Graphics-v2 autotile — 4-bit edge masks (Core Keeper discrete frames).
 *
 * Phase A: fluids (water/lava)
 * Phase C: land (grass/dirt/wall/snow/floor/sand)
 *
 * Pure mask/frame resolution: logic grid + cell → texture key.
 * No continuous paint, no SDF, no material rewrite.
 *
 * @see docs/graphics-v2-style-bible.md
 * @see docs/graphics-v2-rebuild-plan.md
 */

import type { TileKind } from '../types';
import { resolveShoreTextureKey } from './shore';

/** N=1, E=2, S=4, W=8 → 16 frames */
export const EDGE_N = 1;
export const EDGE_E = 2;
export const EDGE_S = 4;
export const EDGE_W = 8;

export type FluidMaterial = 'water' | 'lava';
export type LandMaterial = 'grass' | 'dirt' | 'wall' | 'snow' | 'floor' | 'sand';
export type AutotileMaterial = FluidMaterial | LandMaterial;

/** @deprecated alias — fluids only (Phase A name kept for imports) */
export type { FluidMaterial as AutotileFluidMaterial };

/** Materials that use Phase A fluid autotile sets. */
export function isAutotileFluid(kind: TileKind): boolean {
  return kind === 'water' || kind === 'lava';
}

/** Materials that use Phase C land edge autotile. */
export function isAutotileLand(kind: TileKind): boolean {
  return (
    kind === 'grass' ||
    kind === 'dirt' ||
    kind === 'wall' ||
    kind === 'snow' ||
    kind === 'floor' ||
    kind === 'sand'
  );
}

/** Structure / access cells — dedicated frames, not land edge sets. */
export function isStructureVisualKind(kind: TileKind): boolean {
  return (
    kind === 'door' ||
    kind === 'locked' ||
    kind === 'stairs' ||
    kind === 'stairs_up' ||
    kind === 'entrance' ||
    kind === 'pad'
  );
}

/**
 * 4-bit edge mask from same-material neighbors.
 * OOB / missing cells are non-matching (open edge).
 */
export function edgeMask4(
  grid: TileKind[][],
  x: number,
  y: number,
  isMatch: (k: TileKind) => boolean,
): number {
  const h = grid.length;
  const w = grid[0]?.length ?? 0;
  const at = (tx: number, ty: number): TileKind => {
    if (tx < 0 || ty < 0 || tx >= w || ty >= h) return 'void';
    return grid[ty]![tx] ?? 'void';
  };
  let mask = 0;
  if (isMatch(at(x, y - 1))) mask |= EDGE_N;
  if (isMatch(at(x + 1, y))) mask |= EDGE_E;
  if (isMatch(at(x, y + 1))) mask |= EDGE_S;
  if (isMatch(at(x - 1, y))) mask |= EDGE_W;
  return mask;
}

/** Match predicate for a fluid material (water only connects to water, etc.). */
export function fluidMatch(material: FluidMaterial): (k: TileKind) => boolean {
  return (k) => k === material;
}

/** Match predicate for land — same kind only (grass≠dirt). */
export function landMatch(material: LandMaterial): (k: TileKind) => boolean {
  return (k) => k === material;
}

/**
 * Texture key for an autotile fluid cell.
 * Interior cells (all 4 neighbors same fluid) → mask 15 → full-fill frame.
 */
export function fluidAutotileKey(
  grid: TileKind[][],
  x: number,
  y: number,
): string | null {
  const kind = grid[y]?.[x];
  if (kind !== 'water' && kind !== 'lava') return null;
  const mask = edgeMask4(grid, x, y, fluidMatch(kind));
  return autotileTextureKey(kind, mask);
}

/**
 * Texture key for an autotile land cell (grass/dirt/wall/snow/floor/sand).
 */
export function landAutotileKey(
  grid: TileKind[][],
  x: number,
  y: number,
): string | null {
  const kind = grid[y]?.[x];
  if (!kind || !isAutotileLand(kind)) return null;
  const mask = edgeMask4(grid, x, y, landMatch(kind as LandMaterial));
  return autotileTextureKey(kind as LandMaterial, mask);
}

/** Stable texture key: `at-water-15`, `at-grass-0`, … */
export function autotileTextureKey(
  material: AutotileMaterial,
  mask: number,
): string {
  const m = Math.max(0, Math.min(15, mask | 0));
  return `at-${material}-${m}`;
}

/**
 * Structure visual texture key (readable architecture).
 * Cave mouth when stairs are dungeon-down (floor >= 0) uses tile-cave-mouth.
 */
export function structureTextureKey(
  kind: TileKind,
  floor = 0,
): string | null {
  switch (kind) {
    case 'door':
      return 'tile-door';
    case 'locked':
      return 'tile-locked';
    case 'stairs':
      return floor >= 0 ? 'tile-cave-mouth' : 'tile-stairs';
    case 'stairs_up':
      return 'tile-stairs-up';
    case 'entrance':
      return 'tile-cave-mouth';
    case 'pad':
      return 'tile-pad';
    default:
      return null;
  }
}

/**
 * Resolve visual texture for fluid autotile (Phase A).
 * Returns null for non-fluid.
 */
export function resolveAutotileTextureKey(
  grid: TileKind[][],
  x: number,
  y: number,
): string | null {
  return fluidAutotileKey(grid, x, y);
}

/**
 * Resolve land edge autotile key (Phase C).
 * Returns null for non-land.
 */
export function resolveLandAutotileTextureKey(
  grid: TileKind[][],
  x: number,
  y: number,
): string | null {
  return landAutotileKey(grid, x, y);
}

/** All 16 masks for boot-time texture generation. */
export function allEdgeMasks(): number[] {
  return Array.from({ length: 16 }, (_, i) => i);
}

/** Land materials generated at boot. */
export function allLandMaterials(): LandMaterial[] {
  return ['grass', 'dirt', 'wall', 'snow', 'floor', 'sand'];
}

/**
 * True if this mask is a full-fill interior (all four sides match neighbors).
 */
export function isFullFillMask(mask: number): boolean {
  return (mask & 0xf) === 0xf;
}

/** Room visual context for discrete cell resolve (no Phaser). */
export type RoomVisualCtx = {
  roomId: string;
  land: string;
  floor?: number;
  /** beach_start — sand cliffs / sand floors */
  onBeach: boolean;
  /** road_north_* or land dwarvez — basalt walls / jagged floor */
  isMountainApproach: boolean;
  /** Optional water-body style for legacy fluid fallback keys */
  waterBody?: string;
};

/** Default TEX[] keys when autotile / themed frames are missing. */
const TEX_FALLBACK: Record<string, string> = {
  void: 'tile-floor',
  floor: 'tile-floor',
  wall: 'tile-wall',
  grass: 'tile-grass',
  dirt: 'tile-dirt',
  sand: 'tile-sand',
  snow: 'tile-snow',
  water: 'tile-water',
  door: 'tile-door',
  locked: 'tile-locked',
  stairs: 'tile-stairs',
  stairs_up: 'tile-stairs-up',
  entrance: 'tile-cave-mouth',
  lava: 'tile-lava',
  pad: 'tile-pad',
  carpet: 'tile-carpet',
};

/**
 * Ordered texture candidates for one cell (first existing key wins at runtime).
 *
 * Precedence:
 * 1. structure (door/stairs/cave-mouth)
 * 2. fluid autotile
 * 3. shore (land N4 water)
 * 4. **themed land** (beach sand wall/floor, dwarvez basalt) — before generic land
 * 5. land edge autotile
 * 6. legacy TEX fallback
 */
export function resolveRoomCellTextureCandidates(
  grid: TileKind[][],
  x: number,
  y: number,
  ctx: RoomVisualCtx,
): string[] {
  const kind = grid[y]?.[x];
  if (kind == null) return ['tile-floor'];
  const out: string[] = [];

  if (isStructureVisualKind(kind)) {
    const s = structureTextureKey(kind, ctx.floor ?? 0);
    if (s) out.push(s);
    out.push(TEX_FALLBACK[kind] ?? 'tile-floor');
    return out;
  }

  if (isAutotileFluid(kind)) {
    const f = fluidAutotileKey(grid, x, y);
    if (f) out.push(f);
    if (kind === 'water' && ctx.waterBody) {
      out.push(`tile-water-${ctx.waterBody}`);
      out.push('tile-water');
    }
    if (kind === 'lava') out.push('tile-lava');
    out.push(TEX_FALLBACK[kind] ?? 'tile-water');
    return out;
  }

  // Phase B shore (land N4 water) — wins over themed land and generic land
  const shore = resolveShoreTextureKey(
    grid,
    x,
    y,
    ctx.land,
    ctx.roomId,
  );
  if (shore) {
    out.push(shore);
    out.push(TEX_FALLBACK[kind] ?? 'tile-dirt');
    return out;
  }

  // Themed land BEFORE generic land autotile (beach cliffs, dwarvez basalt)
  if (kind === 'wall' && ctx.onBeach) out.push('tile-sand-wall');
  if (kind === 'floor' && ctx.onBeach) out.push('tile-sand');
  if (kind === 'wall' && ctx.isMountainApproach) out.push('tile-dwarf-wall');
  if (kind === 'floor' && ctx.land === 'dwarvez') out.push('tile-dwarf-floor');

  // Phase C generic land edge frames
  if (isAutotileLand(kind)) {
    const l = landAutotileKey(grid, x, y);
    if (l) out.push(l);
  }

  out.push(TEX_FALLBACK[kind] ?? 'tile-floor');
  return out;
}

/** First candidate that exists (or last fallback). */
export function pickTextureKey(
  candidates: string[],
  exists: (key: string) => boolean,
): string {
  for (const c of candidates) {
    if (exists(c)) return c;
  }
  return candidates[candidates.length - 1] ?? 'tile-floor';
}

/**
 * Phase D fluid anim: alternate key for silhouette-safe sparkle frame.
 * `at-water-15` → `at-water-15-b`. Non-autotile keys return null.
 */
export function fluidAnimAltKey(baseKey: string): string | null {
  if (!/^at-(water|lava)-\d+$/.test(baseKey)) return null;
  return `${baseKey}-b`;
}

/**
 * Two-frame anim pair if both are autotile solid-body keys.
 * Anim only swaps sparkles — same open-edge silhouette as Phase A.
 */
export function fluidAnimFramePair(
  baseKey: string,
): [string, string] | null {
  const alt = fluidAnimAltKey(baseKey);
  if (!alt) return null;
  return [baseKey, alt];
}

/** True if key is a Phase A/D solid fluid autotile body (not land/void). */
export function isSolidFluidAutotileKey(key: string): boolean {
  return /^at-(water|lava)-\d+(-b)?$/.test(key);
}
