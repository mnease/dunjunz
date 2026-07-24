/**
 * Entity pixel polish for Graphics-v2 Phase D (Core Keeper readable silhouettes).
 * Outlines, optional jagged edges, drop shadows. Pure canvas helpers (no Phaser).
 *
 * Soft ambient (koi/sign/crab…) never gets jagged grow — that created black cages.
 *
 * @see docs/graphics-v2-style-bible.md
 * @see docs/graphics-v2-rebuild-plan.md Phase D
 */

import { hash2 } from './fractal-noise';

export const TERRARIA_OUTLINE = '#1a1420';
export const TERRARIA_SHADOW = 'rgba(10, 8, 16, 0.55)';

function opaque(data: Uint8ClampedArray, i: number, aMin = 24): boolean {
  return data[i + 3]! >= aMin;
}

/**
 * 1px dark outline around opaque silhouette (Terraria entity read).
 */
export function applyTerrariaOutline(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  color = TERRARIA_OUTLINE,
): void {
  const img = ctx.getImageData(0, 0, w, h);
  const src = img.data;
  const out = new Uint8ClampedArray(src);
  const parse = color.startsWith('#')
    ? [
        parseInt(color.slice(1, 3), 16),
        parseInt(color.slice(3, 5), 16),
        parseInt(color.slice(5, 7), 16),
      ]
    : [26, 20, 32];
  const [or, og, ob] = parse;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (opaque(src, i)) continue;
      // Neighbor opaque → become outline
      let edge = false;
      for (let dy = -1; dy <= 1 && !edge; dy++) {
        for (let dx = -1; dx <= 1 && !edge; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          if (opaque(src, (ny * w + nx) * 4)) edge = true;
        }
      }
      if (edge) {
        out[i] = or;
        out[i + 1] = og;
        out[i + 2] = ob;
        out[i + 3] = 255;
      }
    }
  }
  img.data.set(out);
  ctx.putImageData(img, 0, 0);
}

/**
 * Jagged organic silhouette — nibble / grow edge pixels with stable hash.
 * Makes trees, creeps, props feel less rectangular.
 */
export function applyTerrariaJaggedEdge(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed = 0,
  nibbleChance = 0.22,
): void {
  const img = ctx.getImageData(0, 0, w, h);
  const src = img.data;
  const out = new Uint8ClampedArray(src);

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      const on = opaque(src, i);
      let neighbors = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          if (opaque(src, ((y + dy) * w + (x + dx)) * 4)) neighbors++;
        }
      }
      const edge = on && neighbors < 8;
      const hollow = !on && neighbors >= 1 && neighbors <= 4;
      const roll = hash2(x, y, seed);

      if (edge && roll < nibbleChance) {
        // Nibble: erase edge pixel for jagged outline
        out[i + 3] = 0;
      } else if (hollow && roll > 1 - nibbleChance * 0.65) {
        // Grow: fill nearby with neighbor color for bumpy edge
        let sr = 0;
        let sg = 0;
        let sb = 0;
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const j = ((y + dy) * w + (x + dx)) * 4;
            if (opaque(src, j)) {
              sr += src[j]!;
              sg += src[j + 1]!;
              sb += src[j + 2]!;
              n++;
            }
          }
        }
        if (n > 0) {
          out[i] = Math.round(sr / n);
          out[i + 1] = Math.round(sg / n);
          out[i + 2] = Math.round(sb / n);
          out[i + 3] = 255;
        }
      }
    }
  }
  img.data.set(out);
  ctx.putImageData(img, 0, 0);
}

/**
 * Hard drop shadow under opaque pixels (Terraria entity shadow).
 * Drawn behind by shifting a dark copy down-right, then re-blitting? 
 * Simpler: paint shadow into transparent cells SE of opaque.
 */
export function applyTerrariaDropShadow(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  ox = 1,
  oy = 2,
  alpha = 90,
): void {
  const img = ctx.getImageData(0, 0, w, h);
  const src = new Uint8ClampedArray(img.data);
  const out = img.data;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (!opaque(src, i)) continue;
      const sx = x + ox;
      const sy = y + oy;
      if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue;
      const j = (sy * w + sx) * 4;
      // Only shadow into empty / translucent
      if (src[j + 3]! < 40) {
        out[j] = 12;
        out[j + 1] = 10;
        out[j + 2] = 18;
        out[j + 3] = Math.max(out[j + 3]!, alpha);
      }
    }
  }
  // Restore original opaque on top (shadow shouldn't overwrite body)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (opaque(src, i)) {
        out[i] = src[i]!;
        out[i + 1] = src[i + 1]!;
        out[i + 2] = src[i + 2]!;
        out[i + 3] = src[i + 3]!;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
}

