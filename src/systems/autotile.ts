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
