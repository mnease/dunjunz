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

/** Kinds that need sharp structure (not fluid blur). */
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
 * Soft-blend biome colors at warped float coords.
 * Structure cells (doors / cave mouths / stairs) skip warp so props stay crisp.
 */
function colorAt(
  grid: TileKind[][],
  tx: number,
  ty: number,
  land: string,
  beach: boolean,
  seed: number,
): RGB {
  const localKind = sampleKind(grid, tx, ty);
  const structure = isStructureKind(localKind);

  // Domain warp for terrain only — keep doors/stairs geometrically sharp
  const warpAmp = structure ? 0.06 : 0.42;
  const w1 = valueNoise2(tx * 0.55, ty * 0.55, seed) * warpAmp;
  const w2 = valueNoise2(tx * 0.55 + 40, ty * 0.55 - 12, seed + 1) * warpAmp;
  const wx = tx + w1;
  const wy = ty + w2;

  // Bilinear-ish blend of 4 corner cells (structures: mostly local cell)
  const x0 = Math.floor(wx);
  const y0 = Math.floor(wy);
  const fx = wx - x0;
  const fy = wy - y0;
  const sx = structure ? 0 : fx * fx * (3 - 2 * fx);
  const sy = structure ? 0 : fy * fy * (3 - 2 * fy);

  const corners: [number, number][] = [
    [x0, y0],
    [x0 + 1, y0],
    [x0, y0 + 1],
    [x0 + 1, y0 + 1],
  ];
  const weights = structure
    ? [1, 0, 0, 0]
    : [(1 - sx) * (1 - sy), sx * (1 - sy), (1 - sx) * sy, sx * sy];
  let r = 0;
  let g = 0;
  let b = 0;
  for (let i = 0; i < 4; i++) {
    const wt = weights[i]!;
    if (wt <= 0) continue;
    const [cx, cy] = corners[i]!;
    const kind = structure ? localKind : sampleKind(grid, cx, cy);
    const pal = kindPalette(kind, land, beach);
    const n = fbm01(wx * 0.9 + i, wy * 0.9, seed + 9 + i, 3);
    const c = lerpRgb(pal.dark, lerpRgb(pal.mid, pal.light, n), 0.35 + n * 0.45);
    r += c[0] * wt;
    g += c[1] * wt;
    b += c[2] * wt;
  }

  // Small-pixel grit (fine dither — not giant tile stamps)
  // Quantize color slightly so the surface reads as tiny pixels, not soft paint
  const grit = hash2(Math.floor(wx * 14), Math.floor(wy * 14), seed + 3);
  if (!structure) {
    if (grit > 0.78) {
      r = Math.min(255, r + 14);
      g = Math.min(255, g + 14);
      b = Math.min(255, b + 12);
    } else if (grit < 0.14) {
      r = Math.max(0, r - 12);
      g = Math.max(0, g - 12);
      b = Math.max(0, b - 10);
    }
  }
  // 4-level channel snap → crisp small-pixel look
  const snap = (v: number) => Math.round(v / 12) * 12;
  r = Math.min(255, snap(r));
  g = Math.min(255, snap(g));
  b = Math.min(255, snap(b));

  // Structure base pads under props — dark threshold / threshold frame
  const fxCell = wx - Math.floor(wx);
  const fyCell = wy - Math.floor(wy);
  if (localKind === 'stairs' || localKind === 'stairs_up' || localKind === 'entrance') {
    // Dark maw center + lighter stone rim
    const dx = fxCell - 0.5;
    const dy = fyCell - 0.5;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.28) {
      // black cave hole
      r = 8;
      g = 6;
      b = 12;
    } else if (dist < 0.42) {
      // arch lip
      r = Math.min(255, 90 + grit * 40);
      g = Math.min(255, 82 + grit * 30);
      b = Math.min(255, 70 + grit * 20);
    } else {
      // stepped threshold bands
      const band = Math.floor(fyCell * 5);
      if (band % 2 === 0) {
        r = Math.min(255, r + 35);
        g = Math.min(255, g + 30);
        b = Math.min(255, b + 40);
      } else {
        r = Math.max(0, r - 20);
        g = Math.max(0, g - 18);
        b = Math.max(0, b - 15);
      }
    }
  }
  if (localKind === 'door' || localKind === 'locked') {
    // Stone frame on edges of the cell
    const frame =
      fxCell < 0.14 || fxCell > 0.86 || fyCell < 0.12 || fyCell > 0.9;
    if (frame) {
      r = 90;
      g = 78;
      b = 52;
    } else {
      // wood / iron slab
      if (localKind === 'locked') {
        r = 70;
        g = 52;
        b = 28;
      } else {
        r = 110;
        g = 85;
        b = 35;
      }
      // vertical grain
      if (Math.floor(fxCell * 12) % 3 === 0) {
        r = Math.max(0, r - 18);
        g = Math.max(0, g - 14);
        b = Math.max(0, b - 10);
      }
    }
  }
  if (localKind === 'pad') {
    const dx = fxCell - 0.5;
    const dy = fyCell - 0.5;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.35) {
      r = 70;
      g = 140;
      b = 200;
    } else if (dist < 0.42) {
      r = 40;
      g = 80;
      b = 120;
    }
  }

  return [Math.round(r), Math.round(g), Math.round(b)];
}

