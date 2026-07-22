/**
 * 32-bit craft density helpers (ART_RES=32) — outlines, faces, hair, blades.
 * EMA council: silhouette first, ≤3 values per form + 1 specular, no muddy face dither.
 */

export function hex(n: number): string {
  return `#${n.toString(16).padStart(6, '0')}`;
}

export function fill(
  ctx: CanvasRenderingContext2D,
  color: string,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

/** Filled rect with a 1px dark outline (reads at distance). */
export function block(
  ctx: CanvasRenderingContext2D,
  fillC: string,
  edgeC: string,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  ctx.fillStyle = edgeC;
  ctx.fillRect(x - 1, y, w + 2, h);
  ctx.fillRect(x, y - 1, w, h + 2);
  ctx.fillStyle = fillC;
  ctx.fillRect(x, y, w, h);
}

/** Top highlight + bottom shadow on a flat color block. */
export function shadedBlock(
  ctx: CanvasRenderingContext2D,
  mid: string,
  light: string,
  dark: string,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  ctx.fillStyle = mid;
  ctx.fillRect(x, y, w, h);
  if (h >= 2) {
    ctx.fillStyle = light;
    ctx.fillRect(x, y, w, 1);
    ctx.fillStyle = dark;
    ctx.fillRect(x, y + h - 1, w, 1);
  }
  if (w >= 2) {
    ctx.fillStyle = light;
    ctx.fillRect(x, y, 1, h);
    ctx.fillStyle = dark;
    ctx.fillRect(x + w - 1, y, 1, h);
  }
}

/** Checker dither between two colors (fabric / stone grit). */
export function dither(
  ctx: CanvasRenderingContext2D,
  a: string,
  b: string,
  x: number,
  y: number,
  w: number,
  h: number,
  phase = 0,
): void {
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      ctx.fillStyle = (i + j + phase) % 2 === 0 ? a : b;
      ctx.fillRect(x + i, y + j, 1, 1);
    }
  }
}

/** Sparse grit dots (not full checker — cheaper / less noisy). */
export function grit(
  ctx: CanvasRenderingContext2D,
  color: string,
  x: number,
  y: number,
  w: number,
  h: number,
  step = 3,
  phase = 0,
): void {
  ctx.fillStyle = color;
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      if ((i * 3 + j * 5 + phase) % step === 0) {
        ctx.fillRect(x + i, y + j, 1, 1);
      }
    }
  }
}

/** Vertical band gradient (top→bottom colors). */
export function vgrad(
  ctx: CanvasRenderingContext2D,
  colors: string[],
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  if (colors.length === 0 || h <= 0) return;
  for (let j = 0; j < h; j++) {
    const t = colors.length === 1 ? 0 : j / (h - 1 || 1);
    const idx = Math.min(colors.length - 1, Math.floor(t * (colors.length - 1)));
    ctx.fillStyle = colors[idx]!;
    ctx.fillRect(x, y + j, w, 1);
  }
}

/** Soft specular dot. */
export function spark(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color = '#ffffff',
): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 1, 1);
}

/** 1px dark outline ring around a filled rect (outer silhouette). */
export function outline(
  ctx: CanvasRenderingContext2D,
  edgeC: string,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  ctx.fillStyle = edgeC;
  ctx.fillRect(x - 1, y, w + 2, 1);
  ctx.fillRect(x - 1, y + h - 1, w + 2, 1);
  ctx.fillRect(x - 1, y, 1, h);
  ctx.fillRect(x + w, y, 1, h);
}

/**
 * Cartoon hero face band (EMA: big eyes + catchlight + small smile + blush).
 * Face rect is typically ~10–12 × 8–9 on a 32 canvas.
 */
