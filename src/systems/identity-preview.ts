/**
 * Beach identity portraits — race × gender via shared drawBodyBase.
 * Pure DOM/canvas — no Phaser required.
 */

import type { RaceId } from './races';
import { drawBodyBase } from './body-visuals';
import { fill } from './pixel-art';

export type PreviewGender = 'male' | 'female';

const SIZE = 32;

/**
 * Draw bare race×gender adventurer for identity pick (matches in-game body).
 */
export function drawIdentityPreview(
  ctx: CanvasRenderingContext2D,
  race: RaceId,
  gender: PreviewGender,
): void {
  ctx.clearRect(0, 0, SIZE, SIZE);
  fill(ctx, '#0c0e14', 0, 0, SIZE, SIZE);
  drawBodyBase(ctx, { race, gender }, 0, { bareHead: true });
}

/** @deprecated Use drawIdentityPreview — kept name for older call sites. */
export function drawGenderPreview(
  ctx: CanvasRenderingContext2D,
  gender: PreviewGender,
  race: RaceId = 'human',
): void {
  drawIdentityPreview(ctx, race, gender);
}

/** Build a scaled data-URL for an identity portrait (crisp pixels). */
export function identityPreviewDataUrl(
  race: RaceId,
  gender: PreviewGender,
  scale = 6,
): string {
  const src = document.createElement('canvas');
  src.width = SIZE;
  src.height = SIZE;
  const sctx = src.getContext('2d');
  if (!sctx) return '';
  sctx.imageSmoothingEnabled = false;
  drawIdentityPreview(sctx, race, gender);

  const out = document.createElement('canvas');
  out.width = SIZE * scale;
  out.height = SIZE * scale;
  const octx = out.getContext('2d');
  if (!octx) return '';
  octx.imageSmoothingEnabled = false;
  octx.drawImage(src, 0, 0, out.width, out.height);
  return out.toDataURL('image/png');
}

/** @deprecated Prefer identityPreviewDataUrl(race, gender, scale). */
export function genderPreviewDataUrl(
  gender: PreviewGender,
  scale = 6,
  race: RaceId = 'human',
): string {
  return identityPreviewDataUrl(race, gender, scale);
}
