/**
 * Continuous room ground paint — Terraria-like small pixels.
 *
 * Logic grid still drives kinds / collision. Visuals use a fine pixel grid
 * (not one giant stamp per cell): hard material edges, 3–4 color palettes
 * per material, speckles/blades like Terraria dirt/grass/stone.
 */

import type { LandId, TileKind } from '../types';
import { COLORS, MAP_PIXEL_H, MAP_PIXEL_W, TILE, SCALE } from '../config';
import { hash2, seedFromString, valueNoise2 } from './fractal-noise';

const CELL = TILE * SCALE; // 48 world px per logical cell

/**
 * World pixels per painted texel. 3 → 16×16 micro-pixels per cell (Terraria block feel).
 */
export const TERRARIA_PIXEL = 3;

/** RGB 0–255 */
type RGB = [number, number, number];

function hexToRgb(n: number): RGB {
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function pick(pal: RGB[], h: number): RGB {
  const i = Math.min(pal.length - 1, Math.floor(h * pal.length));
  return pal[i]!;
}

/** Terraria-style limited palettes (3–5 solid colors per material). */
function materialPalette(
  kind: TileKind,
  land: string,
  beach: boolean,
): RGB[] {
  const mountain = land === 'dwarvez';
  switch (kind) {
    case 'grass':
      return [
        [47, 107, 69],
        [58, 125, 82],
        [36, 88, 52],
        [80, 150, 90],
        [107, 83, 68], // dirt fleck under grass
      ];
    case 'dirt':
      return [
        hexToRgb(COLORS.dirt),
        [107, 83, 68],
        [90, 70, 55],
        [120, 95, 75],
        [70, 52, 40],
      ];
    case 'sand':
      return [
        hexToRgb(COLORS.sand),
        hexToRgb(COLORS.sandDark),
        [245, 230, 192],
        [200, 170, 120],
        [180, 150, 100],
      ];
    case 'snow':
      return [
        [248, 252, 255],
        [232, 240, 248],
        [200, 214, 230],
        [255, 255, 255],
        [180, 196, 214],
      ];
    case 'water':
      return [
        hexToRgb(COLORS.water),
        [35, 90, 140],
        [55, 120, 170],
        [25, 60, 100],
        [90, 160, 200],
      ];
    case 'lava':
      return [
        hexToRgb(COLORS.lava),
        [200, 60, 30],
        [255, 120, 40],
        [100, 25, 12],
        [255, 180, 60],
      ];
    case 'wall':
      if (beach) {
        return [
          [201, 168, 112],
          [180, 145, 90],
          [224, 200, 144],
          [138, 106, 64],
          [160, 130, 80],
        ];
      }
      if (mountain) {
        return [
          [42, 40, 48],
          [30, 28, 36],
          [58, 56, 68],
          [18, 16, 22],
          [70, 68, 82],
        ];
      }
      return [
        hexToRgb(COLORS.wall),
        hexToRgb(COLORS.wallDark),
        [100, 85, 130],
        [70, 60, 95],
        [50, 42, 72],
      ];
    case 'floor':
      if (mountain) {
        return [
          [32, 30, 40],
          [24, 22, 30],
          [48, 46, 58],
          [18, 16, 24],
          [40, 38, 50],
        ];
      }
      if (beach) {
        return materialPalette('sand', land, beach);
      }
      return [
        hexToRgb(COLORS.floor),
        hexToRgb(COLORS.floorAlt),
        [50, 42, 70],
        [35, 28, 50],
        [60, 52, 85],
      ];
    case 'carpet':
      return [
        [100, 40, 70],
        [130, 55, 90],
        [70, 25, 50],
        [150, 70, 100],
      ];
    case 'door':
      return [
        [110, 85, 35],
        [90, 70, 50],
        [140, 110, 60],
        [60, 45, 25],
        [40, 30, 18],
      ];
    case 'locked':
      return [
        [70, 52, 28],
        [90, 65, 35],
        [50, 38, 22],
        [110, 90, 70],
        [40, 32, 48],
      ];
    case 'stairs':
    case 'stairs_up':
    case 'entrance':
      return [
        [45, 40, 58],
        [70, 60, 90],
        [25, 20, 35],
        [12, 10, 18],
        [90, 80, 110],
      ];
    case 'pad':
      return [
        [70, 140, 200],
        [50, 100, 160],
        [100, 180, 230],
        [30, 60, 100],
      ];
    case 'void':
    default:
      return [
        [10, 12, 16],
        [6, 8, 12],
        [16, 18, 24],
      ];
  }
}

function sampleKind(grid: TileKind[][], tx: number, ty: number): TileKind {
  const h = grid.length;
  const w = grid[0]?.length ?? 0;
  const x = Math.max(0, Math.min(w - 1, Math.floor(tx)));
  const y = Math.max(0, Math.min(h - 1, Math.floor(ty)));
  return grid[y]![x] ?? 'void';
}

export function isStructureKind(k: TileKind): boolean {
  return (
    k === 'door' ||
    k === 'locked' ||
    k === 'stairs' ||
    k === 'stairs_up' ||
    k === 'entrance' ||
    k === 'pad'
  );
}

/**
 * Terraria-like pixel color for one micro-pixel.
 * Hard material edges (nearest cell). Intra-material speckles + grass blades.
 */
export function terrariaPixelColor(
  grid: TileKind[][],
  /** Continuous tile-space coords */
  tx: number,
  ty: number,
  /** Integer micro-pixel coords (world/TERRARIA_PIXEL) for stable hash */
  mx: number,
  my: number,
  land: string,
  beach: boolean,
  seed: number,
): RGB {
  // Hard edges — no soft blend between materials
  const kind = sampleKind(grid, tx, ty);
  const pal = materialPalette(kind, land, beach);
  const structure = isStructureKind(kind);

  const fx = tx - Math.floor(tx);
  const fy = ty - Math.floor(ty);
  // Micro position within logical cell (0..15 if 16 texels/cell)
  const subX = Math.floor(fx * 16);
  const subY = Math.floor(fy * 16);

  let h = hash2(mx, my, seed);
  // Slight spatial noise for organic clumps within a material
  const clump = hash2(Math.floor(mx / 3), Math.floor(my / 3), seed + 7);

  let c: RGB;

  if (kind === 'grass') {
    // Terraria grass: dirt-ish body, green top fringe when open above
    const above = sampleKind(grid, tx, ty - 1);
    const openAbove =
      above === 'grass' ||
      above === 'void' ||
      above === 'door' ||
      above === 'water' ||
      above === 'snow' ||
      above === 'sand' ||
      (above !== 'wall' && above !== 'locked');
    // Top 3 micro-rows: grass surface
    if (openAbove && subY <= 2) {
      c = pick(
        [
          [58, 140, 78],
          [80, 170, 95],
          [40, 110, 58],
          [100, 190, 110],
        ],
        h,
      );
      // blade tips stick up 1px sometimes
      if (subY === 0 && h > 0.55) c = [90, 185, 100];
    } else if (subY <= 5 && openAbove) {
      c = pick(
        [
          [47, 107, 69],
          [58, 125, 82],
          [36, 88, 52],
        ],
        h,
      );
    } else {
      // soil under grass
      c = pick(
        [
          [90, 70, 52],
          [107, 83, 68],
          [75, 58, 42],
          [120, 95, 72],
        ],
        h,
      );
    }
  } else if (kind === 'dirt') {
    c = pick(pal, h * 0.7 + clump * 0.3);
    // occasional pebble
    if (h > 0.92) c = [150, 140, 125];
  } else if (kind === 'sand') {
    c = pick(pal, h);
    if (h > 0.9) c = [255, 245, 220];
  } else if (kind === 'snow') {
    c = pick(pal, h);
    if (h > 0.88) c = [255, 255, 255];
    if (h < 0.08) c = [170, 190, 210];
  } else if (kind === 'wall') {
    c = pick(pal, h * 0.6 + clump * 0.4);
    // stone crack lines
    if (hash2(mx, my, seed + 3) > 0.94) c = pal[pal.length - 1]!;
    // mortar-ish darker every few pixels
    if ((subX + subY) % 7 === 0 && h < 0.4) {
      c = [
        Math.max(0, c[0] - 20),
        Math.max(0, c[1] - 20),
        Math.max(0, c[2] - 18),
      ];
    }
  } else if (kind === 'floor') {
    c = pick(pal, h * 0.65 + clump * 0.35);
    if (h > 0.93) {
      c = [
        Math.min(255, c[0] + 18),
        Math.min(255, c[1] + 16),
        Math.min(255, c[2] + 22),
      ];
    }
  } else if (kind === 'water') {
    c = pick(pal, h);
    // highlight sparkle pixel
    if (h > 0.9) c = [120, 180, 220];
  } else if (kind === 'lava') {
    c = pick(pal, h);
    if (h > 0.88) c = [255, 200, 80];
  } else if (kind === 'stairs' || kind === 'stairs_up' || kind === 'entrance') {
    // Dark maw + stone rim (Terraria-like cave hole)
    const dx = fx - 0.5;
    const dy = fy - 0.5;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.26) {
      c = [8, 6, 12];
    } else if (dist < 0.38) {
      c = pick(
        [
          [90, 82, 70],
          [110, 100, 85],
          [70, 64, 55],
        ],
        h,
      );
    } else {
      // step bands
      const band = Math.floor(fy * 6);
      c = band % 2 === 0 ? [70, 60, 90] : [40, 35, 55];
    }
  } else if (kind === 'door' || kind === 'locked') {
    const frame = subX <= 1 || subX >= 14 || subY <= 1 || subY >= 14;
    if (frame) {
      c = [95, 82, 55];
    } else if (kind === 'locked') {
      c = pick(
        [
          [70, 52, 28],
          [55, 42, 24],
          [90, 70, 45],
        ],
        h,
      );
      // iron band
      if (subY === 5 || subY === 10) c = [90, 90, 100];
    } else {
      c = pick(
        [
          [120, 90, 40],
          [100, 75, 30],
          [140, 110, 55],
        ],
        h,
      );
      // wood grain columns
      if (subX % 3 === 0) {
        c = [
          Math.max(0, c[0] - 20),
          Math.max(0, c[1] - 15),
          Math.max(0, c[2] - 10),
        ];
      }
    }
  } else if (kind === 'pad') {
    const dx = fx - 0.5;
    const dy = fy - 0.5;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.32) c = pick([[70, 150, 210], [90, 170, 230], [50, 120, 180]], h);
    else if (dist < 0.4) c = [40, 80, 120];
    else c = pick(pal, h);
  } else if (kind === 'carpet') {
    c = pick(pal, h);
    if ((subX + subY) % 4 === 0) c = [150, 70, 100];
  } else {
    c = pick(pal, h);
  }

  // Micro shade for depth (still hard pixels)
  if (!structure && hash2(mx + 1, my, seed + 11) > 0.97) {
    c = [
      Math.max(0, c[0] - 15),
      Math.max(0, c[1] - 15),
      Math.max(0, c[2] - 12),
    ];
  }

  return c;
}