/** Texture key for a structure prop sprite (doors, cave mouths, stairs). */
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
      // Surface dungeon entrance = cave mouth; basements = stair shaft
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

export const WATER_SHIMMER_PHASES = 3;

export function continuousWaterKey(
  roomId: string,
  gen = 0,
  phase = 0,
): string {
  return `cwater_${roomId}_${gen}_${phase}`;
}

/** True if the logical grid has water or lava that should shimmer. */
export function gridHasFluidSurface(grid: TileKind[][]): boolean {
  for (const row of grid) {
    for (const k of row) {
      if (k === 'water' || k === 'lava') return true;
    }
  }
  return false;
}

/**
 * Continuous water/lava shimmer overlay — only fluid pixels are opaque.
 * `phase` 0..WATER_SHIMMER_PHASES-1 shifts the fractal for animation.
 */
export function paintContinuousWaterOverlay(
  opts: ContinuousGroundOpts & { phase?: number },
): HTMLCanvasElement {
  const {
    grid,
    roomId,
    land = 'surface',
    mapX = 0,
    mapY = 0,
    floor = 0,
    pixelStep = 2,
    phase = 0,
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
  const buf = document.createElement('canvas');
  buf.width = paintW;
  buf.height = paintH;
  const bctx = buf.getContext('2d')!;
  const img = bctx.createImageData(paintW, paintH);
  const data = img.data;

  const seed =
    seedFromString(roomId) ^
    ((mapX * 73856093) ^ (mapY * 19349663) ^ (floor * 83492791));
  const roomSeed = (seed ^ (mapX * 131 + mapY * 917)) + phase * 9973;
  const beach = roomId === 'beach_start';
  const gh = grid.length;
  const gw = grid[0]?.length ?? 1;
  const ph = phase | 0;

  for (let py = 0; py < paintH; py++) {
    for (let px = 0; px < paintW; px++) {
      const worldX = px * step + step * 0.5;
      const worldY = py * step + step * 0.5;
      const tx = Math.max(0, Math.min(gw - 0.001, worldX / CELL));
      const ty = Math.max(0, Math.min(gh - 0.001, worldY / CELL));
      // Soft warped sample — only emit where fluid is strong
      const warpAmp = 0.38;
      const w1 = valueNoise2(tx * 0.55 + ph * 0.2, ty * 0.55, roomSeed) * warpAmp;
      const w2 =
        valueNoise2(tx * 0.55 + 40, ty * 0.55 + ph * 0.15, roomSeed + 1) *
        warpAmp;
      const wx = tx + w1;
      const wy = ty + w2;
      const kind = sampleKind(grid, wx, wy);
      const i = (py * paintW + px) * 4;
      if (kind !== 'water' && kind !== 'lava') {
        data[i] = 0;
        data[i + 1] = 0;
        data[i + 2] = 0;
        data[i + 3] = 0;
        continue;
      }
      const pal = kindPalette(kind, land, beach);
      // Animated foam / heat: phase scrolls the noise field
      const n = fbm01(wx * 1.1 + ph * 0.55, wy * 1.1 - ph * 0.35, roomSeed + 4, 3);
      const n2 = fbm01(wx * 2.2 - ph * 0.4, wy * 2.2 + ph * 0.3, roomSeed + 8, 2);
      let c = lerpRgb(pal.dark, lerpRgb(pal.mid, pal.light, n), 0.4 + n * 0.5);
      // Highlight ridges (foam / lava glow)
      if (n2 > 0.62) {
        if (kind === 'water') {
          c = lerpRgb(c, [210, 235, 255], (n2 - 0.62) * 2.2);
        } else {
          c = lerpRgb(c, [255, 220, 120], (n2 - 0.62) * 2.4);
        }
      }
      // Soft alpha so land shows through at edges
      const edgeKind = sampleKind(grid, tx, ty);
      let a = edgeKind === kind || kind === 'water' || kind === 'lava' ? 210 : 120;
      // Ocean: brighter north-ish foam pulse
      if (kind === 'water' && beach) {
        a = Math.min(255, a + Math.floor(n * 30));
      }
      data[i] = c[0];
      data[i + 1] = c[1];
      data[i + 2] = c[2];
      data[i + 3] = a;
    }
  }
  bctx.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, outW, outH);
  ctx.drawImage(buf, 0, 0, outW, outH);
  return canvas;
}
