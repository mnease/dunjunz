/**
 * Pure spawn placement when crossing room doors / stairs.
 *
 * Semantics of `entryFrom`:
 *   The edge of the *new* room the player came through.
 *   Exit east of room A → enter room B with entryFrom='west'
 *   → spawn just inside B's west door (left side).
 */

import { VIEW_TILES_H, VIEW_TILES_W } from '../config';

export type EntryFrom =
  | 'north'
  | 'south'
  | 'east'
  | 'west'
  | 'stairsDown'
  | 'stairsUp'
  | string;

export type WalkGrid = string[][]; // TileKind strings; 'wall'|'void'|'water'|'locked' = blocked

const BLOCKED = new Set(['wall', 'void', 'water', 'locked', 'lava']);

function isWalkable(kind: string | undefined): boolean {
  return !!kind && !BLOCKED.has(kind);
}

/**
 * Find walkable openings on a room edge and return a spawn just inside.
 * Prefers door tiles; falls back to any walkable edge cell; then mid-edge default.
 */
export function spawnInsideEntryEdge(
  grid: WalkGrid,
  entryFrom: 'north' | 'south' | 'east' | 'west',
): { tx: number; ty: number } {
  const h = grid.length || VIEW_TILES_H;
  const w = grid[0]?.length || VIEW_TILES_W;

  const candidates: { tx: number; ty: number; door: boolean }[] = [];

  if (entryFrom === 'north') {
    const y = 0;
    for (let x = 0; x < w; x++) {
      const k = grid[y]?.[x];
      if (isWalkable(k)) {
        candidates.push({ tx: x, ty: 1, door: k === 'door' });
      }
    }
  } else if (entryFrom === 'south') {
    const y = h - 1;
    for (let x = 0; x < w; x++) {
      const k = grid[y]?.[x];
      if (isWalkable(k)) {
        candidates.push({ tx: x, ty: h - 2, door: k === 'door' });
      }
    }
  } else if (entryFrom === 'west') {
    const x = 0;
    for (let y = 0; y < h; y++) {
      const k = grid[y]?.[x];
      if (isWalkable(k)) {
        candidates.push({ tx: 1, ty: y, door: k === 'door' });
      }
    }
  } else if (entryFrom === 'east') {
    const x = w - 1;
    for (let y = 0; y < h; y++) {
      const k = grid[y]?.[x];
      if (isWalkable(k)) {
        candidates.push({ tx: w - 2, ty: y, door: k === 'door' });
      }
    }
  }

  const doors = candidates.filter((c) => c.door);
  const pool = doors.length ? doors : candidates;
  if (pool.length) {
    // Prefer center-most opening on that edge
    const mid =
      entryFrom === 'north' || entryFrom === 'south'
        ? Math.floor(w / 2)
        : Math.floor(h / 2);
    pool.sort((a, b) => {
      const da =
        entryFrom === 'north' || entryFrom === 'south'
          ? Math.abs(a.tx - mid)
          : Math.abs(a.ty - mid);
      const db =
        entryFrom === 'north' || entryFrom === 'south'
          ? Math.abs(b.tx - mid)
          : Math.abs(b.ty - mid);
      return da - db;
    });
    return { tx: pool[0].tx, ty: pool[0].ty };
  }

  // Hard fallbacks if edge fully walled (shouldn't happen if map is consistent)
  if (entryFrom === 'north') return { tx: Math.floor(w / 2), ty: 1 };
  if (entryFrom === 'south') return { tx: Math.floor(w / 2), ty: h - 2 };
  if (entryFrom === 'west') return { tx: 1, ty: Math.floor(h / 2) };
  return { tx: w - 2, ty: Math.floor(h / 2) };
}

/**
 * Documented contract for loadRoom entryFrom values from checkRoomExit:
 * leave east  → entryFrom 'west'
 * leave west  → entryFrom 'east'
 * leave north → entryFrom 'south'
 * leave south → entryFrom 'north'
 */
export function entryFromOpposite(
  exitDir: 'north' | 'south' | 'east' | 'west',
): 'north' | 'south' | 'east' | 'west' {
  if (exitDir === 'north') return 'south';
  if (exitDir === 'south') return 'north';
  if (exitDir === 'east') return 'west';
  return 'east';
}