export type ContinuousGroundOpts = {
  grid: TileKind[][];
  roomId: string;
  land?: string;
  mapX?: number;
  mapY?: number;
  floor?: number;
  /** @deprecated ignored — Terraria mode uses TERRARIA_PIXEL */
  pixelStep?: number;
};

/**
 * Paint continuous Terraria-style ground for the room.
 */
export function paintContinuousGround(
  opts: ContinuousGroundOpts,
): HTMLCanvasElement {
  const {
    grid,
    roomId,
    land = 'surface',
    mapX = 0,
    mapY = 0,
    floor = 0,
  } = opts;
  const step = TERRARIA_PIXEL;
  const outW = MAP_PIXEL_W;
  const outH = MAP_PIXEL_H;
  const paintW = Math.ceil(outW / step);
  const paintH = Math.ceil(outH / step);

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d')!;
  const buf = document.createElement('canvas');
  buf.width = paintW;
  buf.height = paintH;
  const bctx = buf.getContext('2d')!;
  const img = bctx.createImageData(paintW, paintH);
  const data = img.data;

  const seed =
    seedFromString(roomId) ^
    ((mapX * 73856093) ^ (mapY * 19349663) ^ (floor * 83492791));
  const beach = roomId === 'beach_start';
  const gh = grid.length;
  const gw = grid[0]?.length ?? 1;

  for (let py = 0; py < paintH; py++) {
    for (let px = 0; px < paintW; px++) {
      const worldX = px * step + step * 0.5;
      const worldY = py * step + step * 0.5;
      const tx = Math.max(0, Math.min(gw - 0.001, worldX / CELL));
      const ty = Math.max(0, Math.min(gh - 0.001, worldY / CELL));
      // Stable world micro-coords for hash (across map cells)
      const mx = Math.floor(mapX * 64 + px);
      const my = Math.floor(mapY * 64 + py);
      const [R, G, B] = terrariaPixelColor(
        grid,
        tx,
        ty,
        mx,
        my,
        land,
        beach,
        seed,
      );
      const i = (py * paintW + px) * 4;
      data[i] = R;
      data[i + 1] = G;
      data[i + 2] = B;
      data[i + 3] = 255;
    }
  }
  bctx.putImageData(img, 0, 0);
  // Nearest-neighbor upscale = sharp small pixels (Terraria zoom look)
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(buf, 0, 0, outW, outH);
  return canvas;
}

