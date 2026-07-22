/**
 * Outdoor surface sunlight: tree cast shadows + drifting cloud shade.
 * Pure helpers — no Phaser. Used when ambient is bright (not dungeon FoW).
 */

/** Normalized sun direction (light comes from NW → shadows fall SE). */
export const SUN_DIR = { x: 0.62, y: 0.48 } as const;

/** Soft dark for ground shade (never pure black). */
export const SHADOW_RGB = 0x0a1420;

export type TreeShadowInput = {
  x: number;
  y: number;
  /** Display scale relative to 1.0 base sprite (e.g. 2.4 for big trees). */
  scale: number;
};

export type CloudBlob = {
  /** Phase offset 0..1 along drift cycle. */
  phase: number;
  /** Size in world px (half-width of soft cookie). */
  radius: number;
  /** Drift speed px/s along primary axis. */
  speed: number;
  /** Vertical lane 0..1 of playfield. */
  lane: number;
  /** Darkness peak 0..1. */
  strength: number;
};

/** Outdoor bright lands where sun + cloud shade apply. */
export function isOutdoorSurface(room: {
  floor?: number;
  dark?: boolean;
  land?: string;
}): boolean {
  if (room.dark === true) return false;
  const f = room.floor ?? 0;
  if (f < 0) return false;
  const land = room.land ?? '';
  // Kingdom interiors stay soft indoor ambient (no cloud parade).
  if (land === 'kingdom' || land === 'village') return false;
  return (
    land === 'surface' ||
    land === 'woodz' ||
    land === 'dezertz' ||
    land === '' ||
    f >= 0
  );
}

/**
 * Cast shadow center for a tree trunk at (x,y).
 * Offset scales with tree height (proxy: scale * baseHeight).
 */
export function castTreeShadowCenter(
  treeX: number,
  treeY: number,
  scale: number,
  sun = SUN_DIR,
  baseHeightPx = 40,
): { x: number; y: number; rx: number; ry: number; alpha: number } {
  const h = baseHeightPx * Math.max(0.8, scale);
  // Shadow falls opposite sun (sun from NW → cast SE)
  const ox = sun.x * h * 0.85;
  const oy = sun.y * h * 0.85;
  const rx = 14 * scale + h * 0.22;
  const ry = 8 * scale + h * 0.08;
  const alpha = Math.min(0.42, 0.18 + scale * 0.08);
  return { x: treeX + ox, y: treeY + oy, rx, ry, alpha };
}

/**
 * Deterministic cloud blob field for a room seed.
 * Blobs drift; clouds themselves are never drawn.
 */
export function makeCloudField(
  seed: number,
  count = 5,
): CloudBlob[] {
  const blobs: CloudBlob[] = [];
  let s = (seed >>> 0) || 1;
  const next = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
  for (let i = 0; i < count; i++) {
    blobs.push({
      phase: next(),
      radius: 90 + next() * 140,
      speed: 12 + next() * 18, // slow crawl
      lane: 0.12 + next() * 0.76,
      strength: 0.12 + next() * 0.14,
    });
  }
  return blobs;
}

/**
 * World positions of cloud shadow soft-centers at time t.
 * Playfield width/height in world px (or screen if scrollFactor 0).
 */
export function cloudShadowCenters(
  blobs: CloudBlob[],
  timeMs: number,
  width: number,
  height: number,
): Array<{ x: number; y: number; radius: number; alpha: number }> {
  const t = Math.max(0, timeMs) / 1000;
  return blobs.map((b) => {
    // Wrap horizontal drift; slight vertical bob
    const span = width + b.radius * 2;
    const x =
      ((b.phase * span + t * b.speed) % span) - b.radius;
    const y =
      b.lane * height + Math.sin(t * 0.15 + b.phase * 6.28) * 18;
    return {
      x,
      y,
      radius: b.radius,
      alpha: b.strength,
    };
  });
}

/**
 * Sample cloud darkness at a point (0 = full sun, 1 = deep shade).
 * Soft radial falloff sum, clamped.
 */
export function sampleCloudDarkness(
  px: number,
  py: number,
  centers: Array<{ x: number; y: number; radius: number; alpha: number }>,
): number {
  let d = 0;
  for (const c of centers) {
    const dx = (px - c.x) / c.radius;
    const dy = (py - c.y) / (c.radius * 0.55); // flatter ellipses
    const r2 = dx * dx + dy * dy;
    if (r2 >= 1) continue;
    const fall = (1 - r2) * (1 - r2); // smooth
    d += c.alpha * fall;
  }
  return Math.max(0, Math.min(0.55, d));
}

/** Tree shadow darkness contribution at a point. */
export function sampleTreeShadowDarkness(
  px: number,
  py: number,
  trees: TreeShadowInput[],
  sun = SUN_DIR,
): number {
  let d = 0;
  for (const tr of trees) {
    const sh = castTreeShadowCenter(tr.x, tr.y, tr.scale, sun);
    const dx = (px - sh.x) / sh.rx;
    const dy = (py - sh.y) / sh.ry;
    const r2 = dx * dx + dy * dy;
    if (r2 >= 1) continue;
    const fall = (1 - r2) * (1 - r2);
    d += sh.alpha * fall;
  }
  return Math.max(0, Math.min(0.5, d));
}

/**
 * Combined surface shade 0..1 (higher = darker veil contribution).
 * Cap keeps combat readable.
 */
export function sampleSurfaceShade(
  px: number,
  py: number,
  trees: TreeShadowInput[],
  cloudCenters: Array<{ x: number; y: number; radius: number; alpha: number }>,
): number {
  const t = sampleTreeShadowDarkness(px, py, trees);
  const c = sampleCloudDarkness(px, py, cloudCenters);
  return Math.max(0, Math.min(0.58, t + c * 0.85));
}

/** Overlay alpha from shade (for soft full-screen contribution if needed). */
export function shadeToOverlayAlpha(shade: number): number {
  return Math.max(0, Math.min(0.45, shade * 0.7));
}
