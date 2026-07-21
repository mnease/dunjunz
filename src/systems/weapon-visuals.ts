/**
 * Shared weapon silhouettes — avatar hip (32×32), inventory icons (32×32),
 * and swing FX. Each look must read at a glance (16-bit density).
 */

import type { WeaponLook } from './appearance';
import { block, fill, spark } from './pixel-art';

/**
 * Hip weapon on the 32×32 player sprite (right side, high contrast).
 */
export function drawWeaponAvatar(
  ctx: CanvasRenderingContext2D,
  look: WeaponLook,
): void {
  if (look === 'none') return;

  if (look === 'bow') {
    // Vertical recurve D
    fill(ctx, '#3a2410', 26, 8, 2, 18);
    fill(ctx, '#8b5a2b', 27, 10, 2, 14);
    fill(ctx, '#a06830', 28, 8, 2, 2);
    fill(ctx, '#a06830', 28, 24, 2, 2);
    fill(ctx, '#6b4423', 29, 12, 2, 10);
    // string
    fill(ctx, '#e8e0d0', 25, 10, 1, 2);
    fill(ctx, '#e8e0d0', 24, 15, 2, 2);
    fill(ctx, '#e8e0d0', 25, 22, 1, 2);
    // arrow
    fill(ctx, '#c8b090', 20, 15, 6, 2);
    fill(ctx, '#7dffb3', 18, 15, 3, 2);
    fill(ctx, '#ff6b9d', 26, 14, 2, 4);
    return;
  }

  if (look === 'crossbow') {
    fill(ctx, '#5a3d1a', 20, 16, 11, 5);
    fill(ctx, '#8b5a2b', 24, 10, 3, 16);
    fill(ctx, '#a06830', 21, 10, 9, 2);
    fill(ctx, '#a06830', 21, 24, 9, 2);
    fill(ctx, '#3a2410', 20, 11, 2, 12);
    fill(ctx, '#3a2410', 29, 11, 2, 12);
    fill(ctx, '#d0d0d8', 25, 12, 1, 10);
    fill(ctx, '#c8b090', 27, 17, 5, 2);
    fill(ctx, '#ff6b9d', 30, 16, 2, 4);
    fill(ctx, '#c9a227', 22, 18, 3, 2);
    return;
  }

  if (look === 'phaser') {
    block(ctx, '#1a1a22', '#0a0a10', 20, 16, 5, 9);
    block(ctx, '#3a3a48', '#1a1a22', 22, 12, 9, 7);
    fill(ctx, '#5a5a68', 22, 12, 9, 2);
    fill(ctx, '#2a2a35', 24, 15, 5, 2);
    block(ctx, '#ff2030', '#8a1018', 29, 14, 4, 4);
    fill(ctx, '#ff8890', 30, 15, 2, 2);
    fill(ctx, '#ffc857', 25, 14, 2, 2);
    fill(ctx, '#aaa', 23, 11, 2, 2);
    return;
  }

  if (look === 'staff') {
    fill(ctx, '#4a3018', 26, 6, 3, 22);
    fill(ctx, '#6b4423', 26, 10, 2, 16);
    fill(ctx, '#3a2010', 25, 14, 5, 1);
    fill(ctx, '#3a2010', 25, 20, 5, 1);
    block(ctx, '#2a8a5a', '#0a4a30', 24, 3, 8, 7);
    fill(ctx, '#7dffb3', 26, 4, 4, 4);
    spark(ctx, 27, 5, '#c9ffe0');
    return;
  }

  if (look === 'cleaver') {
    block(ctx, '#ff6b9d', '#6a2040', 22, 8, 9, 12);
    fill(ctx, '#ffb0c8', 23, 9, 4, 9);
    fill(ctx, '#c04070', 28, 8, 3, 12);
    fill(ctx, '#c9a227', 22, 19, 8, 2);
    fill(ctx, '#8b5a2b', 24, 21, 4, 6);
    return;
  }

  if (look === 'honk') {
    block(ctx, '#ffe08a', '#8a7030', 25, 6, 5, 16);
    fill(ctx, '#fff3c0', 25, 7, 2, 12);
    fill(ctx, '#c9a227', 23, 20, 8, 2);
    block(ctx, '#5ad45a', '#2a6a2a', 23, 22, 8, 7);
    fill(ctx, '#222', 27, 24, 2, 2);
    fill(ctx, '#ff8844', 29, 26, 3, 2);
    return;
  }

  if (look === 'saber') {
    fill(ctx, '#8a6030', 22, 20, 8, 2);
    fill(ctx, '#e8c070', 28, 6, 3, 4);
    fill(ctx, '#e8c070', 26, 9, 4, 4);
    fill(ctx, '#e8c070', 25, 12, 3, 4);
    fill(ctx, '#e8c070', 24, 15, 3, 5);
    fill(ctx, '#fff0c0', 28, 8, 1, 5);
    fill(ctx, '#c9a227', 23, 19, 6, 2);
    fill(ctx, '#6b4423', 25, 22, 4, 5);
    return;
  }

  if (look === 'iron') {
    block(ctx, '#8a98a8', '#3a4050', 25, 4, 5, 18);
    fill(ctx, '#5a6878', 27, 6, 2, 14);
    fill(ctx, '#c0c8d0', 25, 4, 5, 3);
    fill(ctx, '#4a4030', 22, 20, 10, 2);
    fill(ctx, '#6a5a40', 24, 22, 6, 5);
    spark(ctx, 26, 6);
    return;
  }

  // mild sword
  block(ctx, '#dfe6f0', '#607080', 25, 8, 5, 14);
  fill(ctx, '#ffffff', 25, 9, 2, 10);
  fill(ctx, '#c9a227', 23, 20, 9, 2);
  fill(ctx, '#8b5a2b', 25, 22, 4, 5);
  spark(ctx, 26, 10);
}