export function cartoonFace(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  opts?: { squint?: boolean; soft?: boolean },
): void {
  const skin = '#f0c8a4';
  const skinHi = '#ffe0c8';
  const skinSh = '#c09070';
  const edge = '#6a4030';
  // head mass
  ctx.fillStyle = edge;
  ctx.fillRect(x - 1, y, w + 2, h);
  ctx.fillRect(x, y - 1, w, h + 2);
  shadedBlock(ctx, skin, skinHi, skinSh, x, y, w, h);
  // cheek blush (solid, not dither)
  fill(ctx, opts?.soft ? 'rgba(255,150,160,0.55)' : 'rgba(255,120,140,0.4)', x + 1, y + h - 3, 2, 1);
  fill(ctx, opts?.soft ? 'rgba(255,150,160,0.55)' : 'rgba(255,120,140,0.4)', x + w - 3, y + h - 3, 2, 1);
  // eyes — large cartoon ovals
  const eyeY = y + Math.max(2, Math.floor(h * 0.35));
  const leftEx = x + 2;
  const rightEx = x + w - 5;
  if (opts?.squint) {
    fill(ctx, '#1a1a2e', leftEx, eyeY + 1, 3, 1);
    fill(ctx, '#1a1a2e', rightEx, eyeY + 1, 3, 1);
  } else {
    // sclera
    fill(ctx, '#ffffff', leftEx, eyeY, 3, 3);
    fill(ctx, '#ffffff', rightEx, eyeY, 3, 3);
    // iris
    fill(ctx, '#2a3a6a', leftEx + 1, eyeY + 1, 2, 2);
    fill(ctx, '#2a3a6a', rightEx + 1, eyeY + 1, 2, 2);
    // catchlight
    spark(ctx, leftEx + 1, eyeY, '#ffffff');
    spark(ctx, rightEx + 1, eyeY, '#ffffff');
    // brows
    fill(ctx, '#3d2b1f', leftEx, eyeY - 1, 3, 1);
    fill(ctx, '#3d2b1f', rightEx, eyeY - 1, 3, 1);
  }
  // smile
  const my = y + h - 2;
  fill(ctx, '#c07070', x + Math.floor(w / 2) - 2, my, 4, 1);
  fill(ctx, '#e09090', x + Math.floor(w / 2) - 1, my, 2, 1);
}

/**
 * Hair mass over a head: crown bulk + bangs + side locks + 1 specular streak.
 * hairColor mid; dark/light derived.
 */
export function hairMass(
  ctx: CanvasRenderingContext2D,
  headX: number,
  headY: number,
  headW: number,
  opts?: { color?: string; bangs?: boolean },
): void {
  const mid = opts?.color ?? '#3d2b1f';
  const dark = '#1a1008';
  const light = '#6b4423';
  // crown / undercut silhouette
  fill(ctx, dark, headX - 1, headY - 3, headW + 2, 4);
  fill(ctx, mid, headX, headY - 4, headW, 5);
  fill(ctx, mid, headX - 1, headY - 1, 2, 6); // left lock
  fill(ctx, mid, headX + headW - 1, headY - 1, 2, 6); // right lock
  fill(ctx, dark, headX - 1, headY + 2, 1, 3);
  fill(ctx, dark, headX + headW, headY + 2, 1, 3);
  // bangs breaking the forehead
  if (opts?.bangs !== false) {
    fill(ctx, mid, headX + 1, headY, 3, 3);
    fill(ctx, mid, headX + 5, headY, 2, 2);
    fill(ctx, mid, headX + headW - 4, headY, 3, 3);
    fill(ctx, dark, headX + 2, headY + 2, 2, 1);
  }
  // single specular streak (not stripes)
  fill(ctx, light, headX + 3, headY - 3, 2, 1);
  spark(ctx, headX + 4, headY - 3, '#a07840');
}

/**
 * Sharpened blade: mid + edge hilite + dark bevel + bright tip.
 * Vertical blade growing upward from (x, tipY) of height h, width w.
 */
export function bladeVertical(
  ctx: CanvasRenderingContext2D,
  x: number,
  tipY: number,
  w: number,
  h: number,
  mid = '#dfe6f0',
  edge = '#ffffff',
  back = '#607080',
  outlineC = '#3a4050',
): void {
  // outline
  fill(ctx, outlineC, x - 1, tipY, w + 2, h);
  // body
  fill(ctx, mid, x, tipY + 1, w, h - 1);
  // edge hilite (attack side = left)
  fill(ctx, edge, x, tipY + 2, 1, Math.max(2, h - 4));
  // back bevel
  fill(ctx, back, x + w - 1, tipY + 2, 1, Math.max(2, h - 4));
  // tip wedge
  fill(ctx, mid, x, tipY, w, 2);
  fill(ctx, edge, x + Math.floor(w / 2) - 1, tipY, 2, 1);
  spark(ctx, x + Math.floor(w / 2), tipY, '#ffffff');
}

