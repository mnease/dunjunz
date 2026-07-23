/**
 * Universal tile solidity rules for walk vs projectile / ranged LOS.
 *
 * LAW:
 * - Water never blocks a doorway or pathway approach (door / stairs / entrance /
 *   pad adjacency → water is walkable ford so doors stay reachable).
 * - Water never stops projectiles (arrows, bolts, lightning, etc.).
 * - Water still blocks walking in open ponds/rivers (no door access nearby).
 * - Walls / void / locked always block both walk and projectiles.
 * - Lava blocks walk and projectiles.
 *
 * Logic grid TileKind is authoritative — no visual shore/autotile rewrites.
 */

import type { TileKind } from '../types';

/** Kinds that block walking when not given doorway-ford exception. */
const WALK_BLOCK = new Set<string>([
  'wall',
  'water',
  'void',
  'locked',
  'lava',
]);

/** Kinds that stop projectiles and ranged LOS. Water is intentionally absent. */
const PROJECTILE_BLOCK = new Set<string>(['wall', 'void', 'locked', 'lava']);

/** Access tiles — water next to these never blocks walk (doorway / path mouth). */
const ACCESS_KINDS = new Set<string>([
  'door',
  'stairs',
  'stairs_up',
  'entrance',
  'pad',
]);

export function isAccessKind(kind: TileKind | string | undefined | null): boolean {
  return !!kind && ACCESS_KINDS.has(kind);
}

/**
 * True if any N/E/S/W neighbor is a doorway/stairs/access tile.
 * Used so water fords form at door mouths (4-neigh only).
 */
export function hasAccessNeighbor4(
  grid: Array<Array<TileKind | string>>,
  x: number,
  y: number,
): boolean {
  const h = grid.length;
  const w = grid[0]?.length ?? 0;
  const at = (tx: number, ty: number): string => {
    if (tx < 0 || ty < 0 || tx >= w || ty >= h) return 'void';
    return (grid[ty]![tx] as string) ?? 'void';
  };
  return (
    isAccessKind(at(x, y - 1)) ||
    isAccessKind(at(x + 1, y)) ||
    isAccessKind(at(x, y + 1)) ||
    isAccessKind(at(x - 1, y))
  );
}

/**
 * Kind-only walk block (no grid). Prefer {@link blocksWalkAt} when grid known.
 * Door is never blocked. Water is blocked without adjacency context.
 */
export function blocksWalk(kind: TileKind | string | undefined | null): boolean {
  if (kind == null || kind === '') return true;
  if (isAccessKind(kind)) return false;
  return WALK_BLOCK.has(kind);
}

/**
 * Grid-aware walk solid. Universal doorway law:
 * water adjacent to door/stairs/entrance/pad does **not** block walk.
 */
export function blocksWalkAt(
  grid: Array<Array<TileKind | string>>,
  x: number,
  y: number,
): boolean {
  const kind = grid[y]?.[x] as TileKind | string | undefined;
  if (kind == null || kind === '') return true;
  if (isAccessKind(kind)) return false;
  if (kind === 'water' && hasAccessNeighbor4(grid, x, y)) return false;
  return WALK_BLOCK.has(kind);
}

/**
 * True if projectiles / lightning LOS stop on this kind.
 * **Universal: water never blocks** — shoot over water, through doorways over ponds.
 */
export function blocksProjectile(
  kind: TileKind | string | undefined | null,
): boolean {
  if (kind == null || kind === '') return true;
  if (kind === 'water') return false;
  if (isAccessKind(kind)) return false;
  return PROJECTILE_BLOCK.has(kind);
}

/** @deprecated use blocksWalk */
export function isWalkSolidKind(
  kind: TileKind | string | undefined | null,
): boolean {
  return blocksWalk(kind);
}
