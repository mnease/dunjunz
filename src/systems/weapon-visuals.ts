/**
 * Shared weapon silhouettes — avatar hip (32×32), inventory icons (32×32),
 * and swing FX. 32-bit craft density (EMA): edge hilite, tip gleam, clear guard.
 */

import type { WeaponLook } from './appearance';
import { bladeVertical, block, fill, hiltBelow, spark } from './pixel-art';

/**
 * Hip weapon on the 32×32 player sprite (right side, high contrast).
 */
export function drawWeaponAvatar(
  ctx: CanvasRenderingContext2D,
  look: WeaponLook,
): void {
  if (look === 'none') return;

  if (look === 'bow' || look === 'longbow' || look === 'magic_bow') {
    const tall = look === 'longbow';
    const magic = look === 'magic_bow';
    const wood = magic ? '#4a3060' : '#8b5a2b';
    const woodHi = magic ? '#7a50a0' : '#a06830';
    const limb = magic ? '#c090ff' : '#c9a070';
    // Vertical recurve; longbow taller; magic tinted purple
    fill(ctx, '#2a1810', 25, tall ? 5 : 7, 2, tall ? 22 : 18);
    fill(ctx, wood, 26, tall ? 6 : 8, 3, tall ? 20 : 16);
    fill(ctx, woodHi, 27, tall ? 5 : 7, 2, 2);
    fill(ctx, woodHi, 27, tall ? 25 : 23, 2, 2);
    fill(ctx, limb, 28, tall ? 8 : 10, 1, tall ? 16 : 12);
    fill(ctx, magic ? '#e0c0ff' : '#e8e0d0', 24, tall ? 7 : 9, 1, 2);
    fill(ctx, magic ? '#e0c0ff' : '#e8e0d0', 23, 14, 2, 3);
    fill(ctx, magic ? '#e0c0ff' : '#e8e0d0', 24, tall ? 23 : 21, 1, 2);
    fill(ctx, magic ? '#d0a0ff' : '#c8b090', 19, 14, 7, 2);
    fill(ctx, magic ? '#b070ff' : '#7dffb3', 17, 14, 3, 2);
    fill(ctx, magic ? '#ff90e0' : '#ff6b9d', 25, 13, 2, 4);
    spark(ctx, 18, 14, magic ? '#e8d0ff' : '#c9ffe0');
    return;
  }

  if (look === 'crossbow') {
    fill(ctx, '#5a3d1a', 19, 15, 12, 5);
    fill(ctx, '#8b5a2b', 23, 9, 4, 17);
    fill(ctx, '#a06830', 20, 9, 10, 2);
    fill(ctx, '#a06830', 20, 24, 10, 2);
    fill(ctx, '#3a2410', 19, 10, 2, 13);
    fill(ctx, '#3a2410', 29, 10, 2, 13);
    fill(ctx, '#e8e0d0', 24, 11, 1, 11);
    fill(ctx, '#c8b090', 26, 16, 5, 2);
    fill(ctx, '#ff6b9d', 29, 15, 3, 4);
    fill(ctx, '#c9a227', 21, 17, 3, 2);
    spark(ctx, 30, 16, '#ffb0c8');
    return;
  }

  if (look === 'phaser') {
    block(ctx, '#1a1a22', '#0a0a10', 20, 15, 5, 10);
    block(ctx, '#3a3a48', '#1a1a22', 21, 11, 10, 8);
    fill(ctx, '#6a6a78', 21, 11, 10, 2);
    fill(ctx, '#2a2a35', 23, 14, 6, 2);
    block(ctx, '#ff2030', '#8a1018', 28, 13, 4, 5);
    fill(ctx, '#ff8890', 29, 14, 2, 2);
    fill(ctx, '#ffc857', 24, 13, 2, 2);
    fill(ctx, '#d0d0d8', 22, 10, 2, 2);
    spark(ctx, 30, 14, '#ffffff');
    return;
  }

  if (
    look === 'axe' ||
    look === 'battle_axe' ||
    look === 'iron_axe' ||
    look === 'greataxe'
  ) {
    const iron = look === 'iron_axe';
    const battle = look === 'battle_axe';
    const great = look === 'greataxe';
    const bit = iron ? '#9aabc0' : great ? '#c0c8d0' : '#9aabc0';
    const bitHi = iron ? '#e0e8f0' : great ? '#ffffff' : '#e0e8f0';
    const bitSh = iron ? '#4a5060' : '#3a4050';
    // Hip hatchet / battle / great — bit left of haft (not a sword)
    fill(ctx, '#3a2010', 24, great ? 10 : 12, 4, great ? 16 : 14);
    fill(ctx, '#8b5a2b', 25, great ? 11 : 13, 2, great ? 14 : 12);
    fill(ctx, bitSh, 16, great ? 6 : 8, battle || great ? 13 : 12, battle || great ? 11 : 9);
    fill(ctx, bit, 17, great ? 7 : 9, battle || great ? 10 : 9, battle || great ? 8 : 6);
    fill(ctx, bitHi, 17, great ? 7 : 9, 3, battle || great ? 6 : 5);
    if (battle || great) {
      // second bit (double-bit) peeks right
      fill(ctx, bitSh, 26, great ? 8 : 10, 5, 7);
      fill(ctx, bit, 26, great ? 9 : 11, 4, 5);
    }
    fill(ctx, '#c9a227', 23, 15, 5, 2);
    spark(ctx, 18, great ? 8 : 10, '#ffffff');
    return;
  }

  if (
    look === 'staff' ||
    look === 'staff_lightning' ||
    look === 'staff_fire' ||
    look === 'staff_ice'
  ) {
    const crystal =
      look === 'staff_lightning'
        ? { deep: '#1a6aaa', mid: '#4ac0ff', hi: '#c0ecff', spark: '#e0f8ff' }
        : look === 'staff_fire'
          ? { deep: '#8a2010', mid: '#ff5030', hi: '#ffb080', spark: '#ffe0a0' }
          : look === 'staff_ice'
            ? { deep: '#0a2048', mid: '#2a60a0', hi: '#80b0e0', spark: '#c0e0ff' }
            : { deep: '#0a4a30', mid: '#2a8a5a', hi: '#7dffb3', spark: '#c9ffe0' };
    fill(ctx, '#3a2010', 25, 5, 4, 23);
    fill(ctx, '#6b4423', 26, 7, 2, 19);
    fill(ctx, '#8b5a2b', 26, 9, 1, 15);
    fill(ctx, '#2a1810', 24, 13, 6, 1);
    fill(ctx, '#2a1810', 24, 19, 6, 1);
    block(ctx, crystal.mid, crystal.deep, 23, 2, 9, 8);
    fill(ctx, crystal.hi, 25, 3, 5, 5);
    fill(ctx, crystal.spark, 26, 4, 2, 2);
    spark(ctx, 27, 4, '#ffffff');
    spark(ctx, 25, 6, crystal.hi);
    return;
  }

  if (look === 'cleaver') {
    // Wide pink cleaver — sharp top edge
    fill(ctx, '#6a2040', 21, 7, 10, 13);
    fill(ctx, '#ff6b9d', 22, 8, 8, 11);
    fill(ctx, '#ffb0c8', 22, 8, 3, 10); // edge hilite
    fill(ctx, '#c04070', 28, 8, 2, 11); // back bevel
    fill(ctx, '#ffffff', 23, 8, 2, 1); // tip gleam
    fill(ctx, '#c9a227', 21, 19, 9, 2);
    fill(ctx, '#5a3d1a', 24, 21, 4, 6);
    fill(ctx, '#8b5a2b', 25, 21, 2, 5);
    return;
  }

  if (look === 'honk') {
    fill(ctx, '#8a7030', 24, 5, 6, 17);
    fill(ctx, '#ffe08a', 25, 6, 4, 15);
    fill(ctx, '#fff3c0', 25, 7, 2, 12);
    fill(ctx, '#c9a227', 22, 19, 9, 2);
    block(ctx, '#5ad45a', '#2a6a2a', 22, 21, 9, 8);
    fill(ctx, '#222', 26, 23, 2, 2);
    spark(ctx, 26, 23, '#ffffff');
    fill(ctx, '#ff8844', 28, 25, 3, 2);
    return;
  }

  if (look === 'saber') {
    // Curved sand saber — stepped tip, bright edge
    fill(ctx, '#8a6030', 22, 19, 8, 2);
    fill(ctx, '#c9a040', 27, 5, 4, 4);
    fill(ctx, '#e8c070', 26, 8, 4, 4);
    fill(ctx, '#e8c070', 25, 11, 4, 4);
    fill(ctx, '#e8c070', 24, 14, 4, 5);
    fill(ctx, '#fff0c0', 27, 6, 1, 8); // edge
    fill(ctx, '#a07030', 29, 8, 1, 8); // back
    spark(ctx, 28, 5, '#ffffff');
    fill(ctx, '#c9a227', 23, 18, 6, 2);
    fill(ctx, '#5a3d1a', 25, 21, 4, 6);
    fill(ctx, '#8b5a2b', 26, 21, 2, 5);
    return;
  }

  if (look === 'iron') {
    bladeVertical(ctx, 25, 3, 5, 18, '#9aabc0', '#e0e8f0', '#4a5060', '#2a3040');
    fill(ctx, '#c0c8d0', 25, 3, 5, 2);
    hiltBelow(ctx, 27, 20, 10);
    return;
  }

  // mild sword — sharp steel
  bladeVertical(ctx, 25, 6, 5, 15, '#dfe6f0', '#ffffff', '#607080', '#3a4050');
  hiltBelow(ctx, 27, 20, 9);
}

