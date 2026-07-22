/**
 * Stretch authored 16×11 room ASCII into the live VIEW_TILES grid so the
 * **playable** dungeon fills the 16:9 playfield.
 *
 * Interior floors/grass/features scale up; the outer rim is a solid wall
 * shell with intentional openings only. Single-tile doors become a short
 * multi-tile span so stretch no longer leaves floor “gaps” beside doors.
 */

import { VIEW_TILES_H, VIEW_TILES_W } from '../config';

/** World data is authored at this size (see world.ts). */
export const ROOM_AUTHOR_W = 16;
export const ROOM_AUTHOR_H = 11;

/** How many perimeter tiles a single authored door occupies after stretch. */
export const DOOR_SPAN = 3;

const DOORISH = new Set(['D', 'L']);

function isSolidWall(ch: string): boolean {
  return ch === '#';
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** Map a coordinate from [0, srcMax] → [0, dstMax] (inclusive). */
function mapAxis(src: number, srcMax: number, dstMax: number): number {
  if (srcMax <= 0) return 0;
  if (dstMax <= 0) return 0;
  return clamp(Math.round((src * dstMax) / srcMax), 0, dstMax);
}

/**
 * Sample source axis for interior stretch (dst in 1..dstMax-1).
 */
function sampleInterior(
  dst: number,
  dstMax: number,
  srcMax: number,
): number {
  // dstMax here is last interior index (target-2), maps to src interior 1..srcMax-1
  if (dstMax <= 0) return 1;
  if (srcMax <= 2) return 1;
  const t = dstMax === 0 ? 0 : dst / dstMax;
  return clamp(1 + Math.round(t * (srcMax - 2)), 1, srcMax - 1);
}

export interface ExpandedRoom {
  tiles: string[];
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

  const srcGrid: string[][] = [];
  for (let y = 0; y < srcH; y++) {
    const row = src[y] ?? '';
    const cells: string[] = [];
    for (let x = 0; x < srcW; x++) cells.push(row[x] ?? '#');
    srcGrid.push(cells);
  }

  // Start as solid walls — rim stays wall unless we cut openings
  const grid: string[][] = Array.from({ length: targetH }, () =>
    Array.from({ length: targetW }, () => '#'),
  );

  // 1) Stretch ONLY the interior (keeps rim clean)
  const inW = targetW - 2;
  const inH = targetH - 2;
  if (inW > 0 && inH > 0 && srcW > 2 && srcH > 2) {
    for (let y = 0; y < inH; y++) {
      const sy = sampleInterior(y, inH - 1, srcH - 1);
      for (let x = 0; x < inW; x++) {
        const sx = sampleInterior(x, inW - 1, srcW - 1);
        let ch = srcGrid[sy]?.[sx] ?? '.';
        // Unique features placed later so they don't smear
        if (DOORISH.has(ch) || ch === 'S' || ch === 'U' || ch === 'P') {
          ch = nearestFill(srcGrid, sx, sy);
        }
        // Authored outer wall samples shouldn't appear as brick islands inside
        if (isSolidWall(ch)) ch = nearestFill(srcGrid, sx, sy);
        grid[y + 1]![x + 1] = ch;
      }
    }
  }

  // 2) Edge openings only (doors widened; open trails keep multi-tile spans)
  placeEdgeOpenings(srcGrid, srcW, srcH, grid, targetW, targetH);

  // 3) Interior stairs / pads once
  for (let sy = 0; sy < srcH; sy++) {
    for (let sx = 0; sx < srcW; sx++) {
      const ch = srcGrid[sy]![sx]!;
      if (ch !== 'S' && ch !== 'U' && ch !== 'P') continue;
      if (sx === 0 || sy === 0 || sx === srcW - 1 || sy === srcH - 1) continue;
      const dx = mapAxis(sx, srcW - 1, targetW - 1);
      const dy = mapAxis(sy, srcH - 1, targetH - 1);
      const px = clamp(dx, 1, targetW - 2);
      const py = clamp(dy, 1, targetH - 2);
      grid[py]![px] = ch;
    }
  }

  // 4) Final rim seal: any non-opening rim cell → wall
  sealRim(grid, targetW, targetH);

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

function nearestFill(src: string[][], sx: number, sy: number): string {
  const h = src.length;
  const w = src[0]?.length ?? 0;
  const prefs = ['.', 'g', 'd', '~', '='];
  for (const p of prefs) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const ch = src[sy + dy]?.[sx + dx];
        if (ch === p) return p;
      }
    }
  }
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const ch =
        src[clamp(sy + dy, 0, h - 1)]?.[clamp(sx + dx, 0, w - 1)];
      if (
        ch &&
        !isSolidWall(ch) &&
        !DOORISH.has(ch) &&
        ch !== 'S' &&
        ch !== 'U' &&
        ch !== 'P'
      ) {
        return ch;
      }
    }
  }
  return '.';
}

