/**
 * Standing water kinds: ocean (beach), ponds (koi), rivers (channels / room-to-room).
 * Classification is topological from the live tile grid — no extra map chars.
 */

import type { EntityDef, TileKind } from '../types';
import { fractalTerrainVariant } from './fractal-noise';

export type WaterBodyKind = 'ocean' | 'pond' | 'river';

const BEACH_ROOM = 'beach_start';

export function isWaterKind(k: TileKind | string): boolean {
  return k === 'water';
}

function key(x: number, y: number): string {
  return `${x},${y}`;
}

interface WaterComponent {
  cells: { x: number; y: number }[];
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  /** Touches live grid border (not just wall shell). */
  onEdge: boolean;
}

function floodComponents(grid: TileKind[][]): WaterComponent[] {
  const h = grid.length;
  const w = grid[0]?.length ?? 0;
  const seen = new Set<string>();
  const out: WaterComponent[] = [];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!isWaterKind(grid[y]![x]!) || seen.has(key(x, y))) continue;
      const cells: { x: number; y: number }[] = [];
      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      let onEdge = false;
      const stack = [{ x, y }];
      seen.add(key(x, y));
      while (stack.length) {
        const c = stack.pop()!;
        cells.push(c);
        minX = Math.min(minX, c.x);
        maxX = Math.max(maxX, c.x);
        minY = Math.min(minY, c.y);
        maxY = Math.max(maxY, c.y);
        if (c.x === 0 || c.y === 0 || c.x === w - 1 || c.y === h - 1) {
          onEdge = true;
        }
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ] as const) {
          const nx = c.x + dx;
          const ny = c.y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          if (!isWaterKind(grid[ny]![nx]!) || seen.has(key(nx, ny))) continue;
          seen.add(key(nx, ny));
          stack.push({ x: nx, y: ny });
        }
      }
      out.push({ cells, minX, maxX, minY, maxY, onEdge });
    }
  }
  return out;
}

/**
 * River if edge-connected or a long thin channel; else pond.
 * Beach room forces ocean on every water cell.
 */
export function classifyWaterComponent(
  roomId: string,
  comp: WaterComponent,
): WaterBodyKind {
  if (roomId === BEACH_ROOM) return 'ocean';

  const w = comp.maxX - comp.minX + 1;
  const h = comp.maxY - comp.minY + 1;
  const area = comp.cells.length;
  const thin = Math.min(w, h) <= 2;
  const long = Math.max(w, h) >= 4;
  // Sewer channels / creek strips
  if (comp.onEdge) return 'river';
  if (thin && long) return 'river';
  // Sparse diagonal-ish strips still read as flow
  if (area >= 6 && thin) return 'river';
  return 'pond';
}

/**
 * Per-cell water body kind for a room's tile grid.
 * Non-water cells are omitted from the map.
 */
export function classifyRoomWater(
  roomId: string,
  grid: TileKind[][],
): Map<string, WaterBodyKind> {
  const map = new Map<string, WaterBodyKind>();
  if (roomId === BEACH_ROOM) {
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < (grid[0]?.length ?? 0); x++) {
        if (isWaterKind(grid[y]![x]!)) map.set(key(x, y), 'ocean');
      }
    }
    return map;
  }
  for (const comp of floodComponents(grid)) {
    const kind = classifyWaterComponent(roomId, comp);
    for (const c of comp.cells) map.set(key(c.x, c.y), kind);
  }
  return map;
}

export function waterTextureKey(
  body: WaterBodyKind,
  phase: number,
): string {
  if (body === 'ocean') {
    if (phase === 0) return 'tile-water-ocean';
    if (phase === 1) return 'tile-water-ocean-b';
    return 'tile-water-ocean-c';
  }
  if (body === 'river') {
    return phase % 2 === 0 ? 'tile-water-river' : 'tile-water-river-b';
  }
  return phase % 2 === 0 ? 'tile-water-pond' : 'tile-water-pond-b';
}

/** Fallback if specialized textures missing. */
export function waterTextureKeySafe(
  body: WaterBodyKind,
  phase: number,
  exists: (k: string) => boolean,
): string {
  const preferred = waterTextureKey(body, phase);
  if (exists(preferred)) return preferred;
  // Legacy ocean frames
  if (phase === 0 && exists('tile-water')) return 'tile-water';
  if (phase === 1 && exists('tile-water-b')) return 'tile-water-b';
  if (phase >= 2 && exists('tile-water-c')) return 'tile-water-c';
  if (exists('tile-water-b')) return 'tile-water-b';
  return 'tile-water';
}

/** Parse authored ASCII rows into a TileKind grid (for pre-expand classification). */
export function authoredTilesToGrid(tiles: string[]): TileKind[][] {
  return tiles.map((row) =>
    [...row].map((ch) => (ch === '~' ? 'water' : ch === '=' ? 'lava' : 'floor')),
  );
}

/**
 * Auto-place koi on pond cells when the room has no authored koi.
 * Uses **authored** tile coords so room-expand remapping works.
 * 2–4 fish depending on pond area.
 */
export function autoKoiEntities(
  roomId: string,
  authoredTiles: string[],
  existing: readonly EntityDef[] = [],
): EntityDef[] {
  if (existing.some((e) => e.kind === 'koi')) return [];
  if (roomId === BEACH_ROOM) return [];

  const grid = authoredTilesToGrid(authoredTiles);
  const kinds = classifyRoomWater(roomId, grid);
  const pondCells: { x: number; y: number }[] = [];
  for (const [k, body] of kinds) {
    if (body !== 'pond') continue;
    const [xs, ys] = k.split(',');
    pondCells.push({ x: Number(xs), y: Number(ys) });
  }
  if (pondCells.length < 1) return [];

  // Prefer interior of pond (not rim) for readable swimming
  const interior = pondCells.filter((c) => {
    const n =
      (kinds.get(key(c.x + 1, c.y)) === 'pond' ? 1 : 0) +
      (kinds.get(key(c.x - 1, c.y)) === 'pond' ? 1 : 0) +
      (kinds.get(key(c.x, c.y + 1)) === 'pond' ? 1 : 0) +
      (kinds.get(key(c.x, c.y - 1)) === 'pond' ? 1 : 0);
    return n >= 2;
  });
  const pool = interior.length >= 1 ? interior : pondCells;
  const count = Math.min(4, Math.max(2, Math.ceil(pool.length / 2)));
  const out: EntityDef[] = [];
  // Deterministic spread by room id hash
  let seed = 0;
  for (let i = 0; i < roomId.length; i++) seed = (seed * 31 + roomId.charCodeAt(i)) | 0;
  const used = new Set<string>();
  for (let i = 0; i < count; i++) {
    seed = (seed * 1103515245 + 12345) | 0;
    let idx = Math.abs(seed) % pool.length;
    let tries = 0;
    while (used.has(key(pool[idx]!.x, pool[idx]!.y)) && tries < pool.length) {
      idx = (idx + 1) % pool.length;
      tries++;
    }
    const cell = pool[idx]!;
    used.add(key(cell.x, cell.y));
    out.push({
      kind: 'koi',
      id: `${roomId}-koi-${i + 1}`,
      x: cell.x,
      y: cell.y,
    });
  }
  return out;
}

/**
 * Terrain texture variant index from tile coords (breaks square grid look).
 */
/**
 * Pick a terrain texture variant for cell (tx,ty).
 * Fractal fBm so patches feel fluid rather than a 3-tile checker stamp.
 */
export function terrainVariant(tx: number, ty: number, variants = 16): number {
  return fractalTerrainVariant(tx, ty, variants, 1337);
}
