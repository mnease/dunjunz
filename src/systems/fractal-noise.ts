/**
 * Deterministic fractal noise for terrain variation.
 * Value noise + fBm (fractal Brownian motion) — pure, no Phaser.
 *
 * Used so grass / dirt / stone / snow tiles keep their authored kinds &
 * positions but no longer stamp the same 3 square patterns forever.
 */

/** Integer hash → [0, 1). */
export function hash2(x: number, y: number, seed = 0): number {
  let n = (x | 0) * 374761393 + (y | 0) * 668265263 + (seed | 0) * 1274126177;
  n = (n ^ (n >>> 13)) * 1274126177;
  n = n ^ (n >>> 16);
  return (n >>> 0) / 4294967296;
}

/** Smoothstep */
function fade(t: number): number {
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Value noise at continuous coords. Range roughly [-1, 1].
 */
export function valueNoise2(x: number, y: number, seed = 0): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const xf = fade(x - x0);
  const yf = fade(y - y0);
  const v00 = hash2(x0, y0, seed) * 2 - 1;
  const v10 = hash2(x0 + 1, y0, seed) * 2 - 1;
  const v01 = hash2(x0, y0 + 1, seed) * 2 - 1;
  const v11 = hash2(x0 + 1, y0 + 1, seed) * 2 - 1;
  const x1 = lerp(v00, v10, xf);
  const x2 = lerp(v01, v11, xf);
  return lerp(x1, x2, yf);
}

/**
 * Fractal Brownian motion — layered value noise.
 * @param octaves typically 3–5
 * @returns roughly [-1, 1]
 */
export function fbm2(
  x: number,
  y: number,
  seed = 0,
  octaves = 4,
  lacunarity = 2,
  gain = 0.5,
): number {
  let amp = 1;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise2(x * freq, y * freq, seed + i * 1013);
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return norm > 0 ? sum / norm : 0;
}

/** Map fBm ∈ [-1,1] → [0, 1]. */
export function fbm01(
  x: number,
  y: number,
  seed = 0,
  octaves = 4,
): number {
  return (fbm2(x, y, seed, octaves) + 1) * 0.5;
}

/**
 * Stable terrain style index for a world cell.
 * Low frequency → large coherent patches (fluid regions, not checkerboard).
 */
export function fractalTerrainVariant(
  worldX: number,
  worldY: number,
  variants: number,
  seed = 1337,
): number {
  const n = variants | 0;
  if (n <= 1) return 0;
  // Regional style (large swirls)
  const regional = fbm01(worldX * 0.11, worldY * 0.11, seed, 4);
  // Local break-up so adjacent cells aren't identical
  const local = fbm01(worldX * 0.37 + 9.1, worldY * 0.37 - 3.7, seed + 17, 2);
  const mixed = regional * 0.72 + local * 0.28;
  return Math.min(n - 1, Math.floor(mixed * n));
}

/**
 * Subtle per-cell tint multiplier for continuous fluid color drift.
 * Returns RGB 0xRRGGBB around white (0xffffff).
 */
export function fractalTerrainTint(
  worldX: number,
  worldY: number,
  seed = 42,
): number {
  const rN = fbm01(worldX * 0.23, worldY * 0.23, seed, 3);
  const gN = fbm01(worldX * 0.23 + 40, worldY * 0.23, seed + 3, 3);
  const bN = fbm01(worldX * 0.23, worldY * 0.23 + 40, seed + 7, 3);
  // Keep subtle: ±8% channel drift
  const r = Math.round(255 * (0.92 + rN * 0.16));
  const g = Math.round(255 * (0.92 + gN * 0.16));
  const b = Math.round(255 * (0.92 + bN * 0.16));
  return (
    (Math.min(255, Math.max(0, r)) << 16) |
    (Math.min(255, Math.max(0, g)) << 8) |
    Math.min(255, Math.max(0, b))
  );
}

/** Deterministic room seed from id string. */
export function seedFromString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** How many pre-baked fractal terrain variants we generate per kind. */
export const TERRAIN_VARIANT_COUNT = 16;

/**
 * World-space cell coords so adjacent rooms share coherent noise fields
 * when mapX/mapY are set; falls back to local tile indices.
 */
export function worldCell(
  tileX: number,
  tileY: number,
  mapX?: number,
  mapY?: number,
  floor = 0,
): { wx: number; wy: number } {
  const mx = mapX ?? 0;
  const my = mapY ?? 0;
  // Stretch map cell so rooms don't re-use the same noise patch
  return {
    wx: mx * 17 + tileX + floor * 3,
    wy: my * 13 + tileY - floor * 5,
  };
}
