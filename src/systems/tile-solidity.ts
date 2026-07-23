/**
 * Universal tile solidity rules for walk vs projectile / ranged LOS.
 *
 * LAW:
 * - Water never blocks a doorway or pathway for *ranged line of fire*.
 * - Water never stops projectiles (arrows, bolts, lightning, etc.).
 * - Water still blocks walking (ponds/rivers stay non-walkable).
 * - Walls / void / locked always block both walk and projectiles.
 * - Lava blocks walk; still blocks projectiles (hazard wall, not "over water").
 *
 * Logic grid TileKind is authoritative — no visual shore/autotile rewrites.
 */

import type { TileKind } from '../types';

/** Kinds that block walking / AI path probes. */
const WALK_BLOCK = new Set<string>([
  'wall',
  'water',
  'void',
  'locked',
  'lava',
]);

/** Kinds that stop projectiles and ranged LOS. Water is intentionally absent. */
const PROJECTILE_BLOCK = new Set<string>(['wall', 'void', 'locked', 'lava']);

/**
 * True if a creature cannot stand / walk on this kind.
 * Water is walk-blocked (pathways around ponds still go on land).
 * Door tiles are never walk-blocked even if mis-authored.
 */
export function blocksWalk(kind: TileKind | string | undefined | null): boolean {
  if (kind == null || kind === '') return true;
  if (kind === 'door') return false; // doorway always passable
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
  if (kind === 'door') return false;
  return PROJECTILE_BLOCK.has(kind);
}

/** @deprecated name for callers that meant walk-solid — use blocksWalk */
export function isWalkSolidKind(
  kind: TileKind | string | undefined | null,
): boolean {
  return blocksWalk(kind);
}