/** Cross-guard + grip + pommel under a blade. */
export function hiltBelow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  y: number,
  guardW = 9,
): void {
  fill(ctx, '#8a6820', cx - Math.floor(guardW / 2), y, guardW, 2);
  fill(ctx, '#c9a227', cx - Math.floor(guardW / 2) + 1, y, guardW - 2, 1);
  fill(ctx, '#5a3d1a', cx - 1, y + 2, 3, 5);
  fill(ctx, '#8b5a2b', cx, y + 2, 1, 4);
  fill(ctx, '#c9a227', cx - 1, y + 6, 3, 2);
  spark(ctx, cx, y + 6, '#fff3a0');
}

/** One cobble stone with bevel + optional chip. */
function cobble(
  ctx: CanvasRenderingContext2D,
  mid: string,
  light: string,
  dark: string,
  x: number,
  y: number,
  w: number,
  h: number,
  chip = false,
): void {
  shadedBlock(ctx, mid, light, dark, x, y, w, h);
  // inner face (depth)
  if (w > 4 && h > 4) {
    fill(ctx, mid, x + 1, y + 1, w - 2, h - 2);
    fill(ctx, light, x + 1, y + 1, w - 3, 1);
    fill(ctx, dark, x + 1, y + h - 2, w - 2, 1);
  }
  if (chip && w > 5 && h > 5) {
    fill(ctx, dark, x + w - 3, y + 2, 2, 1);
    fill(ctx, light, x + 2, y + h - 3, 2, 1);
  }
}

/**
 * SNES castle brick wall — 3 staggered rows, mortar grit, chips, moss.
 * Designed for ART_RES 32 (also works at other even sizes).
 */
export function drawBrickTile(
  ctx: CanvasRenderingContext2D,
  s: number,
  base: string,
  face: string,
  mortar: string,
  hilite: string,
): void {
  // mortar bed
  fill(ctx, mortar, 0, 0, s, s);
  dither(ctx, mortar, base, 0, 0, s, s, 0);

  const rows = 3;
  const rowH = Math.floor(s / rows);
  const faceDim = face; // mid
  const faceDeep = base;
  const faceLite = hilite;
  // slight face variants for brick individuality
  const variants: [string, string, string][] = [
    [faceDim, faceLite, faceDeep],
    ['#6a5a88', '#8a7ab0', '#3a3058'],
    ['#54486e', '#7a6a98', '#322848'],
    ['#625478', '#8a7aa0', '#3a3048'],
  ];

  for (let r = 0; r < rows; r++) {
    const y = r * rowH;
    const offset = r % 2 === 1;
    const brickH = rowH - 1;
    if (offset) {
      // half-brick left
      const half = Math.floor(s / 2) - 1;
      const v0 = variants[(r + 0) % variants.length]!;
      cobble(ctx, v0[0], v0[1], v0[2], 1, y + 1, half - 1, brickH - 1, true);
      const v1 = variants[(r + 1) % variants.length]!;
      cobble(
        ctx,
        v1[0],
        v1[1],
        v1[2],
        half + 1,
        y + 1,
        s - half - 2,
        brickH - 1,
        r === 1,
      );
    } else {
      // three bricks across for 32px
      const bw = Math.floor((s - 4) / 2);
      const v0 = variants[(r + 2) % variants.length]!;
      cobble(ctx, v0[0], v0[1], v0[2], 1, y + 1, bw, brickH - 1, r === 0);
      const v1 = variants[(r + 3) % variants.length]!;
      cobble(
        ctx,
        v1[0],
        v1[1],
        v1[2],
        2 + bw,
        y + 1,
        s - 3 - bw,
        brickH - 1,
        true,
      );
    }
    // mortar seam line
    fill(ctx, mortar, 0, y + rowH - 1, s, 1);
  }

  // moss / lichen in mortar
  fill(ctx, 'rgba(70,120,80,0.45)', 4, rowH - 1, 3, 1);
  fill(ctx, 'rgba(70,120,80,0.35)', s - 10, rowH * 2 - 1, 4, 1);
  fill(ctx, 'rgba(90,140,70,0.3)', 14, s - 2, 5, 1);

  // surface grit
  grit(ctx, 'rgba(0,0,0,0.18)', 2, 2, s - 4, s - 4, 5, 1);
  grit(ctx, 'rgba(255,255,255,0.08)', 2, 2, s - 4, s - 4, 7, 3);

  // top cap shadow (reads as wall thickness)
  fill(ctx, 'rgba(0,0,0,0.25)', 0, 0, s, 1);
  fill(ctx, 'rgba(255,255,255,0.12)', 0, 1, s, 1);
}

