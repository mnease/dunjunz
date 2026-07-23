/**
 * Pixel craft helpers (author unit ART_BASE=32, textures ART_RES=64).
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
  // soft nose bridge shadow
  fill(ctx, skinSh, x + Math.floor(w / 2) - 1, y + Math.floor(h * 0.55), 2, 1);
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
    // iris + pupil
    fill(ctx, '#2a3a6a', leftEx + 1, eyeY + 1, 2, 2);
    fill(ctx, '#2a3a6a', rightEx + 1, eyeY + 1, 2, 2);
    fill(ctx, '#0a0a14', leftEx + 1, eyeY + 2, 1, 1);
    fill(ctx, '#0a0a14', rightEx + 1, eyeY + 2, 1, 1);
    // catchlight
    spark(ctx, leftEx + 1, eyeY, '#ffffff');
    spark(ctx, rightEx + 1, eyeY, '#ffffff');
    // brows
    fill(ctx, '#3d2b1f', leftEx, eyeY - 1, 3, 1);
    fill(ctx, '#3d2b1f', rightEx, eyeY - 1, 3, 1);
  }
  // smile + lower lip hint
  const my = y + h - 2;
  fill(ctx, '#c07070', x + Math.floor(w / 2) - 2, my, 4, 1);
  fill(ctx, '#e09090', x + Math.floor(w / 2) - 1, my, 2, 1);
  fill(ctx, skinHi, x + Math.floor(w / 2) - 1, my - 1, 2, 1);
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
  // volume clumps on crown
  fill(ctx, dark, headX + 2, headY - 4, 2, 2);
  fill(ctx, dark, headX + headW - 4, headY - 3, 2, 1);
  // bangs breaking the forehead
  if (opts?.bangs !== false) {
    fill(ctx, mid, headX + 1, headY, 3, 3);
    fill(ctx, mid, headX + 5, headY, 2, 2);
    fill(ctx, mid, headX + headW - 4, headY, 3, 3);
    fill(ctx, dark, headX + 2, headY + 2, 2, 1);
    fill(ctx, light, headX + 3, headY + 1, 1, 1);
  }
  // single specular streak (not stripes)
  fill(ctx, light, headX + 3, headY - 3, 2, 1);
  spark(ctx, headX + 4, headY - 3, '#a07840');
  spark(ctx, headX + headW - 3, headY - 2, light);
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

/** One cobble stone with bevel, grain, optional chip. */
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
    // micro grain / mineral flecks
    if (w > 6 && h > 6) {
      fill(ctx, light, x + 2, y + 2, 1, 1);
      fill(ctx, dark, x + w - 3, y + Math.floor(h / 2), 1, 1);
      if (w > 8) fill(ctx, light, x + Math.floor(w / 2), y + 3, 1, 1);
    }
  }
  if (chip && w > 5 && h > 5) {
    fill(ctx, dark, x + w - 3, y + 2, 2, 1);
    fill(ctx, light, x + 2, y + h - 3, 2, 1);
  }
}

/**
 * SNES castle brick wall — staggered irregular bricks, top face cap for depth.
 * `variant` 0–2 shifts brick layout so walls don't read as a square grid.
 */
