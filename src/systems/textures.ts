import type Phaser from 'phaser';
import { ART_RES, COLORS } from '../config';
import {
  BARE_APPEARANCE,
  buddyTextureKey,
  playerTextureKey,
  type AppearanceSpec,
  type BuddyPoseName,
  type PlayerWalkFrame,
  type WeaponLook,
  type ShieldLook,
  type AmuletLook,
  type RingLook,
  type ShoesLook,
} from './appearance';
import {
  drawWeaponAvatar,
  drawWeaponIcon,
  drawWeaponSwing,
  swingTextureKey,
  weaponLookFromTemplateId,
} from './weapon-visuals';
import {
  block,
  cartoonFace,
  dither,
  drawBrickTile,
  drawDirtTile,
  drawFloorTile,
  drawGrassTile,
  drawLavaTile,
  drawWaterTile,
  fill,
  grit,
  hairMass,
  hex,
  shadedBlock,
  spark,
} from './pixel-art';

function canvasTex(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
): void {
  if (scene.textures.exists(key)) return;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  // Crisp pixels — no smoothing when we later scale
  ctx.imageSmoothingEnabled = false;
  draw(ctx);
  scene.textures.addCanvas(key, canvas);
}

function drawWeapon(
  ctx: CanvasRenderingContext2D,
  look: WeaponLook,
): void {
  drawWeaponAvatar(ctx, look);
}

/**
 * Left-arm shield silhouettes — must read as a shield (rim, boss, shape),
 * not a vertical bar.
 */
function drawShield(
  ctx: CanvasRenderingContext2D,
  look: ShieldLook,
): void {
  if (look === 'none') return;
  if (look === 'tower') {
    // Tall heater: wide top, taper bottom, bands + boss
    fill(ctx, '#2a3040', 0, 8, 10, 18);
    fill(ctx, '#5a6578', 1, 9, 8, 16);
    fill(ctx, '#8a98a8', 1, 9, 8, 2); // top rim
    fill(ctx, '#3a4558', 2, 11, 6, 12);
    // gothic point bottom
    fill(ctx, '#5a6578', 2, 24, 6, 2);
    fill(ctx, '#5a6578', 3, 26, 4, 1);
    fill(ctx, '#5a6578', 4, 27, 2, 1);
    // cross bands
    fill(ctx, '#c0c8d0', 1, 15, 8, 2);
    fill(ctx, '#c0c8d0', 4, 9, 2, 16);
    fill(ctx, '#ffc857', 3, 14, 4, 4); // boss
    fill(ctx, '#fff3a0', 4, 15, 2, 1);
    spark(ctx, 4, 12, '#e0e8f0');
    return;
  }
  if (look === 'iron') {
    // Heater / kite shield
    fill(ctx, '#3a4050', 1, 10, 9, 14);
    fill(ctx, '#9aabc0', 2, 11, 7, 12);
    // rounded top corners
    fill(ctx, '#9aabc0', 2, 10, 7, 1);
    fill(ctx, '#c0d0e0', 2, 11, 7, 1);
    // taper tip
    fill(ctx, '#9aabc0', 3, 23, 5, 1);
    fill(ctx, '#9aabc0', 4, 24, 3, 1);
    // metal rim
    fill(ctx, '#6a7888', 2, 11, 1, 12);
    fill(ctx, '#6a7888', 8, 11, 1, 12);
    // center boss
    fill(ctx, '#d0d8e8', 4, 15, 3, 4);
    fill(ctx, '#ffffff', 5, 16, 1, 1);
    fill(ctx, '#ffc857', 4, 14, 3, 1);
    return;
  }
  // Wood round / kite
  fill(ctx, '#4a3010', 1, 11, 9, 13);
  fill(ctx, '#a07828', 2, 12, 7, 11);
  fill(ctx, '#c9a227', 2, 12, 7, 1);
  // grain
  fill(ctx, '#6b4423', 3, 14, 1, 8);
  fill(ctx, '#6b4423', 6, 15, 1, 7);
  // round-ish bottom
  fill(ctx, '#a07828', 3, 23, 5, 1);
  // boss + strap hint
  fill(ctx, '#8a6820', 4, 16, 3, 3);
  fill(ctx, '#ffc857', 5, 17, 1, 1);
  fill(ctx, '#5a3d1a', 3, 18, 5, 1);
}

function drawAmulet(
  ctx: CanvasRenderingContext2D,
  look: AmuletLook,
): void {
  if (look === 'none') return;
  // chain across collar
  fill(ctx, '#c9a227', 11, 12, 10, 1);
  fill(ctx, '#8a6820', 11, 13, 10, 1);
  if (look === 'cube') {
    block(ctx, '#5ad45a', '#2a6a2a', 13, 13, 6, 6);
    fill(ctx, '#9ef09e', 14, 14, 3, 2);
    fill(ctx, '#2a8a2a', 13, 17, 6, 1);
    spark(ctx, 15, 15, '#e0ffe0');
    return;
  }
  if (look === 'bauble') {
    block(ctx, '#ff6b9d', '#8a2040', 13, 13, 6, 6);
    fill(ctx, '#ffb0c8', 14, 14, 3, 2);
    spark(ctx, 15, 15);
    fill(ctx, '#c07090', 14, 18, 4, 1);
    return;
  }
  // gold medallion
  block(ctx, '#ffc857', '#8a6820', 13, 13, 6, 6);
  fill(ctx, '#fff3a0', 14, 14, 3, 2);
  fill(ctx, '#c9a227', 15, 16, 2, 2);
  spark(ctx, 14, 14, '#ffffff');
}

function drawRing(
  ctx: CanvasRenderingContext2D,
  look: RingLook,
): void {
  if (look === 'none') return;
  // on right hand knuckles (near glove)
  if (look === 'luck') {
    fill(ctx, '#2a6a50', 24, 19, 5, 4);
    fill(ctx, '#7dffb3', 25, 18, 3, 5);
    fill(ctx, '#c9ffe0', 26, 19, 1, 3);
    spark(ctx, 26, 18);
    return;
  }
  if (look === 'silver') {
    block(ctx, '#d0d8e8', '#607080', 24, 19, 5, 4);
    fill(ctx, '#ffffff', 25, 20, 2, 1);
    spark(ctx, 26, 20);
    return;
  }
  block(ctx, '#c07040', '#603010', 24, 19, 5, 4);
  fill(ctx, '#e09060', 25, 20, 2, 1);
}

/**
 * Per-foot offsets for walk cycle (front view).
 * Left index 0, right index 1: { dx, dy } plant lower = dy+1, lift = dy-1.
 */
function footOffsets(walk: PlayerWalkFrame): [{ dx: number; dy: number }, { dx: number; dy: number }] {
  if (walk === 1) {
    // left plant / step down-forward, right lifted back
    return [
      { dx: -1, dy: 1 },
      { dx: 1, dy: -1 },
    ];
  }
  if (walk === 2) {
    // right plant, left lift
    return [
      { dx: 1, dy: -1 },
      { dx: -1, dy: 1 },
    ];
  }
  return [
    { dx: 0, dy: 0 },
    { dx: 0, dy: 0 },
  ];
}

/**
 * Boots with ankle shaft + sole + forward toe box (clearly feet, not gloves).
 * `walk` animates left/right plant and lift.
 */
function drawShoes(
  ctx: CanvasRenderingContext2D,
  look: ShoesLook,
  walk: PlayerWalkFrame = 0,
): void {
  const [lo, ro] = footOffsets(walk);
  const drawBoot = (
    x: number,
    yOff: number,
    mid: string,
    light: string,
    dark: string,
    sole: string,
    fancy = false,
  ) => {
    const y = 25 + yOff;
    // ankle shaft (up the shin)
    shadedBlock(ctx, mid, light, dark, x, y, 5, 4);
    // foot body
    shadedBlock(ctx, mid, light, dark, x, y + 3, 7, 3);
    // toe box pointing forward
    fill(ctx, mid, x + 5, y + 4, 3, 2);
    fill(ctx, light, x + 5, y + 4, 2, 1);
    // sole
    fill(ctx, sole, x, y + 6, 8, 1);
    // lace / buckle
    fill(ctx, dark, x + 1, y + 2, 3, 1);
    if (fancy) {
      fill(ctx, '#ff6b9d', x + 1, y + 1, 2, 1);
      fill(ctx, '#9ef0c8', x + 2, y + 4, 2, 1);
    }
  };

  if (look === 'apology') {
    drawBoot(8 + lo.dx, lo.dy, '#5ad4a0', '#9ef0c8', '#2a6a50', '#1a4030', true);
    drawBoot(17 + ro.dx, ro.dy, '#5ad4a0', '#9ef0c8', '#2a6a50', '#1a4030', true);
    return;
  }
  if (look === 'leather') {
    drawBoot(8 + lo.dx, lo.dy, '#6b4423', '#a06830', '#2a1810', '#1a1008');
    drawBoot(17 + ro.dx, ro.dy, '#6b4423', '#a06830', '#2a1810', '#1a1008');
    return;
  }
  // bare shoes
  drawBoot(9 + lo.dx, lo.dy, '#3d2b1f', '#5a4030', '#1a1008', '#0a0804');
  drawBoot(17 + ro.dx, ro.dy, '#3d2b1f', '#5a4030', '#1a1008', '#0a0804');
}

/** Shin guards — knee cap + shin plate; walk shortens the lifting leg. */
function drawGreaves(
  ctx: CanvasRenderingContext2D,
  look: AppearanceSpec['greaves'],
  walk: PlayerWalkFrame = 0,
): void {
  const [lo, ro] = footOffsets(walk);
  const legs: [number, number][] = [
    [10 + lo.dx, lo.dy],
    [17 + ro.dx, ro.dy],
  ];
  if (look === 'plate') {
    for (const [x, dy] of legs) {
      const y = 21 + dy;
      block(ctx, '#a8b8c8', '#4a5060', x, y, 5, 3);
      fill(ctx, '#c0d0e0', x + 1, y, 3, 1);
      shadedBlock(ctx, '#8a98a8', '#c0c8d0', '#3a4050', x, y + 3, 5, 5);
      fill(ctx, '#6a7888', x + 2, y + 4, 1, 3);
    }
  } else if (look === 'leather') {
    for (const [x, dy] of legs) {
      const y = 22 + dy;
      shadedBlock(ctx, '#8b5a2b', '#a06830', '#5a3d1a', x, y, 5, 6);
      fill(ctx, '#5a3d1a', x + 1, y + 2, 3, 1);
      fill(ctx, '#c9a227', x + 2, y + 2, 1, 1);
    }
  } else {
    // pants
    for (const [x, dy] of legs) {
      const y = 23 + dy;
      shadedBlock(ctx, '#2d6cdf', '#4a8cff', '#1a3a8a', x, y, 5, 5);
    }
  }
}

/**
 * Gloves = hands with fingers at the ends of arms (mid torso sides),
 * never boot-shaped blocks at the feet.
 */
function drawGloves(
  ctx: CanvasRenderingContext2D,
  look: AppearanceSpec['gloves'],
): void {
  const hand = (
    x: number,
    mid: string,
    light: string,
    dark: string,
    sheath = false,
  ) => {
    // forearm cuff
    shadedBlock(ctx, mid, light, dark, x, 14, 4, 5);
    // palm
    shadedBlock(ctx, mid, light, dark, x - (x < 16 ? 1 : 0), 18, 5, 4);
    // fingers (3 stubs) — horizontal/down, glove signature
    fill(ctx, mid, x - (x < 16 ? 1 : 0), 22, 2, 2);
    fill(ctx, mid, x + 1, 22, 2, 2);
    fill(ctx, mid, x + 3, 22, 1, 2);
    fill(ctx, light, x, 18, 3, 1);
    if (sheath) {
      // arrow nock peeking
      fill(ctx, '#c8b090', x + (x < 16 ? 3 : -1), 12, 2, 5);
      fill(ctx, '#7dffb3', x + (x < 16 ? 3 : -1), 11, 2, 2);
    }
  };

  if (look === 'sheath') {
    hand(4, '#5a3d1a', '#8b5a2b', '#2a1810', true);
    hand(24, '#5a3d1a', '#8b5a2b', '#2a1810', true);
  } else if (look === 'leather') {
    hand(4, '#8b5a2b', '#a06830', '#5a3d1a');
    hand(24, '#8b5a2b', '#a06830', '#5a3d1a');
  } else {
    // bare hands (skin)
    hand(5, '#f0c8a4', '#ffe0c0', '#c09070');
    hand(23, '#f0c8a4', '#ffe0c0', '#c09070');
  }
}