/**
 * Full 32×32 inventory / shop icon.
 */
export function drawWeaponIcon(
  ctx: CanvasRenderingContext2D,
  look: WeaponLook | string,
): void {
  if (look === 'bow' || look === 'longbow' || look === 'magic_bow') {
    const tall = look === 'longbow';
    const magic = look === 'magic_bow';
    const wood = magic ? '#4a3060' : '#8b5a2b';
    const woodHi = magic ? '#7a50a0' : '#a06830';
    const tip = magic ? '#b070ff' : '#7dffb3';
    const fletch = magic ? '#ff90e0' : '#ff6b9d';
    const y0 = tall ? 1 : 3;
    const h = tall ? 30 : 26;
    fill(ctx, '#2a1810', 7, y0, 3, h);
    fill(ctx, '#2a1810', 22, y0, 3, h);
    for (let i = 0; i < (tall ? 13 : 11); i++) {
      const y = y0 + i * 2;
      const inset = i < 5 ? 4 - Math.floor(i / 2) : Math.floor((i - 5) / 2);
      fill(ctx, wood, 5 + inset, y, 3, 2);
      fill(ctx, wood, 24 - inset, y, 3, 2);
    }
    fill(ctx, woodHi, 9, y0 + 2, 2, h - 4);
    fill(ctx, woodHi, 21, y0 + 2, 2, h - 4);
    fill(ctx, magic ? '#e0c0ff' : '#e8e0d0', 12, y0 + 3, 1, h - 6);
    fill(ctx, magic ? '#d0a0ff' : '#c8b090', 3, 13, 20, 3);
    fill(ctx, tip, 1, 13, 4, 3);
    fill(ctx, fletch, 21, 12, 5, 5);
    spark(ctx, 2, 14, magic ? '#e8d0ff' : '#c9ffe0');
    return;
  }

  if (look === 'crossbow') {
    fill(ctx, '#5a3d1a', 3, 12, 22, 7);
    fill(ctx, '#8b5a2b', 11, 3, 6, 26);
    fill(ctx, '#a06830', 5, 3, 18, 3);
    fill(ctx, '#a06830', 5, 26, 18, 3);
    fill(ctx, '#3a2410', 4, 5, 3, 20);
    fill(ctx, '#3a2410', 21, 5, 3, 20);
    fill(ctx, '#e8e0d0', 13, 6, 2, 18);
    fill(ctx, '#c8b090', 13, 13, 15, 3);
    fill(ctx, '#ff6b9d', 26, 12, 5, 5);
    fill(ctx, '#c9a227', 7, 14, 4, 3);
    spark(ctx, 28, 13, '#ffb0c8');
    return;
  }

  if (look === 'phaser') {
    block(ctx, '#1a1a22', '#0a0a10', 4, 13, 9, 13);
    block(ctx, '#3a3a48', '#1a1a22', 7, 7, 17, 11);
    fill(ctx, '#6a6a78', 7, 7, 17, 3);
    fill(ctx, '#2a2a35', 10, 12, 9, 3);
    block(ctx, '#ff2030', '#8a1018', 21, 9, 9, 7);
    fill(ctx, '#ff8890', 23, 11, 5, 3);
    fill(ctx, '#ffc857', 11, 11, 3, 3);
    fill(ctx, '#d0d0d8', 8, 5, 3, 3);
    spark(ctx, 26, 11, '#ffffff');
    return;
  }

  if (
    look === 'axe' ||
    look === 'battle_axe' ||
    look === 'iron_axe' ||
    look === 'greataxe'
  ) {
    const iron = look === 'iron_axe';
    const battle = look === 'battle_axe';
    const great = look === 'greataxe';
    const bit = iron ? '#9aabc0' : great ? '#c0c8d0' : '#8a98a8';
    const bitHi = iron ? '#e0e8f0' : great ? '#ffffff' : '#c0c8d0';
    const bitSh = iron ? '#4a5060' : '#5a6578';
    fill(ctx, '#3a2010', 14, great ? 6 : 8, 5, great ? 22 : 20);
    fill(ctx, '#6b4423', 15, great ? 7 : 9, 3, great ? 20 : 18);
    fill(ctx, bitSh, 6, great ? 2 : 4, battle || great ? 20 : 18, great ? 14 : 12);
    fill(ctx, bit, 8, great ? 3 : 5, battle || great ? 15 : 13, great ? 11 : 9);
    fill(ctx, bitHi, 8, great ? 3 : 5, 5, great ? 8 : 7);
    if (battle || great) {
      fill(ctx, bitSh, 20, great ? 4 : 6, 8, 10);
      fill(ctx, bit, 21, great ? 5 : 7, 6, 7);
    }
    fill(ctx, '#c9a227', 12, 14, 8, 3);
    spark(ctx, 9, great ? 4 : 6, '#ffffff');
    return;
  }

  if (
    look === 'staff' ||
    look === 'staff_lightning' ||
    look === 'staff_fire' ||
    look === 'staff_ice'
  ) {
    const crystal =
      look === 'staff_lightning'
        ? { deep: '#1a6aaa', mid: '#4ac0ff', hi: '#c0ecff', spark: '#e0f8ff' }
        : look === 'staff_fire'
          ? { deep: '#8a2010', mid: '#ff5030', hi: '#ffb080', spark: '#ffe0a0' }
          : look === 'staff_ice'
            ? { deep: '#0a2048', mid: '#2a60a0', hi: '#80b0e0', spark: '#c0e0ff' }
            : { deep: '#0a4a30', mid: '#2a8a5a', hi: '#7dffb3', spark: '#c9ffe0' };
    fill(ctx, '#3a2010', 12, 7, 7, 23);
    fill(ctx, '#6b4423', 13, 9, 5, 19);
    fill(ctx, '#8b5a2b', 14, 11, 2, 15);
    fill(ctx, '#2a1810', 11, 13, 9, 2);
    fill(ctx, '#2a1810', 11, 19, 9, 2);
    block(ctx, crystal.mid, crystal.deep, 9, 1, 14, 11);
    fill(ctx, crystal.hi, 12, 3, 8, 7);
    fill(ctx, crystal.spark, 14, 4, 3, 3);
    spark(ctx, 15, 4, '#ffffff');
    spark(ctx, 13, 7, crystal.hi);
    return;
  }

  if (look === 'cleaver') {
    fill(ctx, '#6a2040', 5, 2, 20, 17);
    fill(ctx, '#ff6b9d', 7, 3, 16, 15);
    fill(ctx, '#ffb0c8', 7, 3, 5, 14);
    fill(ctx, '#c04070', 20, 3, 3, 15);
    fill(ctx, '#ffffff', 8, 3, 4, 2);
    fill(ctx, '#c9a227', 7, 17, 14, 3);
    fill(ctx, '#5a3d1a', 11, 20, 7, 9);
    fill(ctx, '#8b5a2b', 13, 21, 3, 7);
    return;
  }

  if (look === 'honk') {
    fill(ctx, '#8a7030', 11, 1, 10, 19);
    fill(ctx, '#ffe08a', 12, 2, 8, 17);
    fill(ctx, '#fff3c0', 13, 3, 3, 14);
    fill(ctx, '#c9a227', 8, 17, 16, 3);
    block(ctx, '#5ad45a', '#2a6a2a', 9, 20, 14, 9);
    fill(ctx, '#222', 15, 22, 3, 3);
    spark(ctx, 15, 22, '#ffffff');
    fill(ctx, '#ff8844', 19, 24, 5, 3);
    return;
  }

  if (look === 'saber') {
    fill(ctx, '#8a6030', 8, 18, 14, 3);
    fill(ctx, '#e8c070', 18, 2, 8, 6);
    fill(ctx, '#e8c070', 15, 7, 9, 5);
    fill(ctx, '#e8c070', 12, 11, 9, 5);
    fill(ctx, '#e8c070', 10, 15, 8, 4);
    fill(ctx, '#fff0c0', 20, 3, 2, 10);
    spark(ctx, 22, 2, '#ffffff');
    fill(ctx, '#c9a227', 10, 17, 10, 3);
    fill(ctx, '#5a3d1a', 13, 20, 6, 9);
    fill(ctx, '#8b5a2b', 15, 21, 2, 7);
    return;
  }

  if (look === 'iron') {
    bladeVertical(ctx, 12, 2, 8, 18, '#9aabc0', '#e0e8f0', '#4a5060', '#2a3040');
    hiltBelow(ctx, 16, 19, 14);
    return;
  }

  // mild sword default
  bladeVertical(ctx, 12, 3, 8, 17, '#dfe6f0', '#ffffff', '#607080', '#3a4050');
  hiltBelow(ctx, 16, 19, 12);
}

