/**
 * Stretch authored 16×11 room ASCII into the live VIEW_TILES grid so the
 * **playable** dungeon fills the 16:9 playfield — not a brick frame with a
 * small room in the middle.
 *
 * Interior floors/grass/features scale up; perimeter walls stay a 1-tile
 * shell; edge doors/openings map onto the outer rim.
 */

import { VIEW_TILES_H, VIEW_TILES_W } from '../config';

/** World data is authored at this size (see world.ts). */
export const ROOM_AUTHOR_W = 16;
export const ROOM_AUTHOR_H = 11;

const DOORISH = new Set(['D', 'L']);

function isSolidWall(ch: string): boolean {
  return ch === '#';
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * Map a coordinate from [0, srcMax] → [0, dstMax] (inclusive).
 */
function mapAxis(src: number, srcMax: number, dstMax: number): number {
  if (srcMax <= 0) return 0;
  if (dstMax <= 0) return 0;
  return clamp(Math.round((src * dstMax) / srcMax), 0, dstMax);
}

/**
 * Inverse: destination → source sample (for stretch-fill).
 * Maps interior 1..dstMax-1 from interior 1..srcMax-1 when sizes allow.
 */
function sampleAxis(
  dst: number,
  dstMax: number,
  srcMax: number,
): number {
  if (dstMax <= 1) return 0;
  if (srcMax <= 1) return 0;
  // Perimeter cells sample perimeter
  if (dst === 0) return 0;
  if (dst === dstMax) return srcMax;
  if (srcMax <= 2) return clamp(dst, 0, srcMax);
  // Stretch interior
  const t = (dst - 1) / (dstMax - 1);
  return clamp(1 + Math.floor(t * (srcMax - 2)), 1, srcMax - 1);
}

export interface ExpandedRoom {
  tiles: string[];
  /** @deprecated center-pad offsets; stretch uses 0,0 and mapEntityTile */
  offsetX: number;
  offsetY: number;
  srcW: number;
  srcH: number;
  targetW: number;
  targetH: number;
}

/**
 * Stretch an authored room into targetW×targetH of **playable** space.
 */
export function expandRoomTiles(
  src: string[],
  targetW: number = VIEW_TILES_W,
  targetH: number = VIEW_TILES_H,
): ExpandedRoom {
  const srcH = Math.max(1, src.length);
  const srcW = Math.max(1, src[0]?.length ?? ROOM_AUTHOR_W);

  // Source char grid
  const srcGrid: string[][] = [];
  for (let y = 0; y < srcH; y++) {
    const row = src[y] ?? '';
    const cells: string[] = [];
    for (let x = 0; x < srcW; x++) cells.push(row[x] ?? '#');
    srcGrid.push(cells);
  }

  const grid: string[][] = Array.from({ length: targetH }, () =>
    Array.from({ length: targetW }, () => '#'),
  );

  // 1) Stretch-sample entire room (fills playable area with real terrain)
  for (let y = 0; y < targetH; y++) {
    const sy = sampleAxis(y, targetH - 1, srcH - 1);
    for (let x = 0; x < targetW; x++) {
      const sx = sampleAxis(x, targetW - 1, srcW - 1);
      let ch = srcGrid[sy]?.[sx] ?? '#';
      // Don't let doors/stairs duplicate across stretched samples —
      // only keep them when we map exactly from their source cell later.
      if (DOORISH.has(ch) || ch === 'S' || ch === 'U' || ch === 'P') {
        // Replace with nearest walkable terrain for bulk fill
        ch = nearestFill(srcGrid, sx, sy);
      }
      grid[y]![x] = ch;
    }
  }

  // 2) Force a clean outer shell: walls on perimeter except openings
  for (let x = 0; x < targetW; x++) {
    if (!isOpeningOnEdge(srcGrid, srcW, srcH, 'north', x, targetW)) {
      grid[0]![x] = '#';
    }
    if (!isOpeningOnEdge(srcGrid, srcW, srcH, 'south', x, targetW)) {
      grid[targetH - 1]![x] = '#';
    }
  }
  for (let y = 0; y < targetH; y++) {
    if (!isOpeningOnEdge(srcGrid, srcW, srcH, 'west', y, targetH)) {
      grid[y]![0] = '#';
    }
    if (!isOpeningOnEdge(srcGrid, srcW, srcH, 'east', y, targetH)) {
      grid[y]![targetW - 1] = '#';
    }
  }
  // Corners always wall
  grid[0]![0] = '#';
  grid[0]![targetW - 1] = '#';
  grid[targetH - 1]![0] = '#';
  grid[targetH - 1]![targetW - 1] = '#';

  // 3) Place edge openings / doors at mapped perimeter positions
  placeEdgeOpenings(srcGrid, srcW, srcH, grid, targetW, targetH);

  // 4) Place unique interior features (stairs, pads) once at mapped coords
  for (let sy = 0; sy < srcH; sy++) {
    for (let sx = 0; sx < srcW; sx++) {
      const ch = srcGrid[sy]![sx]!;
      if (ch !== 'S' && ch !== 'U' && ch !== 'P') continue;
      // Skip if feature is on outer edge (handled as opening)
      if (sx === 0 || sy === 0 || sx === srcW - 1 || sy === srcH - 1) continue;
      const dx = mapAxis(sx, srcW - 1, targetW - 1);
      const dy = mapAxis(sy, srcH - 1, targetH - 1);
      // Keep off outer wall ring
      const px = clamp(dx, 1, targetW - 2);
      const py = clamp(dy, 1, targetH - 2);
      grid[py]![px] = ch;
    }
  }

  const tiles = grid.map((row) => row.join(''));
  return {
    tiles,
    offsetX: 0,
    offsetY: 0,
    srcW,
    srcH,
    targetW,
    targetH,
  };
}

function nearestFill(
  src: string[][],
  sx: number,
  sy: number,
): string {
  const h = src.length;
  const w = src[0]?.length ?? 0;
  // Prefer floor-like neighbors
  const prefs = ['.', 'g', 'd', '~', '='];
  for (const p of prefs) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const ch = src[sy + dy]?.[sx + dx];
        if (ch === p) return p;
      }
    }
  }
  // Any non-wall non-feature
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const ch = src[clamp(sy + dy, 0, h - 1)]?.[clamp(sx + dx, 0, w - 1)];
      if (ch && !isSolidWall(ch) && !DOORISH.has(ch) && ch !== 'S' && ch !== 'U' && ch !== 'P') {
        return ch;
      }
    }
  }
  return '.';
}

