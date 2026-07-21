/**
 * Expand authored 16×11 room ASCII to the live VIEW_TILES grid so the
 * dungeon fills the 16:9 playfield. Doors/open edges move to the outer
 * rim; entities use the returned offset.
 */

import { VIEW_TILES_H, VIEW_TILES_W } from '../config';

/** World data is authored at this size (see world.ts). */
export const ROOM_AUTHOR_W = 16;
export const ROOM_AUTHOR_H = 11;

const DOORISH = new Set(['D', 'L']);

function isSolidWall(ch: string): boolean {
  return ch === '#';
}

/** Terrain to paint corridors with (keep grass/dirt when opening is outdoor). */
function corridorFill(ch: string): string {
  if (ch === 'g' || ch === 'd' || ch === '~' || ch === '=' || ch === '.') return ch;
  if (DOORISH.has(ch)) return '.';
  if (ch === 'S' || ch === 'U' || ch === 'P') return '.';
  return '.';
}

export interface ExpandedRoom {
  tiles: string[];
  offsetX: number;
  offsetY: number;
  srcW: number;
  srcH: number;
}

/**
 * Center-pad an authored room into targetW×targetH.
 * Walkable edge cells grow corridors to the outer border so exits still work.
 */
export function expandRoomTiles(
  src: string[],
  targetW: number = VIEW_TILES_W,
  targetH: number = VIEW_TILES_H,
): ExpandedRoom {
  const srcH = Math.max(1, src.length);
  const srcW = Math.max(1, src[0]?.length ?? ROOM_AUTHOR_W);
  const offsetX = Math.max(0, Math.floor((targetW - srcW) / 2));
  const offsetY = Math.max(0, Math.floor((targetH - srcH) / 2));

  // Outer shell starts as walls
  const grid: string[][] = Array.from({ length: targetH }, () =>
    Array.from({ length: targetW }, () => '#'),
  );

  // Paste authored content
  for (let y = 0; y < srcH; y++) {
    const row = src[y] ?? '';
    const dy = offsetY + y;
    if (dy < 0 || dy >= targetH) continue;
    for (let x = 0; x < srcW; x++) {
      const dx = offsetX + x;
      if (dx < 0 || dx >= targetW) continue;
      grid[dy]![dx] = row[x] ?? '#';
    }
  }

  // West openings → corridor to x=0
  for (let y = 0; y < srcH; y++) {
    const ch = src[y]?.[0] ?? '#';
    if (isSolidWall(ch)) continue;
    const ty = offsetY + y;
    if (ty < 0 || ty >= targetH) continue;
    const fill = corridorFill(ch);
    for (let x = 0; x < offsetX; x++) grid[ty]![x] = fill;
    // Outer edge keeps door/open glyph; original edge cell becomes floor path
    grid[ty]![0] = DOORISH.has(ch) ? ch : ch;
    if (offsetX > 0) grid[ty]![offsetX] = fill;
  }

  // East openings → corridor to x=targetW-1
  for (let y = 0; y < srcH; y++) {
    const ch = src[y]?.[srcW - 1] ?? '#';
    if (isSolidWall(ch)) continue;
    const ty = offsetY + y;
    if (ty < 0 || ty >= targetH) continue;
    const fill = corridorFill(ch);
    const innerX = offsetX + srcW - 1;
    for (let x = innerX + 1; x < targetW; x++) grid[ty]![x] = fill;
    grid[ty]![targetW - 1] = DOORISH.has(ch) ? ch : ch;
    if (innerX >= 0 && innerX < targetW - 1) grid[ty]![innerX] = fill;
  }

  // North openings → corridor to y=0
  for (let x = 0; x < srcW; x++) {
    const ch = src[0]?.[x] ?? '#';
    if (isSolidWall(ch)) continue;
    const tx = offsetX + x;
    if (tx < 0 || tx >= targetW) continue;
    const fill = corridorFill(ch);
    for (let y = 0; y < offsetY; y++) grid[y]![tx] = fill;
    grid[0]![tx] = DOORISH.has(ch) ? ch : ch;
    if (offsetY > 0) grid[offsetY]![tx] = fill;
  }

  // South openings → corridor to y=targetH-1
  for (let x = 0; x < srcW; x++) {
    const ch = src[srcH - 1]?.[x] ?? '#';
    if (isSolidWall(ch)) continue;
    const tx = offsetX + x;
    if (tx < 0 || tx >= targetW) continue;
    const fill = corridorFill(ch);
    const innerY = offsetY + srcH - 1;
    for (let y = innerY + 1; y < targetH; y++) grid[y]![tx] = fill;
    grid[targetH - 1]![tx] = DOORISH.has(ch) ? ch : ch;
    if (innerY >= 0 && innerY < targetH - 1) grid[innerY]![tx] = fill;
  }

  // Corner-safe outer ring: keep walls except cells we opened above
  // (already handled)

  const tiles = grid.map((row) => row.join(''));
  return { tiles, offsetX, offsetY, srcW, srcH };
}

/** Offset an authored entity tile coord into the expanded room. */
export function offsetEntityTile(
  x: number,
  y: number,
  offsetX: number,
  offsetY: number,
): { x: number; y: number } {
  return { x: x + offsetX, y: y + offsetY };
}