/**
 * Swing FX (20×20 canvas) — sharp silhouettes for attack VFX.
 */
export function drawWeaponSwing(
  ctx: CanvasRenderingContext2D,
  look: WeaponLook,
): void {
  if (
    look === 'bow' ||
    look === 'longbow' ||
    look === 'crossbow' ||
    look === 'magic_bow'
  ) {
    const tip =
      look === 'crossbow'
        ? '#ff6b9d'
        : look === 'magic_bow'
          ? '#b070ff'
          : '#7dffb3';
    fill(ctx, look === 'magic_bow' ? '#d0a0ff' : '#c8b090', 2, 9, 16, 4);
    fill(ctx, tip, 15, 7, 6, 8);
    fill(ctx, look === 'magic_bow' ? '#ff90e0' : '#ff6b9d', 1, 7, 4, 8);
    spark(ctx, 2, 9, look === 'magic_bow' ? '#e8d0ff' : '#c9ffe0');
    return;
  }
  if (look === 'phaser') {
    fill(ctx, '#3a3a48', 2, 7, 12, 8);
    fill(ctx, '#ff2030', 11, 9, 10, 4);
    fill(ctx, '#ff8890', 13, 10, 6, 2);
    fill(ctx, '#ffc857', 5, 9, 3, 3);
    spark(ctx, 18, 10, '#ffffff');
    return;
  }
  if (
    look === 'axe' ||
    look === 'battle_axe' ||
    look === 'iron_axe' ||
    look === 'greataxe'
  ) {
    const bit = look === 'iron_axe' ? '#9aabc0' : '#8a98a8';
    const bitHi = look === 'greataxe' ? '#ffffff' : '#c0c8d0';
    fill(ctx, '#6b4423', 8, 6, 5, 12);
    fill(ctx, bit, 2, 2, look === 'battle_axe' || look === 'greataxe' ? 16 : 14, 10);
    fill(ctx, bitHi, 3, 3, 5, 7);
    spark(ctx, 4, 3, '#ffffff');
    return;
  }
  if (
    look === 'staff' ||
    look === 'staff_lightning' ||
    look === 'staff_fire' ||
    look === 'staff_ice'
  ) {
    const crystal =
      look === 'staff_lightning'
        ? { deep: '#1a6aaa', mid: '#4ac0ff' }
        : look === 'staff_fire'
          ? { deep: '#8a2010', mid: '#ff5030' }
          : look === 'staff_ice'
            ? { deep: '#0a2048', mid: '#2a60a0' }
            : { deep: '#2a8a5a', mid: '#7dffb3' };
    fill(ctx, '#6b4423', 9, 3, 5, 16);
    block(ctx, crystal.mid, crystal.deep, 6, 1, 12, 9);
    spark(ctx, 10, 3, '#ffffff');
    return;
  }
  if (look === 'cleaver') {
    fill(ctx, '#ff6b9d', 3, 1, 15, 13);
    fill(ctx, '#ffb0c8', 4, 2, 5, 10);
    fill(ctx, '#c04070', 14, 1, 5, 13);
    fill(ctx, '#ffffff', 4, 1, 5, 2);
    fill(ctx, '#8b5a2b', 8, 13, 6, 8);
    return;
  }
  if (look === 'honk') {
    fill(ctx, '#ffe08a', 7, 0, 8, 14);
    fill(ctx, '#fff3c0', 8, 1, 3, 11);
    fill(ctx, '#5ad45a', 5, 13, 11, 7);
    return;
  }
  if (look === 'saber') {
    fill(ctx, '#e8c070', 13, 0, 6, 5);
    fill(ctx, '#e8c070', 10, 4, 7, 5);
    fill(ctx, '#e8c070', 7, 8, 7, 6);
    fill(ctx, '#fff0c0', 15, 1, 2, 8);
    fill(ctx, '#c9a227', 5, 13, 11, 3);
    spark(ctx, 16, 0, '#ffffff');
    return;
  }
  if (look === 'iron') {
    fill(ctx, '#3a4050', 7, 0, 8, 16);
    fill(ctx, '#9aabc0', 8, 1, 6, 14);
    fill(ctx, '#e0e8f0', 8, 1, 2, 12);
    fill(ctx, '#4a5060', 12, 2, 2, 12);
    fill(ctx, '#4a4030', 3, 14, 15, 4);
    spark(ctx, 9, 1, '#ffffff');
    return;
  }
  // mild sword slash
  fill(ctx, '#3a4050', 8, 0, 7, 16);
  fill(ctx, '#dfe6f0', 9, 1, 5, 14);
  fill(ctx, '#ffffff', 9, 1, 2, 12);
  fill(ctx, '#607080', 12, 2, 2, 12);
  fill(ctx, '#c9a227', 5, 14, 13, 3);
  fill(ctx, '#8b5a2b', 8, 17, 6, 4);
  spark(ctx, 10, 0, '#ffffff');
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
    case 'training_axe':
      return 'axe';
    case 'battle_axe':
      return 'battle_axe';
    case 'iron_hatchet':
      return 'iron_axe';
    case 'great_axe':
      return 'greataxe';
    case 'iron_blade':
    case 'bud_fang':
      return 'iron';
    case 'sand_saber':
      return 'saber';
    case 'dunjun_cleaver':
    case 'bud_claw':
      return 'cleaver';
    case 'honk_blade':
      return 'honk';
    case 'phaser':
      return 'phaser';
    case 'short_bow':
      return 'bow';
    case 'long_bow':
      return 'longbow';
    case 'hunter_crossbow':
      return 'crossbow';
    case 'magic_bow':
      return 'magic_bow';
    case 'wizard_staff':
      return 'staff';
    case 'staff_lightning':
      return 'staff_lightning';
    case 'staff_fire':
      return 'staff_fire';
    case 'staff_ice':
      return 'staff_ice';
    default:
      return null;
  }
}