/** Torso armor — real breastplate silhouette vs jackets/cloaks. */
function drawBreastplate(
  ctx: CanvasRenderingContext2D,
  look: AppearanceSpec['breastplate'],
): void {
  if (look === 'plate') {
    // neck opening
    fill(ctx, '#1a1a2e', 13, 11, 6, 2);
    // main cuirass (tapered waist)
    shadedBlock(ctx, '#8a98a8', '#c0d0e0', '#3a4050', 8, 12, 16, 11);
    fill(ctx, '#a8b8c8', 10, 13, 12, 4);
    // chest ridge / muscle line
    fill(ctx, '#c0d0e0', 15, 14, 2, 6);
    fill(ctx, '#6a7888', 10, 18, 12, 1);
    // fauld (bottom plates)
    fill(ctx, '#7a8a9a', 9, 22, 14, 2);
    fill(ctx, '#5a6878', 10, 24, 12, 1);
    // pauldrons
    block(ctx, '#c0d0e0', '#4a5060', 5, 11, 5, 6);
    block(ctx, '#c0d0e0', '#4a5060', 22, 11, 5, 6);
    fill(ctx, '#e0e8f0', 6, 12, 3, 1);
    fill(ctx, '#e0e8f0', 23, 12, 3, 1);
    // rivets
    spark(ctx, 11, 15, '#ffffff');
    spark(ctx, 20, 15, '#ffffff');
    spark(ctx, 15, 13, '#ffffff');
    return;
  }
  if (look === 'reinforced') {
    shadedBlock(ctx, '#5c4030', '#8a7a60', '#3a2a18', 8, 12, 16, 12);
    // metal chest plate inset
    block(ctx, '#a8b0b8', '#4a5060', 11, 14, 10, 7);
    fill(ctx, '#c0c8d0', 12, 15, 8, 2);
    fill(ctx, '#ffc857', 14, 17, 4, 3);
    fill(ctx, '#fff3a0', 15, 18, 2, 1);
    // shoulder cops
    block(ctx, '#c0b090', '#6a6040', 6, 12, 4, 5);
    block(ctx, '#c0b090', '#6a6040', 22, 12, 4, 5);
    fill(ctx, '#3d2b1f', 9, 22, 14, 2); // belt
    return;
  }
  if (look === 'leather') {
    // jacket with collar + straps (not a metal plate)
    shadedBlock(ctx, '#8b5a2b', '#a06830', '#5a3d1a', 8, 12, 16, 12);
    // open collar V
    fill(ctx, '#f0c8a4', 13, 12, 6, 3);
    fill(ctx, '#5a3d1a', 12, 12, 1, 4);
    fill(ctx, '#5a3d1a', 19, 12, 1, 4);
    // cross straps
    fill(ctx, '#3d2b1f', 10, 16, 12, 2);
    fill(ctx, '#c9a227', 14, 16, 4, 2); // buckle
    fill(ctx, '#5a3d1a', 10, 15, 2, 6);
    fill(ctx, '#5a3d1a', 20, 15, 2, 6);
    dither(ctx, '#8b5a2b', '#7a4a20', 11, 19, 10, 3);
    fill(ctx, '#3d2b1f', 9, 23, 14, 1);
    return;
  }
  if (look === 'cloth_arcane') {
    // draped cloak — wide shoulders, starfield, hanging sleeves
    shadedBlock(ctx, '#4a2a7a', '#7a5ab0', '#2a1848', 6, 11, 20, 14);
    fill(ctx, '#6a4a9a', 8, 12, 16, 4);
    // hood collar
    fill(ctx, '#2a1848', 11, 11, 10, 3);
    fill(ctx, '#5a3a8a', 12, 12, 8, 1);
    spark(ctx, 10, 16, '#ffc857');
    spark(ctx, 20, 18, '#7dffb3');
    spark(ctx, 14, 20, '#ffc857');
    spark(ctx, 17, 15, '#c9a0ff');
    // hanging cloth flaps
    fill(ctx, '#3a1a60', 6, 22, 4, 3);
    fill(ctx, '#3a1a60', 22, 22, 4, 3);
    return;
  }
  if (look === 'cloak_ranger') {
    // hooded forest cloak
    shadedBlock(ctx, '#3a5a38', '#5a8a50', '#1a3018', 6, 11, 20, 14);
    // hood shape over shoulders
    fill(ctx, '#2a4a28', 9, 10, 14, 4);
    fill(ctx, '#1a3018', 12, 11, 8, 2);
    // clasp
    fill(ctx, '#8b5a2b', 14, 14, 4, 3);
    fill(ctx, '#c9a227', 15, 15, 2, 1);
    // leaf dither
    dither(ctx, '#3a5a38', '#2a4a28', 8, 17, 16, 5);
    return;
  }
  if (look === 'holy') {
    shadedBlock(ctx, '#e8e0d0', '#ffffff', '#8a8070', 8, 12, 16, 12);
    fill(ctx, '#f8f0e0', 10, 13, 12, 3);
    // gold cross breastplate
    fill(ctx, '#ffc857', 14, 15, 4, 7);
    fill(ctx, '#ffc857', 12, 17, 8, 3);
    fill(ctx, '#fff3a0', 15, 16, 2, 2);
    fill(ctx, '#c9a227', 9, 23, 14, 1);
    return;
  }
  if (look === 'hide') {
    // fur pelt cuirass with ragged edge + bone pin
    shadedBlock(ctx, '#6a4a30', '#8a6a48', '#3a2818', 7, 12, 18, 12);
    dither(ctx, '#6a4a30', '#5a3a28', 9, 14, 14, 7);
    // fur tufts on shoulders
    fill(ctx, '#8a6a48', 6, 11, 3, 3);
    fill(ctx, '#8a6a48', 23, 11, 3, 3);
    fill(ctx, '#a08060', 7, 12, 2, 1);
    fill(ctx, '#a08060', 24, 12, 2, 1);
    // bone pin
    fill(ctx, '#e8e0d0', 14, 15, 4, 2);
    fill(ctx, '#c0392b', 15, 17, 2, 3);
    // ragged hem
    fill(ctx, '#3a2818', 8, 23, 2, 2);
    fill(ctx, '#3a2818', 12, 24, 3, 1);
    fill(ctx, '#3a2818', 18, 23, 2, 2);
    fill(ctx, '#3a2818', 22, 24, 2, 1);
    return;
  }
  // default tunic
  shadedBlock(ctx, '#2d6cdf', '#5a9aff', '#1a4aaf', 8, 12, 16, 12);
  fill(ctx, '#4a8cef', 10, 14, 12, 3);
  fill(ctx, '#1a4aaf', 14, 18, 4, 5);
  fill(ctx, '#1a3a8a', 12, 12, 8, 2);
  fill(ctx, '#c9a227', 13, 20, 6, 2); // belt
  spark(ctx, 11, 15, '#a0c8ff');
}

/**
 * Head: cartoon face + hair mass, then helm overlays (EMA 32-bit craft).
 */
function drawHelmet(
  ctx: CanvasRenderingContext2D,
  look: AppearanceSpec['helmet'],
): void {
  const fx = 10;
  const fy = 5;
  const fw = 12;
  const fh = 9;

  // Hair first (under helm / over skull) — bare heads get full mass
  if (look === 'none') {
    hairMass(ctx, fx, fy, fw, { bangs: true });
  } else if (look === 'leather' || look === 'cloth_arcane') {
    // side locks peek from open helms
    fill(ctx, '#3d2b1f', fx - 1, fy + 1, 2, 5);
    fill(ctx, '#3d2b1f', fx + fw - 1, fy + 1, 2, 5);
  }

  cartoonFace(ctx, fx, fy, fw, fh, {
    soft: look === 'cloth_arcane',
  });

  if (look === 'plate') {
    // closed great-helm dome + horns (face mostly covered)
    shadedBlock(ctx, '#8a98a8', '#c0d0e0', '#3a4050', 8, 1, 16, 11);
    fill(ctx, '#a8b8c8', 10, 2, 12, 3);
    fill(ctx, '#0a0a12', 11, 7, 10, 3); // visor
    fill(ctx, '#1a1a2e', 12, 8, 3, 2);
    fill(ctx, '#1a1a2e', 17, 8, 3, 2);
    spark(ctx, 13, 8, '#ffffff');
    spark(ctx, 18, 8, '#ffffff');
    fill(ctx, '#6a7888', 15, 6, 2, 6); // nasal
    fill(ctx, '#7a8a9a', 8, 8, 3, 5);
    fill(ctx, '#7a8a9a', 21, 8, 3, 5);
    // horns
    fill(ctx, '#e8e0d0', 5, 0, 4, 6);
    fill(ctx, '#e8e0d0', 23, 0, 4, 6);
    fill(ctx, '#c0b8a0', 4, 0, 2, 3);
    fill(ctx, '#c0b8a0', 26, 0, 2, 3);
    fill(ctx, '#ffffff', 6, 1, 1, 2);
    fill(ctx, '#ffffff', 25, 1, 1, 2);
    fill(ctx, '#c0d0e0', 10, 5, 12, 1);
    spark(ctx, 14, 2, '#ffffff');
    return;
  }
  if (look === 'leather') {
    shadedBlock(ctx, '#8b5a2b', '#a06830', '#5a3d1a', 8, 1, 16, 7);
    fill(ctx, '#a06830', 10, 2, 12, 2);
    fill(ctx, '#6b4423', 7, 6, 4, 6);
    fill(ctx, '#6b4423', 21, 6, 4, 6);
    fill(ctx, '#3d2b1f', 12, 12, 8, 1);
    fill(ctx, '#e8e0d0', 8, 0, 3, 3);
    fill(ctx, '#e8e0d0', 21, 0, 3, 3);
    fill(ctx, '#c9a227', 13, 3, 6, 1);
    // bangs peek under cap
    fill(ctx, '#3d2b1f', 12, 5, 3, 2);
    fill(ctx, '#3d2b1f', 17, 5, 3, 2);
    return;
  }
  if (look === 'cloth_arcane') {
    fill(ctx, '#2a1848', 5, 5, 22, 3); // brim
    fill(ctx, '#4a2a7a', 6, 5, 20, 2);
    fill(ctx, '#4a2a7a', 10, 0, 12, 7);
    fill(ctx, '#7a5ab0', 12, 0, 8, 7);
    fill(ctx, '#5a3a8a', 14, 0, 4, 2);
    fill(ctx, '#2a1848', 15, 0, 2, 1);
    spark(ctx, 16, 1, '#ffc857');
    spark(ctx, 12, 3, '#c9a0ff');
    fill(ctx, '#c9a227', 10, 5, 12, 1);
    return;
  }
  // bare: circlet on hair
  shadedBlock(ctx, '#c9a227', '#e8c050', '#8a7010', 9, 2, 14, 3);
  fill(ctx, '#ffc857', 10, 1, 2, 3);
  fill(ctx, '#ffc857', 14, 0, 4, 3);
  fill(ctx, '#ffc857', 20, 1, 2, 3);
  fill(ctx, '#fff3a0', 15, 0, 2, 1);
}

/**
 * 32×32 SNES-density hero. Layer order:
 * greaves → shoes → torso → gloves → head/helm → amulet → ring → shield → weapon → key.
 * `walk` 1/2 = alternating foot plant for walk cycle.
 */
export function drawPlayerLook(
  ctx: CanvasRenderingContext2D,
  spec: AppearanceSpec,
  walk: PlayerWalkFrame = 0,
): void {
  drawGreaves(ctx, spec.greaves, walk);
  drawShoes(ctx, spec.shoes, walk);
  drawBreastplate(ctx, spec.breastplate);
  drawGloves(ctx, spec.gloves);
  drawHelmet(ctx, spec.helmet);
  drawAmulet(ctx, spec.amulet);
  drawRing(ctx, spec.ring);
  drawShield(ctx, spec.shield);
  drawWeapon(ctx, spec.weapon);

  if (spec.key === 'key') {
    // key on belt left hip
    fill(ctx, '#8a6820', 5, 21, 3, 2);
    block(ctx, '#ffc857', '#8a6820', 5, 22, 5, 5);
    fill(ctx, '#fff3a0', 6, 23, 2, 2);
    fill(ctx, '#ffc857', 9, 24, 3, 1);
    fill(ctx, '#ffc857', 10, 25, 1, 2);
    spark(ctx, 6, 23, '#ffffff');
  }
}

/**
 * Ensure a canvas texture exists for this loadout (+ walk frame).
 * Walk frames are generated on demand for the current gear only.
 */
export function ensurePlayerTexture(
  scene: Phaser.Scene,
  spec: AppearanceSpec,
  walk: PlayerWalkFrame = 0,
): string {
  const key = playerTextureKey(spec, walk);
  if (!scene.textures.exists(key)) {
    canvasTex(scene, key, ART_RES, ART_RES, (ctx) => {
      drawPlayerLook(ctx, spec, walk);
    });
  }
  return key;
}

/** Pose body flags for Best Bud canvas frames. */
export interface BuddyDrawOpts {
  stretchX?: number;
  armReach?: number;
  claw?: boolean;
  puffed?: boolean;
  coil?: boolean;
  soft?: boolean;
  squint?: boolean;
}

export function buddyDrawOptsForPose(pose: BuddyPoseName): BuddyDrawOpts {
  switch (pose) {
    case 'stretch':
      return { stretchX: 2, armReach: 3, claw: false };
    case 'grab':
      return { stretchX: 1, armReach: 4, claw: true };
    case 'strike':
      return { armReach: 3, claw: true };
    case 'spit':
      return { puffed: true };
    case 'blink':
      return { squint: true, stretchX: 0 };
    case 'guard':
      return { coil: true };
    case 'heal':
      return { soft: true };
    case 'chase':
    case 'idle':
    default:
      return {};
  }
}

