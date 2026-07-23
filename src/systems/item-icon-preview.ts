/**
 * Pure-canvas item icon data URLs for HTML modals (loot reveal).
 * No Phaser dependency.
 */

import { drawItemIcon } from './textures';

const SIZE = 32;

/** Scaled pixel-art icon as PNG data URL. */
export function itemIconDataUrl(templateId: string, scale = 4): string {
  const src = document.createElement('canvas');
  src.width = SIZE;
  src.height = SIZE;
  const sctx = src.getContext('2d');
  if (!sctx) return '';
  sctx.imageSmoothingEnabled = false;
  drawItemIcon(sctx, templateId);

  const out = document.createElement('canvas');
  out.width = SIZE * scale;
  out.height = SIZE * scale;
  const octx = out.getContext('2d');
  if (!octx) return '';
  octx.imageSmoothingEnabled = false;
  octx.drawImage(src, 0, 0, out.width, out.height);
  return out.toDataURL('image/png');
}
