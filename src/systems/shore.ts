/**
 * Graphics-v2 Phase B — 1-cell land-aware shore ring around water.
 *
 * Pure resolve: logic grid + land context → shore texture key or null.
 * Water cells never become shore. Walls/structures never become shore.
 * Collision uses logic TileKind unchanged.
 *
 * @see docs/graphics-v2-style-bible.md §5.3
 * @see docs/graphics-v2-rebuild-plan.md Phase B
 */

import type { TileKind } from '../types';

/** Shore visual materials (Style Bible land-aware ramps). */
export type ShoreMaterial = 'sand' | 'dirt' | 'cave' | 'snow';

/** Land kinds eligible for shore paint (walkable / open ground). */
export function isShoreEligibleLand(kind: TileKind): boolean {
  return (
    kind === 'grass' ||
    kind === 'dirt' ||
    kind === 'sand' ||
    kind === 'snow' ||
    kind === 'floor' ||
    kind === 'carpet'
  );
}

/** Structure / solid architecture — never receive shore paint. */
export function isShoreBlockedKind(kind: TileKind): boolean {
  return (
    kind === 'wall' ||
    kind === 'locked' ||
    kind === 'door' ||
    kind === 'stairs' ||
    kind === 'stairs_up' ||
    kind === 'entrance' ||
    kind === 'pad' ||
    kind === 'void' ||
    kind === 'water' ||
    kind === 'lava'
  );
}

/**
 * True if any of N/E/S/W is water (4-neighbor only — no diagonal fatten).
 */
export function hasWaterNeighbor4(
  grid: TileKind[][],
  x: number,
  y: number,
): boolean {
  const h = grid.length;
  const w = grid[0]?.length ?? 0;
  const at = (tx: number, ty: number): TileKind => {
    if (tx < 0 || ty < 0 || tx >= w || ty >= h) return 'void';
    return grid[ty]![tx] ?? 'void';
  };
  return (
    at(x, y - 1) === 'water' ||
    at(x + 1, y) === 'water' ||
    at(x, y + 1) === 'water' ||
    at(x - 1, y) === 'water'
  );
}

/**
 * Land-aware shore material from room land + room id.
 * Beach / desert → sand; dwarvez → snow gravel-dirt; dungeons → packed cave dirt.
 */
export function shoreMaterialForContext(
  landId: string,
  roomId = '',
): ShoreMaterial {
  if (roomId === 'beach_start' || landId === 'dezertz') return 'sand';
  if (landId === 'dwarvez') return 'snow';
  if (
    landId === 'dunjunz' ||
    landId === 'sewerz' ||
    landId === 'moredorkz' ||
    landId === 'kingdomz'
  ) {
    return 'cave';
  }
  // surface, woodz, roarhimz, default meadow/path
  return 'dirt';
}

/** Stable texture key: `at-shore-sand`, `at-shore-dirt`, … */
export function shoreTextureKey(material: ShoreMaterial): string {
  return `at-shore-${material}`;
}

/**
 * Resolve shore visual for a land cell adjacent to water.
 * Returns null if not shore-eligible, blocked, or no N4 water.
 * Never returns a key for water/lava cells.
 */
export function resolveShoreTextureKey(
  grid: TileKind[][],
  x: number,
  y: number,
  landId: string,
  roomId = '',
): string | null {
  const kind = grid[y]?.[x];
  if (kind == null) return null;
  if (isShoreBlockedKind(kind)) return null;
  if (!isShoreEligibleLand(kind)) return null;
  if (!hasWaterNeighbor4(grid, x, y)) return null;
  return shoreTextureKey(shoreMaterialForContext(landId, roomId));
}

/** All shore materials for boot-time texture generation. */
export function allShoreMaterials(): ShoreMaterial[] {
  return ['sand', 'dirt', 'cave', 'snow'];
}