export function continuousGroundKey(roomId: string, gen = 0): string {
  return `cground_${roomId}_${gen}`;
}

export const WATER_SHIMMER_PHASES = 3;

export function continuousWaterKey(
  roomId: string,
  gen = 0,
  phase = 0,
): string {
  return `cwater_${roomId}_${gen}_${phase}`;
}

export function gridHasFluidSurface(grid: TileKind[][]): boolean {
  for (const row of grid) {
    for (const k of row) {
      if (k === 'water' || k === 'lava') return true;
    }
  }
  return false;
}

/**
 * Water/lava shimmer overlay — Terraria-like highlight pixels only.
 * Transparent elsewhere so land stays sharp underneath.
 */
export function paintContinuousWaterOverlay(
  opts: ContinuousGroundOpts & { phase?: number },
): HTMLCanvasElement {
  const {
    grid,
    roomId,
    mapX = 0,
    mapY = 0,
    floor = 0,
    phase = 0,
  } = opts;
  const step = TERRARIA_PIXEL;
  const outW = MAP_PIXEL_W;
  const outH = MAP_PIXEL_H;
  const paintW = Math.ceil(outW / step);
  const paintH = Math.ceil(outH / step);

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d')!;
  const buf = document.createElement('canvas');
  buf.width = paintW;
  buf.height = paintH;
  const bctx = buf.getContext('2d')!;
  const img = bctx.createImageData(paintW, paintH);
  const data = img.data;

  const seed =
    seedFromString(roomId) ^
    ((mapX * 73856093) ^ (mapY * 19349663) ^ (floor * 83492791));
  const ph = phase | 0;
  const roomSeed = seed + ph * 9973;
  const beach = roomId === 'beach_start';
  const gh = grid.length;
  const gw = grid[0]?.length ?? 1;

  for (let py = 0; py < paintH; py++) {
    for (let px = 0; px < paintW; px++) {
      const worldX = px * step + step * 0.5;
      const worldY = py * step + step * 0.5;
      const tx = Math.max(0, Math.min(gw - 0.001, worldX / CELL));
      const ty = Math.max(0, Math.min(gh - 0.001, worldY / CELL));
      const kind = sampleKind(grid, tx, ty);
      const i = (py * paintW + px) * 4;
      if (kind !== 'water' && kind !== 'lava') {
        data[i] = 0;
        data[i + 1] = 0;
        data[i + 2] = 0;
        data[i + 3] = 0;
        continue;
      }
      const mx = Math.floor(mapX * 64 + px + ph * 2);
      const my = Math.floor(mapY * 64 + py - ph);
      // Phase-shifted sparkle pattern (hard pixels)
      const h = hash2(mx, my, roomSeed + 4);
      const wave = valueNoise2(
        tx * 2.5 + ph * 0.4,
        ty * 2.5 - ph * 0.3,
        roomSeed,
      );
      if (kind === 'water') {
        if (h > 0.82 || wave > 0.55) {
          data[i] = 160;
          data[i + 1] = 210;
          data[i + 2] = 255;
          data[i + 3] = beach ? 210 : 170;
        } else if (h > 0.55) {
          data[i] = 50;
          data[i + 1] = 110;
          data[i + 2] = 170;
          data[i + 3] = 100;
        } else {
          data[i] = 30;
          data[i + 1] = 80;
          data[i + 2] = 130;
          data[i + 3] = 55;
        }
      } else {
        if (h > 0.8 || wave > 0.5) {
          data[i] = 255;
          data[i + 1] = 200;
          data[i + 2] = 80;
          data[i + 3] = 210;
        } else {
          data[i] = 220;
          data[i + 1] = 70;
          data[i + 2] = 30;
          data[i + 3] = 110;
        }
      }
    }
  }
  bctx.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, outW, outH);
  ctx.drawImage(buf, 0, 0, outW, outH);
  return canvas;
}

export function structurePropTexture(
  kind: TileKind,
  floor = 0,
): string | null {
  switch (kind) {
    case 'door':
      return 'tile-door';
    case 'locked':
      return 'tile-locked';
    case 'stairs':
      return floor >= 0 ? 'tile-cave-mouth' : 'tile-stairs';
    case 'stairs_up':
      return 'tile-stairs-up';
    case 'entrance':
      return 'tile-cave-mouth';
    case 'pad':
      return 'tile-pad';
    default:
      return null;
  }
}