function isOpeningOnEdge(
  src: string[][],
  srcW: number,
  srcH: number,
  edge: 'north' | 'south' | 'east' | 'west',
  dstAlong: number,
  dstMax: number,
): boolean {
  // Map destination perimeter position back to source edge index
  if (edge === 'north' || edge === 'south') {
    const sx = mapAxis(dstAlong, dstMax - 1, srcW - 1);
    const sy = edge === 'north' ? 0 : srcH - 1;
    const ch = src[sy]?.[sx] ?? '#';
    return !isSolidWall(ch);
  }
  const sy = mapAxis(dstAlong, dstMax - 1, srcH - 1);
  const sx = edge === 'west' ? 0 : srcW - 1;
  const ch = src[sy]?.[sx] ?? '#';
  return !isSolidWall(ch);
}

function placeEdgeOpenings(
  src: string[][],
  srcW: number,
  srcH: number,
  grid: string[][],
  targetW: number,
  targetH: number,
): void {
  // West
  for (let sy = 0; sy < srcH; sy++) {
    const ch = src[sy]![0]!;
    if (isSolidWall(ch)) continue;
    const dy = mapAxis(sy, srcH - 1, targetH - 1);
    const y = clamp(dy, 1, targetH - 2);
    const fill = DOORISH.has(ch) ? ch : ch === '.' || ch === 'g' || ch === 'd' ? ch : '.';
    grid[y]![0] = DOORISH.has(ch) ? ch : fill;
    // Ensure a step of floor just inside so you can walk in
    if (isSolidWall(grid[y]![1]!)) grid[y]![1] = fill === 'D' || fill === 'L' ? '.' : fill;
  }
  // East
  for (let sy = 0; sy < srcH; sy++) {
    const ch = src[sy]![srcW - 1]!;
    if (isSolidWall(ch)) continue;
    const dy = mapAxis(sy, srcH - 1, targetH - 1);
    const y = clamp(dy, 1, targetH - 2);
    const fill = DOORISH.has(ch) ? ch : ch === '.' || ch === 'g' || ch === 'd' ? ch : '.';
    grid[y]![targetW - 1] = DOORISH.has(ch) ? ch : fill;
    if (isSolidWall(grid[y]![targetW - 2]!)) {
      grid[y]![targetW - 2] = fill === 'D' || fill === 'L' ? '.' : fill;
    }
  }
  // North
  for (let sx = 0; sx < srcW; sx++) {
    const ch = src[0]![sx]!;
    if (isSolidWall(ch)) continue;
    const dx = mapAxis(sx, srcW - 1, targetW - 1);
    const x = clamp(dx, 1, targetW - 2);
    const fill = DOORISH.has(ch) ? ch : ch === '.' || ch === 'g' || ch === 'd' ? ch : '.';
    grid[0]![x] = DOORISH.has(ch) ? ch : fill;
    if (isSolidWall(grid[1]![x]!)) grid[1]![x] = fill === 'D' || fill === 'L' ? '.' : fill;
  }
  // South
  for (let sx = 0; sx < srcW; sx++) {
    const ch = src[srcH - 1]![sx]!;
    if (isSolidWall(ch)) continue;
    const dx = mapAxis(sx, srcW - 1, targetW - 1);
    const x = clamp(dx, 1, targetW - 2);
    const fill = DOORISH.has(ch) ? ch : ch === '.' || ch === 'g' || ch === 'd' ? ch : '.';
    grid[targetH - 1]![x] = DOORISH.has(ch) ? ch : fill;
    if (isSolidWall(grid[targetH - 2]![x]!)) {
      grid[targetH - 2]![x] = fill === 'D' || fill === 'L' ? '.' : fill;
    }
  }
}

