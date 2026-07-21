/**
 * 16-bit style pixel helpers — outlines, shading, dither, vertical gradients.
 * Used by texture generation for SNES-era readability.
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

/** SNES-ish stone brick tile into ctx (size s). */
export function drawBrickTile(
  ctx: CanvasRenderingContext2D,
  s: number,
  base: string,
  face: string,
  mortar: string,
  hilite: string,
): void {
  ctx.fillStyle = mortar;
  ctx.fillRect(0, 0, s, s);
  const rowH = Math.floor(s / 2);
  // row 0
  shadedBlock(ctx, face, hilite, base, 1, 1, s - 2, rowH - 2);
  ctx.fillStyle = mortar;
  ctx.fillRect(Math.floor(s / 2) - 1, 1, 2, rowH - 1);
  // row 1 offset
  shadedBlock(ctx, face, hilite, base, 1, rowH + 1, Math.floor(s / 2) - 2, rowH - 2);
  shadedBlock(
    ctx,
    face,
    hilite,
    base,
    Math.floor(s / 2) + 1,
    rowH + 1,
    Math.floor(s / 2) - 2,
    rowH - 2,
  );
  // grit
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fillRect(3, 3, 1, 1);
  ctx.fillRect(s - 5, rowH + 3, 1, 1);
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.fillRect(6, 2, 2, 1);
}

/** Cobble / dungeon floor. */
export function drawFloorTile(
  ctx: CanvasRenderingContext2D,
  s: number,
  base: string,
  alt: string,
  grout: string,
): void {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, s, s);
  // four cobbles
  const half = s / 2;
  shadedBlock(ctx, alt, '#4a4060', grout, 1, 1, half - 2, half - 2);
  shadedBlock(ctx, base, '#3a3450', grout, half + 1, 1, half - 2, half - 2);
  shadedBlock(ctx, base, '#3a3450', grout, 1, half + 1, half - 2, half - 2);
  shadedBlock(ctx, alt, '#4a4060', grout, half + 1, half + 1, half - 2, half - 2);
  ctx.fillStyle = grout;
  ctx.fillRect(0, half - 1, s, 2);
  ctx.fillRect(half - 1, 0, 2, s);
  // moss flecks
  ctx.fillStyle = 'rgba(80,140,90,0.35)';
  ctx.fillRect(4, 5, 2, 1);
  ctx.fillRect(s - 8, s - 6, 2, 1);
}

/** Lush grass with blades. */
export function drawGrassTile(
  ctx: CanvasRenderingContext2D,
  s: number,
  base: string,
  blade: string,
  tip: string,
): void {
  vgrad(ctx, [blade, base, '#245a38'], 0, 0, s, s);
  const blades: [number, number, number][] = [
    [3, 8, 6],
    [7, 4, 9],
    [11, 10, 5],
    [15, 6, 8],
    [19, 12, 4],
    [23, 5, 7],
    [27, 9, 6],
    [5, 18, 5],
    [13, 20, 4],
    [21, 16, 7],
    [9, 14, 5],
    [25, 22, 3],
  ];
  for (const [x, y0, h] of blades) {
    if (x >= s) continue;
    ctx.fillStyle = tip;
    for (let i = 0; i < h; i++) {
      const yy = y0 + i;
      if (yy >= s) break;
      ctx.fillRect(x + (i % 2 === 0 ? 0 : 1), yy, 1, 1);
    }
    ctx.fillStyle = '#5ad47a';
    ctx.fillRect(x, y0, 1, 1);
  }
  // dirt patches
  ctx.fillStyle = 'rgba(80,60,40,0.25)';
  ctx.fillRect(10, 28, 4, 2);
  ctx.fillRect(22, 4, 3, 2);
}
