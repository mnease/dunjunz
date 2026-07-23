/**
 * Pure spawn placement when crossing room doors / stairs.
 *
 * Semantics of `entryFrom`:
 *   The edge of the *new* room the player came through.
 *   Exit east of room A → enter room B with entryFrom='west'
 *   → spawn just inside B's west door (left side).
 */

import { VIEW_TILES_H, VIEW_TILES_W } from '../config';
import { blocksWalk, blocksWalkAt } from './tile-solidity';
import type { TileKind } from '../types';

export type EntryFrom =
  | 'north'
  | 'south'
  | 'east'
  | 'west'
  | 'stairsDown'
  | 'stairsUp'
  | string;

export type WalkGrid = string[][]; // TileKind strings; door always open; water fords access

// sand / dirt / grass / floor / carpet are walkable; door never blocked

function isWalkable(kind: string | undefined): boolean {
  return !!kind && !blocksWalk(kind);
}

/** Grid-aware walk (water next to door/stairs is a ford). */
function isWalkableAt(grid: WalkGrid, x: number, y: number): boolean {
  return !blocksWalkAt(grid as TileKind[][], x, y);
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
      if (isWalkable(k) || k === 'door') {
        let ty = 1;
        // Grid-aware: water next to door is a ford (still walkable)
        while (ty < h - 1 && !isWalkableAt(grid, x, ty)) ty++;
        if (ty >= h - 1 || !isWalkableAt(grid, x, ty)) continue;
        candidates.push({
          tx: x,
          ty,
          door: k === 'door' || grid[y]?.[x] === 'door',
        });
      }
    }
  } else if (entryFrom === 'south') {
    const y = h - 1;
    for (let x = 0; x < w; x++) {
      const k = grid[y]?.[x];
      if (isWalkable(k) || k === 'door') {
        // Walk inward; water fording a door counts as walkable
        let ty = h - 2;
        while (ty > 0 && !isWalkableAt(grid, x, ty)) ty--;
        if (ty <= 0 || !isWalkableAt(grid, x, ty)) continue;
        candidates.push({
          tx: x,
          ty,
          door: k === 'door' || grid[y]?.[x] === 'door',
        });
      }
    }
  } else if (entryFrom === 'west') {
    const x = 0;
    for (let y = 0; y < h; y++) {
      const k = grid[y]?.[x];
      if (isWalkable(k) || isWalkableAt(grid, x, y)) {
        candidates.push({ tx: 1, ty: y, door: k === 'door' });
      }
    }
  } else if (entryFrom === 'east') {
    const x = w - 1;
    for (let y = 0; y < h; y++) {
      const k = grid[y]?.[x];
      if (isWalkable(k) || isWalkableAt(grid, x, y)) {
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

export function isWalkableTile(kind: string | undefined): boolean {
  return isWalkable(kind);
}

/**
 * Spawn beside a stair tile after a floor transition.
 *
 * Going **down** into a room (entryFrom stairsDown): stand **north** of the
 * stairs-up tile so the exit is south of you (not in front / north).
 * Going **up** (entryFrom stairsUp): stand **south** of the stairs-down tile
 * so the hole is north of you (behind when facing into the overworld).
 */
export function spawnBesideStairs(
  grid: WalkGrid,
  mode: 'arriveDown' | 'arriveUp',
): { tx: number; ty: number } | null {
  const h = grid.length || VIEW_TILES_H;
  const w = grid[0]?.length || VIEW_TILES_W;
  const want = mode === 'arriveDown' ? 'stairs_up' : 'stairs';
  let sx = -1;
  let sy = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (grid[y]?.[x] === want) {
        sx = x;
        sy = y;
        break;
      }
    }
    if (sx >= 0) break;
  }
  if (sx < 0) return null;

  // Prefer 2 tiles off, then 1; then side-step if blocked
  const deltas =
    mode === 'arriveDown'
      ? [
          { dx: 0, dy: -2 },
          { dx: 0, dy: -1 },
          { dx: -1, dy: -1 },
          { dx: 1, dy: -1 },
          { dx: 0, dy: 1 },
        ]
      : [
          { dx: 0, dy: 2 },
          { dx: 0, dy: 1 },
          { dx: -1, dy: 1 },
          { dx: 1, dy: 1 },
          { dx: 0, dy: -1 },
        ];

  for (const { dx, dy } of deltas) {
    const tx = sx + dx;
    const ty = sy + dy;
    if (ty < 0 || ty >= h || tx < 0 || tx >= w) continue;
    if (isWalkable(grid[ty]?.[tx])) return { tx, ty };
  }
  return null;
}

/**
 * Safe continue/load spawn: prefer a room entrance, never land on solids.
 * Fixes softlocks like woodz_hollow default (8,5) inside a sealed pen.
 */
export function spawnForContinue(
  grid: WalkGrid,
  room: {
    id?: string;
    north?: string;
    south?: string;
    east?: string;
    west?: string;
  },
): { tx: number; ty: number } {
  const h = grid.length || VIEW_TILES_H;
  const w = grid[0]?.length || VIEW_TILES_W;

  if (room.id === 'overworld') {
    if (isWalkable(grid[4]?.[8])) return { tx: 8, ty: 4 };
  }
  // Beach wake: mid-sand, eyes open facing north
  if (room.id === 'beach_start') {
    if (isWalkable(grid[4]?.[8])) return { tx: 8, ty: 4 };
    if (isWalkable(grid[5]?.[8])) return { tx: 8, ty: 5 };
  }

  // Prefer walking in through a linked edge (matches how you got here)
  if (room.west) {
    const s = spawnInsideEntryEdge(grid, 'west');
    if (isWalkable(grid[s.ty]?.[s.tx])) return s;
  }
  if (room.south) {
    const s = spawnInsideEntryEdge(grid, 'south');
    if (isWalkable(grid[s.ty]?.[s.tx])) return s;
  }
  if (room.north) {
    const s = spawnInsideEntryEdge(grid, 'north');
    if (isWalkable(grid[s.ty]?.[s.tx])) return s;
  }
  if (room.east) {
    const s = spawnInsideEntryEdge(grid, 'east');
    if (isWalkable(grid[s.ty]?.[s.tx])) return s;
  }

  // Stairs if any — same side contract as floor transitions
  const byUp = spawnBesideStairs(grid, 'arriveDown');
  if (byUp) return byUp;
  const byDown = spawnBesideStairs(grid, 'arriveUp');
  if (byDown) return byDown;

  // Prefer open mid-room walkables (avoid edges/corners)
  const preferred: [number, number][] = [
    [2, 5],
    [3, 5],
    [4, 5],
    [1, 5],
    [8, 3],
    [8, 7],
    [6, 5],
    [7, 4],
    [8, 5],
    [Math.floor(w / 2), Math.floor(h / 2)],
  ];
  for (const [tx, ty] of preferred) {
    if (isWalkable(grid[ty]?.[tx])) return { tx, ty };
  }

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      if (isWalkable(grid[y]?.[x])) return { tx: x, ty: y };
    }
  }

  return { tx: 1, ty: Math.floor(h / 2) };
}