/**
 * Dungeon cobble floor — irregular stones, cracks, moss, grit.
 * Light from top-left for SNES depth.
 */
export function drawFloorTile(
  ctx: CanvasRenderingContext2D,
  s: number,
  base: string,
  alt: string,
  grout: string,
): void {
  fill(ctx, grout, 0, 0, s, s);
  dither(ctx, grout, '#120e1c', 0, 0, s, s, 1);

  const light = '#5a5078';
  const lightAlt = '#4a4068';
  const dark = '#1a1428';
  const darkAlt = '#221a30';

  // Irregular cobble layout (not a boring 2×2 grid)
  const stones: [number, number, number, number, string, string, string, boolean][] = [
    [1, 1, 10, 9, alt, lightAlt, darkAlt, true],
    [12, 1, 9, 8, base, light, dark, false],
    [22, 1, 9, 10, alt, lightAlt, darkAlt, true],
    [1, 11, 8, 10, base, light, dark, false],
    [10, 10, 12, 9, alt, lightAlt, darkAlt, true],
    [23, 12, 8, 9, base, light, dark, true],
    [1, 22, 11, 9, alt, lightAlt, darkAlt, false],
    [13, 20, 10, 11, base, light, dark, true],
    [24, 22, 7, 9, alt, lightAlt, darkAlt, false],
  ];

  for (const [x, y, w, h, mid, li, da, chip] of stones) {
    if (x + w > s || y + h > s) continue;
    cobble(ctx, mid, li, da, x, y, w, h, chip);
  }

  // cracks (grout channels)
  fill(ctx, grout, 11, 1, 1, 9);
  fill(ctx, grout, 21, 1, 1, 10);
  fill(ctx, grout, 1, 10, 30, 1);
  fill(ctx, grout, 9, 11, 1, 10);
  fill(ctx, grout, 22, 12, 1, 9);
  fill(ctx, grout, 1, 21, 30, 1);
  fill(ctx, grout, 12, 20, 1, 11);

  // hairline fractures
  fill(ctx, dark, 6, 4, 1, 3);
  fill(ctx, dark, 17, 14, 3, 1);
  fill(ctx, dark, 26, 6, 1, 4);

  // moss flecks
  fill(ctx, 'rgba(70,130,90,0.4)', 4, 6, 2, 1);
  fill(ctx, 'rgba(70,130,90,0.35)', 15, 25, 3, 1);
  fill(ctx, 'rgba(90,150,100,0.3)', 27, 18, 2, 2);
  fill(ctx, 'rgba(60,110,80,0.3)', 8, 28, 2, 1);

  // pebble / grit
  grit(ctx, 'rgba(0,0,0,0.2)', 1, 1, s - 2, s - 2, 6, 2);
  spark(ctx, 5, 3, 'rgba(200,190,230,0.35)');
  spark(ctx, 18, 12, 'rgba(200,190,230,0.25)');
  spark(ctx, 28, 24, 'rgba(200,190,230,0.3)');
}

/**
 * Lush meadow grass — multi-tone soil, many blades, flowers, dirt nubs.
 */
