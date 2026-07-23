/**
 * Dungeon depth personality — each basement floor reads darker, meaner,
 * and more hazardous than the one above. Pure helpers (no Phaser).
 */

import type { LandId, TileKind } from '../types';

/** Basement depth: surface/overworld = 0, B1 = 1, B8 = 8. */
export function basementDepth(floor: number | undefined | null): number {
  if (floor == null) return 0;
  if (floor < 0) return Math.abs(floor);
  return 0;
}

/** Human label for HUD / signs. */
export function depthFlavor(depth: number): string {
  if (depth <= 0) return 'SURFACE LIGHT';
  if (depth === 1) return 'DIM TORCHES';
  if (depth === 2) return 'SHADOW SEEPS';
  if (depth === 3) return 'COLD STONE';
  if (depth === 4) return 'DARKENING';
  if (depth === 5) return 'BLACK AIR';
  if (depth === 6) return 'NO SUN REMEMBERS';
  if (depth === 7) return 'NEAR THE BOTTOM';
  return 'THE ABYSS';
}

/**
 * Phaser tint for map tiles by depth + land mood.
 * 0xffffff = full bright; deeper floors crush toward near-black violet/green/sand.
 */
export function depthTileTint(
  depth: number,
  kind: TileKind,
  land: LandId = 'dunjunz',
): number {
  if (depth <= 0) return 0xffffff;
  // Walls/void stay darker than floors so rooms still read
  const wallBias = kind === 'wall' || kind === 'void' ? 0.12 : 0;
  const t = Math.min(0.82, depth * 0.09 + wallBias);

  // Land hue bases (RGB 0–1 at full brightness)
  let br = 1;
  let bg = 1;
  let bb = 1;
  if (land === 'dunjunz') {
    br = 0.92;
    bg = 0.82;
    bb = 1.0; // cold violet stone
  } else if (land === 'sewerz') {
    br = 0.75;
    bg = 0.95;
    bb = 0.8; // bilge green
  } else if (land === 'woodz') {
    br = 0.8;
    bg = 0.95;
    bb = 0.75; // deep forest
  } else if (land === 'dezertz') {
    br = 1.0;
    bg = 0.88;
    bb = 0.7; // dusk sand
  } else if (land === 'kingdomz') {
    br = 0.95;
    bg = 0.85;
    bb = 1.0;
  } else if (land === 'dwarvez') {
    br = 0.72;
    bg = 0.7;
    bb = 0.78; // cold basalt caves
  }

  // Crush toward near-black with a residual hue
  const keep = 1 - t;
  const floorFloor = kind === 'lava' ? 0.35 : kind === 'water' ? 0.28 : 0.18;
  const r = Math.max(floorFloor, br * keep);
  const g = Math.max(floorFloor * 0.9, bg * keep);
  const b = Math.max(floorFloor * 1.1, bb * keep);

  const ri = Math.min(255, Math.round(r * 255));
  const gi = Math.min(255, Math.round(g * 255));
  const bi = Math.min(255, Math.round(b * 255));
  return (ri << 16) | (gi << 8) | bi;
}

/** Camera / void backdrop behind the map. */
export function depthBackdropColor(depth: number, land: LandId = 'dunjunz'): number {
  if (depth <= 0) return 0x0a0c10;
  const t = Math.min(1, depth / 8);
  if (land === 'sewerz') return lerpRgb(0x0a1210, 0x020605, t);
  if (land === 'woodz') return lerpRgb(0x0a100c, 0x020403, t);
  if (land === 'dezertz') return lerpRgb(0x120e08, 0x060402, t);
  if (land === 'dwarvez') return lerpRgb(0x0c0c12, 0x040406, t);
  return lerpRgb(0x0c0a14, 0x030208, t);
}

function lerpRgb(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const br = (b >> 16) & 0xff;
  const bg = (b >> 8) & 0xff;
  const bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}