/**
 * Full 32×32 inventory / shop icon.
 */
export function drawWeaponIcon(
  ctx: CanvasRenderingContext2D,
  look: WeaponLook | string,
): void {
  if (look === 'bow') {
    fill(ctx, '#3a2410', 8, 4, 3, 24);
    fill(ctx, '#3a2410', 21, 4, 3, 24);
    for (let i = 0; i < 10; i++) {
      const y = 4 + i * 2;
      const inset = i < 5 ? 4 - Math.floor(i / 2) : Math.floor((i - 5) / 2);
      fill(ctx, '#8b5a2b', 6 + inset, y, 3, 2);
      fill(ctx, '#8b5a2b', 23 - inset, y, 3, 2);
    }
    fill(ctx, '#a06830', 10, 6, 2, 20);
    fill(ctx, '#a06830', 20, 6, 2, 20);
    fill(ctx, '#e8e0d0', 12, 7, 1, 18);
    fill(ctx, '#c8b090', 4, 14, 18, 3);
    fill(ctx, '#7dffb3', 2, 14, 4, 3);
    fill(ctx, '#ff6b9d', 20, 13, 4, 5);
    return;
  }

  if (look === 'crossbow') {
    fill(ctx, '#5a3d1a', 4, 13, 20, 6);
    fill(ctx, '#8b5a2b', 12, 4, 5, 24);
    fill(ctx, '#a06830', 6, 4, 16, 3);
    fill(ctx, '#a06830', 6, 25, 16, 3);
    fill(ctx, '#3a2410', 5, 6, 3, 18);
    fill(ctx, '#3a2410', 20, 6, 3, 18);
    fill(ctx, '#d0d0d8', 13, 7, 2, 16);
    fill(ctx, '#c8b090', 14, 14, 14, 3);
    fill(ctx, '#ff6b9d', 26, 13, 5, 5);
    fill(ctx, '#c9a227', 8, 15, 4, 3);
    return;
  }

  if (look === 'phaser') {
    block(ctx, '#1a1a22', '#0a0a10', 5, 14, 8, 12);
    block(ctx, '#3a3a48', '#1a1a22', 8, 8, 16, 10);
    fill(ctx, '#5a5a68', 8, 8, 16, 3);
    fill(ctx, '#2a2a35', 11, 12, 8, 3);
    block(ctx, '#ff2030', '#8a1018', 22, 10, 8, 6);
    fill(ctx, '#ff8890', 24, 12, 4, 2);
    fill(ctx, '#ffc857', 12, 12, 3, 3);
    fill(ctx, '#aaa', 9, 6, 3, 3);
    return;
  }

  if (look === 'staff') {
    fill(ctx, '#4a3018', 13, 8, 6, 22);
    fill(ctx, '#6b4423', 14, 10, 4, 18);
    fill(ctx, '#3a2010', 12, 14, 8, 2);
    fill(ctx, '#3a2010', 12, 20, 8, 2);
    block(ctx, '#2a8a5a', '#0a4a30', 10, 2, 12, 10);
    fill(ctx, '#7dffb3', 13, 4, 6, 6);
    spark(ctx, 15, 5, '#c9ffe0');
    spark(ctx, 16, 7, '#ffffff');
    return;
  }

  if (look === 'cleaver') {
    block(ctx, '#ff6b9d', '#6a2040', 6, 3, 18, 16);
    fill(ctx, '#ffb0c8', 8, 5, 8, 12);
    fill(ctx, '#c04070', 20, 4, 4, 14);
    fill(ctx, '#c9a227', 8, 18, 12, 3);
    fill(ctx, '#8b5a2b', 12, 21, 6, 8);
    return;
  }

  if (look === 'honk') {
    block(ctx, '#ffe08a', '#8a7030', 12, 2, 8, 18);
    fill(ctx, '#fff3c0', 13, 3, 3, 14);
    fill(ctx, '#c9a227', 9, 18, 14, 3);
    block(ctx, '#5ad45a', '#2a6a2a', 10, 21, 12, 8);
    fill(ctx, '#222', 16, 23, 2, 2);
    fill(ctx, '#ff8844', 20, 25, 5, 3);
    return;
  }

  if (look === 'saber') {
    fill(ctx, '#8a6030', 7, 18, 14, 3);
    const curve: [number, number, number, number][] = [
      [18, 3, 6, 5],
      [15, 6, 7, 5],
      [13, 10, 6, 5],
      [12, 14, 5, 5],
    ];
    for (const [x, y, w, h] of curve) fill(ctx, '#e8c070', x, y, w, h);
    fill(ctx, '#fff0c0', 19, 5, 2, 6);
    fill(ctx, '#c9a227', 8, 17, 12, 3);
    fill(ctx, '#6b4423', 12, 21, 6, 8);
    return;
  }

  if (look === 'iron') {
    block(ctx, '#8a98a8', '#3a4050', 12, 2, 8, 18);
    fill(ctx, '#5a6878', 15, 4, 2, 14);
    fill(ctx, '#c0c8d0', 12, 2, 8, 4);
    fill(ctx, '#4a4030', 7, 18, 18, 4);
    fill(ctx, '#6a5a40', 12, 22, 8, 8);
    spark(ctx, 14, 4);
    return;
  }

  // mild sword
  block(ctx, '#dfe6f0', '#607080', 13, 3, 6, 16);
  fill(ctx, '#ffffff', 14, 4, 2, 12);
  fill(ctx, '#c9a227', 8, 17, 16, 4);
  fill(ctx, '#8b5a2b', 13, 21, 6, 8);
  fill(ctx, '#ffc857', 14, 18, 4, 2);
  spark(ctx, 15, 5);
}