export function drawGrassTile(
  ctx: CanvasRenderingContext2D,
  s: number,
  base: string,
  blade: string,
  tip: string,
): void {
  // soil undergrowth
  vgrad(ctx, ['#3a7d52', blade, base, '#245a38', '#1a4028'], 0, 0, s, s);
  dither(ctx, base, '#2a6040', 0, Math.floor(s * 0.55), s, Math.ceil(s * 0.45), 0);
  grit(ctx, 'rgba(40,30,20,0.2)', 0, Math.floor(s * 0.6), s, Math.floor(s * 0.4), 4, 1);

  // dirt nubs / bare patches
  fill(ctx, 'rgba(90,70,45,0.4)', 8, 26, 5, 3);
  fill(ctx, 'rgba(70,55,35,0.35)', 20, 4, 4, 2);
  fill(ctx, 'rgba(100,80,50,0.3)', 2, 18, 3, 2);

  // blades: [x, yBase, height, lean 0|1]
  const blades: [number, number, number, number][] = [
    [2, 10, 8, 0],
    [4, 6, 11, 1],
    [6, 14, 6, 0],
    [8, 4, 12, 1],
    [10, 11, 7, 0],
    [12, 7, 10, 1],
    [14, 15, 5, 0],
    [16, 5, 11, 0],
    [18, 12, 8, 1],
    [20, 3, 13, 0],
    [22, 9, 9, 1],
    [24, 14, 6, 0],
    [26, 6, 10, 1],
    [28, 11, 7, 0],
    [3, 20, 7, 1],
    [7, 22, 5, 0],
    [11, 18, 8, 1],
    [15, 21, 6, 0],
    [19, 19, 9, 1],
    [23, 23, 5, 0],
    [27, 20, 7, 1],
    [5, 16, 6, 0],
    [13, 24, 4, 1],
    [25, 16, 8, 0],
  ];

  for (const [x, y0, h, lean] of blades) {
    if (x >= s) continue;
    for (let i = 0; i < h; i++) {
      const yy = y0 + i;
      if (yy >= s) break;
      const xx = x + (lean ? (i > h / 2 ? 1 : 0) : i % 3 === 2 ? 1 : 0);
      if (xx >= s) continue;
      // tip lighter, base darker
      ctx.fillStyle = i < 2 ? tip : i > h - 3 ? '#1e5030' : blade;
      ctx.fillRect(xx, yy, 1, 1);
    }
    // bright tip pixel
    fill(ctx, '#8ef0a8', x, y0, 1, 1);
  }

  // tiny flowers
  fill(ctx, '#ffc857', 9, 17, 2, 2);
  fill(ctx, '#fff3a0', 9, 17, 1, 1);
  fill(ctx, '#ff6b9d', 21, 13, 2, 2);
  fill(ctx, '#ffb0c8', 21, 13, 1, 1);
  fill(ctx, '#c9a0ff', 15, 27, 2, 1);

  // shadow edge (reads as turf depth)
  fill(ctx, 'rgba(0,0,0,0.12)', 0, s - 1, s, 1);
}

/**
 * Packed trail dirt — ruts, pebbles, packed earth clumps.
 */
export function drawDirtTile(
  ctx: CanvasRenderingContext2D,
  s: number,
  mid: string,
): void {
  vgrad(ctx, ['#8a7564', mid, '#5a4538', '#4a3830'], 0, 0, s, s);
  dither(ctx, mid, '#5a4538', 0, 0, s, s, 1);

  // packed clumps
  cobble(ctx, '#7a6554', '#9a8574', '#4a3830', 2, 3, 9, 7, true);
  cobble(ctx, '#6b5344', '#8a7564', '#3a2820', 13, 2, 8, 8, false);
  cobble(ctx, '#7a6554', '#9a8574', '#4a3830', 22, 4, 8, 6, true);
  cobble(ctx, '#5a4538', '#7a6554', '#3a2820', 4, 14, 10, 8, false);
  cobble(ctx, '#6b5344', '#8a7564', '#3a2820', 16, 13, 12, 7, true);
  cobble(ctx, '#7a6554', '#9a8574', '#4a3830', 3, 23, 11, 7, true);
  cobble(ctx, '#5a4538', '#7a6554', '#3a2820', 17, 22, 12, 8, false);

  // wagon / foot ruts
  fill(ctx, 'rgba(40,28,20,0.45)', 0, 11, s, 1);
  fill(ctx, 'rgba(40,28,20,0.35)', 0, 20, s, 1);
  fill(ctx, 'rgba(100,85,70,0.25)', 0, 12, s, 1);

  // pebbles
  fill(ctx, '#9a9080', 7, 8, 2, 2);
  fill(ctx, '#6a6050', 7, 9, 2, 1);
  fill(ctx, '#b0a898', 24, 16, 2, 2);
  fill(ctx, '#8a8070', 14, 26, 3, 2);
  fill(ctx, '#c0b8a8', 28, 7, 2, 1);

  grit(ctx, 'rgba(0,0,0,0.15)', 1, 1, s - 2, s - 2, 5, 0);
  spark(ctx, 8, 8, 'rgba(220,210,190,0.4)');
}

