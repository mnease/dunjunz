/**
 * Smashable corner props — barrels, crates, vases.
 * Hit with a weapon for coins and occasional potions.
 * Pure helpers; GameScene owns spawn + hit + VFX.
 */

import type { EntityDef, EntityKind } from '../types';
import type { LootDrop, Rng } from './loot';
import { mulberry32 } from './loot';

export const SMASHABLE_KINDS = ['barrel', 'crate', 'vase'] as const;
export type SmashableKind = (typeof SMASHABLE_KINDS)[number];

export function isSmashableKind(kind: string): kind is SmashableKind {
  return (SMASHABLE_KINDS as readonly string[]).includes(kind);
}

/** Hits to break (melee / projectiles). Vases are fragile. */
export function smashableHp(kind: SmashableKind): number {
  if (kind === 'vase') return 1;
  if (kind === 'crate') return 2;
  return 3; // barrel
}

/**
 * Loot table: always a few coins; ~22% potion; rare second coin pouch.
 */
export function rollSmashLoot(
  kind: SmashableKind,
  rng: Rng = Math.random,
): LootDrop[] {
  const drops: LootDrop[] = [];
  const base =
    kind === 'barrel' ? 4 : kind === 'crate' ? 3 : 2;
  const coins = base + Math.floor(rng() * (kind === 'barrel' ? 8 : 5));
  drops.push({
    kind: 'coins',
    label: `${coins} COINS`,
    coins,
  });
  if (rng() < 0.22) {
    drops.push({
      kind: 'potion',
      label: 'POTION',
      stackId: 'potion',
      stackCount: 1,
    });
  }
  if (rng() < 0.08) {
    const bonus = 2 + Math.floor(rng() * 6);
    drops.push({
      kind: 'coins',
      label: `+${bonus} COINS`,
      coins: bonus,
    });
  }
  return drops;
}

/** Stable seed from room + run seed so corners don't reshuffle every frame. */
export function smashSeed(roomId: string, runSeed: number): number {
  let h = runSeed >>> 0;
  for (let i = 0; i < roomId.length; i++) {
    h = Math.imul(h ^ roomId.charCodeAt(i), 0x9e3779b1) >>> 0;
  }
  return h || 1;
}

/**
 * Pick corner-ish floor tiles (authored 16×11 coords) for smash props.
 * Prefers classic four corners; may fill near-corners if primary is blocked.
 */
export function cornerSmashSlots(
  walkable: (x: number, y: number) => boolean,
  occupied: Set<string>,
  rng: Rng,
  max = 4,
): { x: number; y: number; kind: SmashableKind }[] {
  const candidates: [number, number][] = [
    [1, 1],
    [14, 1],
    [1, 9],
    [14, 9],
    [2, 1],
    [13, 1],
    [1, 2],
    [14, 2],
    [2, 9],
    [13, 9],
    [1, 8],
    [14, 8],
  ];
  const free = candidates.filter(([x, y]) => {
    const k = `${x},${y}`;
    if (occupied.has(k)) return false;
    return walkable(x, y);
  });
  // Shuffle
  for (let i = free.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = free[i]!;
    free[i] = free[j]!;
    free[j] = t;
  }
  const n = Math.min(max, free.length, 2 + Math.floor(rng() * 3)); // 2–4
  const kinds: SmashableKind[] = ['barrel', 'crate', 'vase'];
  const out: { x: number; y: number; kind: SmashableKind }[] = [];
  for (let i = 0; i < n; i++) {
    const [x, y] = free[i]!;
    const kind = kinds[Math.floor(rng() * kinds.length)]!;
    out.push({ x, y, kind });
  }
  return out;
}

export function smashableEntityDefs(
  roomId: string,
  runSeed: number,
  walkable: (x: number, y: number) => boolean,
  occupiedIds: Set<string>,
  occupiedTiles: Set<string>,
  collected: readonly string[],
): EntityDef[] {
  const rng = mulberry32(smashSeed(roomId, runSeed));
  // Skip open outdoor beaches / empty void
  if (roomId === 'beach_start') return [];
  const slots = cornerSmashSlots(walkable, occupiedTiles, rng, 4);
  const defs: EntityDef[] = [];
  for (const s of slots) {
    const id = `${roomId}-smash-${s.kind}-${s.x}-${s.y}`;
    if (collected.includes(id) || occupiedIds.has(id)) continue;
    defs.push({
      kind: s.kind as EntityKind,
      id,
      x: s.x,
      y: s.y,
      hp: smashableHp(s.kind),
    });
  }
  return defs;
}