function placeEdgeOpenings(
  src: string[][],
  srcW: number,
  srcH: number,
  grid: string[][],
  targetW: number,
  targetH: number,
): void {
  type Edge = 'north' | 'south' | 'east' | 'west';

  const paint = (
    edge: Edge,
    along: number,
    ch: string,
    span: number,
  ): void => {
    const half = Math.floor(span / 2);
    for (let d = -half; d <= half; d++) {
      const a = along + d;
      if (edge === 'west' || edge === 'east') {
        if (a <= 0 || a >= targetH - 1) continue;
        const x = edge === 'west' ? 0 : targetW - 1;
        const inner = edge === 'west' ? 1 : targetW - 2;
        // Door glyph only on center of span; flanks match open terrain
        const glyph =
          d === 0
            ? DOORISH.has(ch)
              ? ch
              : ch
            : DOORISH.has(ch)
              ? ch
              : openFill(ch);
        grid[a]![x] = glyph;
        if (isSolidWall(grid[a]![inner]!)) {
          grid[a]![inner] = openFill(ch);
        }
      } else {
        if (a <= 0 || a >= targetW - 1) continue;
        const y = edge === 'north' ? 0 : targetH - 1;
        const inner = edge === 'north' ? 1 : targetH - 2;
        const glyph =
          d === 0
            ? DOORISH.has(ch)
              ? ch
              : ch
            : DOORISH.has(ch)
              ? ch
              : openFill(ch);
        grid[y]![a] = glyph;
        if (isSolidWall(grid[inner]![a]!)) {
          grid[inner]![a] = openFill(ch);
        }
      }
    }
  };

  // West / east: iterate source edge cells
  for (let sy = 0; sy < srcH; sy++) {
    const wch = src[sy]![0]!;
    if (!isSolidWall(wch)) {
      const dy = mapAxis(sy, srcH - 1, targetH - 1);
      const span = DOORISH.has(wch) ? DOOR_SPAN : 1;
      paint('west', clamp(dy, 1, targetH - 2), wch, span);
    }
    const ech = src[sy]![srcW - 1]!;
    if (!isSolidWall(ech)) {
      const dy = mapAxis(sy, srcH - 1, targetH - 1);
      const span = DOORISH.has(ech) ? DOOR_SPAN : 1;
      paint('east', clamp(dy, 1, targetH - 2), ech, span);
    }
  }
  // North / south
  for (let sx = 0; sx < srcW; sx++) {
    const nch = src[0]![sx]!;
    if (!isSolidWall(nch)) {
      const dx = mapAxis(sx, srcW - 1, targetW - 1);
      const span = DOORISH.has(nch) ? DOOR_SPAN : 1;
      paint('north', clamp(dx, 1, targetW - 2), nch, span);
    }
    const sch = src[srcH - 1]![sx]!;
    if (!isSolidWall(sch)) {
      const dx = mapAxis(sx, srcW - 1, targetW - 1);
      const span = DOORISH.has(sch) ? DOOR_SPAN : 1;
      paint('south', clamp(dx, 1, targetW - 2), sch, span);
    }
  }

  // Multi-tile open edges (meadow trail): also paint every mapped open cell
  // so long openings stay wide after stretch (span=1 each already above).
  // Merge consecutive open-edge source cells into continuous dest spans.
  sealOpenRuns(src, srcW, srcH, grid, targetW, targetH, 'west', 0);
  sealOpenRuns(src, srcW, srcH, grid, targetW, targetH, 'east', srcW - 1);
  sealOpenRuns(src, srcW, srcH, grid, targetW, targetH, 'north', 0);
  sealOpenRuns(src, srcW, srcH, grid, targetW, targetH, 'south', srcH - 1);
}

