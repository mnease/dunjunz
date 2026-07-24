/**
 * Entity pixel polish for Graphics-v2 Phase D (Core Keeper readable silhouettes).
 * Outlines + drop shadows on dense sprites. Pure canvas helpers (no Phaser).
 *
 * Soft ambient (koi/sign/crab…) skips outline/jagged/shadow entirely — stroking
 * sparse silhouettes (or micro flecks in transparent cells) read as zebra hatch.
 *
 * @see docs/graphics-v2-style-bible.md
 * @see docs/graphics-v2-rebuild-plan.md Phase D
 */

import { hash2 } from './fractal-noise';

export const TERRARIA_OUTLINE = '#1a1420';
/** Dark forest rim for foliage — not purple-black sticker stroke. */
export const FOLIAGE_OUTLINE = '#163828';
export const TERRARIA_SHADOW = 'rgba(10, 8, 16, 0.55)';

function opaque(data: Uint8ClampedArray, i: number, aMin = 24): boolean {
  return data[i + 3]! >= aMin;
}

function parseHexColor(color: string): [number, number, number] {
  if (color.startsWith('#') && color.length >= 7) {
    return [
      parseInt(color.slice(1, 3), 16),
      parseInt(color.slice(3, 5), 16),
      parseInt(color.slice(5, 7), 16),
    ];
  }
  return [26, 20, 32];
}

/**
 * 1px dark outline around solid silhouette (Terraria entity read).
 * `cardinal` = only N/E/S/W neighbors (cleaner corners; less thick black steps).
 * `bodyAlphaMin` = alpha needed to count as body (default 24). Use ~160 for
 * foliage so soft contact shadows (rgba black ~0.1–0.25) are not rimmed —
 * otherwise the outline draws a broken green ring under the trunk.
 * Outline is only written into empty / very soft cells (alpha < bodyAlphaMin).
 */
export function applyTerrariaOutline(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  color = TERRARIA_OUTLINE,
  alpha = 255,
  cardinal = false,
  bodyAlphaMin = 24,
): void {
  const img = ctx.getImageData(0, 0, w, h);
  const src = img.data;
  const out = new Uint8ClampedArray(src);
  const [or, og, ob] = parseHexColor(color);
  const a = Math.max(0, Math.min(255, alpha));
  const bodyMin = Math.max(1, Math.min(255, bodyAlphaMin));
  const neigh: [number, number][] = cardinal
    ? [
        [0, -1],
        [1, 0],
        [0, 1],
        [-1, 0],
      ]
    : [
        [-1, -1],
        [0, -1],
        [1, -1],
        [-1, 0],
        [1, 0],
        [-1, 1],
        [0, 1],
        [1, 1],
      ];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      // Skip solid body; also leave soft contact-shadow pixels alone
      if (src[i + 3]! >= bodyMin) continue;
      let edge = false;
      for (const [dx, dy] of neigh) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        if (opaque(src, (ny * w + nx) * 4, bodyMin)) {
          edge = true;
          break;
        }
      }
      if (edge) {
        // Prefer empty cells; if writing into soft shadow, composite under body
        // by using max alpha so rim stays continuous at trunk roots
        const prevA = src[i + 3]!;
        out[i] = or;
        out[i + 1] = og;
        out[i + 2] = ob;
        out[i + 3] = Math.max(a, prevA);
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
  /** Outline hex; foliage uses dark green, not purple-black. */
  outlineColor?: string;
  /** Outline alpha 0–255 (default 255). */
  outlineAlpha?: number;
  /** Cardinal-only neighbors for cleaner corners. */
  outlineCardinal?: boolean;
  /**
   * Min alpha for a pixel to count as solid body when riming.
   * Raise for sprites with soft contact shadows (trees) so the rim hugs
   * trunk/canopy only, not the translucent ground blob.
   */
  outlineBodyAlpha?: number;
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
    outlineColor = TERRARIA_OUTLINE,
    outlineAlpha = 255,
    outlineCardinal = false,
    outlineBodyAlpha = 24,
    jagged = true,
    shadow = true,
    snap = true,
    seed = 0,
  } = opts;
  if (snap) applyTerrariaColorSnap(ctx, w, h, 12);
  // Slightly lower nibble than v1 (0.2 → 0.14) — restrained Phase D silhouettes
  if (jagged) applyTerrariaJaggedEdge(ctx, w, h, seed, 0.14);
  if (shadow) applyTerrariaDropShadow(ctx, w, h, 1, 2, 80);
  if (outline)
    applyTerrariaOutline(
      ctx,
      w,
      h,
      outlineColor,
      outlineAlpha,
      outlineCardinal,
      outlineBodyAlpha,
    );
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
 * Sparse silhouettes: no outline/jagged/shadow — those turn body flecks and
 * thin limbs into zebra hatch / black cages (seen on staging crabs).
 * Soft ambient skips the entity pass entirely (all flags off).
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

/**
 * Foliage already has author dark lobe/edge shading. A purple-black sticker
 * outline + extra drop shadow read as a thick mistaken border (staging trees).
 * Soft dark-green cardinal rim only; no second shadow / color crush.
 */
const FOLIAGE_KEYS = new Set([
  'tree',
  'tree_redwood',
  'cactus',
]);

/** True if key uses soft ambient polish (no outline/jagged/shadow). */
export function isSoftAmbientEntityKey(key: string): boolean {
  if (SOFT_AMBIENT_KEYS.has(key)) return true;
  // Dynamic buddy frames stay dense (outline+shadow); not soft ambient
  return false;
}

/** True if key is foliage (soft green rim, no sticker black). */
export function isFoliageEntityKey(key: string): boolean {
  if (FOLIAGE_KEYS.has(key)) return true;
  if (key.startsWith('tree_')) return true;
  return false;
}

/**
 * Per-key pass options (Phase D).
 * Soft ambient = no entity stroke (draw only + body micro grit).
 * Foliage = dark-green cardinal rim only (author shadow + lobe shade kept).
 * Dense characters = clean outline + light drop shadow (no jagged nibble).
 */
export function terrariaEntityPassOpts(key: string): TerrariaPassOpts {
  const seed = terrariaSeedFromKey(key);
  if (isSoftAmbientEntityKey(key)) {
    return {
      outline: false,
      jagged: false,
      shadow: false,
      snap: false,
      seed,
    };
  }
  if (isFoliageEntityKey(key)) {
    return {
      outline: true,
      outlineColor: FOLIAGE_OUTLINE,
      outlineAlpha: 210,
      // Full 8-neigh for continuous root/canopy rim (cardinal left gaps at base)
      outlineCardinal: false,
      // Soft ground shadow is ~alpha 25–64; only solid trunk/canopy count as body
      outlineBodyAlpha: 160,
      jagged: false,
      shadow: false, // drawTreeSprite already paints ground contact shadow
      snap: false, // keep canopy greens; snap crushed them toward black
      seed,
    };
  }
  // Dense: readable silhouette + contact shadow; jagged off (nibble read as hatch)
  return {
    outline: true,
    jagged: false,
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