/**
 * Map an authored entity tile coord into the stretched room.
 * Uses proportional mapping so props stay relatively placed in the wide room.
 */
export function offsetEntityTile(
  x: number,
  y: number,
  offsetX: number,
  offsetY: number,
  srcW: number = ROOM_AUTHOR_W,
  srcH: number = ROOM_AUTHOR_H,
  targetW: number = VIEW_TILES_W,
  targetH: number = VIEW_TILES_H,
): { x: number; y: number } {
  // Legacy center-pad path (offset != 0): keep old behavior
  if (offsetX !== 0 || offsetY !== 0) {
    return { x: x + offsetX, y: y + offsetY };
  }
  // Stretch path
  const mx = mapAxis(x, Math.max(1, srcW - 1), Math.max(1, targetW - 1));
  const my = mapAxis(y, Math.max(1, srcH - 1), Math.max(1, targetH - 1));
  return {
    x: clamp(mx, 1, targetW - 2),
    y: clamp(my, 1, targetH - 2),
  };
}

/** Map entity using ExpandedRoom metadata. */
export function mapEntityTile(
  x: number,
  y: number,
  expanded: Pick<ExpandedRoom, 'srcW' | 'srcH' | 'targetW' | 'targetH' | 'offsetX' | 'offsetY'>,
): { x: number; y: number } {
  return offsetEntityTile(
    x,
    y,
    expanded.offsetX,
    expanded.offsetY,
    expanded.srcW,
    expanded.srcH,
    expanded.targetW,
    expanded.targetH,
  );
}
