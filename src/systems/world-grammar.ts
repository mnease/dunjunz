/**
 * World grammar — asymmetric land budgets, path metrics, Jaquays checks.
 * Pure helpers over shipped ROOMS (no Phaser).
 */

import type { LandId, RoomDef } from '../types';

/** P2 doctrine: lands are intentionally unequal length. */
export const LAND_LENGTH_DOCTRINE = {
  dunjunz: {
    role: 'long-spine' as const,
    /** Min rooms tagged land=dunjunz */
    minRooms: 24,
    /** Critical path rooms entrance → land boss (approx) */
    minPathToBoss: 12,
  },
  woodz: {
    role: 'short-surface-ceremony' as const,
    /** Surface path to Wolf Lord stays short; deep is optional mastery */
    maxSurfacePathToBoss: 5,
  },
  dezertz: {
    role: 'short-surface-ceremony' as const,
    maxSurfacePathToBoss: 5,
  },
  sewerz: {
    role: 'medium-pipe' as const,
    minRooms: 8,
    maxRooms: 20,
    /** Shorter than Dunjunz full spine */
    maxPathToBoss: 18,
  },
  surface: { role: 'hub' as const },
  kingdomz: { role: 'bridge' as const },
  dwarvez: {
    role: 'medium-pipe' as const,
    minRooms: 10,
    maxRooms: 16,
    maxPathToBoss: 10,
  },
  roarhimz: {
    role: 'short-surface-ceremony' as const,
    maxSurfacePathToBoss: 6,
  },
  moredorkz: {
    role: 'long-ish-endgame' as const,
    minRooms: 10,
    maxRooms: 16,
    minPathToBoss: 7,
  },
} as const;

export function roomsForLand(
  rooms: Record<string, RoomDef>,
  land: LandId,
): RoomDef[] {
  return Object.values(rooms).filter((r) => r.land === land);
}

export function countLandRooms(
  rooms: Record<string, RoomDef>,
  land: LandId,
): number {
  return roomsForLand(rooms, land).length;
}

type LinkKey = 'north' | 'south' | 'east' | 'west' | 'stairsDown' | 'stairsUp';

const LINKS: LinkKey[] = [
  'north',
  'south',
  'east',
  'west',
  'stairsDown',
  'stairsUp',
];

/** BFS path length (edge count) from start to any room matching pred. */
export function pathLengthTo(
  rooms: Record<string, RoomDef>,
  startId: string,
  pred: (r: RoomDef) => boolean,
): number | null {
  const start = rooms[startId];
  if (!start) return null;
  const seen = new Set<string>();
  const q: { id: string; d: number }[] = [{ id: startId, d: 0 }];
  while (q.length) {
    const { id, d } = q.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const r = rooms[id];
    if (!r) continue;
    if (pred(r)) return d;
    for (const k of LINKS) {
      const t = r[k];
      if (t && rooms[t] && !seen.has(t)) q.push({ id: t, d: d + 1 });
    }
  }
  return null;
}

export function roomHasBossId(
  r: RoomDef,
  bossId: string,
): boolean {
  return !!r.entities?.some((e) => e.id === bossId || (e.kind === 'boss' && e.id === bossId));
}

/** Count combat-ish hostiles in a room (excludes props/signs/torch/chest). */
export function countCombatHostiles(r: RoomDef): number {
  const skip = new Set([
    'sign',
    'chest',
    'heart',
    'torch_wall',
    'npc',
    'merchant',
    'mapz',
    'forje',
    'portal',
    'tree',
    'tumbleweed',
    'key',
    'sword',
  ]);
  return (r.entities ?? []).filter((e) => !skip.has(e.kind)).length;
}

/** True if room is a low-combat threshold (foyer quiet law). */
export function isQuietFoyer(r: RoomDef): boolean {
  if (!r.id.includes('_foyer') && !r.id.endsWith('_entrance')) return false;
  return countCombatHostiles(r) <= 1;
}

/**
 * Undirected edge set for cycle detection (Jaquays loop).
 * Returns true if the land subgraph has a cycle (loop exists).
 */
export function landGraphHasCycle(
  rooms: Record<string, RoomDef>,
  land: LandId,
): boolean {
  const nodes = roomsForLand(rooms, land).map((r) => r.id);
  const set = new Set(nodes);
  const adj = new Map<string, Set<string>>();
  for (const id of nodes) adj.set(id, new Set());
  for (const id of nodes) {
    const r = rooms[id]!;
    for (const k of LINKS) {
      const t = r[k];
      if (t && set.has(t)) {
        adj.get(id)!.add(t);
        adj.get(t)!.add(id);
      }
    }
  }
  const seen = new Set<string>();
  const dfs = (u: string, parent: string | null): boolean => {
    seen.add(u);
    for (const v of adj.get(u) ?? []) {
      if (v === parent) continue;
      if (seen.has(v)) return true;
      if (dfs(v, u)) return true;
    }
    return false;
  };
  for (const id of nodes) {
    if (!seen.has(id) && dfs(id, null)) return true;
  }
  return false;
}

/** Rooms flagged secret / sideRole vault that are not on stairs spine only. */
export function secretOrVaultRooms(
  rooms: Record<string, RoomDef>,
  land: LandId,
): RoomDef[] {
  return roomsForLand(rooms, land).filter(
    (r) =>
      r.id.includes('secret') ||
      r.sideRole === 'vault' ||
      r.sideRole === 'quiet' ||
      (r.title ?? '').toUpperCase().includes('SECRET') ||
      (r.title ?? '').toUpperCase().includes('SHRINE'),
  );
}

/** Entity kinds histogram for biome differentiation tests. */
export function entityKindHistogram(r: RoomDef): Record<string, number> {
  const h: Record<string, number> = {};
  for (const e of r.entities ?? []) {
    h[e.kind] = (h[e.kind] ?? 0) + 1;
  }
  return h;
}