/**
 * Water tile — depth bands, foam, ripples. `phase` 0|1 for animation frames.
 */
export function drawWaterTile(
  ctx: CanvasRenderingContext2D,
  s: number,
  mid: string,
  phase = 0,
): void {
  const deep = '#1a4068';
  const shallow = phase === 0 ? '#3d7eb0' : '#4a8ec0';
  const foam = phase === 0 ? 'rgba(200,230,255,0.55)' : 'rgba(220,240,255,0.5)';
  vgrad(ctx, [shallow, mid, '#245a88', deep], 0, 0, s, s);

  // depth mottling
  dither(ctx, mid, deep, 0, Math.floor(s * 0.4), s, Math.ceil(s * 0.6), phase);

  // ripple arcs (shifted by phase)
  const ox = phase * 4;
  fill(ctx, foam, 4 + ox, 6, 10, 2);
  fill(ctx, 'rgba(255,255,255,0.35)', 6 + ox, 7, 6, 1);
  fill(ctx, foam, 14 - ox, 14, 12, 2);
  fill(ctx, 'rgba(255,255,255,0.3)', 16 - ox, 15, 8, 1);
  fill(ctx, foam, 2 + ox, 22, 9, 2);
  fill(ctx, foam, 18 - ox, 8, 8, 1);

  // dark troughs
  fill(ctx, deep, 2, 12, 8, 1);
  fill(ctx, deep, 18, 20, 10, 1);
  fill(ctx, deep, 10, 4, 6, 1);

  // edge foam
  fill(ctx, 'rgba(180,220,255,0.25)', 0, 0, s, 1);
  fill(ctx, 'rgba(0,0,0,0.15)', 0, s - 1, s, 1);

  spark(ctx, 10 + ox, 8, '#e8f8ff');
  spark(ctx, 22 - ox, 16, '#ffffff');
  spark(ctx, 8 + ox, 24, 'rgba(255,255,255,0.7)');
}

/**
 * Lava — crust, hot pools, cracks, bubbles. `phase` for animation.
 */
export function drawLavaTile(
  ctx: CanvasRenderingContext2D,
  s: number,
  mid: string,
  phase = 0,
): void {
  const crust = '#6a1808';
  const hot = phase === 0 ? '#ff8a4c' : '#ffaa55';
  const core = phase === 0 ? '#ffcc66' : '#ffe08a';
  vgrad(ctx, [hot, mid, '#a03018', crust], 0, 0, s, s);
  dither(ctx, mid, crust, 0, 0, s, s, phase);

  // dark crust plates
  cobble(ctx, '#8a2810', '#c04020', '#4a1008', 1, 1, 12, 10, true);
  cobble(ctx, '#7a2010', '#b03818', '#3a0c08', 16, 3, 14, 9, false);
  cobble(ctx, '#6a1808', '#a03018', '#3a0c08', 2, 14, 10, 10, true);
  cobble(ctx, '#8a2810', '#c04020', '#4a1008', 14, 15, 16, 8, false);
  cobble(ctx, '#7a2010', '#b03818', '#3a0c08', 4, 24, 14, 7, true);
  cobble(ctx, '#6a1808', '#a03018', '#3a0c08', 20, 23, 10, 8, false);

  // glowing cracks
  const glow = phase === 0 ? core : '#fff0a0';
  fill(ctx, glow, 12, 2, 2, 12);
  fill(ctx, hot, 12, 2, 1, 12);
  fill(ctx, glow, 3, 12, 20, 2);
  fill(ctx, hot, 3, 13, 20, 1);
  fill(ctx, glow, 18, 14, 2, 10);
  fill(ctx, core, 8, 22, 8, 2);

  // hot pools
  fill(ctx, core, 6 + phase * 2, 6, 5, 4);
  fill(ctx, '#fff8c0', 7 + phase * 2, 7, 2, 2);
  fill(ctx, core, 20 - phase * 2, 18, 6, 4);
  fill(ctx, '#fff8c0', 21 - phase * 2, 19, 2, 1);

  spark(ctx, 8 + phase, 8, '#ffffff');
  spark(ctx, 22 - phase, 20, '#ffe08a');
  fill(ctx, 'rgba(255,100,40,0.25)', 0, 0, s, 1);
}