/** Critter body (untinted greys — species tint applied on the sprite). */
export function drawBuddyBase(
  ctx: CanvasRenderingContext2D,
  opts: BuddyDrawOpts = {},
): void {
  const sx = (opts.stretchX ?? 0) * 2;
  const bx = 8 - Math.min(2, sx);
  const bw = 16 + sx;
  // body outline + shaded mass
  fill(ctx, '#6a6a72', bx - 1, 11, bw + 2, 16);
  shadedBlock(ctx, '#d0d0d8', '#f0f0f8', '#909098', bx, 12, bw, 14);
  fill(ctx, '#e8e8f0', bx + 2, 13, bw - 4, 3);
  // ears (tufted)
  fill(ctx, '#6a6a72', 5, 5, 7, 9);
  fill(ctx, '#d0d0d8', 6, 6, 5, 7);
  fill(ctx, '#ffb0c8', 7, 8, 3, 3); // inner ear
  fill(ctx, '#6a6a72', 20 + Math.min(4, sx), 5, 7, 9);
  fill(ctx, '#d0d0d8', 21 + Math.min(4, sx), 6, 5, 7);
  fill(ctx, '#ffb0c8', 22 + Math.min(4, sx), 8, 3, 3);
  fill(ctx, '#b0b0b8', 5, 3, 4, 4);
  fill(ctx, '#b0b0b8', 23 + Math.min(4, sx), 3, 4, 4);
  // cartoon face band
  cartoonFace(ctx, 11, 14, 10, 7, {
    squint: opts.squint,
    soft: opts.soft,
  });
  // snout accent
  fill(ctx, opts.soft ? '#ffb0c8' : '#ff6b9d', 14, 20, 4, 2);
  const reach = (opts.armReach ?? 0) * 2;
  if (reach > 0) {
    fill(ctx, '#909098', 24, 15, reach, 5);
    fill(ctx, '#c8c8d0', 24, 16, reach, 3);
    fill(ctx, '#c8c8d0', 24 + reach - 2, 13, 5, 9);
    if (opts.claw) {
      fill(ctx, '#222', 24 + reach + 1, 12, 2, 4);
      fill(ctx, '#222', 26 + reach, 14, 2, 2);
      fill(ctx, '#222', 24 + reach + 1, 20, 2, 4);
      fill(ctx, '#eee', 25 + reach, 13, 1, 1);
    }
  }
  if (opts.puffed) {
    fill(ctx, '#e8d0b0', 7, 17, 5, 5);
    fill(ctx, '#e8d0b0', 20, 17, 5, 5);
    fill(ctx, '#ff8844', 27, 15, 5, 5);
    spark(ctx, 29, 16, '#ffcc88');
  }
  if (opts.coil) {
    fill(ctx, '#909098', 3, 13, 26, 12);
    fill(ctx, '#b0b0b8', 5, 14, 22, 10);
    fill(ctx, '#888890', 6, 16, 20, 2);
    fill(ctx, '#888890', 8, 20, 16, 2);
  }
  if (opts.soft) {
    fill(ctx, 'rgba(232,240,255,0.45)', 3, 9, 26, 18);
  }
  // feet with pads
  fill(ctx, '#6a6a72', 9, 26, 6, 5);
  fill(ctx, '#a0a0a8', 10, 26, 5, 4);
  fill(ctx, '#ffb0c8', 11, 28, 3, 1);
  fill(ctx, '#6a6a72', 17, 26, 6, 5);
  fill(ctx, '#a0a0a8', 18, 26, 5, 4);
  fill(ctx, '#ffb0c8', 19, 28, 3, 1);
  if (opts.squint && !opts.stretchX) {
    ctx.fillStyle = 'rgba(125,92,255,0.5)';
    ctx.fillRect(0, 7, 3, 3);
    ctx.fillRect(1, 6, 2, 1);
  }
}

/**
 * Gear overlays for a critter frame — same look IDs as the hero, fitted to
 * the buddy silhouette so weapons/armor read at a glance.
 */
export function drawBuddyGear(
  ctx: CanvasRenderingContext2D,
  spec: AppearanceSpec,
  opts: BuddyDrawOpts = {},
): void {
  const sx = (opts.stretchX ?? 0) * 2;
  const bodyX = 8 - Math.min(2, sx);
  const bodyW = 16 + sx;

  // —— Greaves: shin plates on lower legs ——
  if (spec.greaves === 'plate') {
    for (const x of [10, 18]) {
      block(ctx, '#a8b8c8', '#4a5060', x, 23, 4, 2);
      shadedBlock(ctx, '#8a98a8', '#c0c8d0', '#3a4050', x, 25, 4, 4);
    }
  } else if (spec.greaves === 'leather') {
    for (const x of [10, 18]) {
      shadedBlock(ctx, '#8b5a2b', '#a06830', '#5a3d1a', x, 24, 4, 5);
      fill(ctx, '#c9a227', x + 1, 26, 2, 1);
    }
  }

  // —— Boots with toe + sole ——
  if (spec.shoes === 'apology' || spec.shoes === 'leather') {
    const mid = spec.shoes === 'apology' ? '#5ad4a0' : '#6b4423';
    const light = spec.shoes === 'apology' ? '#9ef0c8' : '#a06830';
    const dark = spec.shoes === 'apology' ? '#2a6a50' : '#2a1810';
    for (const x of [9, 18]) {
      shadedBlock(ctx, mid, light, dark, x, 27, 5, 3);
      fill(ctx, mid, x + 4, 28, 2, 2); // toe
      fill(ctx, dark, x, 30, 6, 1); // sole
      if (spec.shoes === 'apology') fill(ctx, '#ff6b9d', x + 1, 28, 2, 1);
    }
  }

  // —— Body armor (distinct shapes) ——
  if (spec.breastplate === 'plate') {
    shadedBlock(ctx, '#8a98a8', '#c0d0e0', '#3a4050', bodyX, 14, bodyW, 10);
    fill(ctx, '#c0d0e0', bodyX + bodyW / 2 - 1, 15, 2, 6);
    block(ctx, '#c0d0e0', '#4a5060', bodyX - 2, 13, 4, 5);
    block(ctx, '#c0d0e0', '#4a5060', bodyX + bodyW - 2, 13, 4, 5);
    spark(ctx, bodyX + 3, 16, '#ffffff');
  } else if (spec.breastplate === 'reinforced') {
    shadedBlock(ctx, '#5c4030', '#8a7a60', '#3a2a18', bodyX, 14, bodyW, 10);
    block(ctx, '#a8b0b8', '#4a5060', bodyX + 3, 16, bodyW - 6, 5);
    fill(ctx, '#ffc857', bodyX + bodyW / 2 - 2, 17, 4, 3);
  } else if (spec.breastplate === 'leather') {
    shadedBlock(ctx, '#8b5a2b', '#a06830', '#5a3d1a', bodyX, 14, bodyW, 10);
    fill(ctx, '#f0c8a4', bodyX + bodyW / 2 - 2, 14, 4, 2); // collar V
    fill(ctx, '#3d2b1f', bodyX + 2, 17, bodyW - 4, 2);
    fill(ctx, '#c9a227', bodyX + bodyW / 2 - 1, 17, 2, 2);
  } else if (spec.breastplate === 'cloth_arcane') {
    shadedBlock(ctx, '#4a2a7a', '#7a5ab0', '#2a1848', bodyX - 1, 13, bodyW + 2, 12);
    spark(ctx, bodyX + 3, 16, '#ffc857');
    spark(ctx, bodyX + bodyW - 3, 19, '#7dffb3');
  } else if (spec.breastplate === 'cloak_ranger') {
    shadedBlock(ctx, '#3a5a38', '#5a8a50', '#1a3018', bodyX - 1, 13, bodyW + 2, 12);
    fill(ctx, '#2a4a28', bodyX + 2, 13, bodyW - 4, 3);
    fill(ctx, '#c9a227', bodyX + bodyW / 2 - 1, 16, 2, 2);
  } else if (spec.breastplate === 'holy') {
    shadedBlock(ctx, '#e8e0d0', '#ffffff', '#a09080', bodyX, 14, bodyW, 10);
    fill(ctx, '#ffc857', bodyX + bodyW / 2 - 1, 16, 2, 5);
    fill(ctx, '#ffc857', bodyX + bodyW / 2 - 3, 18, 6, 2);
  } else if (spec.breastplate === 'hide') {
    shadedBlock(ctx, '#6a4020', '#8a5a30', '#3a2010', bodyX, 14, bodyW, 10);
    dither(ctx, '#6a4020', '#5a3818', bodyX + 1, 15, bodyW - 2, 7, 0);
    fill(ctx, '#e8e0d0', bodyX + bodyW / 2 - 2, 16, 4, 2);
  }

  // —— Paw gloves with finger stubs ——
  if (spec.gloves === 'leather' || spec.gloves === 'sheath') {
    const mid = spec.gloves === 'sheath' ? '#3a5a38' : '#8b5a2b';
    const dark = spec.gloves === 'sheath' ? '#1a3018' : '#5a3d1a';
    const rx = 22 + Math.min(4, sx);
    for (const x of [5, rx]) {
      block(ctx, mid, dark, x, 17, 4, 4);
      fill(ctx, mid, x, 21, 1, 2);
      fill(ctx, mid, x + 2, 21, 1, 2);
    }
    if (spec.gloves === 'sheath') {
      fill(ctx, '#c8b090', rx + 1, 14, 2, 4);
      fill(ctx, '#7dffb3', rx + 1, 13, 2, 2);
    }
  }

  // —— Helmets with horns / brim ——
  if (spec.helmet === 'plate') {
    shadedBlock(ctx, '#8a98a8', '#c0d0e0', '#3a4050', 9, 3, 14, 8);
    fill(ctx, '#0a0a12', 12, 7, 8, 2); // visor
    fill(ctx, '#e8e0d0', 7, 1, 3, 4); // horn L
    fill(ctx, '#e8e0d0', 22, 1, 3, 4); // horn R
    fill(ctx, '#c0b8a0', 6, 1, 2, 2);
    fill(ctx, '#c0b8a0', 24, 1, 2, 2);
  } else if (spec.helmet === 'leather') {
    shadedBlock(ctx, '#8b5a2b', '#a06830', '#5a3d1a', 9, 4, 14, 7);
    fill(ctx, '#6b4423', 8, 8, 3, 4);
    fill(ctx, '#6b4423', 21, 8, 3, 4);
    fill(ctx, '#e8e0d0', 10, 2, 2, 3);
    fill(ctx, '#e8e0d0', 20, 2, 2, 3);
  } else if (spec.helmet === 'cloth_arcane') {
    fill(ctx, '#2a1848', 8, 5, 16, 2); // brim
    shadedBlock(ctx, '#4a2a7a', '#7a5ab0', '#2a1848', 11, 0, 10, 7);
    spark(ctx, 15, 1, '#ffc857');
  }

  // —— Collar amulet ——
  if (spec.amulet !== 'none') {
    fill(ctx, '#c9a227', 12, 13, 8, 1);
    if (spec.amulet === 'gold') {
      block(ctx, '#ffc857', '#8a6820', 13, 13, 6, 5);
      spark(ctx, 15, 14, '#fff3a0');
    } else if (spec.amulet === 'bauble') {
      block(ctx, '#ff6b9d', '#8a2040', 13, 13, 6, 5);
      spark(ctx, 15, 14);
    } else {
      block(ctx, '#5ad45a', '#2a6a2a', 13, 13, 6, 5);
      spark(ctx, 15, 14, '#e0ffe0');
    }
  }

  // —— Ring on paw ——
  if (spec.ring === 'luck') {
    fill(ctx, '#7dffb3', 24 + Math.min(2, sx), 21, 4, 3);
    spark(ctx, 25 + Math.min(2, sx), 21);
  } else if (spec.ring === 'silver') {
    block(ctx, '#d0d8e8', '#607080', 24 + Math.min(2, sx), 21, 4, 3);
  } else if (spec.ring === 'copper') {
    block(ctx, '#c07040', '#603010', 24 + Math.min(2, sx), 21, 4, 3);
  }

  // —— Shield (true shield shapes on left flank) ——
  if (spec.shield === 'tower') {
    fill(ctx, '#2a3040', 0, 11, 7, 14);
    fill(ctx, '#5a6578', 1, 12, 5, 12);
    fill(ctx, '#c0c8d0', 1, 16, 5, 2);
    fill(ctx, '#ffc857', 2, 15, 3, 3);
    fill(ctx, '#5a6578', 2, 24, 3, 1);
  } else if (spec.shield === 'iron') {
    fill(ctx, '#3a4050', 0, 12, 8, 12);
    fill(ctx, '#9aabc0', 1, 13, 6, 10);
    fill(ctx, '#9aabc0', 2, 23, 4, 1);
    fill(ctx, '#d0d8e8', 3, 16, 2, 3);
    spark(ctx, 3, 15);
  } else if (spec.shield === 'wood') {
    fill(ctx, '#4a3010', 0, 12, 8, 12);
    fill(ctx, '#a07828', 1, 13, 6, 10);
    fill(ctx, '#6b4423', 2, 15, 1, 6);
    fill(ctx, '#c9a227', 3, 17, 2, 2);
  }

  // —— Weapon (shared hip silhouettes) ——
  if (spec.weapon !== 'none') {
    drawWeaponAvatar(ctx, spec.weapon);
  }
}