/** For continuous open edges (not single doors), fill every mapped rim cell. */
function sealOpenRuns(
  src: string[][],
  srcW: number,
  srcH: number,
  grid: string[][],
  targetW: number,
  targetH: number,
  edge: 'north' | 'south' | 'east' | 'west',
  fixed: number,
): void {
  const vertical = edge === 'west' || edge === 'east';
  const len = vertical ? srcH : srcW;
  let runStart = -1;
  let runCh = '.';

  const flush = (from: number, to: number, ch: string) => {
    // Only for non-door open runs of 2+ (meadow mouths)
    if (DOORISH.has(ch)) return;
    if (to - from < 1) return;
    const a0 = mapAxis(from, len - 1, (vertical ? targetH : targetW) - 1);
    const a1 = mapAxis(to, len - 1, (vertical ? targetH : targetW) - 1);
    const lo = Math.min(a0, a1);
    const hi = Math.max(a0, a1);
    for (let a = lo; a <= hi; a++) {
      if (vertical) {
        if (a <= 0 || a >= targetH - 1) continue;
        const x = edge === 'west' ? 0 : targetW - 1;
        const inner = edge === 'west' ? 1 : targetW - 2;
        grid[a]![x] = openFill(ch);
        if (isSolidWall(grid[a]![inner]!)) grid[a]![inner] = openFill(ch);
      } else {
        if (a <= 0 || a >= targetW - 1) continue;
        const y = edge === 'north' ? 0 : targetH - 1;
        const inner = edge === 'north' ? 1 : targetH - 2;
        grid[y]![a] = openFill(ch);
        if (isSolidWall(grid[inner]![a]!)) grid[inner]![a] = openFill(ch);
      }
    }
  };

  for (let i = 0; i <= len; i++) {
    let ch = '#';
    if (i < len) {
      if (vertical) ch = src[i]![fixed]!;
      else ch = src[fixed]![i]!;
    }
    const open = i < len && !isSolidWall(ch) && !DOORISH.has(ch);
    if (open) {
      if (runStart < 0) {
        runStart = i;
        runCh = ch;
      }
    } else if (runStart >= 0) {
      flush(runStart, i - 1, runCh);
      runStart = -1;
    }
  }
}

function openFill(ch: string): string {
  if (ch === 'g' || ch === 'd' || ch === '~' || ch === '=' || ch === '.') return ch;
  if (DOORISH.has(ch)) return '.';
  return '.';
}

/**
 * Any rim cell that isn't door/open stays wall. Corners always wall.
 * Also: if a door sits alone with floor neighbors on the rim, expand door
 * flanks to door tiles (wider door) so no stray floor gap remains.
 */
function sealRim(
  grid: string[][],
  targetW: number,
  targetH: number,
): void {
  const isOpenRim = (ch: string | undefined) =>
    !!ch && ch !== '#';

  // Corners
  grid[0]![0] = '#';
  grid[0]![targetW - 1] = '#';
  grid[targetH - 1]![0] = '#';
  grid[targetH - 1]![targetW - 1] = '#';

  // Widen door clusters: any rim open cell adjacent to D/L becomes D/L
  // (fills the classic stretch gap of "D.")
  const widen = (get: (i: number) => string, set: (i: number, c: string) => void, n: number) => {
    const next = Array.from({ length: n }, (_, i) => get(i));
    for (let i = 1; i < n - 1; i++) {
      if (next[i] === '#' ) continue;
      if (DOORISH.has(next[i]!)) continue;
      // Floor-like next to door → convert to door for a solid mouth
      const nearDoor =
        DOORISH.has(next[i - 1] ?? '#') || DOORISH.has(next[i + 1] ?? '#');
      if (nearDoor && (next[i] === '.' || next[i] === 'g' || next[i] === 'd')) {
        const doorCh =
          (DOORISH.has(next[i - 1] ?? '#') ? next[i - 1] : next[i + 1]) ?? 'D';
        next[i] = doorCh!;
      }
    }
    for (let i = 0; i < n; i++) set(i, next[i]!);
  };

  // North / south rows
  widen(
    (i) => grid[0]![i]!,
    (i, c) => {
      grid[0]![i] = c;
    },
    targetW,
  );
  widen(
    (i) => grid[targetH - 1]![i]!,
    (i, c) => {
      grid[targetH - 1]![i] = c;
    },
    targetW,
  );
  // West / east cols
  widen(
    (i) => grid[i]![0]!,
    (i, c) => {
      grid[i]![0] = c;
    },
    targetH,
  );
  widen(
    (i) => grid[i]![targetW - 1]!,
    (i, c) => {
      grid[i]![targetW - 1] = c;
    },
    targetH,
  );

  // Re-assert corners
  grid[0]![0] = '#';
  grid[0]![targetW - 1] = '#';
  grid[targetH - 1]![0] = '#';
  grid[targetH - 1]![targetW - 1] = '#';

  void isOpenRim;
}

/**
 * Map an authored entity tile coord into the stretched room.
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
  if (offsetX !== 0 || offsetY !== 0) {
    return { x: x + offsetX, y: y + offsetY };
  }
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
  expanded: Pick<
    ExpandedRoom,
    'srcW' | 'srcH' | 'targetW' | 'targetH' | 'offsetX' | 'offsetY'
  >,
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
