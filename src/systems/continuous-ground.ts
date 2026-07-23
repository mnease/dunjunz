/**
 * Continuous (tile-free) ground paint.
 * Logical grid still drives kinds / collision; visuals are one fluid surface
 * with fractal-warped biome edges — no square stamps.
 */

import type { LandId, TileKind } from '../types';
import { COLORS, MAP_PIXEL_H, MAP_PIXEL_W, TILE, SCALE } from '../config';
import { fbm01, hash2, seedFromString, valueNoise2 } from './fractal-noise';

const CELL = TILE * SCALE; // 48 world px per logical cell

/** RGB 0–255 */
type RGB = [number, number, number];

function hexToRgb(n: number): RGB {
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function lerpRgb(a: RGB, b: RGB, t: number): RGB {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

/** Base palette per terrain kind (mid / light / dark). */
function kindPalette(
  kind: TileKind,
  land: LandId | string,
  beach: boolean,
): { mid: RGB; light: RGB; dark: RGB } {
  const mountain = land === 'dwarvez';
  switch (kind) {
    case 'grass':
      return {
        mid: hexToRgb(COLORS.grass),
        light: hexToRgb(COLORS.grassAlt),
        dark: [30, 70, 42],
      };
    case 'dirt':
      return {
        mid: hexToRgb(COLORS.dirt),
        light: [138, 117, 100],
        dark: [58, 40, 32],
      };
    case 'sand':
      return {
        mid: hexToRgb(COLORS.sand),
        light: [245, 230, 192],
        dark: hexToRgb(COLORS.sandDark),
      };
    case 'snow':
      return {
        mid: [232, 240, 248],
        light: [255, 255, 255],
        dark: [184, 200, 216],
      };
    case 'water':
      return {
        mid: hexToRgb(COLORS.water),
        light: [70, 140, 190],
        dark: [20, 50, 80],
      };
    case 'lava':
      return {
        mid: hexToRgb(COLORS.lava),
        light: [255, 140, 60],
        dark: [80, 20, 10],
      };
    case 'wall':
      if (beach) {
        return {
          mid: [201, 168, 112],
          light: [224, 200, 144],
          dark: [138, 106, 64],
        };
      }
      if (mountain) {
        return {
          mid: [36, 34, 42],
          light: [74, 72, 88],
          dark: [12, 12, 16],
        };
      }
      return {
        mid: hexToRgb(COLORS.wall),
        light: [122, 106, 154],
        dark: hexToRgb(COLORS.wallDark),
      };
    case 'floor':
      if (mountain) {
        return {
          mid: [30, 28, 38],
          light: [54, 52, 64],
          dark: [16, 14, 22],
        };
      }
      if (beach) {
        return {
          mid: hexToRgb(COLORS.sand),
          light: [245, 230, 192],
          dark: hexToRgb(COLORS.sandDark),
        };
      }
      return {
        mid: hexToRgb(COLORS.floor),
        light: hexToRgb(COLORS.floorAlt),
        dark: [26, 20, 40],
      };
    case 'carpet':
      return {
        mid: [90, 40, 70],
        light: [140, 60, 100],
        dark: [50, 20, 40],
      };
    case 'door':
      return {
        mid: [90, 70, 50],
        light: [140, 110, 80],
        dark: [40, 30, 20],
      };
    case 'locked':
      return {
        mid: [70, 50, 90],
        light: [110, 80, 130],
        dark: [30, 20, 40],
      };
    case 'stairs':
    case 'stairs_up':
    case 'entrance':
      return {
        mid: [60, 55, 75],
        light: [100, 90, 120],
        dark: [25, 22, 35],
      };
    case 'pad':
      return {
        mid: [80, 120, 160],
        light: [120, 180, 220],
        dark: [30, 50, 70],
      };
    case 'void':
    default:
      return {
        mid: [10, 12, 16],
        light: [20, 24, 30],
        dark: [0, 0, 0],
      };
  }
}

function sampleKind(
  grid: TileKind[][],
  tx: number,
  ty: number,
): TileKind {
  const h = grid.length;
  const w = grid[0]?.length ?? 0;
  const x = Math.max(0, Math.min(w - 1, Math.floor(tx)));
  const y = Math.max(0, Math.min(h - 1, Math.floor(ty)));
  return grid[y]![x] ?? 'void';
}

/**
 * Soft-blend biome colors at warped float coords.
 * Warp breaks square cell boundaries into fluid edges.
 */
function colorAt(
  grid: TileKind[][],
  tx: number,
  ty: number,
  land: string,
  beach: boolean,
  seed: number,
): RGB {
  // Domain warp — the secret to "no tiles"
  const warpAmp = 0.42;
  const w1 = valueNoise2(tx * 0.55, ty * 0.55, seed) * warpAmp;
  const w2 = valueNoise2(tx * 0.55 + 40, ty * 0.55 - 12, seed + 1) * warpAmp;
  const wx = tx + w1;
  const wy = ty + w2;

  // Bilinear-ish blend of 4 corner cells
  const x0 = Math.floor(wx);
  const y0 = Math.floor(wy);
  const fx = wx - x0;
  const fy = wy - y0;
  // Smoothstep for softer seams
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);

  const corners: [number, number][] = [
    [x0, y0],
    [x0 + 1, y0],
    [x0, y0 + 1],
    [x0 + 1, y0 + 1],
  ];
  const weights = [(1 - sx) * (1 - sy), sx * (1 - sy), (1 - sx) * sy, sx * sy];
  let r = 0;
  let g = 0;
  let b = 0;
  for (let i = 0; i < 4; i++) {
    const [cx, cy] = corners[i]!;
    const kind = sampleKind(grid, cx, cy);
    const pal = kindPalette(kind, land, beach);
    // Micro variation within biome
    const n = fbm01(wx * 0.9 + i, wy * 0.9, seed + 9 + i, 3);
    const c = lerpRgb(pal.dark, lerpRgb(pal.mid, pal.light, n), 0.35 + n * 0.45);
    const wt = weights[i]!;
    r += c[0] * wt;
    g += c[1] * wt;
    b += c[2] * wt;
  }

  // Fine grit
  const grit = hash2(Math.floor(wx * 8), Math.floor(wy * 8), seed + 3);
  if (grit > 0.82) {
    r = Math.min(255, r + 12);
    g = Math.min(255, g + 12);
    b = Math.min(255, b + 10);
  } else if (grit < 0.12) {
    r = Math.max(0, r - 10);
    g = Math.max(0, g - 10);
    b = Math.max(0, b - 8);
  }

  // Special functional marks (still continuous, not tile stamps)
  const cellKind = sampleKind(grid, wx, wy);
  if (cellKind === 'stairs' || cellKind === 'stairs_up' || cellKind === 'entrance') {
    // hatch steps
    const band = Math.floor(wy * 4) % 2;
    if (band === 0) {
      r = Math.min(255, r + 25);
      g = Math.min(255, g + 22);
      b = Math.min(255, b + 30);
    }
  }
  if (cellKind === 'door') {
    const glow = fbm01(wx * 2, wy * 2, seed + 50, 2);
    r = Math.min(255, r + glow * 40);
    g = Math.min(255, g + glow * 30);
  }
  if (cellKind === 'pad') {
    const pulse = fbm01(wx * 3, wy * 3, seed + 60, 2);
    b = Math.min(255, b + 40 + pulse * 40);
    g = Math.min(255, g + 20);
  }

  return [Math.round(r), Math.round(g), Math.round(b)];
}

export type ContinuousGroundOpts = {
  grid: TileKind[][];
  roomId: string;
  land?: string;
  mapX?: number;
  mapY?: number;
  floor?: number;
  /** Paint every Nth pixel (2 = half res, faster). */
  pixelStep?: number;
};

/**
 * Paint a continuous ground canvas for the room.
 * Returns a canvas ready to upload as a Phaser texture.
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
    pixelStep = 2,
  } = opts;
  const step = Math.max(1, pixelStep | 0);
  const outW = MAP_PIXEL_W;
  const outH = MAP_PIXEL_H;
  const paintW = Math.ceil(outW / step);
  const paintH = Math.ceil(outH / step);

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d')!;
  // Low-res paint buffer
  const buf = document.createElement('canvas');
  buf.width = paintW;
  buf.height = paintH;
  const bctx = buf.getContext('2d')!;
  const img = bctx.createImageData(paintW, paintH);
  const data = img.data;

  const seed = seedFromString(roomId) ^ ((mapX * 73856093) ^ (mapY * 19349663) ^ (floor * 83492791));
  const beach = roomId === 'beach_start';
  const gh = grid.length;
  const gw = grid[0]?.length ?? 1;

  for (let py = 0; py < paintH; py++) {
    for (let px = 0; px < paintW; px++) {
      // World px → tile-space float (logical grid)
      const worldX = px * step + step * 0.5;
      const worldY = py * step + step * 0.5;
      const tx = Math.max(0, Math.min(gw - 0.001, worldX / CELL));
      const ty = Math.max(0, Math.min(gh - 0.001, worldY / CELL));
      // Seed offset by map so adjacent rooms share continuous fields
      const roomSeed = seed ^ (mapX * 131 + mapY * 917);
      const [R, G, B] = colorAt(grid, tx, ty, land, beach, roomSeed);
      const i = (py * paintW + px) * 4;
      data[i] = R;
      data[i + 1] = G;
      data[i + 2] = B;
      data[i + 3] = 255;
    }
  }
  bctx.putImageData(img, 0, 0);
  // Upscale nearest-neighbor for crisp pixel look without square tiles
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(buf, 0, 0, outW, outH);
  return canvas;
}

/** Unique Phaser texture key for a room ground (invalidate on door unlock). */
export function continuousGroundKey(roomId: string, gen = 0): string {
  return `cground_${roomId}_${gen}`;
}