/** Extra threat points pure from depth (steeper than old +1/floor). */
export function depthThreatBonus(depth: number): number {
  if (depth <= 0) return 0;
  // B1=1, B2=2, B3=4, B4=5, B5=7, B6=8, B7=10, B8=11
  return depth + Math.floor((depth - 1) / 2);
}

/** Hostile contact/HP extra beyond room threat (applied as extra threat slice). */
export function depthHostileThreatBoost(depth: number): number {
  return Math.max(0, depth - 1);
}

/**
 * Deterministic 0..1 from string (room id + cell).
 */
export function depthHash01(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

export type DepthTileset = 'dungeon' | 'wood' | 'sand' | 'sewer';

/**
 * Stamp ominous obstacles into an authored 16×11 tile grid.
 * Preserves doors (D), stairs (U/S), entrances, and a walkable spine.
 */
export function applyDepthHazards(
  tiles: string[],
  depth: number,
  tileset: DepthTileset,
  seed: string,
): string[] {
  if (depth < 2 || tiles.length === 0) return tiles;
  const h = tiles.length;
  const w = tiles[0]?.length ?? 16;
  const grid = tiles.map((row) => row.split(''));

  const hazard =
    tileset === 'sewer' ? '~' : tileset === 'wood' ? '#' : tileset === 'sand' ? 'd' : '=';
  // secondary clutter
  const clutter =
    tileset === 'dungeon' ? '#' : tileset === 'sewer' ? '#' : tileset === 'wood' ? 'g' : 'd';

  // How aggressive: B2 light, B8 max
  const hazardChance = Math.min(0.22, 0.04 + depth * 0.025);
  const clutterChance = Math.min(0.18, 0.03 + depth * 0.02);

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const ch = grid[y]![x]!;
      // only rewrite open floor-like cells
      if (ch !== '.' && ch !== 'g' && ch !== 'd') continue;
      // keep a cross spine walkable (center column + mid row)
      if (x === Math.floor(w / 2) || y === Math.floor(h / 2)) continue;
      // keep near edges freer for door approaches
      if (x <= 1 || x >= w - 2 || y <= 1 || y >= h - 2) continue;

      const r = depthHash01(`${seed}:${x},${y}`);
      if (r < hazardChance) {
        grid[y]![x] = hazard;
      } else if (r < hazardChance + clutterChance) {
        grid[y]![x] = clutter;
      }
    }
  }

  // Deeper: ring of lava/water near center for drama (still leaves spine)
  if (depth >= 5) {
    const cy = Math.floor(h / 2);
    const cx = Math.floor(w / 2);
    for (const [dx, dy] of [
      [-2, -2],
      [2, -2],
      [-2, 2],
      [2, 2],
      [-3, 0],
      [3, 0],
      [0, -3],
      [0, 3],
    ] as const) {
      const x = cx + dx;
      const y = cy + dy;
      if (y > 0 && y < h - 1 && x > 0 && x < w - 1) {
        const ch = grid[y]![x]!;
        if (ch === '.' || ch === 'g' || ch === 'd') {
          grid[y]![x] = hazard;
        }
      }
    }
  }

  return grid.map((row) => row.join(''));
}

/**
 * Layout variant index 0–2 by depth tier for swapping room templates.
 * 0 = open, 1 = cramped, 2 = hazardous maze.
 */
export function depthLayoutTier(depth: number): 0 | 1 | 2 {
  if (depth <= 2) return 0;
  if (depth <= 5) return 1;
  return 2;
}

/** How many extra creep spawn points to append (beyond base spots). */
export function depthExtraCreepSlots(depth: number): number {
  if (depth <= 1) return 0;
  if (depth <= 3) return 1;
  if (depth <= 5) return 2;
  if (depth <= 7) return 3;
  return 4;
}

/** Enemy sprite tint: deeper = bloodier / colder. */
export function depthEnemyTint(depth: number): number | null {
  if (depth < 3) return null;
  if (depth < 5) return 0xddbbcc; // slight dusk
  if (depth < 7) return 0xcc99aa; // sickly
  return 0xaa7788; // deep crimson wash
}