/**
 * Attack swing / held weapon FX (24×24).
 */
export function drawWeaponSwing(
  ctx: CanvasRenderingContext2D,
  look: WeaponLook,
): void {
  if (look === 'bow' || look === 'crossbow') {
    fill(ctx, '#c8b090', 2, 10, 16, 4);
    fill(ctx, look === 'crossbow' ? '#ff6b9d' : '#7dffb3', 16, 8, 6, 8);
    fill(ctx, '#ff6b9d', 1, 8, 4, 8);
    return;
  }
  if (look === 'phaser') {
    fill(ctx, '#3a3a48', 2, 8, 12, 8);
    fill(ctx, '#ff2030', 12, 10, 10, 4);
    fill(ctx, '#ffc857', 5, 10, 3, 3);
    return;
  }
  if (look === 'staff') {
    fill(ctx, '#6b4423', 10, 4, 5, 16);
    block(ctx, '#7dffb3', '#2a8a5a', 7, 2, 11, 8);
    spark(ctx, 11, 4);
    return;
  }
  if (look === 'cleaver') {
    fill(ctx, '#ff6b9d', 4, 2, 14, 12);
    fill(ctx, '#c04070', 14, 2, 5, 12);
    fill(ctx, '#8b5a2b', 9, 14, 6, 8);
    return;
  }
  if (look === 'honk') {
    fill(ctx, '#ffe08a', 8, 1, 7, 14);
    fill(ctx, '#5ad45a', 6, 14, 10, 7);
    return;
  }
  if (look === 'saber') {
    fill(ctx, '#e8c070', 14, 1, 5, 5);
    fill(ctx, '#e8c070', 11, 5, 6, 5);
    fill(ctx, '#e8c070', 8, 9, 6, 6);
    fill(ctx, '#c9a227', 6, 14, 10, 3);
    return;
  }
  if (look === 'iron') {
    fill(ctx, '#8a98a8', 8, 0, 7, 16);
    fill(ctx, '#5a6878', 11, 2, 2, 12);
    fill(ctx, '#4a4030', 4, 14, 14, 4);
    return;
  }
  fill(ctx, '#dfe6f0', 9, 0, 6, 16);
  fill(ctx, '#fff', 10, 1, 2, 12);
  fill(ctx, '#c9a227', 6, 14, 12, 4);
  fill(ctx, '#8b5a2b', 9, 18, 6, 5);
}

export function swingTextureKey(look: WeaponLook): string {
  if (look === 'none') return 'sword-swing';
  return `swing_${look}`;
}

/** Map item template id → weapon look for icons / FX. */
export function weaponLookFromTemplateId(id: string): WeaponLook | null {
  switch (id) {
    case 'mild_sword':
      return 'sword';
    case 'iron_blade':
      return 'iron';
    case 'sand_saber':
      return 'saber';
    case 'dunjun_cleaver':
      return 'cleaver';
    case 'honk_blade':
      return 'honk';
    case 'phaser':
      return 'phaser';
    case 'short_bow':
      return 'bow';
    case 'hunter_crossbow':
      return 'crossbow';
    case 'wizard_staff':
      return 'staff';
    default:
      return null;
  }
}
