/**
 * Canvas portraits for Male / Female identity pick (binary only).
 * Pure DOM/canvas — no Phaser required.
 */

import {
  cartoonFace,
  fill,
  hairMass,
  shadedBlock,
  spark,
} from './pixel-art';

export type PreviewGender = 'male' | 'female';

const SIZE = 32;

/**
 * Draw a bare human adventurer silhouette for the given binary gender.
 * Distinct proportions + hair so they read at a glance when scaled up.
 */
export function drawGenderPreview(
  ctx: CanvasRenderingContext2D,
  gender: PreviewGender,
): void {
  // Transparent / dark void so it reads on modal panel
  ctx.clearRect(0, 0, SIZE, SIZE);
  fill(ctx, '#0c0e14', 0, 0, SIZE, SIZE);

  if (gender === 'male') {
    drawMaleAdventurer(ctx);
  } else {
    drawFemaleAdventurer(ctx);
  }
}

function drawMaleAdventurer(ctx: CanvasRenderingContext2D): void {
  // Shadow
  fill(ctx, 'rgba(0,0,0,0.35)', 8, 28, 16, 3);
  // Boots
  shadedBlock(ctx, '#3d2b1f', '#5a4030', '#1a1008', 9, 25, 5, 4);
  shadedBlock(ctx, '#3d2b1f', '#5a4030', '#1a1008', 18, 25, 5, 4);
  // Legs (broader stance)
  shadedBlock(ctx, '#2a3a5a', '#3a5080', '#1a2840', 10, 20, 5, 6);
  shadedBlock(ctx, '#2a3a5a', '#3a5080', '#1a2840', 17, 20, 5, 6);
  // Torso (wider shoulders)
  shadedBlock(ctx, '#2d6cdf', '#5a9aff', '#1a4aaf', 8, 11, 16, 11);
  fill(ctx, '#4a8cef', 10, 13, 12, 3);
  fill(ctx, '#c9a227', 11, 19, 10, 2); // belt
  // Arms
  shadedBlock(ctx, '#e8c4a0', '#ffe0c8', '#c09070', 5, 12, 4, 8);
  shadedBlock(ctx, '#e8c4a0', '#ffe0c8', '#c09070', 23, 12, 4, 8);
  // Head
  cartoonFace(ctx, 10, 4, 12, 9);
  // Short hair
  hairMass(ctx, 10, 4, 12, { color: '#3d2b1f', bangs: true });
  // Mild sword on hip (male adventurer cue)
  fill(ctx, '#9aabc0', 26, 14, 3, 10);
  fill(ctx, '#e0e8f0', 26, 14, 1, 8);
  fill(ctx, '#c9a227', 25, 22, 5, 2);
  spark(ctx, 27, 15, '#ffffff');
}

function drawFemaleAdventurer(ctx: CanvasRenderingContext2D): void {
  // Shadow
  fill(ctx, 'rgba(0,0,0,0.35)', 9, 28, 14, 3);
  // Boots
  shadedBlock(ctx, '#3d2b1f', '#5a4030', '#1a1008', 10, 25, 4, 4);
  shadedBlock(ctx, '#3d2b1f', '#5a4030', '#1a1008', 18, 25, 4, 4);
  // Legs (narrower)
  shadedBlock(ctx, '#2a3a5a', '#3a5080', '#1a2840', 11, 20, 4, 6);
  shadedBlock(ctx, '#2a3a5a', '#3a5080', '#1a2840', 17, 20, 4, 6);
  // Torso (slightly narrower shoulders, longer tunic flare)
  shadedBlock(ctx, '#2d6cdf', '#5a9aff', '#1a4aaf', 9, 11, 14, 11);
  fill(ctx, '#4a8cef', 11, 13, 10, 3);
  fill(ctx, '#1a4aaf', 10, 20, 12, 3); // tunic hem
  fill(ctx, '#c9a227', 12, 19, 8, 2);
  // Arms
  shadedBlock(ctx, '#e8c4a0', '#ffe0c8', '#c09070', 6, 12, 3, 8);
  shadedBlock(ctx, '#e8c4a0', '#ffe0c8', '#c09070', 23, 12, 3, 8);
  // Head
  cartoonFace(ctx, 10, 4, 12, 9, { soft: true });
  // Longer hair — sides + back length
  hairMass(ctx, 10, 4, 12, { color: '#4a3020', bangs: true });
  fill(ctx, '#3d2b1f', 8, 8, 3, 10); // left length
  fill(ctx, '#4a3020', 9, 9, 2, 9);
  fill(ctx, '#3d2b1f', 21, 8, 3, 10); // right length
  fill(ctx, '#4a3020', 21, 9, 2, 9);
  fill(ctx, '#6b4423', 10, 16, 2, 1);
  fill(ctx, '#6b4423', 20, 16, 2, 1);
  // Bow cue on back (female adventurer silhouette)
  fill(ctx, '#8b5a2b', 24, 8, 2, 12);
  fill(ctx, '#c8b090', 22, 12, 6, 1);
  spark(ctx, 25, 10, '#e8c070');
}

/** Build a scaled data-URL for an identity portrait (crisp pixels). */
export function genderPreviewDataUrl(
  gender: PreviewGender,
  scale = 6,
): string {
  const src = document.createElement('canvas');
  src.width = SIZE;
  src.height = SIZE;
  const sctx = src.getContext('2d');
  if (!sctx) return '';
  sctx.imageSmoothingEnabled = false;
  drawGenderPreview(sctx, gender);

  const out = document.createElement('canvas');
  out.width = SIZE * scale;
  out.height = SIZE * scale;
  const octx = out.getContext('2d');
  if (!octx) return '';
  octx.imageSmoothingEnabled = false;
  octx.drawImage(src, 0, 0, out.width, out.height);
  return out.toDataURL('image/png');
}