/** Full buddy frame: body pose + equipped gear. */
export function drawBuddyLook(
  ctx: CanvasRenderingContext2D,
  spec: AppearanceSpec,
  pose: BuddyPoseName = 'idle',
): void {
  const opts = buddyDrawOptsForPose(pose);
  drawBuddyBase(ctx, opts);
  // Gear under coil so guard pose still reads as coiled; weapon/shield on top of soft aura
  if (!opts.coil) {
    drawBuddyGear(ctx, spec, opts);
  } else {
    // light collar/helm still peek for identity
    drawBuddyGear(
      ctx,
      {
        ...spec,
        breastplate: 'none',
        greaves: 'none',
        gloves: 'none',
        weapon: 'none',
        shield: 'none',
      },
      opts,
    );
  }
}

/**
 * On-demand buddy texture for pose + gear (avoids combinatorial boot cost).
 */
export function ensureBuddyTexture(
  scene: Phaser.Scene,
  spec: AppearanceSpec,
  pose: BuddyPoseName = 'idle',
): string {
  const key = buddyTextureKey(spec, pose);
  if (!scene.textures.exists(key)) {
    canvasTex(scene, key, ART_RES, ART_RES, (ctx) => {
      drawBuddyLook(ctx, spec, pose);
    });
  }
  return key;
}

function drawItemIcon(
  ctx: CanvasRenderingContext2D,
  itemId: string,
): void {
  const S = 32;
  fill(ctx, '#1a1528', 0, 0, S, S);
  ctx.strokeStyle = '#5c4d7a';
  ctx.strokeRect(0.5, 0.5, S - 1, S - 1);

  if (itemId === 'empty') {
    fill(ctx, '#2a2438', 10, 10, 12, 12);
    return;
  }
  if (itemId === 'potion') {
    block(ctx, '#ff6b9d', '#8a2040', 11, 12, 10, 14);
    fill(ctx, '#ffb0c8', 13, 14, 6, 4);
    fill(ctx, '#ddd', 13, 7, 6, 6);
    fill(ctx, '#8b5a2b', 14, 4, 4, 5);
    spark(ctx, 15, 16);
    return;
  }
  {
    const wLook = weaponLookFromTemplateId(itemId);
    if (wLook) {
      drawWeaponIcon(ctx, wLook);
      return;
    }
  }
  if (itemId === 'arrows') {
    fill(ctx, '#c8b090', 6, 8, 18, 3);
    fill(ctx, '#c8b090', 6, 14, 18, 3);
    fill(ctx, '#c8b090', 6, 20, 18, 3);
    fill(ctx, '#7dffb3', 4, 7, 4, 5);
    fill(ctx, '#7dffb3', 4, 13, 4, 5);
    fill(ctx, '#7dffb3', 4, 19, 4, 5);
    fill(ctx, '#ff6b9d', 22, 7, 4, 5);
    fill(ctx, '#ff6b9d', 22, 13, 4, 5);
    fill(ctx, '#ff6b9d', 22, 19, 4, 5);
    return;
  }
  if (itemId === 'beam_me_up') {
    block(ctx, '#4ecdc4', '#1a6060', 8, 8, 16, 16);
    fill(ctx, '#fff', 11, 12, 10, 3);
    fill(ctx, '#7dffb3', 12, 18, 8, 3);
    return;
  }
  if (
    itemId === 'ore_iron' ||
    itemId === 'ore_spark' ||
    itemId === 'wood_shard' ||
    itemId === 'sand_crystal' ||
    itemId === 'slime_gel' ||
    itemId === 'bone' ||
    itemId === 'wolf_pelt' ||
    itemId === 'cactus_spine' ||
    itemId === 'ensign_badge'
  ) {
    const colors: Record<string, string> = {
      ore_iron: '#8a9098',
      ore_spark: '#7dffb3',
      wood_shard: '#8b5a2b',
      sand_crystal: '#e8c070',
      slime_gel: '#5ad45a',
      bone: '#e8e0d0',
      wolf_pelt: '#6a5a4a',
      cactus_spine: '#3a8f4a',
      ensign_badge: '#c0392b',
    };
    const c = colors[itemId] ?? '#7dffb3';
    block(ctx, c, '#1a1528', 8, 8, 16, 16);
    spark(ctx, 12, 12, '#fff3a0');
    fill(ctx, '#fff3a0', 14, 14, 4, 4);
    return;
  }
  if (itemId === 'leather_helmet') {
    // open-face cap + cheek guards + stub horns
    fill(ctx, '#3d2b1f', 6, 8, 20, 10);
    fill(ctx, '#8b5a2b', 7, 9, 18, 8);
    fill(ctx, '#a06830', 9, 10, 14, 3);
    fill(ctx, '#6b4423', 5, 14, 6, 8);
    fill(ctx, '#6b4423', 21, 14, 6, 8);
    fill(ctx, '#e8e0d0', 8, 4, 3, 5);
    fill(ctx, '#e8e0d0', 21, 4, 3, 5);
    fill(ctx, '#c9a227', 12, 12, 8, 2);
    return;
  }
  if (
    itemId === 'leather_armor' ||
    itemId === 'reinforced_leather' ||
    itemId === 'studded_leather' ||
    itemId === 'wizard_cloak' ||
    itemId === 'ranger_cloak' ||
    itemId === 'fighter_plate' ||
    itemId === 'cleric_vestments' ||
    itemId === 'barbarian_hide'
  ) {
    if (itemId === 'wizard_cloak') {
      fill(ctx, '#2a1848', 4, 8, 24, 20);
      fill(ctx, '#4a2a7a', 6, 6, 20, 20);
      fill(ctx, '#7a5ab0', 9, 10, 14, 6);
      fill(ctx, '#2a1848', 10, 6, 12, 4); // hood
      spark(ctx, 12, 14, '#ffc857');
      spark(ctx, 18, 18, '#7dffb3');
      fill(ctx, '#3a1a60', 4, 24, 5, 4);
      fill(ctx, '#3a1a60', 23, 24, 5, 4);
      return;
    }
    if (itemId === 'ranger_cloak') {
      fill(ctx, '#1a3018', 4, 8, 24, 20);
      fill(ctx, '#3a5a38', 6, 6, 20, 20);
      fill(ctx, '#2a4a28', 8, 6, 16, 6); // hood
      fill(ctx, '#5a8a50', 9, 12, 14, 5);
      fill(ctx, '#8b5a2b', 14, 16, 4, 4);
      fill(ctx, '#c9a227', 15, 17, 2, 2);
      return;
    }
    if (itemId === 'fighter_plate') {
      // cuirass with pauldrons + fauld
      fill(ctx, '#3a4050', 5, 8, 22, 20);
      fill(ctx, '#8a98a8', 7, 8, 18, 16);
      fill(ctx, '#c0d0e0', 10, 10, 12, 6);
      fill(ctx, '#a8b8c8', 15, 11, 2, 8); // ridge
      // pauldrons
      fill(ctx, '#c0d0e0', 3, 8, 6, 8);
      fill(ctx, '#c0d0e0', 23, 8, 6, 8);
      fill(ctx, '#5a6878', 8, 22, 16, 3); // fauld
      spark(ctx, 12, 12);
      spark(ctx, 19, 12);
      return;
    }
    if (itemId === 'cleric_vestments') {
      fill(ctx, '#8a8070', 6, 6, 20, 22);
      fill(ctx, '#e8e0d0', 7, 7, 18, 20);
      fill(ctx, '#ffffff', 9, 9, 14, 4);
      fill(ctx, '#ffc857', 14, 12, 4, 10);
      fill(ctx, '#ffc857', 11, 15, 10, 4);
      fill(ctx, '#fff3a0', 15, 14, 2, 2);
      return;
    }
    if (itemId === 'barbarian_hide') {
      fill(ctx, '#3a2818', 5, 6, 22, 22);
      fill(ctx, '#6a4a30', 7, 7, 18, 18);
      dither(ctx, '#6a4a30', '#5a3a28', 9, 10, 14, 10, 0);
      fill(ctx, '#8a6a48', 5, 6, 5, 5);
      fill(ctx, '#8a6a48', 22, 6, 5, 5);
      fill(ctx, '#e8e0d0', 13, 12, 6, 3);
      fill(ctx, '#c0392b', 14, 16, 4, 5);
      return;
    }
    if (itemId === 'reinforced_leather') {
      fill(ctx, '#2a1810', 6, 6, 20, 22);
      fill(ctx, '#5c4030', 7, 7, 18, 20);
      fill(ctx, '#8a7a60', 9, 10, 14, 6);
      fill(ctx, '#a8b0b8', 11, 12, 10, 7);
      fill(ctx, '#ffc857', 13, 14, 6, 4);
      fill(ctx, '#c0b090', 5, 8, 5, 7);
      fill(ctx, '#c0b090', 22, 8, 5, 7);
      return;
    }
    if (itemId === 'studded_leather') {
      fill(ctx, '#2a1810', 6, 6, 20, 22);
      fill(ctx, '#8b5a2b', 7, 7, 18, 20);
      fill(ctx, '#a06830', 9, 10, 14, 8);
      for (const [x, y] of [
        [10, 12],
        [16, 14],
        [20, 12],
        [12, 18],
        [18, 18],
      ] as const) {
        fill(ctx, '#c0c0c0', x, y, 2, 2);
      }
      return;
    }
    // leather jacket + straps
    fill(ctx, '#2a1810', 6, 6, 20, 22);
    fill(ctx, '#8b5a2b', 7, 7, 18, 20);
    fill(ctx, '#a06830', 9, 10, 14, 6);
    fill(ctx, '#f0c8a4', 13, 7, 6, 4); // collar V
    fill(ctx, '#3d2b1f', 9, 14, 14, 2);
    fill(ctx, '#c9a227', 13, 14, 6, 2);
    fill(ctx, '#5a3d1a', 10, 12, 3, 10);
    fill(ctx, '#5a3d1a', 19, 12, 3, 10);
    return;
  }
  if (itemId === 'mage_hat') {
    fill(ctx, '#2a1848', 4, 14, 24, 5); // brim
    fill(ctx, '#4a2a7a', 5, 14, 22, 3);
    fill(ctx, '#4a2a7a', 10, 2, 12, 14);
    fill(ctx, '#7a5ab0', 13, 2, 6, 14);
    fill(ctx, '#2a1848', 15, 1, 2, 3);
    fill(ctx, '#c9a227', 10, 14, 12, 2);
    spark(ctx, 16, 3, '#ffc857');
    return;
  }
  if (itemId === 'plate_helm') {
    // great-helm + horns
    fill(ctx, '#3a4050', 6, 8, 20, 18);
    fill(ctx, '#8a98a8', 7, 9, 18, 16);
    fill(ctx, '#c0d0e0', 9, 10, 14, 4);
    fill(ctx, '#0a0a12', 10, 16, 12, 3); // visor
    fill(ctx, '#6a7888', 15, 14, 2, 6); // nasal
    fill(ctx, '#e8e0d0', 4, 2, 5, 10);
    fill(ctx, '#e8e0d0', 23, 2, 5, 10);
    fill(ctx, '#c0b8a0', 3, 2, 3, 5);
    fill(ctx, '#c0b8a0', 26, 2, 3, 5);
    spark(ctx, 15, 11);
    return;
  }
  if (itemId === 'plate_greaves') {
    // knee + shin pair
    for (const x of [5, 18]) {
      fill(ctx, '#3a4050', x, 6, 9, 22);
      fill(ctx, '#a8b8c8', x + 1, 7, 7, 5); // knee
      fill(ctx, '#8a98a8', x + 1, 13, 7, 13); // shin
      fill(ctx, '#c0c8d0', x + 3, 14, 2, 10);
    }
    return;
  }
  if (itemId === 'ranger_sheath') {
    // gloves with arrow nocks (hands, not boots)
    for (const x of [5, 18]) {
      fill(ctx, '#2a1810', x, 8, 9, 16);
      fill(ctx, '#5a3d1a', x + 1, 9, 7, 10);
      fill(ctx, '#8b5a2b', x + 1, 18, 7, 5); // palm
      fill(ctx, '#5a3d1a', x + 1, 23, 2, 3);
      fill(ctx, '#5a3d1a', x + 4, 23, 2, 3);
      fill(ctx, '#5a3d1a', x + 6, 23, 2, 2);
    }
    fill(ctx, '#c8b090', 20, 4, 3, 10);
    fill(ctx, '#7dffb3', 20, 2, 3, 3);
    return;
  }
  if (itemId === 'leather_greaves') {
    for (const x of [5, 18]) {
      fill(ctx, '#3d2b1f', x, 6, 9, 22);
      fill(ctx, '#8b5a2b', x + 1, 7, 7, 18);
      fill(ctx, '#a06830', x + 2, 10, 5, 4);
      fill(ctx, '#5a3d1a', x + 2, 16, 5, 2);
      fill(ctx, '#c9a227', x + 3, 16, 3, 2);
    }
    return;
  }
  if (itemId === 'leather_shoes' || itemId === 'sorry_boots') {
    // pair of boots: shaft + foot + toe + sole
    const c = itemId === 'sorry_boots' ? '#5ad4a0' : '#8b5a2b';
    const hi = itemId === 'sorry_boots' ? '#9ef0c8' : '#a06830';
    const e = itemId === 'sorry_boots' ? '#2a6a50' : '#3d2b1f';
    for (const x of [3, 17]) {
      fill(ctx, e, x, 8, 12, 20);
      fill(ctx, c, x + 1, 9, 8, 10); // shaft
      fill(ctx, c, x + 1, 18, 11, 7); // foot
      fill(ctx, hi, x + 2, 10, 6, 3);
      fill(ctx, c, x + 10, 20, 3, 4); // toe box
      fill(ctx, e, x + 1, 26, 12, 2); // sole
      if (itemId === 'sorry_boots') {
        fill(ctx, '#ff6b9d', x + 3, 14, 4, 2);
        fill(ctx, hi, x + 3, 20, 4, 2);
      } else {
        fill(ctx, e, x + 3, 14, 5, 2); // laces
      }
    }
    return;
  }
  if (itemId === 'leather_gloves') {
    // hands with fingers (clearly not boots)
    for (const x of [4, 18]) {
      fill(ctx, '#3d2b1f', x, 6, 10, 20);
      fill(ctx, '#8b5a2b', x + 1, 7, 8, 10); // cuff + palm
      fill(ctx, '#a06830', x + 2, 9, 6, 4);
      // fingers
      fill(ctx, '#8b5a2b', x + 1, 18, 2, 7);
      fill(ctx, '#8b5a2b', x + 4, 18, 2, 8);
      fill(ctx, '#8b5a2b', x + 7, 18, 2, 6);
      fill(ctx, '#a06830', x + 1, 18, 2, 2);
    }
    return;
  }
  // —— Buddy-only kit icons (cute + gold BUD vibe) ——
  if (itemId.startsWith('bud_')) {
    fill(ctx, '#1a1528', 0, 0, 32, 32);
    fill(ctx, '#ffc857', 1, 1, 30, 2);
    fill(ctx, '#ffc857', 1, 29, 30, 2);
    if (itemId === 'bud_collar') {
      fill(ctx, '#ff6b9d', 6, 12, 20, 8);
      fill(ctx, '#ffc857', 12, 16, 8, 6);
      spark(ctx, 15, 14);
    } else if (itemId === 'bud_sash' || itemId === 'bud_mail') {
      const c = itemId === 'bud_mail' ? '#8a98a8' : '#6a4a30';
      fill(ctx, c, 6, 8, 20, 18);
      fill(ctx, '#ffc857', 10, 12, 12, 3);
    } else if (itemId === 'bud_paws') {
      fill(ctx, '#f0c8a4', 6, 10, 8, 12);
      fill(ctx, '#f0c8a4', 18, 10, 8, 12);
      fill(ctx, '#ff6b9d', 8, 20, 4, 3);
      fill(ctx, '#ff6b9d', 20, 20, 4, 3);
    } else if (itemId === 'bud_booties') {
      fill(ctx, '#5ad4a0', 5, 14, 10, 12);
      fill(ctx, '#5ad4a0', 17, 14, 10, 12);
      fill(ctx, '#ff6b9d', 8, 20, 4, 2);
    } else if (itemId === 'bud_spike') {
      fill(ctx, '#8a98a8', 8, 10, 16, 14);
      fill(ctx, '#e8e0d0', 6, 4, 4, 10);
      fill(ctx, '#e8e0d0', 22, 4, 4, 10);
    } else if (itemId === 'bud_charm') {
      fill(ctx, '#7dffb3', 10, 10, 12, 12);
      spark(ctx, 14, 12);
    } else if (itemId === 'bud_claw' || itemId === 'bud_fang') {
      fill(ctx, '#c0c0c8', 14, 6, 4, 18);
      fill(ctx, itemId === 'bud_fang' ? '#9aabc0' : '#ff6b9d', 16, 4, 10, 8);
    } else if (itemId === 'bud_shell') {
      fill(ctx, '#a07828', 8, 6, 16, 20);
      fill(ctx, '#c9a227', 12, 12, 8, 8);
    } else {
      fill(ctx, '#ffc857', 10, 10, 12, 12);
    }
    fill(ctx, '#0a0c10', 22, 22, 8, 8);
    fill(ctx, '#ffc857', 23, 24, 6, 4);
    return;
  }
  if (itemId === 'cube_core') {
    block(ctx, '#5ad45a', '#2a6a2a', 6, 6, 20, 20);
    fill(ctx, 'rgba(255,255,255,0.45)', 9, 9, 8, 8);
    fill(ctx, '#2a8a2a', 6, 22, 20, 3);
    return;
  }
  if (itemId === 'gold_trinket' || itemId === 'dungeon_key') {
    if (itemId === 'dungeon_key') {
      fill(ctx, '#ffc857', 8, 8, 10, 10);
      fill(ctx, '#1a1528', 11, 11, 4, 4);
      fill(ctx, '#ffc857', 16, 11, 10, 4);
      fill(ctx, '#ffc857', 22, 15, 4, 6);
      fill(ctx, '#ffc857', 18, 15, 4, 4);
      spark(ctx, 10, 10);
    } else {
      block(ctx, '#ffc857', '#8a6820', 8, 8, 16, 16);
      spark(ctx, 12, 12, '#fff3a0');
      fill(ctx, '#fff3a0', 14, 14, 4, 4);
    }
    return;
  }
  if (itemId === 'shiny_bauble') {
    block(ctx, '#ff6b9d', '#8a2040', 8, 8, 16, 16);
    spark(ctx, 12, 12);
    fill(ctx, '#fff', 13, 13, 5, 5);
    return;
  }
  if (itemId === 'tinker_oil') {
    block(ctx, '#4a90a4', '#1a4050', 10, 10, 12, 16);
    fill(ctx, '#8b5a2b', 12, 5, 8, 7);
    spark(ctx, 14, 16, '#a0e0f0');
    return;
  }
  if (
    itemId === 'wood_shield' ||
    itemId === 'iron_shield' ||
    itemId === 'tower_shield'
  ) {
    if (itemId === 'tower_shield') {
      // tall heater, taper base
      fill(ctx, '#2a3040', 7, 3, 18, 26);
      fill(ctx, '#5a6578', 8, 4, 16, 24);
      fill(ctx, '#8a98a8', 8, 4, 16, 3);
      fill(ctx, '#3a4558', 10, 8, 12, 14);
      fill(ctx, '#c0c8d0', 8, 14, 16, 3);
      fill(ctx, '#c0c8d0', 14, 4, 4, 22);
      fill(ctx, '#ffc857', 12, 13, 8, 6);
      fill(ctx, '#5a6578', 10, 26, 12, 2);
      fill(ctx, '#5a6578', 12, 28, 8, 1);
      spark(ctx, 15, 8, '#e0e8f0');
    } else if (itemId === 'iron_shield') {
      // kite heater
      fill(ctx, '#405060', 8, 4, 16, 22);
      fill(ctx, '#a0b0c0', 9, 5, 14, 20);
      fill(ctx, '#c0d0e0', 9, 5, 14, 3);
      fill(ctx, '#a0b0c0', 11, 24, 10, 2);
      fill(ctx, '#a0b0c0', 13, 26, 6, 1);
      fill(ctx, '#6a7888', 9, 5, 2, 20);
      fill(ctx, '#6a7888', 21, 5, 2, 20);
      fill(ctx, '#d0d8e8', 13, 12, 6, 6);
      fill(ctx, '#ffc857', 14, 11, 4, 2);
      spark(ctx, 15, 13);
    } else {
      // round wood
      fill(ctx, '#3d2b1f', 6, 5, 20, 22);
      fill(ctx, '#8b5a2b', 7, 6, 18, 20);
      fill(ctx, '#a07828', 9, 8, 14, 16);
      fill(ctx, '#6b4423', 11, 10, 2, 12);
      fill(ctx, '#6b4423', 19, 11, 2, 10);
      fill(ctx, '#c9a227', 13, 14, 6, 6);
      fill(ctx, '#8a6820', 14, 15, 4, 4);
      spark(ctx, 15, 12, '#e8c050');
    }
    return;
  }
  if (
    itemId === 'copper_ring' ||
    itemId === 'silver_ring' ||
    itemId === 'luck_ring'
  ) {
    const c =
      itemId === 'silver_ring'
        ? '#d0d8e0'
        : itemId === 'luck_ring'
          ? '#7dffb3'
          : '#c97b3a';
    ctx.strokeStyle = c;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(16, 17, 9, 0, Math.PI * 2);
    ctx.stroke();
    fill(ctx, '#ffc857', 12, 6, 8, 5);
    return;
  }
  fill(ctx, '#7dffb3', 10, 10, 12, 12);
}

