/**
 * Shared weapon silhouettes — avatar hip, inventory icons, and swing FX.
 * Each look must read at a glance: bow ≠ crossbow ≠ phaser ≠ sword family.
 */

import type { WeaponLook } from './appearance';

/** Outline helper for readability on dark UI / dungeon floors. */
function outline(
  ctx: CanvasRenderingContext2D,
  fill: string,
  edge: string,
  rects: [number, number, number, number][],
): void {
  ctx.fillStyle = edge;
  for (const [x, y, w, h] of rects) {
    ctx.fillRect(x - 1, y, w + 2, h);
    ctx.fillRect(x, y - 1, w, h + 2);
  }
  ctx.fillStyle = fill;
  for (const [x, y, w, h] of rects) ctx.fillRect(x, y, w, h);
}

/**
 * Hip weapon on the 16×16 player sprite (right side, high contrast).
 * Sticks out past the body so gear is readable at SCALE=3.
 */
export function drawWeaponAvatar(
  ctx: CanvasRenderingContext2D,
  look: WeaponLook,
): void {
  if (look === 'none') return;

  // —— Ranged / special (very distinct silhouettes) ——
  if (look === 'bow') {
    // Vertical recurve D on right hip + string + arrow nock
    ctx.fillStyle = '#3a2410';
    ctx.fillRect(13, 4, 1, 9);
    ctx.fillRect(14, 5, 1, 7);
    ctx.fillStyle = '#a06830';
    ctx.fillRect(14, 4, 1, 1);
    ctx.fillRect(14, 12, 1, 1);
    ctx.fillRect(15, 6, 1, 5);
    // string
    ctx.fillStyle = '#e8e0d0';
    ctx.fillRect(13, 5, 1, 1);
    ctx.fillRect(12, 8, 1, 1);
    ctx.fillRect(13, 11, 1, 1);
    // nocked arrow tip
    ctx.fillStyle = '#c0c8d0';
    ctx.fillRect(11, 7, 2, 1);
    ctx.fillStyle = '#7dffb3';
    ctx.fillRect(10, 7, 1, 1);
    return;
  }

  if (look === 'crossbow') {
    // Horizontal prod + stock + bolt — reads as crossbow, not bow
    ctx.fillStyle = '#5a3d1a';
    ctx.fillRect(11, 9, 5, 2); // stock
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(12, 7, 1, 5); // prod upright
    ctx.fillRect(11, 7, 3, 1);
    ctx.fillRect(11, 12, 3, 1);
    // stirrup / string
    ctx.fillStyle = '#d0d0d8';
    ctx.fillRect(13, 8, 1, 3);
    // bolt
    ctx.fillStyle = '#c8b090';
    ctx.fillRect(14, 9, 2, 1);
    ctx.fillStyle = '#ff6b9d';
    ctx.fillRect(15, 9, 1, 1);
    return;
  }

  if (look === 'phaser') {
    // Sidearm: grip down, fat barrel forward, red emitter, status LED
    ctx.fillStyle = '#1a1a22';
    ctx.fillRect(11, 9, 2, 4); // grip
    ctx.fillStyle = '#3a3a48';
    ctx.fillRect(12, 7, 4, 3); // body
    ctx.fillStyle = '#5a5a68';
    ctx.fillRect(12, 7, 4, 1);
    ctx.fillStyle = '#ff2030';
    ctx.fillRect(15, 8, 2, 2); // emitter
    ctx.fillStyle = '#ffc857';
    ctx.fillRect(13, 8, 1, 1); // LED
    ctx.fillStyle = '#888';
    ctx.fillRect(11, 8, 1, 1); // sight
    return;
  }

  if (look === 'staff') {
    // Tall gnarled shaft + glowing orb above head-height on hip
    ctx.fillStyle = '#4a3018';
    ctx.fillRect(13, 3, 2, 11);
    ctx.fillStyle = '#6b4423';
    ctx.fillRect(13, 5, 1, 8);
    ctx.fillStyle = '#2a8a5a';
    ctx.fillRect(12, 2, 4, 3);
    ctx.fillStyle = '#7dffb3';
    ctx.fillRect(13, 2, 2, 2);
    ctx.fillStyle = '#c9ffe0';
    ctx.fillRect(13, 2, 1, 1);
    return;
  }

  // —— Sword family (shape + color must differ) ——
  if (look === 'cleaver') {
    // Wide chopping head, short haft
    outline(ctx, '#ff6b9d', '#6a2040', [
      [12, 5, 4, 5],
    ]);
    ctx.fillStyle = '#c04070';
    ctx.fillRect(14, 5, 2, 5);
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(12, 10, 2, 3);
    ctx.fillStyle = '#c9a227';
    ctx.fillRect(11, 10, 4, 1);
    return;
  }

  if (look === 'honk') {
    // Gold blade + green goose-head pommel
    outline(ctx, '#ffe08a', '#8a7030', [
      [13, 4, 2, 7],
    ]);
    ctx.fillStyle = '#fff3c0';
    ctx.fillRect(13, 4, 1, 6);
    ctx.fillStyle = '#5ad45a';
    ctx.fillRect(12, 11, 4, 3); // goose blob
    ctx.fillStyle = '#222';
    ctx.fillRect(14, 12, 1, 1); // eye
    ctx.fillStyle = '#ff8844';
    ctx.fillRect(15, 13, 1, 1); // beak tip
    return;
  }

  if (look === 'saber') {
    // Curved sand blade (steps, not a straight bar)
    ctx.fillStyle = '#8a6030';
    ctx.fillRect(12, 11, 4, 1);
    ctx.fillStyle = '#e8c070';
    ctx.fillRect(14, 4, 1, 2);
    ctx.fillRect(13, 5, 2, 2);
    ctx.fillRect(13, 7, 1, 4);
    ctx.fillStyle = '#fff0c0';
    ctx.fillRect(14, 5, 1, 2);
    ctx.fillStyle = '#c9a227';
    ctx.fillRect(12, 10, 3, 1);
    ctx.fillStyle = '#6b4423';
    ctx.fillRect(13, 12, 2, 2);
    return;
  }

  if (look === 'iron') {
    // Long dark broadsword, thicker, dark fuller
    outline(ctx, '#8a98a8', '#3a4050', [
      [13, 3, 2, 9],
    ]);
    ctx.fillStyle = '#5a6878';
    ctx.fillRect(14, 4, 1, 7);
    ctx.fillStyle = '#c0c8d0';
    ctx.fillRect(13, 3, 1, 2); // tip highlight
    ctx.fillStyle = '#4a4030';
    ctx.fillRect(11, 11, 5, 1);
    ctx.fillStyle = '#6a5a40';
    ctx.fillRect(12, 12, 3, 2);
    return;
  }

  // mild sword — short bright steel, simple gold guard
  outline(ctx, '#dfe6f0', '#607080', [
    [13, 5, 2, 6],
  ]);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(13, 5, 1, 5);
  ctx.fillStyle = '#c9a227';
  ctx.fillRect(12, 10, 4, 1);
  ctx.fillStyle = '#8b5a2b';
  ctx.fillRect(13, 11, 2, 2);
}