export function drawBrickTile(
  ctx: CanvasRenderingContext2D,
  s: number,
  base: string,
  face: string,
  mortar: string,
  hilite: string,
  variant = 0,
): void {
  // mortar bed
  fill(ctx, mortar, 0, 0, s, s);
  dither(ctx, mortar, base, 0, 0, s, s, variant);

  // Top bevel face (pseudo-3D wall crown) — light from NW
  const capH = 4;
  vgrad(ctx, [hilite, face, base, mortar], 0, 0, s, capH);
  fill(ctx, 'rgba(255,255,255,0.2)', 0, 0, s, 1);
  fill(ctx, 'rgba(0,0,0,0.35)', 0, capH - 1, s, 1);
  // Soft drop-shadow under cap onto face
  fill(ctx, 'rgba(0,0,0,0.22)', 0, capH, s, 2);

  const rows = 3;
  const bodyH = s - capH;
  const rowH = Math.floor(bodyH / rows);
  const faceDim = face;
  const faceDeep = base;
  const faceLite = hilite;
  const variants: [string, string, string][] = [
    [faceDim, faceLite, faceDeep],
    ['#6a5a88', '#8a7ab0', '#3a3058'],
    ['#54486e', '#7a6a98', '#322848'],
    ['#625478', '#8a7aa0', '#3a3048'],
    ['#5a4a72', '#7a6a92', '#2e2440'],
  ];
  const shift = variant % 3;

  for (let r = 0; r < rows; r++) {
    const y = capH + r * rowH;
    const offset = (r + shift) % 2 === 1;
    const brickH = Math.max(3, rowH - 1);
    // Irregular brick widths (organic seams, not perfect halves)
    const jitter = ((r + variant) % 3) - 1;
    if (offset) {
      const half = Math.floor(s / 2) - 1 + jitter;
      const v0 = variants[(r + shift) % variants.length]!;
      cobble(ctx, v0[0], v0[1], v0[2], 1, y + 1, Math.max(4, half - 1), brickH - 1, true);
      const v1 = variants[(r + shift + 1) % variants.length]!;
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
      const bw = Math.floor((s - 4) / 2) + jitter;
      const v0 = variants[(r + shift + 2) % variants.length]!;
      cobble(ctx, v0[0], v0[1], v0[2], 1, y + 1, Math.max(5, bw), brickH - 1, r === 0);
      const v1 = variants[(r + shift + 3) % variants.length]!;
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
    fill(ctx, mortar, 0, y + rowH - 1, s, 1);
  }

  // moss / lichen in mortar + chips
  fill(ctx, 'rgba(70,120,80,0.45)', 4 + shift, capH + rowH - 1, 3, 1);
  fill(ctx, 'rgba(70,120,80,0.35)', s - 10 - shift, capH + rowH * 2 - 1, 4, 1);
  fill(ctx, 'rgba(90,140,70,0.3)', 14, s - 2, 5, 1);
  fill(ctx, 'rgba(80,130,90,0.35)', 8, capH + 2, 2, 2);
  fill(ctx, 'rgba(100,150,80,0.25)', s - 8, capH + rowH + 2, 3, 1);
  // mortar grit + cracks
  fill(ctx, 'rgba(0,0,0,0.25)', 10 + shift, capH + rowH, 4, 1);
  fill(ctx, 'rgba(0,0,0,0.2)', 18, capH + rowH * 2, 3, 1);
  fill(ctx, 'rgba(255,255,255,0.08)', 6, capH + 1, 5, 1);

  grit(ctx, 'rgba(0,0,0,0.18)', 2, capH + 1, s - 4, s - capH - 3, 4, 1 + variant);
  grit(ctx, 'rgba(255,255,255,0.08)', 2, capH + 1, s - 4, s - capH - 3, 6, 3);
  spark(ctx, 8 + shift, capH + 3, 'rgba(200,190,230,0.25)');

  // Bottom ground contact shadow (wall sits on floor)
  fill(ctx, 'rgba(0,0,0,0.28)', 0, s - 1, s, 1);
  fill(ctx, 'rgba(0,0,0,0.12)', 1, s - 2, s - 2, 1);
}

/**
 * Dungeon cobble floor — irregular stones, soft depth, non-grid seams.
 * `variant` 0–2 rotates stone layout so neighbors don't tile as a checker.
 */
export function drawFloorTile(
  ctx: CanvasRenderingContext2D,
  s: number,
  base: string,
  alt: string,
  grout: string,
  variant = 0,
): void {
  fill(ctx, grout, 0, 0, s, s);
  dither(ctx, grout, '#120e1c', 0, 0, s, s, variant);

  const light = '#5a5078';
  const lightAlt = '#4a4068';
  const dark = '#1a1428';
  const darkAlt = '#221a30';

  // Offset layouts so adjacent tiles break the square grid read
  const layouts: [number, number, number, number, string, string, string, boolean][][] = [
    [
      [1, 1, 11, 8, alt, lightAlt, darkAlt, true],
      [13, 2, 10, 9, base, light, dark, false],
      [24, 1, 7, 11, alt, lightAlt, darkAlt, true],
      [2, 10, 9, 11, base, light, dark, false],
      [12, 12, 11, 8, alt, lightAlt, darkAlt, true],
      [24, 13, 7, 8, base, light, dark, true],
      [1, 22, 12, 9, alt, lightAlt, darkAlt, false],
      [14, 21, 9, 10, base, light, dark, true],
      [24, 22, 7, 9, alt, lightAlt, darkAlt, false],
    ],
    [
      [2, 2, 8, 10, base, light, dark, false],
      [11, 1, 12, 8, alt, lightAlt, darkAlt, true],
      [24, 2, 7, 9, base, light, dark, true],
      [1, 13, 11, 8, alt, lightAlt, darkAlt, false],
      [13, 10, 9, 12, base, light, dark, true],
      [23, 12, 8, 10, alt, lightAlt, darkAlt, false],
      [2, 22, 9, 9, base, light, dark, true],
      [12, 23, 11, 8, alt, lightAlt, darkAlt, false],
      [24, 23, 7, 8, base, light, dark, true],
    ],
    [
      [1, 2, 10, 9, alt, lightAlt, darkAlt, true],
      [12, 1, 8, 11, base, light, dark, false],
      [21, 2, 10, 8, alt, lightAlt, darkAlt, true],
      [1, 12, 7, 10, base, light, dark, true],
      [9, 13, 13, 8, alt, lightAlt, darkAlt, false],
      [23, 11, 8, 11, base, light, dark, false],
      [2, 23, 10, 8, alt, lightAlt, darkAlt, true],
      [13, 22, 10, 9, base, light, dark, false],
      [24, 23, 7, 8, alt, lightAlt, darkAlt, true],
    ],
  ];
  const stones = layouts[variant % layouts.length]!;

  for (const [x, y, w, h, mid, li, da, chip] of stones) {
    if (x + w > s || y + h > s) continue;
    cobble(ctx, mid, li, da, x, y, w, h, chip);
  }

  // Soft ambient occlusion in crooks (depth, not flat grout grid)
  fill(ctx, 'rgba(0,0,0,0.18)', 11, 9, 2, 2);
  fill(ctx, 'rgba(0,0,0,0.14)', 22, 11, 2, 2);
  fill(ctx, 'rgba(0,0,0,0.12)', 8, 21, 3, 1);
  fill(ctx, 'rgba(0,0,0,0.1)', 16, 16, 2, 2);
  fill(ctx, 'rgba(0,0,0,0.1)', 25, 20, 2, 1);

  // hairline fractures (diagonal-ish, not full cross grid)
  fill(ctx, dark, 6 + variant, 4, 1, 3);
  fill(ctx, dark, 17, 14 + (variant % 2), 3, 1);
  fill(ctx, dark, 26 - variant, 6, 1, 4);
  fill(ctx, dark, 9, 18, 1, 2);
  fill(ctx, dark, 19, 7, 2, 1);
  fill(ctx, dark, 14, 22, 1, 3);
  fill(ctx, dark, 3, 15, 2, 1);

  // moss flecks + wet glints
  fill(ctx, 'rgba(70,130,90,0.4)', 4 + variant, 6, 2, 1);
  fill(ctx, 'rgba(70,130,90,0.35)', 15, 25 - variant, 3, 1);
  fill(ctx, 'rgba(90,150,100,0.3)', 27, 18, 2, 2);
  fill(ctx, 'rgba(60,110,80,0.3)', 8, 28, 2, 1);
  fill(ctx, 'rgba(90,150,100,0.25)', 22, 4, 2, 1);
  fill(ctx, 'rgba(70,130,90,0.3)', 12, 12, 1, 2);

  // pebble litter
  fill(ctx, light, 7, 8, 2, 1);
  fill(ctx, dark, 7, 9, 2, 1);
  fill(ctx, lightAlt, 20, 26, 2, 1);

  grit(ctx, 'rgba(0,0,0,0.2)', 1, 1, s - 2, s - 2, 5, 2 + variant);
  grit(ctx, 'rgba(255,255,255,0.06)', 2, 2, s - 4, s - 4, 7, 1 + variant);
  spark(ctx, 5 + variant, 3, 'rgba(200,190,230,0.35)');
  spark(ctx, 18, 12, 'rgba(200,190,230,0.25)');
  spark(ctx, 28 - variant, 24, 'rgba(200,190,230,0.3)');
  spark(ctx, 11, 19, 'rgba(180,170,220,0.3)');

  // Subtle ground plane shadow along south edge
  fill(ctx, 'rgba(0,0,0,0.12)', 0, s - 1, s, 1);
  fill(ctx, 'rgba(0,0,0,0.06)', 0, s - 2, s, 1);
}

/**
 * Lush meadow grass — multi-tone soil, clumpy turf, blades, flowers.
 * `variant` shifts clumps/blades so the meadow is not a square carpet.
 */
export function drawGrassTile(
  ctx: CanvasRenderingContext2D,
  s: number,
  base: string,
  blade: string,
  tip: string,
  variant = 0,
): void {
  // Soft undulating soil (not flat green square)
  vgrad(ctx, ['#3a7d52', blade, base, '#245a38', '#1a4028'], 0, 0, s, s);
  dither(ctx, base, '#2a6040', 0, Math.floor(s * 0.55), s, Math.ceil(s * 0.45), variant);

  // Organic turf mounds (overlap edges so tiles blend)
  const mounds: [number, number, number, number][] = [
    [2 + variant, 4, 14, 10],
    [12, 2 + (variant % 2), 16, 12],
    [0, 14, 18, 10],
    [16 - variant, 16, 14, 12],
    [6, 20, 12, 10],
  ];
  for (const [mx, my, mw, mh] of mounds) {
    fill(ctx, 'rgba(50,120,70,0.35)', mx, my, mw, mh);
    fill(ctx, 'rgba(90,180,110,0.18)', mx + 2, my + 1, Math.max(2, mw - 4), 2);
    fill(ctx, 'rgba(20,50,30,0.2)', mx + 1, my + mh - 2, mw - 2, 2);
  }

  grit(ctx, 'rgba(40,30,20,0.2)', 0, Math.floor(s * 0.6), s, Math.floor(s * 0.4), 4, 1 + variant);
  grit(ctx, 'rgba(90,180,100,0.12)', 0, 0, s, Math.floor(s * 0.5), 5, 2 + variant);

  // dirt nubs / bare patches (offset per variant)
  fill(ctx, 'rgba(90,70,45,0.4)', 8 + variant * 2, 26, 5, 3);
  fill(ctx, 'rgba(70,55,35,0.35)', 20 - variant, 4 + variant, 4, 2);
  fill(ctx, 'rgba(100,80,50,0.3)', 2, 18, 3, 2);
  fill(ctx, 'rgba(80,60,40,0.3)', 14, 8, 3, 2);
  // pebbles
  fill(ctx, '#9a9080', 11, 22, 2, 1);
  fill(ctx, '#6a6050', 11, 23, 2, 1);
  fill(ctx, '#a09888', 24, 14, 2, 1);

  const bladeSets: [number, number, number, number][][] = [
    [
      [2, 10, 8, 0], [4, 6, 11, 1], [6, 14, 6, 0], [8, 4, 12, 1],
      [10, 11, 7, 0], [12, 7, 10, 1], [14, 15, 5, 0], [16, 5, 11, 0],
      [18, 12, 8, 1], [20, 3, 13, 0], [22, 9, 9, 1], [24, 14, 6, 0],
      [26, 6, 10, 1], [28, 11, 7, 0], [3, 20, 7, 1], [7, 22, 5, 0],
      [11, 18, 8, 1], [15, 21, 6, 0], [19, 19, 9, 1], [23, 23, 5, 0],
      [27, 20, 7, 1], [5, 16, 6, 0], [13, 24, 4, 1], [25, 16, 8, 0],
    ],
    [
      [1, 8, 9, 1], [3, 12, 7, 0], [5, 5, 12, 1], [7, 14, 6, 0],
      [9, 3, 11, 0], [11, 9, 8, 1], [13, 6, 10, 0], [15, 13, 7, 1],
      [17, 4, 12, 0], [19, 10, 8, 1], [21, 7, 9, 0], [23, 15, 5, 1],
      [25, 5, 11, 0], [27, 12, 6, 1], [2, 18, 8, 0], [6, 21, 6, 1],
      [10, 19, 7, 0], [14, 23, 5, 1], [18, 17, 9, 0], [22, 22, 6, 1],
      [26, 19, 7, 0], [4, 24, 5, 1], [12, 15, 6, 0], [28, 21, 5, 1],
    ],
    [
      [3, 5, 10, 0], [5, 11, 8, 1], [7, 7, 11, 0], [9, 14, 6, 1],
      [11, 4, 12, 0], [13, 10, 7, 1], [15, 2, 13, 0], [17, 9, 9, 1],
      [19, 6, 10, 0], [21, 13, 6, 1], [23, 3, 12, 0], [25, 11, 8, 1],
      [27, 8, 9, 0], [1, 15, 7, 1], [4, 19, 8, 0], [8, 23, 5, 1],
      [12, 20, 7, 0], [16, 18, 8, 1], [20, 22, 6, 0], [24, 17, 9, 1],
      [28, 20, 6, 0], [6, 16, 5, 1], [14, 25, 4, 0], [22, 24, 5, 1],
    ],
  ];
  const blades = bladeSets[variant % bladeSets.length]!;

  for (const [x, y0, h, lean] of blades) {
    if (x >= s) continue;
    for (let i = 0; i < h; i++) {
      const yy = y0 + i;
      if (yy >= s) break;
      const xx = x + (lean ? (i > h / 2 ? 1 : 0) : i % 3 === 2 ? 1 : 0);
      if (xx >= s) continue;
      ctx.fillStyle = i < 2 ? tip : i > h - 3 ? '#1e5030' : blade;
      ctx.fillRect(xx, yy, 1, 1);
    }
    fill(ctx, '#8ef0a8', x, y0, 1, 1);
  }

  // tiny flowers (moved per variant) — denser meadow
  const fx = 9 + variant * 3;
  const fy = 17 - variant;
  fill(ctx, '#ffc857', fx % 28, fy, 2, 2);
  fill(ctx, '#fff3a0', fx % 28, fy, 1, 1);
  fill(ctx, '#ff6b9d', (21 + variant) % 28, 13, 2, 2);
  fill(ctx, '#ffb0c8', (21 + variant) % 28, 13, 1, 1);
  fill(ctx, '#c9a0ff', 15, 27 - (variant % 2), 2, 1);
  fill(ctx, '#7dffb3', (5 + variant * 2) % 28, 9, 1, 1);
  fill(ctx, '#fff3a0', (18 + variant) % 28, 22, 2, 1);
  fill(ctx, '#ffb0c8', 26, 6 + (variant % 2), 1, 1);

  // turf depth rim + soft top light
  fill(ctx, 'rgba(0,0,0,0.14)', 0, s - 1, s, 1);
  fill(ctx, 'rgba(0,0,0,0.06)', 0, s - 2, s, 1);
  fill(ctx, 'rgba(255,255,255,0.06)', 0, 0, s, 1);
  fill(ctx, 'rgba(180,255,200,0.08)', 4, 2, s - 8, 1);
}

/**
 * Packed trail dirt — ruts, pebbles, packed earth clumps.
 * `variant` offsets clumps so paths don't read as a square stamp.
 */
export function drawDirtTile(
  ctx: CanvasRenderingContext2D,
  s: number,
  mid: string,
  variant = 0,
): void {
  vgrad(ctx, ['#8a7564', mid, '#5a4538', '#4a3830'], 0, 0, s, s);
  dither(ctx, mid, '#5a4538', 0, 0, s, s, variant);

  const o = variant % 3;
  cobble(ctx, '#7a6554', '#9a8574', '#4a3830', 2 + o, 3, 9, 7, true);
  cobble(ctx, '#6b5344', '#8a7564', '#3a2820', 13 - o, 2 + (o % 2), 8, 8, false);
  cobble(ctx, '#7a6554', '#9a8574', '#4a3830', 22, 4 + o, 8, 6, true);
  cobble(ctx, '#5a4538', '#7a6554', '#3a2820', 4, 14, 10, 8, false);
  cobble(ctx, '#6b5344', '#8a7564', '#3a2820', 16 - o, 13, 12, 7, true);
  cobble(ctx, '#7a6554', '#9a8574', '#4a3830', 3 + o, 23, 11, 7, true);
  cobble(ctx, '#5a4538', '#7a6554', '#3a2820', 17, 22 - (o % 2), 12, 8, false);

  // Soft depth between clumps
  fill(ctx, 'rgba(0,0,0,0.12)', 10, 10, 3, 2);
  fill(ctx, 'rgba(0,0,0,0.1)', 20, 18, 2, 2);
  fill(ctx, 'rgba(0,0,0,0.08)', 6, 20, 2, 2);

  // wagon / foot ruts (slightly wavy via offset)
  fill(ctx, 'rgba(40,28,20,0.45)', 0, 11 + (o % 2), s, 1);
  fill(ctx, 'rgba(40,28,20,0.35)', 0, 20 - (o % 2), s, 1);
  fill(ctx, 'rgba(100,85,70,0.25)', 0, 12 + (o % 2), s, 1);
  fill(ctx, 'rgba(40,28,20,0.2)', 0, 15, s, 1);

  fill(ctx, '#9a9080', 7 + o, 8, 2, 2);
  fill(ctx, '#6a6050', 7 + o, 9, 2, 1);
  fill(ctx, '#b0a898', 24 - o, 16, 2, 2);
  fill(ctx, '#8a8070', 14, 24, 2, 1);
  fill(ctx, '#c0b8a8', 3, 16, 1, 1);
  grit(ctx, 'rgba(0,0,0,0.12)', 1, 1, s - 2, s - 2, 5, o);
  fill(ctx, 'rgba(0,0,0,0.12)', 0, s - 1, s, 1);
}

/** Soft beach sand — warm grains, no brick/cobble ruts. */
export function drawSandTile(
  ctx: CanvasRenderingContext2D,
  s: number,
  mid: string,
  dark: string,
): void {
  vgrad(ctx, ['#f5e6c0', mid, dark, '#b89a70'], 0, 0, s, s);
  dither(ctx, mid, dark, 0, 0, s, s, 0);
  // soft dunes
  fill(ctx, 'rgba(255,245,220,0.35)', 0, 6, s, 2);
  fill(ctx, 'rgba(180,150,100,0.25)', 0, 18, s, 2);
  fill(ctx, 'rgba(255,240,200,0.2)', 0, 12, s, 1);
  fill(ctx, 'rgba(160,130,80,0.2)', 0, 24, s, 2);
  // shell / grain flecks
  fill(ctx, '#fff8e8', 5, 9, 2, 1);
  fill(ctx, '#d0b888', 14, 4, 2, 1);
  fill(ctx, '#fff0d0', 22, 15, 2, 1);
  fill(ctx, '#c9a870', 8, 22, 2, 1);
  fill(ctx, '#fff8e0', 26, 25, 2, 1);
  fill(ctx, '#e8d4a0', 18, 20, 2, 1);
  fill(ctx, '#fff8e8', 3, 16, 1, 1);
  // tiny shell
  fill(ctx, '#f0e8d8', 16, 10, 3, 2);
  fill(ctx, '#d0c0a0', 17, 11, 1, 1);
  grit(ctx, 'rgba(255,250,230,0.35)', 0, 0, s, s, 3, 2);
  grit(ctx, 'rgba(120,90,50,0.12)', 0, 0, s, s, 6, 1);
  fill(ctx, 'rgba(0,0,0,0.08)', 0, s - 1, s, 1);
}

/** Sandy cliff / dune wall for beach borders (not dungeon brick). */
export function drawSandWallTile(
  ctx: CanvasRenderingContext2D,
  s: number,
): void {
  vgrad(ctx, ['#d4b888', '#c9a870', '#a88858', '#8a6a40'], 0, 0, s, s);
  dither(ctx, '#c9a870', '#9a7850', 0, 0, s, s, 1);
  // strata bands
  fill(ctx, 'rgba(90,70,40,0.35)', 0, 8, s, 2);
  fill(ctx, 'rgba(90,70,40,0.3)', 0, 18, s, 2);
  fill(ctx, 'rgba(255,240,200,0.2)', 0, 10, s, 1);
  // rock nubs
  cobble(ctx, '#b89868', '#e0c890', '#7a5a38', 3, 4, 8, 6, true);
  cobble(ctx, '#a88858', '#d0b070', '#6a4a30', 18, 12, 10, 7, false);
  cobble(ctx, '#b89868', '#e0c890', '#7a5a38', 6, 22, 9, 6, true);
  fill(ctx, '#8a8070', 14, 26, 3, 2);
  fill(ctx, '#c0b8a8', 28, 7, 2, 1);

  grit(ctx, 'rgba(0,0,0,0.15)', 1, 1, s - 2, s - 2, 5, 0);
  spark(ctx, 8, 8, 'rgba(220,210,190,0.4)');
}

/**
 * Dark jagged mountain / dwarvez cave wall — not brick.
 * Irregular spikes of basalt, deep cracks, cold stone.
 */
export function drawJaggedStoneWall(
  ctx: CanvasRenderingContext2D,
  s: number,
  variant = 0,
): void {
  // near-black basalt bed
  vgrad(ctx, ['#2a2830', '#1a181f', '#121018', '#0a0a10'], 0, 0, s, s);
  dither(ctx, '#1a181f', '#0c0c12', 0, 0, s, s, variant);
  // jagged top silhouette (cliff teeth)
  const teeth = [
    [0, 0, 6, 5],
    [5, 0, 5, 8],
    [9, 0, 7, 4],
    [15, 0, 5, 9],
    [19, 0, 6, 5],
    [24, 0, 8, 7],
  ] as const;
  for (const [x, y, w, h] of teeth) {
    const ox = (x + variant * 3) % (s - 4);
    fill(ctx, '#3a3845', ox, y, w, h);
    fill(ctx, '#101018', ox, y + h - 1, w, 1);
  }
  // deep cracks
  fill(ctx, '#050508', 4 + variant, 10, 2, 14);
  fill(ctx, '#050508', 18, 8, 2, 18);
  fill(ctx, '#050508', 26 - variant, 12, 2, 12);
  // faceted rock nubs (no mortar rows)
  cobble(ctx, '#2e2c38', '#4a4858', '#121018', 2, 12, 10, 8, true);
  cobble(ctx, '#282630', '#3a3848', '#0e0e14', 14, 16, 12, 9, false);
  cobble(ctx, '#323040', '#4e4c5c', '#14141c', 8, 22, 11, 7, true);
  cobble(ctx, '#24222c', '#3c3a48', '#0c0c12', 20, 6, 9, 8, false);
  // cold rim light
  fill(ctx, 'rgba(120,140,180,0.12)', 0, 0, s, 2);
  grit(ctx, 'rgba(0,0,0,0.35)', 1, 1, s - 2, s - 2, 4, 0);
  spark(ctx, 10, 14, 'rgba(90,100,130,0.35)');
}

/** Rough cave floor — dark stone dust, not polished brick. */
export function drawJaggedStoneFloor(
  ctx: CanvasRenderingContext2D,
  s: number,
  variant = 0,
): void {
  vgrad(ctx, ['#2a2832', '#1e1c26', '#16141c', '#121018'], 0, 0, s, s);
  dither(ctx, '#1e1c26', '#121018', 0, 0, s, s, variant);
  cobble(ctx, '#24222c', '#363440', '#101018', 3, 4, 9, 6, true);
  cobble(ctx, '#202028', '#323038', '#0e0e14', 16, 10, 11, 7, false);
  cobble(ctx, '#262430', '#3a3844', '#12121a', 6, 18, 10, 8, true);
  fill(ctx, 'rgba(0,0,0,0.25)', 0, s - 2, s, 2);
  grit(ctx, 'rgba(80,90,110,0.15)', 0, 0, s, s, 5, 1);
}

/** Mountain snow pack — cold white with blue shadow. */
export function drawSnowTile(
  ctx: CanvasRenderingContext2D,
  s: number,
  variant = 0,
): void {
  vgrad(ctx, ['#f8fcff', '#e8f0f8', '#d0dce8', '#b8c8d8'], 0, 0, s, s);
  dither(ctx, '#e8f0f8', '#c8d4e0', 0, 0, s, s, variant);
  // soft drifts
  fill(ctx, 'rgba(255,255,255,0.45)', 0, 6 + variant, s, 2);
  fill(ctx, 'rgba(160,180,200,0.25)', 0, 16, s, 2);
  fill(ctx, 'rgba(255,255,255,0.3)', 0, 22, s, 1);
  // sparkle flecks
  fill(ctx, '#ffffff', 5 + variant, 8, 2, 1);
  fill(ctx, '#ffffff', 14, 14, 1, 1);
  fill(ctx, '#d8e8f8', 22, 10, 2, 1);
  fill(ctx, '#ffffff', 9, 20, 1, 1);
  fill(ctx, '#c0d0e0', 26, 24, 2, 1);
  grit(ctx, 'rgba(255,255,255,0.4)', 0, 0, s, s, 4, 1);
  fill(ctx, 'rgba(100,120,150,0.12)', 0, s - 1, s, 1);
}

/** Mineral vein prop — colored crystal/nugget in dark rock. */
export function drawOreVein(
  ctx: CanvasRenderingContext2D,
  mineral:
    | 'bronze'
    | 'gold'
    | 'silver'
    | 'diamond'
    | 'ruby'
    | 'emerald'
    | 'mithril',
): void {
  // rock base
  shadedBlock(ctx, '#2a2830', '#4a4855', '#121018', 6, 10, 20, 16);
  fill(ctx, '#1a181f', 8, 12, 16, 12);
  const colors: Record<string, [string, string, string]> = {
    bronze: ['#8a5a2b', '#c98a40', '#5a3818'],
    gold: ['#c9a227', '#ffe08a', '#8a6a10'],
    silver: ['#a0a8b8', '#e8ecf4', '#606878'],
    diamond: ['#c8e8ff', '#ffffff', '#68a0d0'],
    ruby: ['#c0392b', '#ff6b6b', '#6a1810'],
    emerald: ['#1e8a4a', '#5ad47a', '#0a4a28'],
    mithril: ['#8ad0e8', '#e0f8ff', '#3a7898'],
  };
  const [mid, lite, deep] = colors[mineral] ?? colors.gold!;
  // crystal cluster
  cobble(ctx, mid, lite, deep, 10, 8, 8, 10, true);
  cobble(ctx, mid, lite, deep, 16, 12, 7, 9, false);
  cobble(ctx, mid, lite, deep, 12, 16, 6, 6, true);
  spark(ctx, 14, 10, lite);
  spark(ctx, 18, 14, lite);
}

export type WaterDrawStyle = 'ocean' | 'pond' | 'river';

/**
 * Water tile — ocean foam, calm pond (lilies), or flowing river.
 * `phase` animates ripples / foam.
 */
export function drawWaterTile(
  ctx: CanvasRenderingContext2D,
  s: number,
  mid: string,
  phase = 0,
  style: WaterDrawStyle = 'ocean',
): void {
  if (style === 'pond') {
    drawPondWater(ctx, s, mid, phase);
    return;
  }
  if (style === 'river') {
    drawRiverWater(ctx, s, mid, phase);
    return;
  }
  // Ocean — deep bands + shorebound foam (legacy beach look)
  const deep = '#0e3058';
  const shallow = phase === 0 ? '#3d7eb0' : phase === 1 ? '#4a8ec0' : '#3580b0';
  const foam =
    phase === 0
      ? 'rgba(200,230,255,0.55)'
      : phase === 1
        ? 'rgba(220,240,255,0.5)'
        : 'rgba(230,245,255,0.6)';
  vgrad(ctx, [shallow, mid, '#1a4a78', deep], 0, 0, s, s);
  dither(ctx, mid, deep, 0, Math.floor(s * 0.4), s, Math.ceil(s * 0.6), phase);

  const oy = phase * 5;
  const ox = (phase % 2) * 3;
  fill(ctx, foam, 2 + ox, 20 - oy, 14, 2);
  fill(ctx, 'rgba(255,255,255,0.4)', 4 + ox, 21 - oy, 10, 1);
  fill(ctx, foam, 10 - ox, 26 - oy, 16, 2);
  fill(ctx, foam, 0 + ox, 12 - oy, 12, 2);
  fill(ctx, 'rgba(255,255,255,0.3)', 2 + ox, 13 - oy, 8, 1);
  fill(ctx, foam, 16 - ox, 8 - oy, 10, 1);

  fill(ctx, deep, 2, 16 - Math.floor(oy / 2), 8, 1);
  fill(ctx, deep, 18, 24 - Math.floor(oy / 2), 10, 1);
  fill(ctx, deep, 10, 4, 6, 1);

  fill(ctx, 'rgba(180,220,255,0.25)', 0, 0, s, 1);
  fill(ctx, 'rgba(0,0,0,0.2)', 0, s - 1, s, 1);

  spark(ctx, 10 + ox, 8, '#e8f8ff');
  spark(ctx, 22 - ox, 16, '#ffffff');
  spark(ctx, 8 + ox, 24, 'rgba(255,255,255,0.7)');
  spark(ctx, 15, 5 + phase, 'rgba(200,230,255,0.5)');
  // subsurface glints
  fill(ctx, 'rgba(100,180,220,0.2)', 12 + ox, 14, 3, 1);
  fill(ctx, 'rgba(40,80,120,0.25)', 5, 22, 4, 1);
}

/** Calm green-blue pond with soft ripples + lily pads. */
function drawPondWater(
  ctx: CanvasRenderingContext2D,
  s: number,
  mid: string,
  phase: number,
): void {
  const deep = '#1a4858';
  const teal = phase % 2 === 0 ? '#2a7a88' : '#348a98';
  const shallow = phase % 2 === 0 ? '#4aa8a0' : '#58b8b0';
  vgrad(ctx, [shallow, teal, mid, deep], 0, 0, s, s);
  dither(ctx, teal, deep, 0, Math.floor(s * 0.35), s, Math.ceil(s * 0.65), phase);

  // Soft concentric ripples
  const ry = 10 + (phase % 2) * 2;
  fill(ctx, 'rgba(180,230,220,0.25)', 6, ry, 20, 1);
  fill(ctx, 'rgba(180,230,220,0.18)', 10, ry + 4, 12, 1);
  fill(ctx, 'rgba(20,60,70,0.25)', 4, ry + 8, 10, 1);
  fill(ctx, 'rgba(20,60,70,0.2)', 18, ry + 6, 8, 1);

  // Lily pads (organic ovals, not squares)
  const lx = phase % 2 === 0 ? 4 : 18;
  const ly = phase % 2 === 0 ? 6 : 18;
  fill(ctx, '#2a6a38', lx, ly + 1, 8, 5);
  fill(ctx, '#3a8a48', lx + 1, ly, 6, 5);
  fill(ctx, '#4aaa58', lx + 2, ly + 1, 3, 2);
  fill(ctx, '#1a4028', lx + 6, ly + 2, 2, 2);
  // second pad
  fill(ctx, '#2a6a38', 20 - lx / 2, 20, 7, 4);
  fill(ctx, '#3a8a48', 21 - lx / 2, 19, 5, 4);
  // tiny flower on pad
  fill(ctx, '#f0e8ff', lx + 3, ly + 1, 2, 2);
  fill(ctx, '#ffc857', lx + 3, ly + 1, 1, 1);
  // reed tips at bank
  fill(ctx, '#3a6a30', 2, 4, 1, 5);
  fill(ctx, '#5aaa50', 2, 3, 1, 2);
  fill(ctx, '#3a6a30', s - 4, 8, 1, 4);
  // water bugs / glints
  spark(ctx, 12, 15, 'rgba(255,255,255,0.5)');
  spark(ctx, 22, 10, 'rgba(200,255,240,0.45)');

  // Depth rim
  fill(ctx, 'rgba(0,0,0,0.18)', 0, s - 1, s, 1);
  fill(ctx, 'rgba(120,200,190,0.15)', 0, 0, s, 1);
  spark(ctx, 14, 12 + phase, 'rgba(220,255,250,0.7)');
}

/** Flowing river — current streaks along X, darker banks. */
function drawRiverWater(
  ctx: CanvasRenderingContext2D,
  s: number,
  mid: string,
  phase: number,
): void {
  const deep = '#1a4060';
  const flow = phase % 2 === 0 ? '#3a80a8' : '#4a90b8';
  const bright = phase % 2 === 0 ? '#5ab0d0' : '#68c0e0';
  vgrad(ctx, [flow, mid, deep, '#0e2848'], 0, 0, s, s);
  dither(ctx, mid, deep, 0, 0, s, s, phase);

  // Current streaks travel right with phase
  const ox = (phase % 2) * 4;
  fill(ctx, 'rgba(180,220,240,0.35)', 2 + ox, 6, 12, 1);
  fill(ctx, 'rgba(180,220,240,0.28)', 10 - ox, 12, 14, 1);
  fill(ctx, 'rgba(180,220,240,0.3)', 4 + ox, 18, 16, 1);
  fill(ctx, 'rgba(180,220,240,0.25)', 8 - ox, 24, 12, 1);
  fill(ctx, bright, 6 + ox, 8, 6, 1);
  fill(ctx, bright, 14 - ox, 16, 5, 1);

  // Dark troughs
  fill(ctx, deep, 0, 10, s, 1);
  fill(ctx, deep, 0, 22, s, 1);
  // Bank foam (top/bottom edges of channel)
  fill(ctx, 'rgba(200,230,250,0.2)', 0, 0, s, 1);
  fill(ctx, 'rgba(200,230,250,0.15)', 0, 1, s, 1);
  fill(ctx, 'rgba(0,0,0,0.2)', 0, s - 1, s, 1);

  spark(ctx, 8 + ox, 7, '#e8f8ff');
  spark(ctx, 20 - ox, 15, '#ffffff');
  spark(ctx, 12 + ox, 25, 'rgba(255,255,255,0.6)');
}

/**
 * Layered oak tree — trunk bark + multi-lobe canopy with depth (not a green square).
 */
export function drawTreeSprite(ctx: CanvasRenderingContext2D, _s: number): void {
  // Ground shadow under trunk (depth cue)
  fill(ctx, 'rgba(0,0,0,0.25)', 10, 28, 12, 3);
  fill(ctx, 'rgba(0,0,0,0.15)', 8, 29, 16, 2);
  fill(ctx, 'rgba(0,0,0,0.1)', 6, 30, 20, 1);

  // Trunk with bark bands + bevel + knots
  shadedBlock(ctx, '#5a3a22', '#7a5a38', '#3a2410', 13, 16, 6, 14);
  fill(ctx, '#4a3018', 13, 20, 6, 1);
  fill(ctx, '#4a3018', 13, 25, 6, 1);
  fill(ctx, '#6b4423', 14, 17, 1, 12);
  fill(ctx, '#2a1808', 18, 18, 1, 10);
  fill(ctx, '#3a2410', 15, 22, 2, 2); // knot
  fill(ctx, '#6b4423', 15, 22, 1, 1);
  // Root flare
  fill(ctx, '#4a3018', 11, 28, 4, 2);
  fill(ctx, '#4a3018', 17, 28, 4, 2);
  fill(ctx, '#3a2410', 10, 29, 2, 1);
  fill(ctx, '#3a2410', 20, 29, 2, 1);

  // Canopy lobes (back → front for depth)
  const lobes: [number, number, number, number, string, string, string][] = [
    [2, 4, 14, 12, '#1a4a28', '#2a6a38', '#0e3018'], // back left
    [16, 3, 14, 13, '#1e5030', '#2f6b45', '#123820'], // back right
    [6, 1, 18, 14, '#2a6a40', '#3a8f5a', '#1a4030'], // mid
    [4, 8, 12, 11, '#246838', '#3a9050', '#164028'], // front left
    [14, 9, 13, 10, '#286c3c', '#42a058', '#184828'], // front right
    [10, 5, 10, 9, '#3a9050', '#5ad47a', '#246838'], // crown highlight
    [8, 12, 8, 6, '#2a7040', '#4aaa60', '#1a4828'], // lower front fluff
  ];
  for (const [x, y, w, h, mid, li, da] of lobes) {
    // Soft oval mass via inset corners (not rectangle)
    shadedBlock(ctx, mid, li, da, x, y, w, h);
    fill(ctx, da, x, y, 2, 2);
    fill(ctx, da, x + w - 2, y, 2, 2);
    fill(ctx, da, x, y + h - 2, 2, 2);
    fill(ctx, da, x + w - 2, y + h - 2, 2, 2);
    fill(ctx, li, x + 2, y + 1, Math.max(2, w - 6), 2);
    // leaf cluster dots
    fill(ctx, li, x + 3, y + 3, 1, 1);
    fill(ctx, da, x + w - 4, y + 4, 1, 1);
  }
  // Leaf speckles + depth holes
  fill(ctx, '#1a4028', 8, 10, 2, 2);
  fill(ctx, '#1a4028', 20, 8, 2, 2);
  fill(ctx, '#1a4028', 14, 14, 2, 1);
  fill(ctx, '#0e3018', 22, 14, 2, 1);
  spark(ctx, 12, 6, '#7dffb3');
  spark(ctx, 18, 5, '#6ad48a');
  spark(ctx, 9, 12, '#5ad47a');
  spark(ctx, 24, 10, '#8ef0a8');
  spark(ctx, 15, 9, '#c9ffe0');
  // Canopy drop-shadow on trunk
  fill(ctx, 'rgba(0,0,0,0.2)', 12, 16, 8, 2);
  fill(ctx, 'rgba(0,0,0,0.12)', 13, 18, 6, 1);
}

/**
 * Sky-piercing enchanted redwood — canopy cropped at the top of the frame
 * so you never see the crown (too tall for the canvas).
 * Author space: 32 wide × 56 tall (taller than standard 32×32 trees).
 */
export function drawSkyRedwoodSprite(
  ctx: CanvasRenderingContext2D,
  _s: number,
): void {
  const H = 56;
  // Soft ground shadow at feet
  fill(ctx, 'rgba(0,0,0,0.3)', 8, H - 4, 16, 3);
  fill(ctx, 'rgba(0,0,0,0.15)', 6, H - 3, 20, 2);

  // Tall trunk — roots at bottom, bark climbs off-frame
  shadedBlock(ctx, '#4a3018', '#6b4423', '#2a1808', 13, 18, 6, H - 22);
  fill(ctx, '#3a2410', 13, 24, 6, 1);
  fill(ctx, '#3a2410', 13, 32, 6, 1);
  fill(ctx, '#3a2410', 13, 40, 6, 1);
  fill(ctx, '#3a2410', 13, 48, 6, 1);
  fill(ctx, '#7a5a38', 14, 20, 1, H - 28);
  fill(ctx, '#1a1008', 18, 22, 1, H - 30);
  // Root flare
  fill(ctx, '#3a2410', 10, H - 6, 5, 3);
  fill(ctx, '#3a2410', 17, H - 6, 5, 3);
  fill(ctx, '#2a1808', 8, H - 4, 4, 2);
  fill(ctx, '#2a1808', 20, H - 4, 4, 2);

  // Mid canopy bands (still on frame)
  const bands: [number, number, number, number, string, string, string][] = [
    [2, 10, 28, 14, '#0e3820', '#1a5030', '#082418'],
    [4, 6, 24, 12, '#164828', '#2a6a40', '#0e3018'],
    [6, 2, 20, 12, '#1e5840', '#3a8f5a', '#123828'],
    [8, -2, 16, 12, '#246838', '#4aaa60', '#164028'], // top cropped
    [10, -6, 12, 12, '#2a7048', '#5ad47a', '#1a4830'], // far above crop
  ];
  for (const [x, y, w, h, mid, li, da] of bands) {
    const yy = Math.max(0, y);
    const hh = h - (yy - y);
    if (hh <= 2) continue;
    shadedBlock(ctx, mid, li, da, x, yy, w, hh);
    fill(ctx, li, x + 2, yy + 1, Math.max(2, w - 6), 2);
    fill(ctx, da, x + 1, yy, 2, 2);
    fill(ctx, da, x + w - 3, yy, 2, 2);
  }
  // Magical fireflies / moss glints along trunk
  spark(ctx, 11, 22, '#7dffb3');
  spark(ctx, 20, 28, '#c9ffe0');
  spark(ctx, 12, 36, '#a0ffe0');
  spark(ctx, 19, 14, '#7dffb3');
  spark(ctx, 9, 8, '#e8ffe8');
  // Canopy bleeds off top edge (no crown outline)
  fill(ctx, '#0e3820', 0, 0, 32, 3);
  fill(ctx, '#1a5030', 4, 0, 24, 2);
}

/**
 * Wood elf sentry — green cloak, long blonde hair, pointed ears,
 * mithril blade + longbow.
 * Author 32×32.
 */
export function drawWoodElfGuard(ctx: CanvasRenderingContext2D): void {
  // Cloak (green)
  shadedBlock(ctx, '#1a6040', '#2a9058', '#0e3820', 6, 12, 20, 14);
  fill(ctx, '#164830', 5, 14, 3, 12); // left fold
  fill(ctx, '#164830', 24, 14, 3, 12);
  // Legs
  fill(ctx, '#2a4030', 10, 24, 4, 6);
  fill(ctx, '#2a4030', 18, 24, 4, 6);
  fill(ctx, '#1a2818', 10, 28, 4, 2);
  fill(ctx, '#1a2818', 18, 28, 4, 2);
  // Torso tunic under cloak
  shadedBlock(ctx, '#2a7850', '#3a9860', '#1a5030', 10, 14, 12, 8);
  // Head / pale skin
  shadedBlock(ctx, '#e8c4a0', '#ffe8d0', '#c09070', 11, 5, 10, 8);
  // Long blonde hair (shoulders + fall)
  fill(ctx, '#e8d070', 9, 4, 14, 4);
  fill(ctx, '#f0e090', 10, 3, 12, 3);
  fill(ctx, '#d4b848', 8, 8, 3, 10); // left fall
  fill(ctx, '#d4b848', 21, 8, 3, 10); // right fall
  fill(ctx, '#f0e090', 8, 8, 2, 6);
  fill(ctx, '#f0e090', 22, 8, 2, 6);
  // Pointed ears
  fill(ctx, '#e8c4a0', 8, 7, 3, 2);
  fill(ctx, '#e8c4a0', 21, 7, 3, 2);
  fill(ctx, '#ffe8d0', 7, 6, 2, 2);
  fill(ctx, '#ffe8d0', 23, 6, 2, 2);
  // Face
  fill(ctx, '#222', 13, 8, 2, 2);
  fill(ctx, '#222', 18, 8, 2, 2);
  fill(ctx, '#c07060', 15, 11, 2, 1);
  // Magical sword (right hip / hand)
  fill(ctx, '#c0e8e0', 24, 10, 3, 14);
  fill(ctx, '#e8fff8', 25, 11, 1, 12);
  fill(ctx, '#a0d0c8', 23, 16, 5, 2); // guard
  fill(ctx, '#8a6820', 24, 22, 3, 3); // pommel
  // Longbow (left)
  fill(ctx, '#8b5a2b', 4, 8, 2, 16);
  fill(ctx, '#c9a227', 3, 8, 1, 2);
  fill(ctx, '#c9a227', 3, 22, 1, 2);
  fill(ctx, '#e8e0c0', 5, 10, 1, 12); // string
  spark(ctx, 25, 12, '#7dffb3');
}

/** Royal carpet / dais floor tile — purple with gold inlay. Author 32. */
export function drawCarpetTile(ctx: CanvasRenderingContext2D, _s: number): void {
  fill(ctx, '#3a1a48', 0, 0, 32, 32);
  fill(ctx, '#4a2860', 1, 1, 30, 30);
  fill(ctx, '#5a3878', 2, 2, 28, 28);
  // Gold border
  fill(ctx, '#c9a227', 0, 0, 32, 2);
  fill(ctx, '#c9a227', 0, 30, 32, 2);
  fill(ctx, '#c9a227', 0, 0, 2, 32);
  fill(ctx, '#c9a227', 30, 0, 2, 32);
  // Center diamond
  fill(ctx, '#ffc857', 14, 10, 4, 12);
  fill(ctx, '#ffc857', 10, 14, 12, 4);
  fill(ctx, '#e8d070', 15, 15, 2, 2);
  // Corner flecks
  fill(ctx, '#7a50a0', 4, 4, 3, 3);
  fill(ctx, '#7a50a0', 25, 4, 3, 3);
  fill(ctx, '#7a50a0', 4, 25, 3, 3);
  fill(ctx, '#7a50a0', 25, 25, 3, 3);
}

/** Throne chair — tall back, gold, cushions. Author 32. */
export function drawThrone(ctx: CanvasRenderingContext2D): void {
  // Base plinth
  shadedBlock(ctx, '#6b4423', '#8b5a2b', '#3a2410', 4, 24, 24, 6);
  fill(ctx, '#c9a227', 5, 24, 22, 2);
  // Seat
  shadedBlock(ctx, '#6a2040', '#a04068', '#3a1020', 7, 16, 18, 10);
  fill(ctx, '#ff6b9d', 9, 18, 14, 6);
  // Arms
  shadedBlock(ctx, '#c9a227', '#ffc857', '#8a6820', 4, 14, 5, 12);
  shadedBlock(ctx, '#c9a227', '#ffc857', '#8a6820', 23, 14, 5, 12);
  // High back
  shadedBlock(ctx, '#4a2060', '#7a40a0', '#2a1040', 8, 2, 16, 16);
  fill(ctx, '#ffc857', 9, 3, 14, 2);
  fill(ctx, '#c9a227', 14, 0, 4, 4); // crest
  fill(ctx, '#ffc857', 15, 0, 2, 3);
  fill(ctx, '#7dffb3', 15, 1, 2, 1);
  // Cushion tufts
  fill(ctx, '#ffb0c8', 12, 8, 3, 3);
  fill(ctx, '#ffb0c8', 17, 8, 3, 3);
  spark(ctx, 15, 2, '#ffffff');
}

/** Stone pillar with gold capital. Author 32. */
export function drawPillar(ctx: CanvasRenderingContext2D): void {
  // Capital
  shadedBlock(ctx, '#c9a227', '#ffc857', '#8a6820', 6, 2, 20, 5);
  fill(ctx, '#e8d070', 8, 3, 16, 2);
  // Shaft
  shadedBlock(ctx, '#6a6a78', '#9a9aa8', '#3a3a48', 10, 6, 12, 22);
  fill(ctx, '#b0b0c0', 11, 8, 2, 18);
  fill(ctx, '#4a4a58', 20, 8, 1, 18);
  // Base
  shadedBlock(ctx, '#5a5a68', '#8a8a98', '#2a2a35', 7, 26, 18, 5);
  fill(ctx, '#c9a227', 8, 26, 16, 1);
}

/** Wooden barrel — staves + metal bands. Author 32. */
export function drawBarrel(ctx: CanvasRenderingContext2D): void {
  fill(ctx, 'rgba(0,0,0,0.2)', 8, 28, 16, 3);
  shadedBlock(ctx, '#6b4423', '#8b5a2b', '#3a2410', 8, 6, 16, 22);
  fill(ctx, '#5a3d1a', 9, 8, 2, 18);
  fill(ctx, '#5a3d1a', 21, 8, 2, 18);
  // Metal bands
  fill(ctx, '#6a6a78', 7, 10, 18, 3);
  fill(ctx, '#6a6a78', 7, 20, 18, 3);
  fill(ctx, '#9a9aa8', 8, 11, 16, 1);
  fill(ctx, '#9a9aa8', 8, 21, 16, 1);
  // Lid
  shadedBlock(ctx, '#5a3d1a', '#7a5a38', '#2a1810', 9, 4, 14, 4);
  fill(ctx, '#c9a227', 14, 5, 4, 2);
}

/** Wooden crate / box. Author 32. */
export function drawCrate(ctx: CanvasRenderingContext2D): void {
  fill(ctx, 'rgba(0,0,0,0.2)', 6, 28, 20, 3);
  shadedBlock(ctx, '#5a3d1a', '#8b5a2b', '#2a1810', 6, 8, 20, 20);
  fill(ctx, '#3a2410', 7, 9, 18, 2);
  fill(ctx, '#3a2410', 7, 17, 18, 2);
  fill(ctx, '#3a2410', 7, 25, 18, 2);
  fill(ctx, '#3a2410', 12, 9, 2, 18);
  fill(ctx, '#3a2410', 18, 9, 2, 18);
  // Nails
  fill(ctx, '#888', 8, 10, 2, 2);
  fill(ctx, '#888', 22, 10, 2, 2);
  fill(ctx, '#888', 8, 24, 2, 2);
  fill(ctx, '#888', 22, 24, 2, 2);
  fill(ctx, '#c9a070', 7, 8, 18, 1);
}

/** Ceramic vase — smashable pot. Author 32. */
export function drawVase(ctx: CanvasRenderingContext2D): void {
  fill(ctx, 'rgba(0,0,0,0.2)', 10, 28, 12, 3);
  // Body
  shadedBlock(ctx, '#6a4050', '#a06078', '#3a2030', 9, 10, 14, 16);
  fill(ctx, '#c08098', 11, 12, 4, 8);
  // Neck + rim
  shadedBlock(ctx, '#5a3040', '#905868', '#2a1820', 12, 6, 8, 6);
  fill(ctx, '#c9a227', 11, 5, 10, 2);
  fill(ctx, '#e8d070', 13, 5, 6, 1);
  // Base
  fill(ctx, '#4a2838', 10, 24, 12, 3);
  // Pattern stripe
  fill(ctx, '#ffc857', 10, 16, 12, 2);
  spark(ctx, 14, 13, '#ffd0e0');
}

/** Wall banner / hanging flag (purple + gold). Author 32. */
export function drawBanner(ctx: CanvasRenderingContext2D): void {
  // Pole
  fill(ctx, '#5a3d1a', 14, 0, 4, 6);
  fill(ctx, '#c9a227', 13, 0, 6, 3);
  // Cloth
  shadedBlock(ctx, '#6a2040', '#c04070', '#3a1028', 6, 5, 20, 22);
  fill(ctx, '#ff6b9d', 8, 7, 16, 3);
  fill(ctx, '#ffc857', 12, 12, 8, 8);
  fill(ctx, '#c9a227', 14, 14, 4, 4);
  // Bottom points
  fill(ctx, '#4a1830', 6, 24, 6, 4);
  fill(ctx, '#4a1830', 13, 26, 6, 4);
  fill(ctx, '#4a1830', 20, 24, 6, 4);
  spark(ctx, 15, 15, '#fff0a0');
}

/**
 * Royal Goose — white goose, orange bill, crown, boss presence.
 * Author 32×32. (Not a tinted humanoid.)
 */
export function drawRoyalGoose(ctx: CanvasRenderingContext2D): void {
  // Shadow
  fill(ctx, 'rgba(0,0,0,0.25)', 8, 28, 16, 3);
  // Body (oval mass)
  shadedBlock(ctx, '#d8dce8', '#f4f6ff', '#98a0b0', 6, 12, 18, 14);
  fill(ctx, '#e8ecf4', 8, 14, 12, 8);
  // Wing fold
  shadedBlock(ctx, '#c0c8d8', '#e0e8f0', '#8890a0', 4, 14, 8, 10);
  fill(ctx, '#a8b0c0', 5, 16, 2, 6);
  // Tail tuft
  fill(ctx, '#c8d0e0', 20, 18, 6, 6);
  fill(ctx, '#e8ecf4', 22, 19, 3, 3);
  // Neck
  shadedBlock(ctx, '#e0e4f0', '#f8faff', '#a8b0c0', 14, 6, 7, 10);
  // Head
  shadedBlock(ctx, '#e8ecf4', '#ffffff', '#b0b8c8', 12, 2, 10, 8);
  // Eye
  fill(ctx, '#1a1a22', 18, 5, 2, 2);
  fill(ctx, '#fff', 18, 5, 1, 1);
  // Orange bill
  fill(ctx, '#e07020', 20, 6, 6, 3);
  fill(ctx, '#ff9020', 21, 6, 4, 2);
  fill(ctx, '#c05010', 24, 7, 2, 2);
  // Nostril
  fill(ctx, '#8a3010', 23, 6, 1, 1);
  // Crown (royal)
  fill(ctx, '#c9a227', 13, 0, 8, 3);
  fill(ctx, '#ffc857', 14, 0, 2, 2);
  fill(ctx, '#ffc857', 17, 0, 2, 3);
  fill(ctx, '#ffc857', 20, 0, 2, 2);
  fill(ctx, '#7dffb3', 17, 0, 2, 1); // gem
  // Orange webbed feet
  fill(ctx, '#e07020', 9, 25, 5, 3);
  fill(ctx, '#e07020', 16, 25, 5, 3);
  fill(ctx, '#c05010', 9, 27, 2, 1);
  fill(ctx, '#c05010', 12, 27, 2, 1);
  fill(ctx, '#c05010', 16, 27, 2, 1);
  fill(ctx, '#c05010', 19, 27, 2, 1);
  spark(ctx, 16, 1, '#ffffff');
}

/**
 * Assistant Honk — junior sewer goose, fluffier / yellower, no crown.
 * Author 32×32.
 */
export function drawAssistantHonk(ctx: CanvasRenderingContext2D): void {
  fill(ctx, 'rgba(0,0,0,0.22)', 9, 28, 14, 3);
  // Smaller body — warm white / butter
  shadedBlock(ctx, '#e8d8a0', '#fff4c8', '#b8a060', 7, 13, 16, 12);
  fill(ctx, '#fff0b0', 9, 15, 10, 7);
  // Wing
  shadedBlock(ctx, '#d0c080', '#f0e0a0', '#a09050', 5, 15, 7, 8);
  // Tail
  fill(ctx, '#d8c890', 19, 18, 5, 5);
  // Neck + head
  shadedBlock(ctx, '#f0e8b0', '#fff8d0', '#c0a860', 13, 7, 6, 9);
  shadedBlock(ctx, '#f4ecb8', '#fffce0', '#c8b070', 12, 3, 9, 7);
  // Big eye (intern energy)
  fill(ctx, '#1a1a22', 17, 5, 2, 2);
  fill(ctx, '#fff', 17, 5, 1, 1);
  // Bill
  fill(ctx, '#e87820', 19, 6, 5, 3);
  fill(ctx, '#ff9828', 20, 6, 3, 2);
  // Tiny intern badge on chest
  fill(ctx, '#ffc857', 12, 16, 4, 3);
  fill(ctx, '#8a6820', 13, 17, 2, 1);
  // Feet
  fill(ctx, '#e07020', 10, 24, 4, 3);
  fill(ctx, '#e07020', 16, 24, 4, 3);
  fill(ctx, '#c05010', 10, 26, 1, 1);
  fill(ctx, '#c05010', 12, 26, 1, 1);
  fill(ctx, '#c05010', 16, 26, 1, 1);
  fill(ctx, '#c05010', 18, 26, 1, 1);
  spark(ctx, 14, 14, '#fff8c0');
}

/**
 * Glamdolph — grey wizard, long white beard, staff, ominous news delivery.
 * Author 32×32.
 */
export function drawGlamdolph(ctx: CanvasRenderingContext2D): void {
  // Grey robes
  shadedBlock(ctx, '#6a6a78', '#9a9aa8', '#3a3a48', 7, 12, 18, 16);
  fill(ctx, '#5a5a68', 6, 14, 3, 14);
  fill(ctx, '#5a5a68', 23, 14, 3, 14);
  fill(ctx, '#8a8a98', 10, 14, 12, 8);
  // Hood / hat point
  fill(ctx, '#5a5a68', 10, 2, 12, 6);
  fill(ctx, '#4a4a58', 12, 0, 8, 4);
  fill(ctx, '#3a3a48', 14, 0, 4, 2);
  // Head
  shadedBlock(ctx, '#e0c0a0', '#f0d8b8', '#b89070', 11, 6, 10, 7);
  // Long white beard
  fill(ctx, '#e8e8f0', 10, 12, 12, 10);
  fill(ctx, '#f4f4fa', 11, 13, 10, 10);
  fill(ctx, '#d0d0d8', 12, 18, 8, 6);
  fill(ctx, '#f8f8ff', 13, 20, 6, 5);
  fill(ctx, '#c8c8d0', 14, 24, 4, 4);
  // Eyes under brow
  fill(ctx, '#222', 13, 8, 2, 2);
  fill(ctx, '#222', 18, 8, 2, 2);
  fill(ctx, '#7dffb3', 13, 8, 1, 1); // knowing glint
  // Staff
  fill(ctx, '#8b5a2b', 25, 4, 2, 22);
  fill(ctx, '#c9a227', 24, 3, 4, 4);
  fill(ctx, '#7dffb3', 25, 2, 2, 2);
  spark(ctx, 25, 2, '#ffffff');
  spark(ctx, 14, 16, '#e8e8f0');
}

/**
 * Queen of the Wood Elves — all white robes, long blonde hair, crown spark.
 * Author 32×32.
 */
export function drawWoodElfQueen(ctx: CanvasRenderingContext2D): void {
  // Full white gown
  shadedBlock(ctx, '#d8dce8', '#f4f6ff', '#a8b0c0', 6, 12, 20, 16);
  fill(ctx, '#e8ecf8', 5, 14, 3, 14);
  fill(ctx, '#e8ecf8', 24, 14, 3, 14);
  fill(ctx, '#ffffff', 10, 14, 12, 8);
  // Soft train
  fill(ctx, '#c8d0e0', 8, 26, 16, 3);
  fill(ctx, '#b0b8c8', 10, 28, 12, 2);
  // Head
  shadedBlock(ctx, '#e8c4a0', '#ffe8d0', '#c09070', 11, 5, 10, 8);
  // Very long blonde hair
  fill(ctx, '#f0e090', 9, 3, 14, 5);
  fill(ctx, '#e8d070', 8, 4, 16, 3);
  fill(ctx, '#f8f0b0', 7, 7, 4, 14); // left cascade
  fill(ctx, '#f8f0b0', 21, 7, 4, 14); // right cascade
  fill(ctx, '#e8d070', 7, 10, 3, 12);
  fill(ctx, '#e8d070', 22, 10, 3, 12);
  // Pointed ears
  fill(ctx, '#e8c4a0', 8, 7, 3, 2);
  fill(ctx, '#e8c4a0', 21, 7, 3, 2);
  fill(ctx, '#ffe8d0', 7, 6, 2, 2);
  fill(ctx, '#ffe8d0', 23, 6, 2, 2);
  // Delicate crown
  fill(ctx, '#e8e8f0', 11, 2, 10, 2);
  fill(ctx, '#ffffff', 12, 1, 2, 2);
  fill(ctx, '#ffffff', 15, 0, 2, 3);
  fill(ctx, '#ffffff', 18, 1, 2, 2);
  fill(ctx, '#7dffb3', 15, 0, 2, 1); // gem
  // Face
  fill(ctx, '#222', 13, 8, 2, 2);
  fill(ctx, '#222', 18, 8, 2, 2);
  fill(ctx, '#d08080', 15, 11, 2, 1);
  // White staff / scepter
  fill(ctx, '#e8e8f0', 25, 8, 2, 16);
  fill(ctx, '#7dffb3', 24, 6, 4, 4);
  spark(ctx, 25, 6, '#ffffff');
  spark(ctx, 12, 16, '#c9ffe0');
}

/**
 * Koi fish — orange/white/black pattern, non-combat pond swimmer.
 */
export function drawKoiSprite(ctx: CanvasRenderingContext2D, _s: number): void {
  // body
  fill(ctx, '#e87840', 6, 12, 18, 8);
  fill(ctx, '#f0a060', 7, 13, 14, 5);
  fill(ctx, '#fff0e0', 10, 14, 6, 3);
  fill(ctx, '#1a1010', 16, 13, 4, 3);
  fill(ctx, '#e04030', 8, 15, 3, 2);
  // head / nose
  fill(ctx, '#f09050', 22, 13, 5, 5);
  fill(ctx, '#1a1010', 25, 14, 2, 2);
  spark(ctx, 25, 14, '#ffffff');
  // tail
  fill(ctx, '#e87840', 2, 11, 5, 4);
  fill(ctx, '#e87840', 2, 16, 5, 4);
  fill(ctx, '#f0a060', 3, 12, 3, 2);
  fill(ctx, '#f0a060', 3, 17, 3, 2);
  // fins
  fill(ctx, '#f0a060', 12, 10, 4, 2);
  fill(ctx, '#f0a060', 12, 19, 4, 2);
  // soft under-glow (in water)
  fill(ctx, 'rgba(255,200,150,0.25)', 8, 20, 12, 2);
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
