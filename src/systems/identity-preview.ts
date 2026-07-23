/**
 * Beach identity portraits — race × gender via shared drawBodyBase.
 * Pure DOM/canvas — no Phaser required. 64-bit density (ART_RES).
 */

import { ART_BASE, ART_RES } from '../config';
import type { RaceId } from './races';
import { drawBodyBase } from './body-visuals';
import { fill } from './pixel-art';

export type PreviewGender = 'male' | 'female';

/**
 * Draw bare race×gender adventurer for identity pick (matches in-game body).
 * Renders at ART_RES with 2× scale from body metrics (ART_BASE).
 */
export function drawIdentityPreview(
  ctx: CanvasRenderingContext2D,
  race: RaceId,
  gender: PreviewGender,
): void {
  const s = ctx.canvas?.width || ART_RES;
  ctx.clearRect(0, 0, s, s);
  fill(ctx, '#0c0e14', 0, 0, s, s);
  ctx.save?.();
  if (ctx.imageSmoothingEnabled !== undefined) {
    ctx.imageSmoothingEnabled = false;
  }
  const scale = s / ART_BASE;
  if (scale !== 1 && typeof ctx.scale === 'function') ctx.scale(scale, scale);
  drawBodyBase(ctx, { race, gender }, 0, { bareHead: true });
  ctx.restore?.();
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
  scale = 4,
): string {
  const src = document.createElement('canvas');
  src.width = ART_RES;
  src.height = ART_RES;
  const sctx = src.getContext('2d');
  if (!sctx) return '';
  sctx.imageSmoothingEnabled = false;
  drawIdentityPreview(sctx, race, gender);

  const out = document.createElement('canvas');
  out.width = ART_RES * scale;
  out.height = ART_RES * scale;
  const octx = out.getContext('2d');
  if (!octx) return '';
  octx.imageSmoothingEnabled = false;
  octx.drawImage(src, 0, 0, out.width, out.height);
  return out.toDataURL('image/png');
}

/** @deprecated Prefer identityPreviewDataUrl(race, gender, scale). */
export function genderPreviewDataUrl(
  gender: PreviewGender,
  scale = 4,
  race: RaceId = 'human',
): string {
  return identityPreviewDataUrl(race, gender, scale);
}
