/**
 * Pure-canvas item icon data URLs for HTML modals (loot reveal).
 * 64-bit density — no Phaser dependency.
 */

import { ART_BASE, ART_RES } from '../config';
import { drawItemIcon } from './textures';

/** Scaled pixel-art icon as PNG data URL (source ART_RES). */
export function itemIconDataUrl(templateId: string, scale = 3): string {
  const src = document.createElement('canvas');
  src.width = ART_RES;
  src.height = ART_RES;
  const sctx = src.getContext('2d');
  if (!sctx) return '';
  sctx.imageSmoothingEnabled = false;
  sctx.save();
  const artScale = ART_RES / ART_BASE;
  if (artScale !== 1) sctx.scale(artScale, artScale);
  drawItemIcon(sctx, templateId);
  sctx.restore();

  const out = document.createElement('canvas');
  out.width = ART_RES * scale;
  out.height = ART_RES * scale;
  const octx = out.getContext('2d');
  if (!octx) return '';
  octx.imageSmoothingEnabled = false;
  octx.drawImage(src, 0, 0, out.width, out.height);
  return out.toDataURL('image/png');
}