export function generateTextures(scene: Phaser.Scene): void {
  // —— Map tiles @ ART_RES (16-bit density, match avatar/weapon detail) ——
  canvasTex(scene, 'tile-floor', ART_RES, ART_RES, (ctx) => {
    drawFloorTile(ctx, ART_RES, hex(COLORS.floor), hex(COLORS.floorAlt), '#1a1528');
  });

  canvasTex(scene, 'tile-wall', ART_RES, ART_RES, (ctx) => {
    drawBrickTile(
      ctx,
      ART_RES,
      hex(COLORS.wallDark),
      hex(COLORS.wall),
      '#2a2438',
      '#7a6a9a',
    );
  });

  canvasTex(scene, 'tile-grass', ART_RES, ART_RES, (ctx) => {
    drawGrassTile(ctx, ART_RES, hex(COLORS.grass), hex(COLORS.grassAlt), '#6ad48a');
  });

  canvasTex(scene, 'tile-dirt', ART_RES, ART_RES, (ctx) => {
    drawDirtTile(ctx, ART_RES, hex(COLORS.dirt));
  });

  canvasTex(scene, 'tile-water', ART_RES, ART_RES, (ctx) => {
    drawWaterTile(ctx, ART_RES, hex(COLORS.water), 0);
  });

  canvasTex(scene, 'tile-water-b', ART_RES, ART_RES, (ctx) => {
    drawWaterTile(ctx, ART_RES, hex(COLORS.water), 1);
  });

  canvasTex(scene, 'tile-lava', ART_RES, ART_RES, (ctx) => {
    drawLavaTile(ctx, ART_RES, hex(COLORS.lava), 0);
  });

  canvasTex(scene, 'tile-lava-b', ART_RES, ART_RES, (ctx) => {
    drawLavaTile(ctx, ART_RES, hex(COLORS.lava), 1);
  });

  canvasTex(scene, 'tile-door', ART_RES, ART_RES, (ctx) => {
    // floor behind so open sides read as passage
    drawFloorTile(ctx, ART_RES, hex(COLORS.floor), hex(COLORS.floorAlt), '#1a1528');
    // stone arch frame
    shadedBlock(ctx, '#6a5a40', '#9a8a60', '#3a3018', 0, 0, ART_RES, 5);
    shadedBlock(ctx, '#6a5a40', '#9a8a60', '#3a3018', 0, 0, 5, ART_RES);
    shadedBlock(ctx, '#6a5a40', '#9a8a60', '#3a3018', ART_RES - 5, 0, 5, ART_RES);
    grit(ctx, 'rgba(0,0,0,0.2)', 0, 0, ART_RES, 5, 4, 0);
    // wood leaves with grain
    shadedBlock(ctx, '#8b6914', '#d4b040', '#4a3010', 5, 5, 10, 25);
    shadedBlock(ctx, '#8b6914', '#d4b040', '#4a3010', 17, 5, 10, 25);
    // grain lines
    fill(ctx, 'rgba(60,40,10,0.35)', 7, 8, 1, 18);
    fill(ctx, 'rgba(60,40,10,0.3)', 12, 10, 1, 14);
    fill(ctx, 'rgba(60,40,10,0.35)', 20, 8, 1, 18);
    fill(ctx, 'rgba(60,40,10,0.3)', 25, 10, 1, 14);
    // raised panels
    shadedBlock(ctx, '#a07828', '#c9a227', '#5a4010', 7, 7, 6, 7);
    shadedBlock(ctx, '#a07828', '#c9a227', '#5a4010', 19, 7, 6, 7);
    shadedBlock(ctx, '#6b5018', '#8b6914', '#3a2810', 7, 17, 6, 9);
    shadedBlock(ctx, '#6b5018', '#8b6914', '#3a2810', 19, 17, 6, 9);
    // iron studs
    fill(ctx, '#4a4a58', 8, 9, 2, 2);
    fill(ctx, '#4a4a58', 11, 9, 2, 2);
    fill(ctx, '#4a4a58', 20, 9, 2, 2);
    fill(ctx, '#4a4a58', 23, 9, 2, 2);
    fill(ctx, '#8a8a98', 8, 9, 1, 1);
    // ring handles
    block(ctx, '#ffc857', '#8a6820', 13, 15, 2, 5);
    block(ctx, '#ffc857', '#8a6820', 17, 15, 2, 5);
    spark(ctx, 13, 16, '#fff3a0');
    spark(ctx, 17, 16, '#fff3a0');
  });

  canvasTex(scene, 'tile-locked', ART_RES, ART_RES, (ctx) => {
    drawFloorTile(ctx, ART_RES, hex(COLORS.floor), hex(COLORS.floorAlt), '#1a1528');
    shadedBlock(ctx, '#4a3820', '#7a5a30', '#2a1c10', 0, 0, ART_RES, 5);
    shadedBlock(ctx, '#4a3820', '#7a5a30', '#2a1c10', 0, 0, 5, ART_RES);
    shadedBlock(ctx, '#4a3820', '#7a5a30', '#2a1c10', ART_RES - 5, 0, 5, ART_RES);
    // heavy door slab
    shadedBlock(ctx, '#5a3d1a', '#8a6230', '#3a2810', 5, 5, 22, 25);
    dither(ctx, '#5a3d1a', '#4a3014', 6, 6, 20, 23, 1);
    // iron bands
    fill(ctx, '#5a5a68', 6, 10, 20, 3);
    fill(ctx, '#5a5a68', 6, 22, 20, 3);
    fill(ctx, '#8a8a98', 6, 10, 20, 1);
    fill(ctx, '#3a3a48', 6, 12, 20, 1);
    // lock plate + keyhole
    block(ctx, '#9a9aa8', '#404050', 11, 12, 10, 12);
    fill(ctx, '#c0c0c8', 12, 13, 8, 1);
    fill(ctx, '#ffc857', 14, 15, 4, 4);
    fill(ctx, '#fff3a0', 15, 16, 2, 1);
    fill(ctx, '#1a1a22', 15, 17, 2, 2);
    fill(ctx, '#1a1a22', 14, 19, 4, 3);
    spark(ctx, 18, 14, '#e0e0e8');
  });

  canvasTex(scene, 'tile-stairs', ART_RES, ART_RES, (ctx) => {
    // pit behind steps
    fill(ctx, '#1a1020', 0, 0, ART_RES, ART_RES);
    dither(ctx, '#1a1020', '#0a0810', 0, 0, ART_RES, ART_RES, 0);
    // side walls
    shadedBlock(ctx, '#3a3050', '#5a4a70', '#1a1428', 0, 0, 3, ART_RES);
    shadedBlock(ctx, '#3a3050', '#5a4a70', '#1a1428', ART_RES - 3, 0, 3, ART_RES);
    for (let i = 0; i < 7; i++) {
      const y = 1 + i * 4;
      const inset = Math.floor(i * 0.7);
      const mid = i % 2 === 0 ? '#6a5a8a' : '#5a4a78';
      shadedBlock(
        ctx,
        mid,
        '#9a8aba',
        '#2a2038',
        3 + inset,
        y,
        ART_RES - 6 - inset * 2,
        3,
      );
      // tread edge
      fill(ctx, '#4a3a60', 3 + inset, y + 3, ART_RES - 6 - inset * 2, 1);
      grit(ctx, 'rgba(0,0,0,0.2)', 4 + inset, y, ART_RES - 8 - inset * 2, 2, 4, i);
    }
    // descent marker
    fill(ctx, '#ff6b9d', 11, 1, 10, 3);
    fill(ctx, '#ffb0c8', 13, 2, 6, 1);
    fill(ctx, '#c03050', 14, 4, 4, 1);
  });

  canvasTex(scene, 'tile-stairs-up', ART_RES, ART_RES, (ctx) => {
    fill(ctx, '#2a3048', 0, 0, ART_RES, ART_RES);
    dither(ctx, '#2a3048', '#1a2030', 0, 0, ART_RES, ART_RES, 1);
    shadedBlock(ctx, '#4a5870', '#7a90a8', '#2a3040', 0, 0, 3, ART_RES);
    shadedBlock(ctx, '#4a5870', '#7a90a8', '#2a3040', ART_RES - 3, 0, 3, ART_RES);
    for (let i = 0; i < 7; i++) {
      const y = 28 - i * 4;
      const inset = Math.max(0, 5 - i);
      const mid = i % 2 === 0 ? '#9ab0d0' : '#8aa0c0';
      shadedBlock(
        ctx,
        mid,
        '#c0d8f0',
        '#405068',
        3 + inset,
        y,
        ART_RES - 6 - inset * 2,
        3,
      );
      fill(ctx, '#7088a8', 3 + inset, y + 3, ART_RES - 6 - inset * 2, 1);
      grit(ctx, 'rgba(255,255,255,0.12)', 4 + inset, y, ART_RES - 8 - inset * 2, 2, 5, i);
    }
    // ascent marker
    fill(ctx, '#7dffb3', 11, 1, 10, 3);
    fill(ctx, '#c9ffe0', 13, 2, 6, 1);
    fill(ctx, '#2a8a5a', 14, 4, 4, 1);
  });

  canvasTex(scene, 'tile-pad', ART_RES, ART_RES, (ctx) => {
    fill(ctx, '#0e1a28', 0, 0, ART_RES, ART_RES);
    dither(ctx, '#0e1a28', '#1a2a40', 0, 0, ART_RES, ART_RES, 0);
    // outer ring
    shadedBlock(ctx, '#1a3048', '#4ecdc4', '#0a1828', 2, 2, 28, 28);
    shadedBlock(ctx, '#243850', '#3a6078', '#102030', 5, 5, 22, 22);
    // circuit channels
    fill(ctx, '#4ecdc4', 8, 8, 16, 2);
    fill(ctx, '#4ecdc4', 8, 22, 16, 2);
    fill(ctx, '#4ecdc4', 8, 8, 2, 16);
    fill(ctx, '#4ecdc4', 22, 8, 2, 16);
    fill(ctx, '#2a8a8a', 10, 10, 12, 1);
    fill(ctx, '#2a8a8a', 10, 21, 12, 1);
    // corner nodes
    for (const [x, y] of [
      [8, 8],
      [22, 8],
      [8, 22],
      [22, 22],
    ] as const) {
      block(ctx, '#7dffb3', '#2a6a5a', x, y, 3, 3);
    }
    // core gem
    block(ctx, '#7dffb3', '#2a8a5a', 13, 13, 6, 6);
    fill(ctx, '#c9ffe0', 14, 14, 3, 2);
    spark(ctx, 15, 15);
    spark(ctx, 17, 16, '#ffffff');
  });

  // Default bare hero + keyed loadout texture (full combos generated on demand)
  canvasTex(scene, 'player', ART_RES, ART_RES, (ctx) => {
    drawPlayerLook(ctx, BARE_APPEARANCE);
  });
  canvasTex(scene, playerTextureKey(BARE_APPEARANCE), ART_RES, ART_RES, (ctx) => {
    drawPlayerLook(ctx, BARE_APPEARANCE);
  });

  const iconIds = [
    'empty',
    'potion',
    'mild_sword',
    'iron_blade',
    'sand_saber',
    'dunjun_cleaver',
    'honk_blade',
    'short_bow',
    'hunter_crossbow',
    'wizard_staff',
    'phaser',
    'arrows',
    'beam_me_up',
    'leather_armor',
    'reinforced_leather',
    'leather_helmet',
    'leather_greaves',
    'leather_shoes',
    'sorry_boots',
    'leather_gloves',
    'wizard_cloak',
    'mage_hat',
    'ranger_cloak',
    'ranger_sheath',
    'fighter_plate',
    'plate_helm',
    'plate_greaves',
    'studded_leather',
    'cleric_vestments',
    'barbarian_hide',
    'gold_trinket',
    'shiny_bauble',
    'cube_core',
    'wood_shield',
    'iron_shield',
    'tower_shield',
    'copper_ring',
    'silver_ring',
    'luck_ring',
    'dungeon_key',
    'tinker_oil',
    'ore_iron',
    'ore_spark',
    'wood_shard',
    'sand_crystal',
    'slime_gel',
    'bone',
    'wolf_pelt',
    'cactus_spine',
    'ensign_badge',
    'bud_collar',
    'bud_sash',
    'bud_paws',
    'bud_booties',
    'bud_spike',
    'bud_charm',
    'bud_claw',
    'bud_shell',
    'bud_mail',
    'bud_fang',
  ];
  for (const id of iconIds) {
    canvasTex(scene, `icon_${id}`, 32, 32, (ctx) => drawItemIcon(ctx, id));
  }

  // Slot frame chrome
  canvasTex(scene, 'slot_frame', 40, 40, (ctx) => {
    ctx.fillStyle = '#12161f';
    ctx.fillRect(0, 0, 40, 40);
    ctx.strokeStyle = '#7dffb3';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, 38, 38);
    ctx.strokeStyle = '#ffc857';
    ctx.strokeRect(4, 4, 32, 32);
  });

  // Default melee swing + one FX frame per weapon look (attack reads uniquely)
  const swingLooks: WeaponLook[] = [
    'sword',
    'iron',
    'saber',
    'cleaver',
    'honk',
    'phaser',
    'bow',
    'crossbow',
    'staff',
  ];
  canvasTex(scene, 'sword-swing', 20, 20, (ctx) => {
    drawWeaponSwing(ctx, 'sword');
  });
  for (const look of swingLooks) {
    canvasTex(scene, swingTextureKey(look), 20, 20, (ctx) => {
      drawWeaponSwing(ctx, look);
    });
  }

  // Motion arc for attack VFX
  canvasTex(scene, 'slash-arc', 24, 24, (ctx) => {
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(12, 12, 9, -0.9, 0.9);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(125,255,179,0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(12, 12, 7, -0.7, 0.7);
    ctx.stroke();
  });

  canvasTex(scene, 'slime', ART_RES, ART_RES, (ctx) => {
    fill(ctx, 'rgba(0,0,0,0.25)', 6, 26, 20, 4);
    block(ctx, '#5ad45a', '#1a4a20', 5, 9, 22, 19);
    fill(ctx, '#7dffb3', 7, 11, 18, 9);
    fill(ctx, '#9ef0b8', 9, 12, 8, 4);
    fill(ctx, '#fff', 9, 14, 5, 5);
    fill(ctx, '#fff', 18, 14, 5, 5);
    fill(ctx, '#1a1a2e', 11, 16, 3, 3);
    fill(ctx, '#1a1a2e', 20, 16, 3, 3);
    spark(ctx, 11, 15, '#ffffff');
    spark(ctx, 20, 15, '#ffffff');
    fill(ctx, '#2a6a2a', 13, 22, 6, 2);
    spark(ctx, 14, 13, '#c9ffe0');
  });

  canvasTex(scene, 'slime-b', ART_RES, ART_RES, (ctx) => {
    fill(ctx, 'rgba(0,0,0,0.2)', 4, 26, 24, 4);
    block(ctx, '#5ad45a', '#1a4a20', 4, 11, 24, 17);
    fill(ctx, '#7dffb3', 6, 13, 20, 7);
    fill(ctx, '#fff', 8, 14, 5, 5);
    fill(ctx, '#fff', 19, 13, 5, 5);
    fill(ctx, '#1a1a2e', 10, 16, 3, 3);
    fill(ctx, '#1a1a2e', 21, 15, 3, 3);
    spark(ctx, 10, 15, '#ffffff');
    spark(ctx, 21, 14, '#ffffff');
  });

  canvasTex(scene, 'skeleton', ART_RES, ART_RES, (ctx) => {
    // skull with cartoon hollow eyes
    fill(ctx, '#6a6050', 9, 1, 14, 12);
    fill(ctx, '#e8e0d0', 10, 2, 12, 10);
    fill(ctx, '#fff8e8', 12, 3, 8, 3);
    fill(ctx, '#1a1a2e', 12, 6, 4, 4);
    fill(ctx, '#1a1a2e', 18, 6, 4, 4);
    spark(ctx, 13, 6, '#ffffff');
    spark(ctx, 19, 6, '#ffffff');
    fill(ctx, '#1a1a2e', 14, 11, 4, 1);
    fill(ctx, '#c8c0b0', 13, 12, 2, 1);
    fill(ctx, '#c8c0b0', 17, 12, 2, 1);
    // ribcage
    fill(ctx, '#e8e0d0', 11, 14, 10, 10);
    fill(ctx, '#c8c0b0', 12, 16, 8, 1);
    fill(ctx, '#c8c0b0', 12, 19, 8, 1);
    fill(ctx, '#c8c0b0', 12, 22, 8, 1);
    fill(ctx, '#e8e0d0', 5, 14, 6, 4);
    fill(ctx, '#e8e0d0', 21, 14, 6, 4);
    fill(ctx, '#e8e0d0', 10, 24, 5, 6);
    fill(ctx, '#e8e0d0', 17, 24, 5, 6);
  });

  canvasTex(scene, 'redshirt', ART_RES, ART_RES, (ctx) => {
    // red tunic + cartoon face + hair
    shadedBlock(ctx, '#c0392b', '#e05050', '#7a1818', 8, 12, 16, 12);
    fill(ctx, '#ffc857', 12, 14, 8, 2); // rank strip
    hairMass(ctx, 10, 4, 12, { color: '#1a1a22', bangs: true });
    cartoonFace(ctx, 10, 4, 12, 9);
    fill(ctx, '#1a1a22', 9, 24, 6, 6);
    fill(ctx, '#1a1a22', 17, 24, 6, 6);
    fill(ctx, '#888', 5, 13, 4, 9);
    fill(ctx, '#3a3a48', 22, 15, 7, 5);
    fill(ctx, '#ff2030', 26, 16, 3, 3);
  });

  canvasTex(scene, 'captain', ART_RES, ART_RES, (ctx) => {
    fill(ctx, '#1a1a22', 10, 24, 5, 6);
    fill(ctx, '#1a1a22', 17, 24, 5, 6);
    shadedBlock(ctx, '#d4a017', '#e8c040', '#8a6810', 8, 12, 16, 12);
    fill(ctx, '#e8c040', 10, 14, 12, 3);
    fill(ctx, '#1a1a22', 10, 12, 12, 2);
    shadedBlock(ctx, '#f0c8a4', '#ffe0c8', '#c09070', 10, 4, 12, 9);
    fill(ctx, '#3d2b1f', 10, 2, 12, 4);
    fill(ctx, '#3d2b1f', 8, 4, 3, 4);
    fill(ctx, '#111', 12, 7, 2, 2);
    fill(ctx, '#111', 18, 7, 2, 2);
    fill(ctx, '#ffc857', 6, 16, 2, 6);
    fill(ctx, '#ffc857', 24, 16, 2, 6);
  });

  // Floor Captain / mid wardens — redshirt manager + cape + clipboard
  canvasTex(scene, 'miniboss', ART_RES, ART_RES, (ctx) => {
    fill(ctx, '#1a1a22', 9, 24, 6, 6);
    fill(ctx, '#1a1a22', 17, 24, 6, 6);
    // cape
    shadedBlock(ctx, '#2a1840', '#4a2868', '#140c20', 4, 12, 6, 14);
    shadedBlock(ctx, '#c0392b', '#e05050', '#7a1818', 8, 12, 16, 12);
    fill(ctx, '#ffc857', 11, 14, 10, 2); // badge strip
    fill(ctx, '#ffc857', 14, 16, 4, 3); // badge
    hairMass(ctx, 10, 4, 12, { color: '#1a1a22', bangs: true });
    cartoonFace(ctx, 10, 4, 12, 9);
    // clipboard
    fill(ctx, '#c9a882', 22, 14, 7, 9);
    fill(ctx, '#888', 23, 16, 5, 1);
    fill(ctx, '#888', 23, 18, 5, 1);
    fill(ctx, '#888', 23, 20, 4, 1);
  });

  canvasTex(scene, 'cube', ART_RES, ART_RES, (ctx) => {
    block(ctx, 'rgba(90, 220, 180, 0.85)', '#2a8f70', 4, 4, 24, 24);
    fill(ctx, 'rgba(255,255,255,0.4)', 7, 7, 8, 8);
    fill(ctx, '#1a3328', 10, 16, 4, 4);
    fill(ctx, '#1a3328', 18, 16, 4, 4);
  });

  canvasTex(scene, 'boss', ART_RES, ART_RES, (ctx) => {
    shadedBlock(ctx, '#4a2060', '#7a40a0', '#2a1040', 6, 12, 20, 16);
    shadedBlock(ctx, '#f0c8a4', '#ffe0c8', '#c09070', 10, 4, 12, 10);
    block(ctx, '#ffc857', '#8a6820', 8, 1, 16, 6);
    fill(ctx, '#ffc857', 13, 0, 6, 4);
    fill(ctx, '#ff3344', 12, 8, 3, 3);
    fill(ctx, '#ff3344', 18, 8, 3, 3);
    fill(ctx, '#fff', 11, 20, 10, 3);
  });

  canvasTex(scene, 'npc', ART_RES, ART_RES, (ctx) => {
    shadedBlock(ctx, '#6b4f9a', '#9a7acc', '#3a2858', 8, 12, 16, 12);
    shadedBlock(ctx, '#e8c4a0', '#ffe0c8', '#c09070', 10, 4, 12, 9);
    fill(ctx, '#ddd', 9, 2, 14, 4);
    fill(ctx, '#222', 12, 7, 2, 2);
    fill(ctx, '#222', 18, 7, 2, 2);
    fill(ctx, '#4a3060', 10, 24, 5, 6);
    fill(ctx, '#4a3060', 17, 24, 5, 6);
  });

  canvasTex(scene, 'merchant', ART_RES, ART_RES, (ctx) => {
    shadedBlock(ctx, '#8b5a2b', '#a06830', '#5a3d1a', 6, 14, 20, 12);
    fill(ctx, '#c9a227', 4, 12, 24, 5);
    shadedBlock(ctx, '#e8c4a0', '#ffe0c8', '#c09070', 10, 5, 12, 8);
    fill(ctx, '#5c3d1a', 8, 2, 16, 4);
    fill(ctx, '#5c3d1a', 14, 0, 4, 4);
    fill(ctx, '#222', 12, 8, 2, 2);
    fill(ctx, '#222', 18, 8, 2, 2);
    fill(ctx, '#ffc857', 24, 16, 4, 4);
  });

  canvasTex(scene, 'key', ART_RES, ART_RES, (ctx) => {
    fill(ctx, '#ffc857', 6, 8, 10, 10);
    fill(ctx, '#1a1528', 9, 11, 4, 4);
    fill(ctx, '#ffc857', 14, 11, 12, 4);
    fill(ctx, '#ffc857', 22, 15, 4, 8);
    fill(ctx, '#ffc857', 18, 15, 4, 5);
    spark(ctx, 8, 10);
  });

  canvasTex(scene, 'heart', ART_RES, ART_RES, (ctx) => {
    fill(ctx, '#ff6b9d', 6, 8, 8, 8);
    fill(ctx, '#ff6b9d', 18, 8, 8, 8);
    fill(ctx, '#ff6b9d', 8, 14, 16, 10);
    fill(ctx, '#ff6b9d', 12, 22, 8, 5);
    spark(ctx, 10, 10);
  });

  canvasTex(scene, 'sword-item', ART_RES, ART_RES, (ctx) => {
    block(ctx, '#dfe6f0', '#607080', 13, 2, 6, 18);
    fill(ctx, '#fff', 14, 3, 2, 14);
    fill(ctx, '#c9a227', 8, 18, 16, 4);
    fill(ctx, '#8b5a2b', 13, 22, 6, 7);
  });

  canvasTex(scene, 'sign', ART_RES, ART_RES, (ctx) => {
    shadedBlock(ctx, '#8b6914', '#c9a227', '#5a4510', 4, 4, 24, 16);
    fill(ctx, '#5a4510', 14, 20, 4, 10);
    fill(ctx, '#f5e6b8', 8, 8, 16, 2);
    fill(ctx, '#f5e6b8', 8, 13, 12, 2);
  });

  canvasTex(scene, 'chest', ART_RES, ART_RES, (ctx) => {
    shadedBlock(ctx, '#8b5a2b', '#a06830', '#5a3d1a', 4, 12, 24, 14);
    shadedBlock(ctx, '#a06830', '#c9a227', '#6b4423', 4, 8, 24, 8);
    block(ctx, '#ffc857', '#8a6820', 14, 14, 4, 6);
    spark(ctx, 15, 15);
  });

  canvasTex(scene, 'mapz', ART_RES, ART_RES, (ctx) => {
    // rolled parchment map pickup
    shadedBlock(ctx, '#d4c4a0', '#f0e8c8', '#8a7850', 3, 5, 26, 22);
    fill(ctx, '#c4b490', 5, 7, 22, 18);
    dither(ctx, '#d4c4a0', '#c4b490', 5, 7, 22, 18, 0);
    // wooden rods
    shadedBlock(ctx, '#8b6914', '#c9a227', '#5a4010', 2, 3, 28, 4);
    shadedBlock(ctx, '#8b6914', '#c9a227', '#5a4010', 2, 25, 28, 4);
    // inked land blobs
    fill(ctx, '#5a8a5a', 7, 10, 9, 6);
    fill(ctx, '#4a6a9a', 16, 14, 9, 7);
    fill(ctx, '#a08040', 10, 18, 7, 4);
    // you-are-here
    fill(ctx, '#c0392b', 14, 12, 3, 3);
    spark(ctx, 15, 13, '#ff6b6b');
    // crease
    fill(ctx, 'rgba(80,60,30,0.2)', 15, 8, 1, 16);
  });

  // Graphic mapz UI tiles (56×56 matches UIScene MAPZ_CELL)
  const cell = 56;
  const drawMapzCell = (
    ctx: CanvasRenderingContext2D,
    fillCol: string,
    border: string,
    mode: 'visited' | 'unknown' | 'current',
  ) => {
    // outer void
    fill(ctx, '#0a0c10', 0, 0, cell, cell);
    // stone rim
    shadedBlock(ctx, '#2a3040', border, '#12161f', 2, 2, cell - 4, cell - 4);
    // room fill
    fill(ctx, fillCol, 6, 6, cell - 12, cell - 12);
    // floor plate detail
    fill(ctx, 'rgba(0,0,0,0.2)', 10, 10, cell - 20, cell - 22);
    dither(ctx, fillCol, 'rgba(0,0,0,0.12)', 10, 10, cell - 20, cell - 22, 0);
    // top highlight on rim
    fill(ctx, 'rgba(255,255,255,0.12)', 6, 6, cell - 12, 3);
    // corner studs
    for (const [x, y] of [
      [4, 4],
      [cell - 8, 4],
      [4, cell - 8],
      [cell - 8, cell - 8],
    ] as const) {
      fill(ctx, border, x, y, 3, 3);
      fill(ctx, 'rgba(255,255,255,0.25)', x, y, 1, 1);
    }
    if (mode === 'unknown') {
      // hatch fog
      grit(ctx, 'rgba(0,0,0,0.35)', 8, 8, cell - 16, cell - 16, 3, 1);
      ctx.fillStyle = border;
      ctx.font = 'bold 24px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', cell / 2, cell / 2 + 1);
    }
    if (mode === 'current') {
      // gold frame pulse base
      ctx.strokeStyle = '#ffc857';
      ctx.lineWidth = 3;
      ctx.strokeRect(5, 5, cell - 10, cell - 10);
      // player diamond
      fill(ctx, '#ff6b9d', cell / 2 - 6, 16, 12, 12);
      fill(ctx, '#ffc857', cell / 2 - 4, 18, 8, 8);
      fill(ctx, '#fff', cell / 2 - 2, 20, 4, 4);
    }
  };

  canvasTex(scene, 'mapz_cell_visited', cell, cell, (ctx) => {
    drawMapzCell(ctx, '#2f6b45', '#7dffb3', 'visited');
  });
  canvasTex(scene, 'mapz_cell_unknown', cell, cell, (ctx) => {
    drawMapzCell(ctx, '#1a2a20', '#5a6a60', 'unknown');
  });
  canvasTex(scene, 'mapz_cell_current', cell, cell, (ctx) => {
    drawMapzCell(ctx, '#3a8a55', '#ffc857', 'current');
  });
  // Base plate for land-tinted rooms (UI multiplies land color)
  canvasTex(scene, 'mapz_cell_base', cell, cell, (ctx) => {
    fill(ctx, '#ffffff', 0, 0, cell, cell);
    // rim keeps some darkness after tint
    fill(ctx, '#c8c8c8', 0, 0, cell, cell);
    shadedBlock(ctx, '#e8e8e8', '#ffffff', '#909090', 2, 2, cell - 4, cell - 4);
    fill(ctx, '#d0d0d0', 8, 8, cell - 16, cell - 16);
    dither(ctx, '#d8d8d8', '#c0c0c0', 10, 10, cell - 20, cell - 20, 0);
    fill(ctx, 'rgba(255,255,255,0.5)', 10, 10, cell - 20, 3);
    for (const [x, y] of [
      [4, 4],
      [cell - 8, 4],
      [4, cell - 8],
      [cell - 8, cell - 8],
    ] as const) {
      fill(ctx, '#ffffff', x, y, 3, 3);
    }
  });
  canvasTex(scene, 'mapz_stairs', 16, 16, (ctx) => {
    fill(ctx, '#2a1520', 0, 0, 16, 16);
    for (let i = 0; i < 5; i++) {
      const y = 12 - i * 2;
      shadedBlock(ctx, '#ff6b9d', '#ffb0c8', '#a03050', 2 + i, y, 12 - i * 2, 2);
    }
  });
  canvasTex(scene, 'mapz_link_h', 20, 10, (ctx) => {
    fill(ctx, '#0a0c10', 0, 0, 20, 10);
    shadedBlock(ctx, '#5a8a70', '#7dffb3', '#2a4a38', 0, 2, 20, 6);
    fill(ctx, 'rgba(255,255,255,0.2)', 0, 3, 20, 1);
  });
  canvasTex(scene, 'mapz_link_v', 10, 20, (ctx) => {
    fill(ctx, '#0a0c10', 0, 0, 10, 20);
    shadedBlock(ctx, '#5a8a70', '#7dffb3', '#2a4a38', 2, 0, 6, 20);
    fill(ctx, 'rgba(255,255,255,0.2)', 3, 0, 1, 20);
  });

  // Forje anvil + glow
  canvasTex(scene, 'forje', ART_RES, ART_RES, (ctx) => {
    shadedBlock(ctx, '#3a3a48', '#5a5a68', '#1a1a22', 6, 16, 20, 10);
    shadedBlock(ctx, '#5a5a68', '#8a8a98', '#2a2a34', 4, 12, 24, 6);
    fill(ctx, '#2a2a34', 8, 18, 16, 2);
    fill(ctx, '#ff8a4c', 12, 6, 8, 6);
    fill(ctx, '#ffcc66', 14, 4, 4, 4);
    fill(ctx, '#ffc857', 15, 8, 3, 2);
    spark(ctx, 16, 5);
  });

  canvasTex(scene, 'princess', ART_RES, ART_RES, (ctx) => {
    shadedBlock(ctx, '#ff6b9d', '#ffb0c8', '#a03050', 8, 14, 16, 12);
    shadedBlock(ctx, '#f0c8a4', '#ffe0c8', '#c09070', 10, 6, 12, 9);
    block(ctx, '#ffc857', '#8a6820', 8, 2, 16, 6);
    fill(ctx, '#ffc857', 14, 0, 4, 4);
    fill(ctx, '#222', 12, 9, 2, 2);
    fill(ctx, '#222', 18, 9, 2, 2);
    fill(ctx, '#c07090', 10, 26, 5, 5);
    fill(ctx, '#c07090', 17, 26, 5, 5);
  });

  canvasTex(scene, 'wolf', ART_RES, ART_RES, (ctx) => {
    shadedBlock(ctx, '#6a6a78', '#9a9aa8', '#3a3a48', 6, 12, 18, 12);
    fill(ctx, '#4a4a58', 4, 8, 12, 8);
    fill(ctx, '#3a3a48', 2, 4, 6, 6);
    fill(ctx, '#3a3a48', 12, 4, 6, 6);
    fill(ctx, '#ff3344', 6, 10, 2, 2);
    fill(ctx, '#ff3344', 14, 10, 2, 2);
    fill(ctx, '#888', 22, 16, 8, 4);
    fill(ctx, '#1a1a22', 8, 24, 5, 6);
    fill(ctx, '#1a1a22', 16, 24, 5, 6);
  });

  canvasTex(scene, 'cactus', ART_RES, ART_RES, (ctx) => {
    shadedBlock(ctx, '#3d8b5a', '#5ad47a', '#2a6a40', 12, 4, 8, 24);
    fill(ctx, '#3d8b5a', 6, 10, 6, 10);
    fill(ctx, '#3d8b5a', 20, 14, 6, 10);
    fill(ctx, '#2a6a40', 14, 8, 2, 4);
    fill(ctx, '#f0e8c0', 10, 4, 2, 2);
    fill(ctx, '#f0e8c0', 20, 8, 2, 2);
    fill(ctx, '#f0e8c0', 8, 12, 2, 2);
    fill(ctx, '#f0e8c0', 22, 18, 2, 2);
    fill(ctx, '#f0e8c0', 14, 2, 2, 2);
  });

  canvasTex(scene, 'tree', ART_RES, ART_RES, (ctx) => {
    fill(ctx, '#5a3a22', 13, 18, 6, 12);
    fill(ctx, '#2f6b45', 4, 6, 24, 16);
    fill(ctx, '#3a8f5a', 8, 4, 10, 10);
    fill(ctx, '#1e4a30', 10, 16, 2, 2);
    fill(ctx, '#1e4a30', 20, 10, 2, 2);
    spark(ctx, 12, 8, '#6ad48a');
  });

  canvasTex(scene, 'tumbleweed', ART_RES, ART_RES, (ctx) => {
    fill(ctx, '#8a6a40', 6, 8, 20, 16);
    ctx.strokeStyle = '#6a5030';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(16, 16, 8, 0, Math.PI * 2);
    ctx.stroke();
    fill(ctx, '#a08050', 12, 12, 3, 3);
    fill(ctx, '#a08050', 18, 18, 3, 3);
  });

  canvasTex(scene, 'scorpion', ART_RES, ART_RES, (ctx) => {
    shadedBlock(ctx, '#c07040', '#e09060', '#603020', 6, 14, 18, 10);
    fill(ctx, '#a05030', 20, 8, 6, 12);
    fill(ctx, '#ff3344', 24, 6, 4, 4);
    fill(ctx, '#603020', 4, 16, 4, 3);
    fill(ctx, '#603020', 4, 20, 4, 3);
    fill(ctx, '#1a1a22', 8, 24, 4, 4);
    fill(ctx, '#1a1a22', 16, 24, 4, 4);
  });

  canvasTex(scene, 'tarantula', ART_RES, ART_RES, (ctx) => {
    block(ctx, '#4a3030', '#1a1010', 10, 12, 12, 10);
    fill(ctx, '#6a4040', 8, 10, 4, 4);
    fill(ctx, '#6a4040', 20, 10, 4, 4);
    for (const x of [4, 8, 20, 24]) {
      fill(ctx, '#3a2020', x, 16, 3, 10);
    }
    fill(ctx, '#ff3344', 12, 14, 2, 2);
    fill(ctx, '#ff3344', 18, 14, 2, 2);
  });

  canvasTex(scene, 'hornet', ART_RES, ART_RES, (ctx) => {
    fill(ctx, 'rgba(200,220,255,0.6)', 6, 8, 8, 6);
    fill(ctx, 'rgba(200,220,255,0.6)', 18, 8, 8, 6);
    shadedBlock(ctx, '#e8c040', '#ffe080', '#8a6810', 10, 12, 12, 10);
    fill(ctx, '#1a1a22', 12, 14, 8, 2);
    fill(ctx, '#1a1a22', 12, 18, 8, 2);
    fill(ctx, '#222', 22, 16, 6, 2);
  });

  // Bare buddy frames (no gear) — gear combos generated on demand via ensureBuddyTexture
  canvasTex(scene, 'best_bud', ART_RES, ART_RES, (ctx) => {
    drawBuddyBase(ctx);
  });
  canvasTex(scene, 'best_bud_stretch', ART_RES, ART_RES, (ctx) => {
    drawBuddyBase(ctx, buddyDrawOptsForPose('stretch'));
  });
  canvasTex(scene, 'best_bud_grab', ART_RES, ART_RES, (ctx) => {
    drawBuddyBase(ctx, buddyDrawOptsForPose('grab'));
  });
  canvasTex(scene, 'best_bud_strike', ART_RES, ART_RES, (ctx) => {
    drawBuddyBase(ctx, buddyDrawOptsForPose('strike'));
  });
  canvasTex(scene, 'best_bud_spit', ART_RES, ART_RES, (ctx) => {
    drawBuddyBase(ctx, buddyDrawOptsForPose('spit'));
  });
  canvasTex(scene, 'best_bud_blink', ART_RES, ART_RES, (ctx) => {
    drawBuddyBase(ctx, buddyDrawOptsForPose('blink'));
  });
  canvasTex(scene, 'best_bud_guard', ART_RES, ART_RES, (ctx) => {
    drawBuddyBase(ctx, buddyDrawOptsForPose('guard'));
  });
  canvasTex(scene, 'best_bud_heal', ART_RES, ART_RES, (ctx) => {
    drawBuddyBase(ctx, buddyDrawOptsForPose('heal'));
  });
  // Elastic limb for stretch ghost (wide strip, tinted in anim)
  canvasTex(scene, 'bud_stretch_limb', 24, 8, (ctx) => {
    ctx.fillStyle = '#d0d0d8';
    ctx.fillRect(0, 2, 24, 4);
    ctx.fillStyle = '#e8e8f0';
    ctx.fillRect(0, 3, 24, 2);
    ctx.fillStyle = '#a8a8b0';
    ctx.fillRect(0, 2, 24, 1);
    ctx.fillRect(0, 5, 24, 1);
    // sticky nubs
    ctx.fillStyle = '#c0c0c8';
    for (let i = 2; i < 22; i += 4) ctx.fillRect(i, 1, 2, 6);
  });

  // Boss exit portal — cyan ring + gem (step-on warp)
  canvasTex(scene, 'portal', ART_RES, ART_RES, (ctx) => {
    fill(ctx, '#0a1220', 0, 0, ART_RES, ART_RES);
    ctx.strokeStyle = '#4ecdc4';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(16, 16, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#7dffb3';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(16, 16, 8, 0, Math.PI * 2);
    ctx.stroke();
    fill(ctx, 'rgba(78,205,196,0.7)', 2, 14, 2, 2);
    fill(ctx, 'rgba(78,205,196,0.7)', 28, 16, 2, 2);
    fill(ctx, 'rgba(78,205,196,0.7)', 14, 2, 2, 2);
    fill(ctx, 'rgba(78,205,196,0.7)', 16, 28, 2, 2);
    block(ctx, '#ffc857', '#8a6820', 13, 13, 6, 6);
    fill(ctx, '#4ecdc4', 12, 20, 8, 2);
  });

  canvasTex(scene, 'particle', 4, 4, (ctx) => {
    ctx.fillStyle = hex(COLORS.gold);
    ctx.fillRect(1, 0, 2, 4);
    ctx.fillRect(0, 1, 4, 2);
  });

  canvasTex(scene, 'particle-hit', 6, 6, (ctx) => {
    ctx.fillStyle = '#fff';
    ctx.fillRect(2, 0, 2, 6);
    ctx.fillRect(0, 2, 6, 2);
    ctx.fillStyle = hex(COLORS.green);
    ctx.fillRect(2, 2, 2, 2);
  });

  // Projectiles (hard mode + player ranged)
  canvasTex(scene, 'proj-arrow', 8, 4, (ctx) => {
    ctx.fillStyle = '#c8b090';
    ctx.fillRect(0, 1, 6, 2);
    ctx.fillStyle = '#e8e0d0';
    ctx.fillRect(5, 0, 3, 4);
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(0, 1, 2, 2);
  });
  canvasTex(scene, 'proj-phaser', 8, 4, (ctx) => {
    ctx.fillStyle = '#ff3344';
    ctx.fillRect(0, 1, 8, 2);
    ctx.fillStyle = '#ffaaaa';
    ctx.fillRect(2, 0, 4, 4);
  });
  canvasTex(scene, 'proj-fireball', 8, 8, (ctx) => {
    ctx.fillStyle = '#ff8a4c';
    ctx.beginPath();
    ctx.arc(4, 4, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe08a';
    ctx.fillRect(3, 3, 2, 2);
  });
  canvasTex(scene, 'proj-bolt', 6, 6, (ctx) => {
    ctx.fillStyle = '#7dffb3';
    ctx.fillRect(2, 0, 2, 6);
    ctx.fillRect(0, 2, 6, 2);
    ctx.fillStyle = '#fff';
    ctx.fillRect(2, 2, 2, 2);
  });

  // ── Humanz & Villagez ──────────────────────────────────
  canvasTex(scene, 'dragon', 32, 24, (ctx) => {
    ctx.fillStyle = '#3d8b5a';
    ctx.fillRect(8, 8, 18, 10);
    ctx.fillRect(4, 6, 8, 6);
    ctx.fillRect(22, 10, 8, 4);
    // wing
    ctx.fillStyle = '#2a6a40';
    ctx.fillRect(10, 2, 10, 6);
    ctx.fillRect(12, 0, 6, 4);
    // eye
    ctx.fillStyle = '#ffc857';
    ctx.fillRect(6, 7, 2, 2);
    ctx.fillStyle = '#000';
    ctx.fillRect(7, 8, 1, 1);
    // belly
    ctx.fillStyle = '#7dffb3';
    ctx.fillRect(12, 12, 10, 4);
  });

  canvasTex(scene, 'hoard-gold', 16, 12, (ctx) => {
    ctx.fillStyle = '#ffc857';
    ctx.fillRect(2, 4, 12, 6);
    ctx.fillRect(4, 2, 8, 4);
    ctx.fillStyle = '#ffe08a';
    ctx.fillRect(5, 3, 2, 2);
    ctx.fillRect(9, 5, 2, 2);
    ctx.fillStyle = '#c9a227';
    ctx.fillRect(3, 8, 10, 2);
  });

  canvasTex(scene, 'villager', ART_RES, ART_RES, (ctx) => {
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(5, 7, 6, 6);
    ctx.fillStyle = '#f0c8a4';
    ctx.fillRect(6, 3, 4, 4);
    ctx.fillStyle = '#222';
    ctx.fillRect(7, 4, 1, 1);
    ctx.fillRect(9, 4, 1, 1);
    ctx.fillStyle = '#4a3a28';
    ctx.fillRect(5, 13, 2, 2);
    ctx.fillRect(9, 13, 2, 2);
  });

  canvasTex(scene, 'villager-thief', ART_RES, ART_RES, (ctx) => {
    ctx.fillStyle = '#2a2438';
    ctx.fillRect(5, 7, 6, 6);
    ctx.fillStyle = '#f0c8a4';
    ctx.fillRect(6, 3, 4, 4);
    ctx.fillStyle = '#7dffb3';
    ctx.fillRect(4, 5, 8, 2);
    ctx.fillStyle = '#222';
    ctx.fillRect(7, 4, 1, 1);
    ctx.fillRect(9, 4, 1, 1);
  });

  canvasTex(scene, 'villager-knight', ART_RES, ART_RES, (ctx) => {
    ctx.fillStyle = '#8a9098';
    ctx.fillRect(5, 6, 6, 7);
    ctx.fillStyle = '#c0c8d0';
    ctx.fillRect(6, 2, 4, 4);
    ctx.fillStyle = '#ffc857';
    ctx.fillRect(12, 6, 2, 6);
    ctx.fillStyle = '#222';
    ctx.fillRect(7, 4, 1, 1);
    ctx.fillRect(9, 4, 1, 1);
  });

  canvasTex(scene, 'villager-mage', ART_RES, ART_RES, (ctx) => {
    ctx.fillStyle = '#4a3a78';
    ctx.fillRect(5, 7, 6, 6);
    ctx.fillStyle = '#f0c8a4';
    ctx.fillRect(6, 4, 4, 3);
    ctx.fillStyle = '#6a4aaa';
    ctx.fillRect(5, 1, 6, 3);
    ctx.fillRect(7, 0, 2, 2);
    ctx.fillStyle = '#7dffb3';
    ctx.fillRect(12, 8, 2, 2);
    ctx.fillStyle = '#222';
    ctx.fillRect(7, 5, 1, 1);
    ctx.fillRect(9, 5, 1, 1);
  });


}
