/**
 * Creep respawn rules — common combat creeps return on a clock.
 * Bosses / quest-critical kills stay permanent.
 */

import type { EntityKind } from '../types';

/** Kinds that reappear after a delay (not bosses / story). */
export const RESPAWN_KINDS: ReadonlySet<string> = new Set([
  'slime',
  'skeleton',
  'redshirt',
  'wolf',
  'cactus',
  'scorpion',
  'tarantula',
  'hornet',
]);

/** Base delay before a creep can return (ms). */
export const RESPAWN_BASE_MS = 55_000;
/** Extra random delay (ms) so packs don't pop at once. */
export const RESPAWN_JITTER_MS = 20_000;

/**
 * Permanent kill = never respawn (quest / boss / unique).
 * Soft kill = XP + loot now, clock respawn later.
 */
export function isPermanentKill(kind: string, id: string): boolean {
  if (kind === 'boss') return true;
  if (kind === 'miniboss') return true;
  if (kind === 'cube') return true;
  if (id === 'captain' || id === 'captain-hard') return true;
  if (
    id === 'floor-captain' ||
    id === 'rules-lawyer' ||
    id === 'assistant-honk' ||
    id === 'deputy-howl' ||
    id === 'lease-wight' ||
    id === 'root-alpha' ||
    id === 'dune-stalker' ||
    id === 'bilge-brute'
  ) {
    return true;
  }
  // Hard-mode trek ensigns must stay dead for captain promotion
  if (id.startsWith('ensign-')) return true;
  if (id === 'dungeon-master' || id === 'wolf-lord' || id === 'sand-wraith') {
    return true;
  }
  if (id === 'royal-goose') return true;
  // Props / non-combat
  if (
    kind === 'tree' ||
    kind === 'tumbleweed' ||
    kind === 'npc' ||
    kind === 'merchant' ||
    kind === 'sign' ||
    kind === 'portal' ||
    kind === 'best_bud' ||
    kind === 'princess'
  ) {
    return true;
  }
  return !RESPAWN_KINDS.has(kind);
}

export function canSoftRespawn(kind: EntityKind | string, id: string): boolean {
  return RESPAWN_KINDS.has(kind) && !isPermanentKill(kind, id);
}

/** Delay until respawn — ~55–75s. */
export function respawnDelayMs(rng: () => number = Math.random): number {
  return RESPAWN_BASE_MS + Math.floor(rng() * RESPAWN_JITTER_MS);
}

/**
 * Scale HP when a creep comes back.
 * Slightly harder with player level + each successive respawn generation.
 */
export function scaleRespawnHp(
  baseHp: number,
  playerLevel: number,
  generation: number,
): number {
  const L = Math.max(1, playerLevel);
  const g = Math.max(0, generation);
  // ~3% per player level (cap +60%), +5% per gen (cap +50%)
  const levelMult = 1 + Math.min(0.6, 0.03 * (L - 1));
  const genMult = 1 + Math.min(0.5, 0.05 * g);
  return Math.max(1, Math.round(baseHp * levelMult * genMult));
}

/** Scale contact damage a little with level / generation. */
export function scaleRespawnContact(
  baseDmg: number,
  playerLevel: number,
  generation: number,
): number {
  const L = Math.max(1, playerLevel);
  const g = Math.max(0, generation);
  return Math.max(
    1,
    baseDmg + Math.floor((L - 1) / 7) + Math.floor(g / 2),
  );
}
