/**
 * Graphics-v2 Phase A — 4-bit edge-mask autotile (Core Keeper discrete frames).
 *
 * Pure mask/frame resolution: logic grid + cell → texture key.
 * No continuous paint, no SDF, no material rewrite.
 *
 * @see docs/graphics-v2-style-bible.md
 * @see docs/graphics-v2-rebuild-plan.md Phase A
 */

import type { TileKind } from '../types';

/** N=1, E=2, S=4, W=8 → 16 frames */
export const EDGE_N = 1;
export const EDGE_E = 2;
export const EDGE_S = 4;
export const EDGE_W = 8;

export type AutotileMaterial = 'water' | 'lava';

/** Materials that use Phase A fluid autotile sets. */
export function isAutotileFluid(kind: TileKind): boolean {
  return kind === 'water' || kind === 'lava';
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
export function fluidMatch(material: AutotileMaterial): (k: TileKind) => boolean {
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

/** Stable texture key: `at-water-15`, `at-lava-0`, … */
export function autotileTextureKey(
  material: AutotileMaterial,
  mask: number,
): string {
  const m = Math.max(0, Math.min(15, mask | 0));
  return `at-${material}-${m}`;
}

/**
 * Resolve visual texture for a cell when autotile applies.
 * Returns null for non-fluid (caller uses TEX[kind] / land path).
 */
export function resolveAutotileTextureKey(
  grid: TileKind[][],
  x: number,
  y: number,
): string | null {
  return fluidAutotileKey(grid, x, y);
}

/** All 16 masks for boot-time texture generation. */
export function allEdgeMasks(): number[] {
  return Array.from({ length: 16 }, (_, i) => i);
}

/**
 * True if this mask is a full-fill interior (all four sides match neighbors).
 * Used by tests and frame generators (no open-edge foam).
 */
export function isFullFillMask(mask: number): boolean {
  return (mask & 0xf) === 0xf;
}