/**
 * Quantize colors to hard steps (Terraria flat shading).
 */
export function applyTerrariaColorSnap(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  step = 16,
): void {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3]! < 8) continue;
    d[i] = Math.round(d[i]! / step) * step;
    d[i + 1] = Math.round(d[i + 1]! / step) * step;
    d[i + 2] = Math.round(d[i + 2]! / step) * step;
  }
  ctx.putImageData(img, 0, 0);
}

export type TerrariaPassOpts = {
  outline?: boolean;
  jagged?: boolean;
  shadow?: boolean;
  snap?: boolean;
  seed?: number;
};

/**
 * Full Terraria entity pass (order: snap → jagged → shadow → outline).
 */
export function applyTerrariaEntityPass(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  opts: TerrariaPassOpts = {},
): void {
  const {
    outline = true,
    jagged = true,
    shadow = true,
    snap = true,
    seed = 0,
  } = opts;
  if (snap) applyTerrariaColorSnap(ctx, w, h, 12);
  // Slightly lower nibble than v1 (0.2 → 0.14) — restrained Phase D silhouettes
  if (jagged) applyTerrariaJaggedEdge(ctx, w, h, seed, 0.14);
  if (shadow) applyTerrariaDropShadow(ctx, w, h, 1, 2, 80);
  if (outline) applyTerrariaOutline(ctx, w, h);
}

/**
 * Pixelated light cookie — stepped rings (Terraria torch-ish falloff).
 * White center → transparent, quantized by distance bands (not smooth gradient).
 */
export function drawTerrariaLightCookie(
  ctx: CanvasRenderingContext2D,
  size: number,
): void {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size / 2;
  const img = ctx.createImageData(size, size);
  const d = img.data;
  const steps = 10;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx + 0.5;
      const dy = y - cy + 0.5;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const t = Math.min(1, dist / maxR);
      // Quantize into hard rings
      const band = Math.floor(t * steps) / steps;
      const intensity = Math.pow(1 - band, 1.45);
      const a = Math.round(intensity * 255);
      const i = (y * size + x) * 4;
      d[i] = 255;
      d[i + 1] = 255;
      d[i + 2] = 255;
      d[i + 3] = a < 6 ? 0 : a;
    }
  }
  ctx.putImageData(img, 0, 0);
}

/**
 * Keys that should NOT get entity outline (UI chrome, terrain frames, FX).
 */
export function shouldApplyTerrariaEntityPass(key: string): boolean {
  if (key.startsWith('tile-')) return false;
  if (key.startsWith('at-')) return false; // autotile / shore terrain frames
  if (key.startsWith('cground_') || key.startsWith('cwater_')) return false;
  if (key.startsWith('icon_') || key.startsWith('rack_')) return false;
  if (key === 'light_cookie') return false;
  if (key.startsWith('mapz_')) return false;
  if (key === 'particle' || key === 'particle-hit') return false;
  if (key.startsWith('precip_')) return false;
  if (key.startsWith('proj-') || key.startsWith('slash') || key === 'sword-swing')
    return false;
  if (key.startsWith('slot_') || key === 'slot_frame') return false;
  // Entity / prop / character sprites — yes
  return true;
}

/**
 * Sparse silhouettes: jagged grow creates black tile-shaped cages.
 * Soft pass only — thin outline, no nibble/grow, no drop shadow.
 */
const SOFT_AMBIENT_KEYS = new Set([
  'koi',
  'crab',
  'seaweed',
  'sign',
  'tumbleweed',
  'hornet',
  'heart',
  'key',
  'palm', // sparse fronds
]);

/** True if key uses soft ambient polish (no jagged). */
export function isSoftAmbientEntityKey(key: string): boolean {
  if (SOFT_AMBIENT_KEYS.has(key)) return true;
  // Dynamic buddy frames stay dense (outline+shadow); not soft ambient
  return false;
}

/**
 * Per-key pass options (Phase D).
 * Soft ambient = outline + light snap only.
 * Dense characters/trees = outline + restrained jagged + drop shadow.
 */
export function terrariaEntityPassOpts(key: string): TerrariaPassOpts {
  const seed = terrariaSeedFromKey(key);
  if (isSoftAmbientEntityKey(key)) {
    return {
      outline: true,
      jagged: false,
      shadow: false,
      snap: true,
      seed,
    };
  }
  // Dense: outline + shadow; jagged on for foliage/creeps (restrained nibble in pass)
  return {
    outline: true,
    jagged: true,
    shadow: true,
    snap: true,
    seed,
  };
}

/** Seed from texture key string. */
export function terrariaSeedFromKey(key: string): number {
  let s = 0;
  for (let i = 0; i < key.length; i++) s = (s * 31 + key.charCodeAt(i)) | 0;
  return Math.abs(s);
}