/**
 * Full 24×24 inventory / shop icon. Big silhouette + outline.
 */
export function drawWeaponIcon(
  ctx: CanvasRenderingContext2D,
  look: WeaponLook | string,
): void {
  // Slot background already drawn by caller sometimes — fill if empty
  // Caller handles bg; we only draw the weapon art.

  if (look === 'bow') {
    // Classic D-bow facing right
    ctx.fillStyle = '#3a2410';
    for (let i = 0; i < 8; i++) {
      const y = 4 + i * 2;
      const inset = i < 4 ? 4 - i : i - 3;
      ctx.fillRect(6 + inset, y, 2, 2);
      ctx.fillRect(16 - inset, y, 2, 2);
    }
    ctx.fillStyle = '#a06830';
    ctx.fillRect(8, 5, 2, 14);
    ctx.fillRect(14, 5, 2, 14);
    ctx.fillStyle = '#e8e0d0';
    ctx.fillRect(10, 6, 1, 12); // string
    // arrow
    ctx.fillStyle = '#c8b090';
    ctx.fillRect(4, 11, 12, 2);
    ctx.fillStyle = '#7dffb3';
    ctx.fillRect(3, 11, 2, 2);
    ctx.fillStyle = '#ff6b9d';
    ctx.fillRect(15, 10, 2, 4); // fletching
    return;
  }

  if (look === 'crossbow') {
    // Stock, prod, bolt — unmistakably a crossbow
    ctx.fillStyle = '#5a3d1a';
    ctx.fillRect(4, 11, 14, 4); // stock
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(10, 5, 3, 14); // prod
    ctx.fillRect(6, 5, 11, 2);
    ctx.fillRect(6, 17, 11, 2);
    ctx.fillStyle = '#3a2410';
    ctx.fillRect(5, 6, 2, 12); // prod tips dark
    ctx.fillRect(16, 6, 2, 12);
    ctx.fillStyle = '#d0d0d8';
    ctx.fillRect(11, 7, 1, 10); // string
    ctx.fillStyle = '#c8b090';
    ctx.fillRect(12, 12, 8, 2); // bolt
    ctx.fillStyle = '#ff6b9d';
    ctx.fillRect(19, 11, 3, 4); // tip
    ctx.fillStyle = '#c9a227';
    ctx.fillRect(8, 12, 2, 2); // trigger block
    return;
  }

  if (look === 'phaser') {
    // Sci-fi pistol silhouette
    ctx.fillStyle = '#1a1a22';
    ctx.fillRect(5, 12, 5, 7); // grip
    ctx.fillStyle = '#3a3a48';
    ctx.fillRect(6, 7, 12, 6); // body
    ctx.fillStyle = '#5a5a68';
    ctx.fillRect(6, 7, 12, 2);
    ctx.fillStyle = '#2a2a35';
    ctx.fillRect(8, 9, 6, 2);
    ctx.fillStyle = '#ff2030';
    ctx.fillRect(17, 8, 5, 4); // emitter
    ctx.fillStyle = '#ff8890';
    ctx.fillRect(19, 9, 2, 2);
    ctx.fillStyle = '#ffc857';
    ctx.fillRect(10, 9, 2, 2); // LED
    ctx.fillStyle = '#aaa';
    ctx.fillRect(7, 6, 2, 2); // sight
    return;
  }

  if (look === 'staff') {
    ctx.fillStyle = '#4a3018';
    ctx.fillRect(10, 6, 4, 16);
    ctx.fillStyle = '#6b4423';
    ctx.fillRect(11, 8, 2, 12);
    // knot rings
    ctx.fillStyle = '#3a2010';
    ctx.fillRect(9, 12, 6, 1);
    ctx.fillRect(9, 16, 6, 1);
    // orb
    ctx.fillStyle = '#2a8a5a';
    ctx.fillRect(8, 2, 8, 7);
    ctx.fillStyle = '#7dffb3';
    ctx.fillRect(10, 3, 4, 5);
    ctx.fillStyle = '#c9ffe0';
    ctx.fillRect(11, 4, 2, 2);
    return;
  }

  if (look === 'cleaver') {
    // Wide chopping blade
    ctx.fillStyle = '#6a2040';
    ctx.fillRect(6, 3, 12, 12);
    ctx.fillStyle = '#ff6b9d';
    ctx.fillRect(7, 4, 10, 10);
    ctx.fillStyle = '#ffb0c8';
    ctx.fillRect(8, 5, 4, 8);
    ctx.fillStyle = '#c04070';
    ctx.fillRect(14, 4, 3, 10);
    ctx.fillStyle = '#c9a227';
    ctx.fillRect(8, 14, 8, 2);
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(10, 16, 4, 5);
    return;
  }

  if (look === 'honk') {
    // Gold blade + goose pommel
    ctx.fillStyle = '#8a7030';
    ctx.fillRect(10, 2, 5, 14);
    ctx.fillStyle = '#ffe08a';
    ctx.fillRect(11, 3, 3, 12);
    ctx.fillStyle = '#fff3c0';
    ctx.fillRect(11, 3, 1, 10);
    ctx.fillStyle = '#c9a227';
    ctx.fillRect(8, 14, 9, 2);
    // goose
    ctx.fillStyle = '#5ad45a';
    ctx.fillRect(9, 16, 7, 5);
    ctx.fillStyle = '#222';
    ctx.fillRect(13, 17, 1, 1);
    ctx.fillStyle = '#ff8844';
    ctx.fillRect(15, 18, 3, 2);
    return;
  }

  if (look === 'saber') {
    // Curved desert blade
    ctx.fillStyle = '#8a6030';
    ctx.fillRect(7, 14, 10, 2);
    ctx.fillStyle = '#e8c070';
    // stepped curve
    const curve: [number, number, number, number][] = [
      [14, 3, 3, 3],
      [12, 5, 4, 3],
      [11, 7, 3, 3],
      [10, 9, 3, 3],
      [10, 11, 2, 3],
    ];
    for (const [x, y, w, h] of curve) ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#fff0c0';
    ctx.fillRect(14, 4, 1, 4);
    ctx.fillStyle = '#c9a227';
    ctx.fillRect(8, 13, 8, 2);
    ctx.fillStyle = '#6b4423';
    ctx.fillRect(10, 16, 4, 5);
    return;
  }

  if (look === 'iron') {
    // Long broad iron sword
    ctx.fillStyle = '#3a4050';
    ctx.fillRect(9, 2, 6, 14);
    ctx.fillStyle = '#8a98a8';
    ctx.fillRect(10, 3, 4, 12);
    ctx.fillStyle = '#5a6878';
    ctx.fillRect(12, 4, 1, 10); // fuller
    ctx.fillStyle = '#c0c8d0';
    ctx.fillRect(10, 3, 4, 2);
    ctx.fillStyle = '#4a4030';
    ctx.fillRect(6, 14, 12, 3);
    ctx.fillStyle = '#6a5a40';
    ctx.fillRect(10, 17, 4, 5);
    return;
  }

  // mild sword (default sword look)
  ctx.fillStyle = '#607080';
  ctx.fillRect(10, 3, 4, 12);
  ctx.fillStyle = '#dfe6f0';
  ctx.fillRect(11, 4, 2, 10);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(11, 4, 1, 8);
  ctx.fillStyle = '#c9a227';
  ctx.fillRect(7, 13, 10, 3);
  ctx.fillStyle = '#8b5a2b';
  ctx.fillRect(10, 16, 4, 5);
  ctx.fillStyle = '#ffc857';
  ctx.fillRect(11, 14, 2, 1);
}

/**
 * Attack swing / held weapon FX (20×20).
 */
export function drawWeaponSwing(
  ctx: CanvasRenderingContext2D,
  look: WeaponLook,
): void {
  if (look === 'bow' || look === 'crossbow') {
    // Fired bolt/arrow flash
    ctx.fillStyle = '#c8b090';
    ctx.fillRect(2, 8, 14, 3);
    ctx.fillStyle = look === 'crossbow' ? '#ff6b9d' : '#7dffb3';
    ctx.fillRect(15, 7, 4, 5);
    ctx.fillStyle = '#ff6b9d';
    ctx.fillRect(1, 7, 3, 5);
    return;
  }
  if (look === 'phaser') {
    ctx.fillStyle = '#3a3a48';
    ctx.fillRect(2, 7, 10, 5);
    ctx.fillStyle = '#ff2030';
    ctx.fillRect(11, 8, 7, 3);
    ctx.fillStyle = '#ffc857';
    ctx.fillRect(5, 8, 2, 2);
    return;
  }
  if (look === 'staff') {
    ctx.fillStyle = '#6b4423';
    ctx.fillRect(8, 2, 4, 14);
    ctx.fillStyle = '#7dffb3';
    ctx.fillRect(6, 1, 8, 6);
    ctx.fillStyle = '#c9ffe0';
    ctx.fillRect(8, 2, 3, 3);
    return;
  }
  if (look === 'cleaver') {
    ctx.fillStyle = '#ff6b9d';
    ctx.fillRect(4, 2, 12, 10);
    ctx.fillStyle = '#c04070';
    ctx.fillRect(12, 2, 4, 10);
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(8, 12, 4, 6);
    return;
  }
  if (look === 'honk') {
    ctx.fillStyle = '#ffe08a';
    ctx.fillRect(7, 1, 5, 12);
    ctx.fillStyle = '#5ad45a';
    ctx.fillRect(6, 12, 7, 5);
    return;
  }
  if (look === 'saber') {
    ctx.fillStyle = '#e8c070';
    ctx.fillRect(12, 1, 3, 4);
    ctx.fillRect(10, 4, 4, 4);
    ctx.fillRect(8, 7, 4, 5);
    ctx.fillStyle = '#c9a227';
    ctx.fillRect(6, 12, 8, 2);
    return;
  }
  if (look === 'iron') {
    ctx.fillStyle = '#8a98a8';
    ctx.fillRect(7, 0, 5, 14);
    ctx.fillStyle = '#5a6878';
    ctx.fillRect(9, 1, 1, 12);
    ctx.fillStyle = '#4a4030';
    ctx.fillRect(4, 12, 12, 3);
    return;
  }
  // mild sword default swing
  ctx.fillStyle = '#dfe6f0';
  ctx.fillRect(8, 0, 4, 14);
  ctx.fillStyle = '#fff';
  ctx.fillRect(9, 1, 1, 10);
  ctx.fillStyle = '#c9a227';
  ctx.fillRect(6, 12, 8, 3);
  ctx.fillStyle = '#8b5a2b';
  ctx.fillRect(8, 15, 4, 4);
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
