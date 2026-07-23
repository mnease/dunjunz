import type Phaser from 'phaser';
import { ART_BASE, ART_RES, COLORS } from '../config';
import {
  BARE_APPEARANCE,
  buddyTextureKey,
  playerTextureKey,
  playerWakeTextureKey,
  type AppearanceSpec,
  type BuddyPoseName,
  type PlayerWalkFrame,
  type PlayerWakePose,
  type WeaponLook,
  type ShieldLook,
  type AmuletLook,
  type RingLook,
  type ShoesLook,
} from './appearance';
import {
  bodyMetrics,
  bodyPalette,
  drawBodyBase,
  type BodyLook,
  DEFAULT_BODY,
} from './body-visuals';
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
  drawJaggedStoneFloor,
  drawJaggedStoneWall,
  drawKoiSprite,
  drawLavaTile,
  drawOreVein,
  drawSandTile,
  drawSandWallTile,
  drawSkyRedwoodSprite,
  drawSnowTile,
  drawTreeSprite,
  drawWaterTile,
  drawAssistantHonk,
  drawBanner,
  drawBarrel,
  drawCarpetTile,
  drawCrate,
  drawGlamdolph,
  drawPillar,
  drawRoyalGoose,
  drawThrone,
  drawVase,
  drawWoodElfGuard,
  drawWoodElfQueen,
  fill,
  grit,
  hairMass,
  hex,
  shadedBlock,
  spark,
  vgrad,
} from './pixel-art';

/**
 * Native-resolution micro-detail after author→ART_RES upscale.
 * Adds fine grit / edge light that only exists at 64px (true density).
 */
function applyMicroDetail(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed = 0,
): void {
  // Soft NW light rim
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  for (let i = 0; i < w; i++) {
    if ((i + seed) % 3 === 0) ctx.fillRect(i, 0, 1, 1);
  }
  for (let j = 0; j < h; j++) {
    if ((j + seed * 2) % 4 === 0) ctx.fillRect(0, j, 1, 1);
  }
  // Fine dark grit
  ctx.fillStyle = 'rgba(0,0,0,0.1)';
  for (let j = 1; j < h - 1; j++) {
    for (let i = 1; i < w - 1; i++) {
      const n = (i * 17 + j * 31 + seed * 13) & 31;
      if (n === 0) ctx.fillRect(i, j, 1, 1);
    }
  }
  // Fine light flecks
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  for (let j = 2; j < h - 2; j++) {
    for (let i = 2; i < w - 2; i++) {
      const n = (i * 23 + j * 11 + seed * 7) & 47;
      if (n === 0) ctx.fillRect(i, j, 1, 1);
    }
  }
  // Bottom contact shadow
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.fillRect(0, h - 1, w, 1);
}

/**
 * Create a canvas texture.
 * `draw` always paints in **author space** (legacy 32-bit coords for sprites).
 * Default: square ART_RES textures use author ART_BASE (2× upscale to 64-bit).
 * Pass authorW/authorH for non-square or custom craft sizes (also upscaled when
 * final w/h differ — use canvasTex2x for a simple 2× of any author size).
 */
function canvasTex(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
  authorW?: number,
  authorH?: number,
): void {
  if (scene.textures.exists(key)) return;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  const aw =
    authorW ?? (w === ART_RES && h === ART_RES ? ART_BASE : w);
  const ah =
    authorH ?? (w === ART_RES && h === ART_RES ? ART_BASE : h);
  const upscaled = aw !== w || ah !== h;
  if (upscaled) {
    ctx.scale(w / aw, h / ah);
  }
  draw(ctx);
  if (upscaled) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // Stable seed from key so textures don't shimmer between loads
    let seed = 0;
    for (let i = 0; i < key.length; i++) seed = (seed * 31 + key.charCodeAt(i)) | 0;
    applyMicroDetail(ctx, w, h, Math.abs(seed));
  }
  scene.textures.addCanvas(key, canvas);
}

/** 64-bit: double an author-space drawing to final texture pixels. */
function canvasTex2x(
  scene: Phaser.Scene,
  key: string,
  authorW: number,
  authorH: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
): void {
  canvasTex(
    scene,
    key,
    authorW * (ART_RES / ART_BASE),
    authorH * (ART_RES / ART_BASE),
    draw,
    authorW,
    authorH,
  );
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
  // Compact collar trinket (~half former 6×6 medallion — was pacifier-scale)
  fill(ctx, '#c9a227', 13, 13, 6, 1); // short chain
  if (look === 'cube') {
    block(ctx, '#5ad45a', '#2a6a2a', 14, 14, 3, 3);
    fill(ctx, '#9ef09e', 14, 14, 2, 1);
    spark(ctx, 15, 15, '#e0ffe0');
    return;
  }
  if (look === 'bauble') {
    block(ctx, '#ff6b9d', '#8a2040', 14, 14, 3, 3);
    fill(ctx, '#ffb0c8', 14, 14, 2, 1);
    spark(ctx, 15, 15);
    return;
  }
  // gold medallion
  block(ctx, '#ffc857', '#8a6820', 14, 14, 3, 3);
  fill(ctx, '#fff3a0', 14, 14, 2, 1);
  fill(ctx, '#c9a227', 15, 15, 1, 1);
  spark(ctx, 14, 14, '#ffffff');
}

function drawRing(
  ctx: CanvasRenderingContext2D,
  look: RingLook,
): void {
  if (look === 'none') return;
  // Compact band on right knuckles (~half former 5×4)
  if (look === 'luck') {
    fill(ctx, '#2a6a50', 25, 20, 3, 2);
    fill(ctx, '#7dffb3', 25, 19, 2, 3);
    fill(ctx, '#c9ffe0', 26, 20, 1, 1);
    spark(ctx, 26, 19);
    return;
  }
  if (look === 'silver') {
    block(ctx, '#d0d8e8', '#607080', 25, 20, 3, 2);
    fill(ctx, '#ffffff', 25, 20, 1, 1);
    return;
  }
  block(ctx, '#c07040', '#603010', 25, 20, 3, 2);
  fill(ctx, '#e09060', 25, 20, 1, 1);
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
  body: BodyLook = DEFAULT_BODY,
): void {
  const m = bodyMetrics(body.race, body.gender);
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
    const y = m.footY - 2 + yOff;
    shadedBlock(ctx, mid, light, dark, x, y, 5, 4);
    shadedBlock(ctx, mid, light, dark, x, y + 3, 7, 3);
    fill(ctx, mid, x + 5, y + 4, 3, 2);
    fill(ctx, light, x + 5, y + 4, 2, 1);
    fill(ctx, sole, x, y + 6, 8, 1);
    fill(ctx, dark, x + 1, y + 2, 3, 1);
    if (fancy) {
      fill(ctx, '#ff6b9d', x + 1, y + 1, 2, 1);
      fill(ctx, '#9ef0c8', x + 2, y + 4, 2, 1);
    }
  };

  if (look === 'apology') {
    drawBoot(m.leftLegX - 2 + lo.dx, lo.dy, '#5ad4a0', '#9ef0c8', '#2a6a50', '#1a4030', true);
    drawBoot(m.rightLegX - 1 + ro.dx, ro.dy, '#5ad4a0', '#9ef0c8', '#2a6a50', '#1a4030', true);
    return;
  }
  if (look === 'leather') {
    drawBoot(m.leftLegX - 2 + lo.dx, lo.dy, '#6b4423', '#a06830', '#2a1810', '#1a1008');
    drawBoot(m.rightLegX - 1 + ro.dx, ro.dy, '#6b4423', '#a06830', '#2a1810', '#1a1008');
    return;
  }
  drawBoot(m.leftLegX - 1 + lo.dx, lo.dy, '#3d2b1f', '#5a4030', '#1a1008', '#0a0804');
  drawBoot(m.rightLegX + ro.dx, ro.dy, '#3d2b1f', '#5a4030', '#1a1008', '#0a0804');
}

/** Shin guards — knee cap + shin plate; walk shortens the lifting leg. */
function drawGreaves(
  ctx: CanvasRenderingContext2D,
  look: AppearanceSpec['greaves'],
  walk: PlayerWalkFrame = 0,
  body: BodyLook = DEFAULT_BODY,
): void {
  const m = bodyMetrics(body.race, body.gender);
  const [lo, ro] = footOffsets(walk);
  const legs: [number, number][] = [
    [m.leftLegX + lo.dx, lo.dy],
    [m.rightLegX + ro.dx, ro.dy],
  ];
  const baseY = m.footY - m.legH + 1;
  if (look === 'plate') {
    for (const [x, dy] of legs) {
      const y = baseY + dy;
      block(ctx, '#a8b8c8', '#4a5060', x, y, m.legW, 3);
      fill(ctx, '#c0d0e0', x + 1, y, Math.max(1, m.legW - 2), 1);
      shadedBlock(ctx, '#8a98a8', '#c0c8d0', '#3a4050', x, y + 3, m.legW, Math.max(3, m.legH - 3));
      fill(ctx, '#6a7888', x + Math.floor(m.legW / 2), y + 4, 1, 3);
    }
  } else if (look === 'leather') {
    for (const [x, dy] of legs) {
      const y = baseY + 1 + dy;
      shadedBlock(ctx, '#8b5a2b', '#a06830', '#5a3d1a', x, y, m.legW, Math.max(4, m.legH - 1));
      fill(ctx, '#5a3d1a', x + 1, y + 2, Math.max(1, m.legW - 2), 1);
      fill(ctx, '#c9a227', x + Math.floor(m.legW / 2), y + 2, 1, 1);
    }
  } else {
    for (const [x, dy] of legs) {
      const y = baseY + 2 + dy;
      shadedBlock(ctx, '#2d6cdf', '#4a8cff', '#1a3a8a', x, y, m.legW, Math.max(3, m.legH - 2));
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
  body: BodyLook = DEFAULT_BODY,
): void {
  const m = bodyMetrics(body.race, body.gender);
  const leftX = m.torsoX - m.armW + m.shoulderBias;
  const rightX = m.torsoX + m.torsoW - m.shoulderBias;
  const cuffY = m.torsoY + 3;
  const hand = (
    x: number,
    mid: string,
    light: string,
    dark: string,
    sheath = false,
  ) => {
    shadedBlock(ctx, mid, light, dark, x, cuffY, Math.max(3, m.armW), 5);
    shadedBlock(ctx, mid, light, dark, x - (x < 16 ? 1 : 0), cuffY + 4, 5, 4);
    fill(ctx, mid, x - (x < 16 ? 1 : 0), cuffY + 8, 2, 2);
    fill(ctx, mid, x + 1, cuffY + 8, 2, 2);
    fill(ctx, mid, x + 3, cuffY + 8, 1, 2);
    fill(ctx, light, x, cuffY + 4, 3, 1);
    if (sheath) {
      fill(ctx, '#c8b090', x + (x < 16 ? 3 : -1), cuffY - 2, 2, 5);
      fill(ctx, '#7dffb3', x + (x < 16 ? 3 : -1), cuffY - 3, 2, 2);
    }
  };

  if (look === 'sheath') {
    hand(leftX, '#5a3d1a', '#8b5a2b', '#2a1810', true);
    hand(rightX, '#5a3d1a', '#8b5a2b', '#2a1810', true);
  } else if (look === 'leather') {
    hand(leftX, '#8b5a2b', '#a06830', '#5a3d1a');
    hand(rightX, '#8b5a2b', '#a06830', '#5a3d1a');
  } else {
    const p = bodyPalette(body.race);
    hand(leftX, p.skin, p.skinHi, p.skinSh);
    hand(rightX, p.skin, p.skinHi, p.skinSh);
  }
}

/** Torso armor — real breastplate silhouette vs jackets/cloaks. */
function drawBreastplate(
  ctx: CanvasRenderingContext2D,
  look: AppearanceSpec['breastplate'],
  body: BodyLook = DEFAULT_BODY,
): void {
  const m = bodyMetrics(body.race, body.gender);
  const tx = m.torsoX;
  const ty = m.torsoY;
  const tw = m.torsoW;
  const th = m.torsoH;
  const cx = tx + Math.floor(tw / 2);

  if (look === 'plate') {
    fill(ctx, '#1a1a2e', cx - 3, ty - 1, 6, 2);
    shadedBlock(ctx, '#8a98a8', '#c0d0e0', '#3a4050', tx, ty, tw, th);
    fill(ctx, '#a8b8c8', tx + 2, ty + 1, tw - 4, 4);
    fill(ctx, '#c0d0e0', cx - 1, ty + 2, 2, 6);
    fill(ctx, '#6a7888', tx + 2, ty + Math.floor(th / 2) + 1, tw - 4, 1);
    fill(ctx, '#7a8a9a', tx + 1, ty + th - 2, tw - 2, 2);
    block(ctx, '#c0d0e0', '#4a5060', tx - 3, ty - 1, 5, 6);
    block(ctx, '#c0d0e0', '#4a5060', tx + tw - 2, ty - 1, 5, 6);
    spark(ctx, tx + 3, ty + 3, '#ffffff');
    spark(ctx, tx + tw - 4, ty + 3, '#ffffff');
    return;
  }
  if (look === 'reinforced') {
    shadedBlock(ctx, '#5c4030', '#8a7a60', '#3a2a18', tx, ty, tw, th);
    block(ctx, '#a8b0b8', '#4a5060', tx + 3, ty + 2, tw - 6, 7);
    fill(ctx, '#c0c8d0', tx + 4, ty + 3, tw - 8, 2);
    fill(ctx, '#ffc857', cx - 2, ty + 5, 4, 3);
    block(ctx, '#c0b090', '#6a6040', tx - 2, ty, 4, 5);
    block(ctx, '#c0b090', '#6a6040', tx + tw - 2, ty, 4, 5);
    fill(ctx, '#3d2b1f', tx + 1, ty + th - 2, tw - 2, 2);
    return;
  }
  if (look === 'leather') {
    shadedBlock(ctx, '#8b5a2b', '#a06830', '#5a3d1a', tx, ty, tw, th);
    fill(ctx, '#f0c8a4', cx - 3, ty, 6, 3);
    fill(ctx, '#5a3d1a', cx - 4, ty, 1, 4);
    fill(ctx, '#5a3d1a', cx + 3, ty, 1, 4);
    fill(ctx, '#3d2b1f', tx + 2, ty + 4, tw - 4, 2);
    fill(ctx, '#c9a227', cx - 2, ty + 4, 4, 2);
    dither(ctx, '#8b5a2b', '#7a4a20', tx + 3, ty + 6, tw - 6, 3);
    fill(ctx, '#3d2b1f', tx + 1, ty + th - 1, tw - 2, 1);
    return;
  }
  if (look === 'cloth_arcane') {
    shadedBlock(ctx, '#4a2a7a', '#7a5ab0', '#2a1848', tx - 2, ty - 1, tw + 4, th + 2);
    fill(ctx, '#6a4a9a', tx, ty, tw, 4);
    fill(ctx, '#2a1848', cx - 5, ty - 1, 10, 3);
    spark(ctx, tx + 2, ty + 4, '#ffc857');
    spark(ctx, tx + tw - 3, ty + 6, '#7dffb3');
    fill(ctx, '#3a1a60', tx - 2, ty + th - 1, 4, 3);
    fill(ctx, '#3a1a60', tx + tw - 2, ty + th - 1, 4, 3);
    return;
  }
  if (look === 'cloak_ranger') {
    shadedBlock(ctx, '#3a5a38', '#5a8a50', '#1a3018', tx - 2, ty - 1, tw + 4, th + 2);
    fill(ctx, '#2a4a28', tx + 1, ty - 2, tw - 2, 4);
    fill(ctx, '#8b5a2b', cx - 2, ty + 2, 4, 3);
    fill(ctx, '#c9a227', cx - 1, ty + 3, 2, 1);
    dither(ctx, '#3a5a38', '#2a4a28', tx, ty + 5, tw, 5);
    return;
  }
  if (look === 'holy') {
    shadedBlock(ctx, '#e8e0d0', '#ffffff', '#8a8070', tx, ty, tw, th);
    fill(ctx, '#f8f0e0', tx + 2, ty + 1, tw - 4, 3);
    fill(ctx, '#ffc857', cx - 2, ty + 3, 4, 7);
    fill(ctx, '#ffc857', cx - 4, ty + 5, 8, 3);
    fill(ctx, '#fff3a0', cx - 1, ty + 4, 2, 2);
    fill(ctx, '#c9a227', tx + 1, ty + th - 1, tw - 2, 1);
    return;
  }
  if (look === 'hide') {
    shadedBlock(ctx, '#6a4a30', '#8a6a48', '#3a2818', tx - 1, ty, tw + 2, th);
    dither(ctx, '#6a4a30', '#5a3a28', tx + 1, ty + 2, tw - 2, 7);
    fill(ctx, '#8a6a48', tx - 2, ty - 1, 3, 3);
    fill(ctx, '#8a6a48', tx + tw - 1, ty - 1, 3, 3);
    fill(ctx, '#e8e0d0', cx - 2, ty + 3, 4, 2);
    fill(ctx, '#c0392b', cx - 1, ty + 5, 2, 3);
    return;
  }
  // default tunic
  shadedBlock(ctx, '#2d6cdf', '#5a9aff', '#1a4aaf', tx, ty, tw, th);
  fill(ctx, '#4a8cef', tx + 2, ty + 2, tw - 4, 3);
  fill(ctx, '#c9a227', tx + 3, ty + th - 3, tw - 6, 2);
  spark(ctx, tx + 3, ty + 3, '#a0c8ff');
}

/**
 * Head: cartoon face + hair mass, then helm overlays (EMA 32-bit craft).
 * When look is 'none', body base already drew the head — this is a no-op.
 */
function drawHelmet(
  ctx: CanvasRenderingContext2D,
  look: AppearanceSpec['helmet'],
  body: BodyLook = DEFAULT_BODY,
): void {
  if (look === 'none') return;
  const m = bodyMetrics(body.race, body.gender);
  const fx = m.headX;
  const fy = m.headY;
  const fw = m.headW;
  const fh = m.headH;
  const p = bodyPalette(body.race);

  if (look === 'leather' || look === 'cloth_arcane') {
    fill(ctx, p.hair, fx - 1, fy + 1, 2, 5);
    fill(ctx, p.hair, fx + fw - 1, fy + 1, 2, 5);
  }

  if (look !== 'plate') {
    shadedBlock(ctx, p.skin, p.skinHi, p.skinSh, fx, fy, fw, fh);
    cartoonFace(ctx, fx, fy, fw, fh, {
      soft: look === 'cloth_arcane' || body.gender === 'female',
    });
  }

  if (look === 'plate') {
    const hx = Math.max(0, fx - 2);
    const hw = Math.min(32 - hx, fw + 4);
    shadedBlock(ctx, '#8a98a8', '#c0d0e0', '#3a4050', hx, Math.max(0, fy - 2), hw, fh + 3);
    fill(ctx, '#a8b8c8', hx + 2, Math.max(0, fy - 1), hw - 4, 3);
    fill(ctx, '#0a0a12', hx + 3, fy + 3, hw - 6, 3);
    fill(ctx, '#6a7888', hx + Math.floor(hw / 2) - 1, fy + 2, 2, 6);
    fill(ctx, '#e8e0d0', hx - 3, Math.max(0, fy - 3), 4, 6);
    fill(ctx, '#e8e0d0', hx + hw - 1, Math.max(0, fy - 3), 4, 6);
    spark(ctx, hx + 4, fy + 1, '#ffffff');
    return;
  }
  if (look === 'leather') {
    shadedBlock(ctx, '#8b5a2b', '#a06830', '#5a3d1a', fx - 2, Math.max(0, fy - 2), fw + 4, 7);
    fill(ctx, '#a06830', fx, Math.max(0, fy - 1), fw, 2);
    fill(ctx, '#6b4423', fx - 3, fy + 2, 4, 6);
    fill(ctx, '#6b4423', fx + fw - 1, fy + 2, 4, 6);
    fill(ctx, '#e8e0d0', fx - 2, Math.max(0, fy - 3), 3, 3);
    fill(ctx, '#e8e0d0', fx + fw - 1, Math.max(0, fy - 3), 3, 3);
    fill(ctx, '#c9a227', fx + 2, fy, fw - 4, 1);
    return;
  }
  if (look === 'cloth_arcane') {
    fill(ctx, '#2a1848', fx - 5, fy + 1, fw + 10, 3);
    fill(ctx, '#4a2a7a', fx - 4, fy + 1, fw + 8, 2);
    fill(ctx, '#4a2a7a', fx, Math.max(0, fy - 3), fw, 7);
    fill(ctx, '#7a5ab0', fx + 2, Math.max(0, fy - 3), fw - 4, 7);
    spark(ctx, fx + Math.floor(fw / 2), Math.max(0, fy - 2), '#ffc857');
    fill(ctx, '#c9a227', fx, fy + 1, fw, 1);
    return;
  }
  // circlet
  shadedBlock(ctx, '#c9a227', '#e8c050', '#8a7010', fx - 1, Math.max(0, fy - 1), fw + 2, 3);
  fill(ctx, '#ffc857', fx + 1, Math.max(0, fy - 2), 2, 3);
  fill(ctx, '#ffc857', fx + Math.floor(fw / 2) - 1, Math.max(0, fy - 3), 4, 3);
  fill(ctx, '#fff3a0', fx + Math.floor(fw / 2), Math.max(0, fy - 3), 2, 1);
}

/**
 * 32×32 SNES-density hero. Layer order:
 * body base (race×gender) → greaves/shoes/armor overlays → head gear → accessories → weapon.
 * `walk` 1/2 = alternating foot plant for walk cycle.
 */
export function drawPlayerLook(
  ctx: CanvasRenderingContext2D,
  spec: AppearanceSpec,
  walk: PlayerWalkFrame = 0,
  body: BodyLook = DEFAULT_BODY,
): void {
  const bareHead = spec.helmet === 'none';
  // Body first (legs/torso/arms/head when bare)
  drawBodyBase(ctx, body, walk, { bareHead });
  // Gear layers (metrics-aligned to race proportions)
  if (spec.greaves !== 'none') drawGreaves(ctx, spec.greaves, walk, body);
  if (spec.shoes !== 'none') drawShoes(ctx, spec.shoes, walk, body);
  if (spec.breastplate !== 'none') drawBreastplate(ctx, spec.breastplate, body);
  if (spec.gloves !== 'none') drawGloves(ctx, spec.gloves, body);
  if (spec.helmet !== 'none') {
    drawHelmet(ctx, spec.helmet, body);
  }
  drawAmulet(ctx, spec.amulet);
  drawRing(ctx, spec.ring);
  drawShield(ctx, spec.shield);
  drawWeapon(ctx, spec.weapon);

  if (spec.key === 'key') {
    fill(ctx, '#8a6820', 5, 21, 3, 2);
    block(ctx, '#ffc857', '#8a6820', 5, 22, 5, 5);
    fill(ctx, '#fff3a0', 6, 23, 2, 2);
    fill(ctx, '#ffc857', 9, 24, 3, 1);
    fill(ctx, '#ffc857', 10, 25, 1, 2);
    spark(ctx, 6, 23, '#ffffff');
  }
}

/**
 * Ensure a canvas texture exists for this loadout (+ body + walk frame).
 */
export function ensurePlayerTexture(
  scene: Phaser.Scene,
  spec: AppearanceSpec,
  walk: PlayerWalkFrame = 0,
  body: BodyLook = DEFAULT_BODY,
): string {
  const key = playerTextureKey(spec, walk, body);
  if (!scene.textures.exists(key)) {
    canvasTex(scene, key, ART_RES, ART_RES, (ctx) => {
      drawPlayerLook(ctx, spec, walk, body);
    });
  }
  return key;
}

/**
 * Beach wake poses: lying on sand → sitting up → standing.
 * Uses race×gender skin/hair palette.
 */
export function drawPlayerWakePose(
  ctx: CanvasRenderingContext2D,
  spec: AppearanceSpec,
  pose: Exclude<PlayerWakePose, 'stand'>,
  body: BodyLook = DEFAULT_BODY,
): void {
  const p = bodyPalette(body.race);
  if (pose === 'lie') {
    fill(ctx, 'rgba(40,30,20,0.25)', 4, 20, 24, 4);
    shadedBlock(ctx, '#3d2b1f', '#5a4030', '#1a1008', 18, 14, 10, 5);
    shadedBlock(ctx, '#3d2b1f', '#5a4030', '#1a1008', 18, 19, 10, 5);
    shadedBlock(ctx, '#4a6a9a', '#6a8aba', '#2a3a5a', 8, 13, 12, 12);
    shadedBlock(ctx, p.skin, p.skinHi, p.skinSh, 2, 14, 8, 8);
    fill(ctx, '#3a2a20', 4, 17, 2, 1);
    fill(ctx, '#3a2a20', 7, 17, 2, 1);
    fill(ctx, p.hair, 2, 13, 8, 2);
    if (body.gender === 'female') {
      fill(ctx, p.hair, 2, 18, 3, 4);
      fill(ctx, p.hair, 8, 18, 2, 3);
    }
    if (body.race === 'tiefling') {
      fill(ctx, '#2a1a10', 3, 12, 2, 3);
      fill(ctx, '#2a1a10', 7, 12, 2, 3);
    }
    if (body.race === 'dragonborn') {
      fill(ctx, p.skinSh, 1, 16, 4, 3);
    }
    if (body.race === 'construct') {
      fill(ctx, '#0a1020', 3, 16, 6, 2);
      fill(ctx, p.accent, 4, 16, 2, 2);
    }
    shadedBlock(ctx, p.skin, p.skinHi, p.skinSh, 12, 22, 8, 3);
    if (spec.breastplate !== 'none') {
      fill(ctx, '#8a98a8', 9, 15, 10, 2);
    }
    spark(ctx, 5, 15, 'rgba(255,255,255,0.3)');
    return;
  }

  fill(ctx, 'rgba(40,30,20,0.2)', 8, 26, 16, 3);
  shadedBlock(ctx, '#3d2b1f', '#5a4030', '#1a1008', 8, 22, 7, 5);
  shadedBlock(ctx, '#3d2b1f', '#5a4030', '#1a1008', 17, 22, 7, 5);
  shadedBlock(ctx, '#4a6a9a', '#6a8aba', '#2a3a5a', 10, 12, 12, 12);
  if (spec.breastplate !== 'none') {
    fill(ctx, '#8a98a8', 11, 14, 10, 8);
  }
  shadedBlock(ctx, p.skin, p.skinHi, p.skinSh, 11, 4, 10, 9);
  fill(ctx, p.hair, 11, 3, 10, 3);
  if (body.gender === 'female') {
    fill(ctx, p.hair, 10, 8, 3, 6);
    fill(ctx, p.hair, 19, 8, 3, 6);
  }
  if (body.race === 'elf' || body.race === 'half_elf') {
    fill(ctx, p.skin, 9, 6, 2, 3);
    fill(ctx, p.skin, 21, 6, 2, 3);
  }
  if (body.race === 'dwarf' && body.gender === 'male') {
    fill(ctx, p.hair, 12, 11, 8, 4);
  }
  fill(ctx, '#222', 13, 8, 2, 1);
  fill(ctx, '#222', 18, 8, 2, 1);
  fill(ctx, '#fff', 13, 7, 1, 1);
  shadedBlock(ctx, p.skin, p.skinHi, p.skinSh, 7, 16, 4, 6);
  shadedBlock(ctx, p.skin, p.skinHi, p.skinSh, 21, 16, 4, 6);
}

export function ensurePlayerWakeTexture(
  scene: Phaser.Scene,
  spec: AppearanceSpec,
  pose: PlayerWakePose,
  body: BodyLook = DEFAULT_BODY,
): string {
  if (pose === 'stand') return ensurePlayerTexture(scene, spec, 0, body);
  const key = playerWakeTextureKey(spec, pose, body);
  if (!scene.textures.exists(key)) {
    canvasTex(scene, key, ART_RES, ART_RES, (ctx) => {
      drawPlayerWakePose(ctx, spec, pose, body);
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

  // —— Collar amulet (compact, ~half former size) ——
  if (spec.amulet !== 'none') {
    fill(ctx, '#c9a227', 13, 14, 5, 1);
    if (spec.amulet === 'gold') {
      block(ctx, '#ffc857', '#8a6820', 14, 14, 3, 3);
      spark(ctx, 15, 15, '#fff3a0');
    } else if (spec.amulet === 'bauble') {
      block(ctx, '#ff6b9d', '#8a2040', 14, 14, 3, 3);
      spark(ctx, 15, 15);
    } else {
      block(ctx, '#5ad45a', '#2a6a2a', 14, 14, 3, 3);
      spark(ctx, 15, 15, '#e0ffe0');
    }
  }

  // —— Ring on paw (compact) ——
  if (spec.ring === 'luck') {
    fill(ctx, '#7dffb3', 25 + Math.min(2, sx), 22, 2, 2);
    spark(ctx, 25 + Math.min(2, sx), 22);
  } else if (spec.ring === 'silver') {
    block(ctx, '#d0d8e8', '#607080', 25 + Math.min(2, sx), 22, 2, 2);
  } else if (spec.ring === 'copper') {
    block(ctx, '#c07040', '#603010', 25 + Math.min(2, sx), 22, 2, 2);
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

/** Item icon art @ 32×32 — also used by loot-reveal HTML modal (scaled up). */
export function drawItemIcon(
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
  if (
    itemId === 'crawler_starter_box' ||
    itemId === 'loot_box_bronze' ||
    itemId === 'loot_box_silver' ||
    itemId === 'loot_box_gold' ||
    itemId === 'loot_box_platinum' ||
    itemId === 'loot_box_diamond' ||
    itemId === 'legendary_elven_box'
  ) {
    const colors: Record<string, { body: string; lid: string; band: string }> = {
      crawler_starter_box: { body: '#8a5a2a', lid: '#c97b3a', band: '#c9a227' },
      loot_box_bronze: { body: '#8a5a2a', lid: '#c97b3a', band: '#c9a227' },
      loot_box_silver: { body: '#6a738a', lid: '#c0c8d0', band: '#e0e8f0' },
      loot_box_gold: { body: '#8a6820', lid: '#ffc857', band: '#ffe08a' },
      loot_box_platinum: { body: '#5a7088', lid: '#b0d0e8', band: '#e8f4ff' },
      loot_box_diamond: { body: '#3a6088', lid: '#7dffb3', band: '#c9ffe0' },
      legendary_elven_box: { body: '#2a6040', lid: '#7dffb3', band: '#c9ffe0' },
    };
    const c = colors[itemId]!;
    // Treasure chest silhouette
    fill(ctx, '#2a1810', 6, 12, 20, 14);
    fill(ctx, c.body, 7, 13, 18, 12);
    fill(ctx, c.lid, 6, 8, 20, 7);
    fill(ctx, c.band, 6, 14, 20, 3);
    fill(ctx, '#ffc857', 14, 15, 4, 4);
    spark(ctx, 15, 9, '#ffffff');
    if (itemId === 'crawler_starter_box') {
      fill(ctx, '#7dffb3', 12, 18, 8, 2);
    }
    if (itemId === 'legendary_elven_box') {
      fill(ctx, '#e8ffe8', 10, 17, 12, 2);
    }
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

/** Compact rack peg weapons — distinct looks, fits multi-weapon stand. */
function drawRackPegWeapon(
  ctx: CanvasRenderingContext2D,
  look: string,
  cx: number,
  top: number,
): void {
  if (look === 'bow' || look === 'longbow' || look === 'magic_bow') {
    const magic = look === 'magic_bow';
    const tall = look === 'longbow';
    fill(ctx, '#2a1810', cx - 1, top, 2, tall ? 16 : 14);
    fill(ctx, magic ? '#4a3060' : '#8b5a2b', cx, top + 1, 1, tall ? 14 : 12);
    fill(ctx, magic ? '#d0a0ff' : '#c8b090', cx - 3, top + 6, 7, 1);
    fill(ctx, magic ? '#b070ff' : '#7dffb3', cx - 3, top + 5, 2, 2);
    return;
  }
  if (look === 'crossbow') {
    fill(ctx, '#5a3d1a', cx - 4, top + 6, 9, 3);
    fill(ctx, '#8b5a2b', cx - 1, top, 2, 14);
    fill(ctx, '#c9a227', cx - 3, top + 7, 2, 1);
    return;
  }
  if (
    look === 'axe' ||
    look === 'battle_axe' ||
    look === 'iron_axe' ||
    look === 'greataxe'
  ) {
    const iron = look === 'iron_axe';
    const double = look === 'battle_axe' || look === 'greataxe';
    fill(ctx, '#5a3d1a', cx, top + 2, 2, look === 'greataxe' ? 14 : 12);
    fill(ctx, '#8b5a2b', cx, top + 3, 1, look === 'greataxe' ? 12 : 10);
    fill(ctx, iron ? '#4a5060' : '#5a6578', cx - 5, top + 2, double ? 8 : 7, 5);
    fill(ctx, iron ? '#e0e8f0' : '#c0c8d0', cx - 4, top + 3, 3, 3);
    if (double) {
      fill(ctx, '#8a98a8', cx + 1, top + 3, 3, 3);
    }
    spark(ctx, cx - 3, top + 3, '#ffffff');
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
        ? { deep: '#1a6aaa', mid: '#4ac0ff', hi: '#c0ecff' }
        : look === 'staff_fire'
          ? { deep: '#8a2010', mid: '#ff5030', hi: '#ffb080' }
          : look === 'staff_ice'
            ? { deep: '#0a2048', mid: '#2a60a0', hi: '#80b0e0' }
            : { deep: '#0a4a30', mid: '#2a8a5a', hi: '#7dffb3' };
    fill(ctx, '#3a2010', cx, top, 2, 15);
    fill(ctx, '#6b4423', cx, top + 1, 1, 13);
    block(ctx, crystal.mid, crystal.deep, cx - 2, top - 1, 6, 5);
    fill(ctx, crystal.hi, cx - 1, top, 3, 3);
    spark(ctx, cx + 1, top, '#ffffff');
    return;
  }
  if (look === 'cleaver') {
    fill(ctx, '#ff6b9d', cx - 2, top + 1, 5, 9);
    fill(ctx, '#ffb0c8', cx - 2, top + 1, 2, 8);
    fill(ctx, '#c9a227', cx - 2, top + 10, 5, 1);
    fill(ctx, '#5a3d1a', cx, top + 11, 2, 4);
    return;
  }
  if (look === 'saber') {
    fill(ctx, '#e8c070', cx, top + 1, 2, 11);
    fill(ctx, '#fff0c0', cx + 1, top + 2, 1, 8);
    fill(ctx, '#c9a040', cx - 1, top, 3, 2);
    fill(ctx, '#5a3d1a', cx, top + 12, 2, 3);
    return;
  }
  if (look === 'iron') {
    fill(ctx, '#9aabc0', cx, top, 2, 13);
    fill(ctx, '#e0e8f0', cx, top, 1, 12);
    fill(ctx, '#c9a227', cx - 1, top + 12, 4, 2);
    fill(ctx, '#5a3d1a', cx, top + 14, 2, 2);
    return;
  }
  if (look === 'honk') {
    fill(ctx, '#ffe08a', cx, top, 2, 12);
    fill(ctx, '#5ad45a', cx - 1, top + 12, 4, 4);
    return;
  }
  // mild / default sword
  fill(ctx, '#dfe6f0', cx, top, 2, 13);
  fill(ctx, '#ffffff', cx, top + 1, 1, 10);
  fill(ctx, '#c9a227', cx - 1, top + 12, 4, 2);
  fill(ctx, '#5a3d1a', cx, top + 14, 2, 2);
}

const RACK_FAMILY_DEFAULTS: Record<string, string[]> = {
  sword: ['mild_sword', 'iron_blade', 'sand_saber', 'dunjun_cleaver'],
  axe: ['training_axe', 'battle_axe', 'iron_hatchet', 'great_axe'],
  bow: ['short_bow', 'long_bow', 'hunter_crossbow', 'magic_bow'],
  staff: ['wizard_staff', 'staff_lightning', 'staff_fire', 'staff_ice'],
};

function defaultPresentForFamily(family: string): string[] {
  return RACK_FAMILY_DEFAULTS[family] ?? [];
}

function lookForRackTemplate(templateId: string): string {
  return weaponLookFromTemplateId(templateId) || 'sword';
}

function drawMultiWeaponRack(
  ctx: CanvasRenderingContext2D,
  _family: string,
  present: string[],
): void {
  // stand
  fill(ctx, '#3a2410', 4, 27, 24, 4);
  fill(ctx, '#5a3d1a', 5, 27, 22, 2);
  fill(ctx, '#6b4423', 6, 20, 3, 9);
  fill(ctx, '#6b4423', 23, 20, 3, 9);
  fill(ctx, '#8b5a2b', 7, 20, 1, 8);
  fill(ctx, '#8b5a2b', 24, 20, 1, 8);
  fill(ctx, '#4a3018', 6, 18, 20, 3);
  fill(ctx, '#6b4423', 7, 18, 18, 1);

  if (present.length === 0) {
    fill(ctx, '#4a3018', 10, 16, 4, 2);
    fill(ctx, '#4a3018', 18, 16, 4, 2);
    return;
  }

  const n = Math.min(4, present.length);
  const span = 20;
  const startX = 6 + Math.floor((span - (n - 1) * Math.floor(span / Math.max(1, n - 1 || 1))) / 2);
  const step = n <= 1 ? 0 : Math.floor(span / (n - 1));
  for (let i = 0; i < n; i++) {
    const tid = present[i]!;
    const look = lookForRackTemplate(tid);
    const cx = n === 1 ? 15 : startX + i * step;
    drawRackPegWeapon(ctx, look, cx, 3);
  }
}

/**
 * Dynamic multi-weapon rack texture for the guild hall.
 * `present` = template ids still hanging (not currently equipped).
 */
export function ensureGuildRackTexture(
  scene: Phaser.Scene,
  family: 'sword' | 'axe' | 'bow' | 'staff',
  present: string[],
): string {
  const sorted = [...present].sort();
  const key =
    sorted.length === 0
      ? 'rack_empty'
      : `rack_${family}__${sorted.join('+')}`;
  if (scene.textures.exists(key)) return key;
  canvasTex(scene, key, ART_RES, ART_RES, (ctx) => {
    drawMultiWeaponRack(ctx, family, sorted);
  });
  return key;
}

export function generateTextures(scene: Phaser.Scene): void {
  // —— Map tiles: 16 fractal-seeded variants each (fluid, non-repeating) ——
  // Keys: tile-grass, tile-grass-1 … tile-grass-15 (+ legacy -b/-c = 1/2)
  const nVar = 16;
  for (let v = 0; v < nVar; v++) {
    const suf = v === 0 ? '' : `-${v}`;
    canvasTex(scene, `tile-floor${suf}`, ART_RES, ART_RES, (ctx) => {
      drawFloorTile(
        ctx,
        ART_BASE,
        hex(COLORS.floor),
        hex(COLORS.floorAlt),
        '#1a1528',
        v,
      );
    });
    canvasTex(scene, `tile-wall${suf}`, ART_RES, ART_RES, (ctx) => {
      drawBrickTile(
        ctx,
        ART_BASE,
        hex(COLORS.wallDark),
        hex(COLORS.wall),
        '#2a2438',
        '#7a6a9a',
        v,
      );
    });
    canvasTex(scene, `tile-grass${suf}`, ART_RES, ART_RES, (ctx) => {
      drawGrassTile(
        ctx,
        ART_BASE,
        hex(COLORS.grass),
        hex(COLORS.grassAlt),
        '#6ad48a',
        v,
      );
    });
    canvasTex(scene, `tile-dirt${suf}`, ART_RES, ART_RES, (ctx) => {
      drawDirtTile(ctx, ART_BASE, hex(COLORS.dirt), v);
    });
  }
  // Legacy letter suffixes used by older calls
  if (scene.textures.exists('tile-grass-1')) {
    // Phaser doesn't alias easily — regenerate letter keys as copies of 1/2
    for (const [letter, idx] of [
      ['b', 1],
      ['c', 2],
    ] as const) {
      for (const base of ['tile-floor', 'tile-wall', 'tile-grass', 'tile-dirt']) {
        canvasTex(scene, `${base}-${letter}`, ART_RES, ART_RES, (ctx) => {
          // redraw same seed as numeric index
          if (base === 'tile-floor') {
            drawFloorTile(
              ctx,
              ART_BASE,
              hex(COLORS.floor),
              hex(COLORS.floorAlt),
              '#1a1528',
              idx,
            );
          } else if (base === 'tile-wall') {
            drawBrickTile(
              ctx,
              ART_BASE,
              hex(COLORS.wallDark),
              hex(COLORS.wall),
              '#2a2438',
              '#7a6a9a',
              idx,
            );
          } else if (base === 'tile-grass') {
            drawGrassTile(
              ctx,
              ART_BASE,
              hex(COLORS.grass),
              hex(COLORS.grassAlt),
              '#6ad48a',
              idx,
            );
          } else {
            drawDirtTile(ctx, ART_BASE, hex(COLORS.dirt), idx);
          }
        });
      }
    }
  }

  canvasTex(scene, 'tile-carpet', ART_RES, ART_RES, (ctx) => {
    drawCarpetTile(ctx, ART_BASE);
  });

  canvasTex(scene, 'tile-sand', ART_RES, ART_RES, (ctx) => {
    drawSandTile(ctx, ART_BASE, hex(COLORS.sand), hex(COLORS.sandDark));
  });

  canvasTex(scene, 'tile-sand-wall', ART_RES, ART_RES, (ctx) => {
    drawSandWallTile(ctx, ART_BASE);
  });

  // Mountain snow + Dwarvez jagged stone (fractal variants)
  for (let v = 0; v < nVar; v++) {
    const suf = v === 0 ? '' : `-${v}`;
    canvasTex(scene, `tile-snow${suf}`, ART_RES, ART_RES, (ctx) => {
      drawSnowTile(ctx, ART_BASE, v);
    });
    canvasTex(scene, `tile-dwarf-wall${suf}`, ART_RES, ART_RES, (ctx) => {
      drawJaggedStoneWall(ctx, ART_BASE, v);
    });
    canvasTex(scene, `tile-dwarf-floor${suf}`, ART_RES, ART_RES, (ctx) => {
      drawJaggedStoneFloor(ctx, ART_BASE, v);
    });
  }
  for (const [letter, idx] of [
    ['b', 1],
    ['c', 2],
  ] as const) {
    canvasTex(scene, `tile-snow-${letter}`, ART_RES, ART_RES, (ctx) => {
      drawSnowTile(ctx, ART_BASE, idx);
    });
    canvasTex(scene, `tile-dwarf-wall-${letter}`, ART_RES, ART_RES, (ctx) => {
      drawJaggedStoneWall(ctx, ART_BASE, idx);
    });
    canvasTex(scene, `tile-dwarf-floor-${letter}`, ART_RES, ART_RES, (ctx) => {
      drawJaggedStoneFloor(ctx, ART_BASE, idx);
    });
  }

  for (const m of [
    'bronze',
    'gold',
    'silver',
    'diamond',
    'ruby',
    'emerald',
    'mithril',
  ] as const) {
    canvasTex(scene, `ore_vein_${m}`, ART_RES, ART_RES, (ctx) => {
      drawOreVein(ctx, m);
    });
  }

  // Legacy water keys = ocean (beach)
  canvasTex(scene, 'tile-water', ART_RES, ART_RES, (ctx) => {
    drawWaterTile(ctx, ART_BASE, hex(COLORS.water), 0, 'ocean');
  });
  canvasTex(scene, 'tile-water-b', ART_RES, ART_RES, (ctx) => {
    drawWaterTile(ctx, ART_BASE, hex(COLORS.water), 1, 'ocean');
  });
  canvasTex(scene, 'tile-water-c', ART_RES, ART_RES, (ctx) => {
    drawWaterTile(ctx, ART_BASE, hex(COLORS.water), 2, 'ocean');
  });
  // Explicit ocean / pond / river sets
  for (const [style, prefix] of [
    ['ocean', 'tile-water-ocean'],
    ['pond', 'tile-water-pond'],
    ['river', 'tile-water-river'],
  ] as const) {
    canvasTex(scene, prefix, ART_RES, ART_RES, (ctx) => {
      drawWaterTile(ctx, ART_BASE, hex(COLORS.water), 0, style);
    });
    canvasTex(scene, `${prefix}-b`, ART_RES, ART_RES, (ctx) => {
      drawWaterTile(ctx, ART_BASE, hex(COLORS.water), 1, style);
    });
    if (style === 'ocean') {
      canvasTex(scene, `${prefix}-c`, ART_RES, ART_RES, (ctx) => {
        drawWaterTile(ctx, ART_BASE, hex(COLORS.water), 2, style);
      });
    }
  }

  canvasTex(scene, 'tile-lava', ART_RES, ART_RES, (ctx) => {
    drawLavaTile(ctx, ART_BASE, hex(COLORS.lava), 0);
  });

  canvasTex(scene, 'tile-lava-b', ART_RES, ART_RES, (ctx) => {
    drawLavaTile(ctx, ART_BASE, hex(COLORS.lava), 1);
  });

  canvasTex(scene, 'tile-door', ART_RES, ART_RES, (ctx) => {
    // floor behind so open sides read as passage
    drawFloorTile(ctx, ART_BASE, hex(COLORS.floor), hex(COLORS.floorAlt), '#1a1528');
    // stone arch frame
    shadedBlock(ctx, '#6a5a40', '#9a8a60', '#3a3018', 0, 0, ART_BASE, 5);
    shadedBlock(ctx, '#6a5a40', '#9a8a60', '#3a3018', 0, 0, 5, ART_BASE);
    shadedBlock(ctx, '#6a5a40', '#9a8a60', '#3a3018', ART_BASE - 5, 0, 5, ART_BASE);
    grit(ctx, 'rgba(0,0,0,0.2)', 0, 0, ART_BASE, 5, 4, 0);
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
    drawFloorTile(ctx, ART_BASE, hex(COLORS.floor), hex(COLORS.floorAlt), '#1a1528');
    shadedBlock(ctx, '#4a3820', '#7a5a30', '#2a1c10', 0, 0, ART_BASE, 5);
    shadedBlock(ctx, '#4a3820', '#7a5a30', '#2a1c10', 0, 0, 5, ART_BASE);
    shadedBlock(ctx, '#4a3820', '#7a5a30', '#2a1c10', ART_BASE - 5, 0, 5, ART_BASE);
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
    // Dungeon stair shaft (purple stone)
    fill(ctx, '#1a1020', 0, 0, ART_BASE, ART_BASE);
    dither(ctx, '#1a1020', '#0a0810', 0, 0, ART_BASE, ART_BASE, 0);
    shadedBlock(ctx, '#3a3050', '#5a4a70', '#1a1428', 0, 0, 3, ART_BASE);
    shadedBlock(ctx, '#3a3050', '#5a4a70', '#1a1428', ART_BASE - 3, 0, 3, ART_BASE);
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
        ART_BASE - 6 - inset * 2,
        3,
      );
      fill(ctx, '#4a3a60', 3 + inset, y + 3, ART_BASE - 6 - inset * 2, 1);
      grit(ctx, 'rgba(0,0,0,0.2)', 4 + inset, y, ART_BASE - 8 - inset * 2, 2, 4, i);
    }
    fill(ctx, '#ff6b9d', 11, 1, 10, 3);
    fill(ctx, '#ffb0c8', 13, 2, 6, 1);
    fill(ctx, '#c03050', 14, 4, 4, 1);
  });

  // Surface cave mouth (meadow dungeon entrance) — rock arch + dark maw
  canvasTex(scene, 'tile-cave-mouth', ART_RES, ART_RES, (ctx) => {
    fill(ctx, '#2f6b45', 0, 0, ART_BASE, ART_BASE); // grass around
    dither(ctx, '#2f6b45', '#1e4a30', 0, 0, ART_BASE, ART_BASE, 0);
    // rock mass
    shadedBlock(ctx, '#5a5048', '#8a8070', '#2a2420', 2, 4, 28, 26);
    fill(ctx, '#6a6058', 4, 6, 24, 8);
    // dark cave hole (ellipse-ish)
    fill(ctx, '#0a0810', 8, 10, 16, 18);
    fill(ctx, '#121018', 10, 12, 12, 14);
    fill(ctx, '#1a1020', 12, 14, 8, 10);
    // arch lip highlight
    fill(ctx, '#a09888', 7, 9, 18, 2);
    fill(ctx, '#c9a227', 12, 8, 8, 1); // faint gold glint
    grit(ctx, 'rgba(0,0,0,0.25)', 4, 8, 24, 20, 6, 2);
    spark(ctx, 14, 16, '#2a2038');
  });

  // Training dummy — straw + wood post
  canvasTex(scene, 'dummy', ART_RES, ART_RES, (ctx) => {
    fill(ctx, '#5a3d1a', 14, 18, 4, 12); // post
    fill(ctx, '#8b5a2b', 15, 18, 2, 11);
    // body sack
    shadedBlock(ctx, '#c9a227', '#e8d080', '#6a5020', 8, 6, 16, 16);
    fill(ctx, '#a08040', 10, 8, 12, 4);
    // rope
    fill(ctx, '#6b4423', 8, 12, 16, 2);
    // face X
    fill(ctx, '#3a2a10', 12, 10, 2, 2);
    fill(ctx, '#3a2a10', 18, 10, 2, 2);
    fill(ctx, '#3a2a10', 14, 14, 4, 2);
    spark(ctx, 11, 9, '#fff3c0');
  });

  // Weapon racks — multi-weapon stands (guild hall)
  const drawRackStand = (ctx: CanvasRenderingContext2D) => {
    fill(ctx, '#3a2410', 4, 27, 24, 4);
    fill(ctx, '#5a3d1a', 5, 27, 22, 2);
    fill(ctx, '#6b4423', 6, 20, 3, 9);
    fill(ctx, '#6b4423', 23, 20, 3, 9);
    fill(ctx, '#8b5a2b', 7, 20, 1, 8);
    fill(ctx, '#8b5a2b', 24, 20, 1, 8);
    // crossbar pegs
    fill(ctx, '#4a3018', 6, 18, 20, 3);
    fill(ctx, '#6b4423', 7, 18, 18, 1);
  };
  canvasTex(scene, 'rack_empty', ART_RES, ART_RES, (ctx) => {
    drawRackStand(ctx);
    fill(ctx, '#4a3018', 10, 16, 4, 2);
    fill(ctx, '#4a3018', 18, 16, 4, 2);
  });

  // Coconut palm — curved trunk + layered fronds (less blocky)
  canvasTex(scene, 'palm', ART_RES, ART_RES, (ctx) => {
    // ground shadow
    fill(ctx, 'rgba(0,0,0,0.2)', 10, 29, 12, 2);
    // trunk lean + bark rings
    fill(ctx, '#3a2410', 15, 12, 4, 18);
    fill(ctx, '#5a3d1a', 14, 13, 4, 16);
    fill(ctx, '#8b5a2b', 15, 12, 2, 17);
    fill(ctx, '#3a2410', 13, 19, 5, 1);
    fill(ctx, '#3a2410', 14, 24, 5, 1);
    fill(ctx, '#6b4423', 16, 14, 1, 14);
    // frond layers (back)
    fill(ctx, '#0e4020', 2, 9, 12, 3);
    fill(ctx, '#0e4020', 18, 9, 12, 3);
    fill(ctx, '#0e4020', 8, 2, 16, 4);
    // mid fronds
    fill(ctx, '#1a5a28', 3, 7, 11, 3);
    fill(ctx, '#2a8a40', 4, 6, 9, 2);
    fill(ctx, '#1a5a28', 18, 7, 11, 3);
    fill(ctx, '#2a8a40', 19, 6, 9, 2);
    fill(ctx, '#1a5a28', 9, 1, 14, 4);
    fill(ctx, '#3aaa50', 11, 0, 10, 3);
    // front fronds
    fill(ctx, '#2a7a38', 5, 4, 7, 3);
    fill(ctx, '#2a7a38', 20, 4, 7, 3);
    fill(ctx, '#4aba60', 12, 2, 6, 2);
    // coconuts under crown
    fill(ctx, '#4a3018', 12, 10, 3, 3);
    fill(ctx, '#6b4423', 13, 11, 2, 2);
    fill(ctx, '#4a3018', 17, 10, 3, 3);
    fill(ctx, '#6b4423', 18, 11, 2, 2);
    fill(ctx, '#8b5a2b', 14, 11, 1, 1);
    fill(ctx, '#5a3d1a', 15, 12, 2, 1); // third coconut shadow
    spark(ctx, 14, 2, '#7dffb3');
    spark(ctx, 18, 3, '#5ad47a');
    spark(ctx, 8, 6, '#6ad48a');
    spark(ctx, 24, 5, '#8ef0a8');
  });

  // Seaweed clump
  canvasTex(scene, 'seaweed', ART_RES, ART_RES, (ctx) => {
    fill(ctx, '#2a4a20', 8, 18, 16, 6);
    fill(ctx, '#1a3018', 10, 22, 12, 4);
    fill(ctx, 'rgba(40,30,20,0.3)', 9, 24, 14, 2);
    // ribbons
    fill(ctx, '#3a6a30', 10, 8, 3, 14);
    fill(ctx, '#4a8a40', 11, 6, 1, 12);
    fill(ctx, '#3a6a30', 15, 10, 3, 12);
    fill(ctx, '#2a5a28', 16, 8, 1, 10);
    fill(ctx, '#3a6a30', 20, 7, 3, 15);
    fill(ctx, '#5aaa50', 21, 5, 1, 12);
    fill(ctx, '#2a5a28', 12, 12, 2, 10);
    fill(ctx, '#4a8a40', 18, 9, 1, 8);
    // wet sheen + bubbles
    fill(ctx, 'rgba(180,220,160,0.35)', 11, 10, 1, 4);
    fill(ctx, 'rgba(180,220,160,0.3)', 21, 8, 1, 3);
    spark(ctx, 12, 7, 'rgba(200,255,180,0.5)');
  });

  // Beach crab (non-combat)
  canvasTex(scene, 'crab', ART_RES, ART_RES, (ctx) => {
    // body
    fill(ctx, '#c04030', 10, 14, 12, 8);
    fill(ctx, '#e06040', 11, 15, 10, 5);
    fill(ctx, '#ff8060', 12, 16, 4, 2);
    fill(ctx, '#a02820', 14, 19, 4, 2); // shell ridge
    // claws
    fill(ctx, '#c04030', 4, 12, 7, 5);
    fill(ctx, '#c04030', 21, 12, 7, 5);
    fill(ctx, '#e06040', 5, 13, 4, 3);
    fill(ctx, '#e06040', 23, 13, 4, 3);
    fill(ctx, '#ff8060', 5, 13, 2, 1);
    fill(ctx, '#ff8060', 25, 13, 2, 1);
    // legs
    fill(ctx, '#a03028', 8, 20, 3, 5);
    fill(ctx, '#a03028', 13, 21, 2, 5);
    fill(ctx, '#a03028', 17, 21, 2, 5);
    fill(ctx, '#a03028', 21, 20, 3, 5);
    // eyes
    fill(ctx, '#1a1010', 12, 12, 2, 3);
    fill(ctx, '#1a1010', 18, 12, 2, 3);
    fill(ctx, '#fff', 12, 12, 1, 1);
    fill(ctx, '#fff', 18, 12, 1, 1);
  });

  // Mirror of Changing — tall oval looking-glass
  canvasTex(scene, 'mirror', ART_RES, ART_RES, (ctx) => {
    // Full-height oval frame
    fill(ctx, '#2a1810', 6, 1, 20, 30);
    fill(ctx, '#5a3d1a', 7, 2, 18, 28);
    fill(ctx, '#c9a227', 8, 3, 16, 26);
    // Glass (cool shimmer)
    fill(ctx, '#1a3048', 10, 5, 12, 22);
    fill(ctx, '#2a5070', 11, 6, 10, 20);
    fill(ctx, '#4a90b0', 12, 7, 4, 8);
    fill(ctx, '#a0e0ff', 13, 8, 2, 4);
    spark(ctx, 14, 9, '#ffffff');
    // Base
    fill(ctx, '#3a2410', 8, 28, 16, 3);
    fill(ctx, '#6b4423', 10, 29, 12, 2);
  });
  // Static full-catalog fallbacks (used before dynamic ensure)
  for (const fam of ['sword', 'axe', 'bow', 'staff'] as const) {
    canvasTex(scene, `rack_${fam}`, ART_RES, ART_RES, (ctx) => {
      drawMultiWeaponRack(ctx, fam, defaultPresentForFamily(fam));
    });
    canvasTex(scene, `rack_${fam}_full`, ART_RES, ART_RES, (ctx) => {
      drawMultiWeaponRack(ctx, fam, defaultPresentForFamily(fam));
    });
  }

  canvasTex(scene, 'tile-stairs-up', ART_RES, ART_RES, (ctx) => {
    fill(ctx, '#2a3048', 0, 0, ART_BASE, ART_BASE);
    dither(ctx, '#2a3048', '#1a2030', 0, 0, ART_BASE, ART_BASE, 1);
    shadedBlock(ctx, '#4a5870', '#7a90a8', '#2a3040', 0, 0, 3, ART_BASE);
    shadedBlock(ctx, '#4a5870', '#7a90a8', '#2a3040', ART_BASE - 3, 0, 3, ART_BASE);
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
        ART_BASE - 6 - inset * 2,
        3,
      );
      fill(ctx, '#7088a8', 3 + inset, y + 3, ART_BASE - 6 - inset * 2, 1);
      grit(ctx, 'rgba(255,255,255,0.12)', 4 + inset, y, ART_BASE - 8 - inset * 2, 2, 5, i);
    }
    // ascent marker
    fill(ctx, '#7dffb3', 11, 1, 10, 3);
    fill(ctx, '#c9ffe0', 13, 2, 6, 1);
    fill(ctx, '#2a8a5a', 14, 4, 4, 1);
  });

  canvasTex(scene, 'tile-pad', ART_RES, ART_RES, (ctx) => {
    fill(ctx, '#0e1a28', 0, 0, ART_BASE, ART_BASE);
    dither(ctx, '#0e1a28', '#1a2a40', 0, 0, ART_BASE, ART_BASE, 0);
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
    'training_axe',
    'battle_axe',
    'iron_hatchet',
    'great_axe',
    'iron_blade',
    'sand_saber',
    'dunjun_cleaver',
    'honk_blade',
    'short_bow',
    'long_bow',
    'hunter_crossbow',
    'magic_bow',
    'wizard_staff',
    'staff_lightning',
    'staff_fire',
    'staff_ice',
    'phaser',
    'arrows',
    'crawler_starter_box',
    'loot_box_bronze',
    'loot_box_silver',
    'loot_box_gold',
    'loot_box_platinum',
    'loot_box_diamond',
    'legendary_elven_box',
    'mithril_blade',
    'mithril_bow',
    'mithril_staff',
    'mithril_breastplate',
    'mithril_greaves',
    'mithril_amulet',
    'mithril_ring',
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
    // 64-bit inventory / shop icons (author 32 → ART_RES)
    canvasTex(scene, `icon_${id}`, ART_RES, ART_RES, (ctx) =>
      drawItemIcon(ctx, id),
    );
  }

  // Slot frame chrome (author 40 → 80)
  canvasTex2x(scene, 'slot_frame', 40, 40, (ctx) => {
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
    'axe',
    'battle_axe',
    'iron_axe',
    'greataxe',
    'iron',
    'saber',
    'cleaver',
    'honk',
    'phaser',
    'bow',
    'longbow',
    'crossbow',
    'magic_bow',
    'staff',
    'staff_lightning',
    'staff_fire',
    'staff_ice',
  ];
  canvasTex2x(scene, 'sword-swing', 20, 20, (ctx) => {
    drawWeaponSwing(ctx, 'sword');
  });
  for (const look of swingLooks) {
    canvasTex2x(scene, swingTextureKey(look), 20, 20, (ctx) => {
      drawWeaponSwing(ctx, look);
    });
  }

  // Motion arc for attack VFX (author 24 → 48)
  canvasTex2x(scene, 'slash-arc', 24, 24, (ctx) => {
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
    fill(ctx, '#4aba60', 6, 20, 20, 6); // lower body volume
    fill(ctx, '#fff', 9, 14, 5, 5);
    fill(ctx, '#fff', 18, 14, 5, 5);
    fill(ctx, '#1a1a2e', 11, 16, 3, 3);
    fill(ctx, '#1a1a2e', 20, 16, 3, 3);
    spark(ctx, 11, 15, '#ffffff');
    spark(ctx, 20, 15, '#ffffff');
    fill(ctx, '#2a6a2a', 13, 22, 6, 2);
    // bubble glints + drip
    fill(ctx, 'rgba(200,255,220,0.5)', 10, 18, 2, 2);
    fill(ctx, 'rgba(200,255,220,0.4)', 20, 20, 2, 1);
    fill(ctx, '#3a8a48', 8, 26, 2, 3);
    fill(ctx, '#3a8a48', 22, 25, 2, 2);
    spark(ctx, 14, 13, '#c9ffe0');
    spark(ctx, 22, 12, '#e0ffe8');
  });

  canvasTex(scene, 'slime-b', ART_RES, ART_RES, (ctx) => {
    fill(ctx, 'rgba(0,0,0,0.2)', 4, 26, 24, 4);
    block(ctx, '#5ad45a', '#1a4a20', 4, 11, 24, 17);
    fill(ctx, '#7dffb3', 6, 13, 20, 7);
    fill(ctx, '#4aba60', 5, 21, 22, 5);
    fill(ctx, '#fff', 8, 14, 5, 5);
    fill(ctx, '#fff', 19, 13, 5, 5);
    fill(ctx, '#1a1a2e', 10, 16, 3, 3);
    fill(ctx, '#1a1a2e', 21, 15, 3, 3);
    spark(ctx, 10, 15, '#ffffff');
    spark(ctx, 21, 14, '#ffffff');
    fill(ctx, 'rgba(200,255,220,0.45)', 12, 18, 2, 2);
    spark(ctx, 16, 12, '#c9ffe0');
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
    fill(ctx, '#d8d0c0', 15, 10, 2, 1); // nasal
    // ribcage
    fill(ctx, '#e8e0d0', 11, 14, 10, 10);
    fill(ctx, '#c8c0b0', 12, 16, 8, 1);
    fill(ctx, '#c8c0b0', 12, 19, 8, 1);
    fill(ctx, '#c8c0b0', 12, 22, 8, 1);
    fill(ctx, '#b8b0a0', 15, 15, 2, 8); // sternum
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

  // Wall torch prop — bracket + flame
  canvasTex(scene, 'torch_wall', ART_RES, ART_RES, (ctx) => {
    fill(ctx, '#3a3a48', 13, 10, 6, 14);
    fill(ctx, '#5c4d7a', 14, 12, 4, 10);
    fill(ctx, '#ffc857', 12, 4, 8, 8);
    fill(ctx, '#ff6b3a', 14, 2, 4, 6);
    fill(ctx, '#fff0a0', 15, 5, 2, 3);
  });

  // Guild hall furniture — living quarters (EMA atmosphere)
  canvasTex(scene, 'bookshelf', ART_RES, ART_RES, (ctx) => {
    // Dark oak case
    shadedBlock(ctx, '#3a2410', '#5a3d1a', '#1a1008', 2, 2, 28, 28);
    fill(ctx, '#2a1810', 3, 3, 26, 26);
    // Shelves
    fill(ctx, '#6b4423', 3, 10, 26, 2);
    fill(ctx, '#6b4423', 3, 18, 26, 2);
    fill(ctx, '#6b4423', 3, 26, 26, 2);
    // Books — varied spines
    const spines = [
      '#4a2060', '#2a4a6a', '#6a2030', '#2a5a30', '#8a6820', '#3a3a58',
      '#5a2040', '#1a4a40', '#7a3020', '#404060',
    ];
    for (let row = 0; row < 3; row++) {
      let x = 4;
      const y = 4 + row * 8;
      for (let i = 0; i < 6 && x < 28; i++) {
        const w = 3 + (i % 3);
        fill(ctx, spines[(row * 3 + i) % spines.length], x, y, w, 6);
        fill(ctx, '#c9a227', x + 1, y + 1, 1, 4);
        x += w + 1;
      }
    }
    spark(ctx, 6, 5, '#c9a227');
  });

  canvasTex(scene, 'chair', ART_RES, ART_RES, (ctx) => {
    // Reading chair — high back, worn seat
    fill(ctx, '#2a1810', 8, 6, 16, 4); // top rail
    shadedBlock(ctx, '#4a3018', '#6b4423', '#2a1810', 9, 8, 14, 12); // back
    fill(ctx, '#5a3d1a', 10, 10, 12, 8);
    // seat
    shadedBlock(ctx, '#6b4423', '#8b5a2b', '#3a2410', 7, 18, 18, 6);
    fill(ctx, '#3a2410', 8, 24, 4, 6); // legs
    fill(ctx, '#3a2410', 20, 24, 4, 6);
    fill(ctx, '#2a1810', 8, 28, 4, 2);
    fill(ctx, '#2a1810', 20, 28, 4, 2);
    // cushion
    fill(ctx, '#4a3060', 10, 19, 12, 4);
    fill(ctx, '#6a50a0', 11, 20, 10, 2);
  });

  canvasTex(scene, 'table', ART_RES, ART_RES, (ctx) => {
    // Small side table + open book
    shadedBlock(ctx, '#5a3d1a', '#8b5a2b', '#3a2410', 4, 12, 24, 8);
    fill(ctx, '#c9a070', 5, 13, 22, 2); // top hilite
    fill(ctx, '#3a2410', 6, 20, 3, 10); // legs
    fill(ctx, '#3a2410', 23, 20, 3, 10);
    fill(ctx, '#3a2410', 14, 20, 4, 8);
    // open book
    fill(ctx, '#e8dcc8', 10, 8, 12, 6);
    fill(ctx, '#d0c4a8', 10, 8, 6, 6);
    fill(ctx, '#c0b090', 16, 8, 6, 6);
    fill(ctx, '#5a4510', 15, 8, 2, 6);
    fill(ctx, '#3a3010', 12, 10, 3, 1);
    fill(ctx, '#3a3010', 18, 11, 4, 1);
  });

  canvasTex(scene, 'lamp', ART_RES, ART_RES, (ctx) => {
    // Floor lamp — iron stem + warm glass
    fill(ctx, '#2a2a35', 14, 14, 4, 16);
    fill(ctx, '#4a4a58', 15, 14, 2, 15);
    fill(ctx, '#1a1a22', 10, 28, 12, 3); // base
    fill(ctx, '#3a3a48', 11, 28, 10, 1);
    // shade / glass
    block(ctx, '#ffc857', '#8a6820', 10, 4, 12, 12);
    fill(ctx, '#fff0a0', 12, 6, 8, 8);
    fill(ctx, '#ff6b3a', 14, 8, 4, 5);
    spark(ctx, 15, 7, '#ffffff');
    spark(ctx, 13, 10, '#ffc857');
  });

  // Light item icons
  canvasTex(scene, 'icon_torch', ART_RES, ART_RES, (ctx) => {
    fill(ctx, '#6b4423', 14, 12, 4, 14);
    fill(ctx, '#ffc857', 12, 4, 8, 10);
    fill(ctx, '#ff6b3a', 14, 2, 4, 6);
  });
  canvasTex(scene, 'icon_lantern', ART_RES, ART_RES, (ctx) => {
    fill(ctx, '#888', 12, 6, 8, 2);
    fill(ctx, '#c9a227', 11, 8, 10, 12);
    fill(ctx, '#ffc857', 13, 10, 6, 8);
    fill(ctx, '#555', 14, 20, 4, 6);
  });
  canvasTex(scene, 'icon_flashlight', ART_RES, ART_RES, (ctx) => {
    fill(ctx, '#444', 10, 12, 12, 8);
    fill(ctx, '#222', 8, 13, 4, 6);
    fill(ctx, '#a0e0ff', 20, 12, 6, 8);
    fill(ctx, '#fff', 22, 14, 2, 4);
  });
  canvasTex(scene, 'icon_scroll_ward', ART_RES, ART_RES, (ctx) => {
    fill(ctx, '#e8dcc8', 8, 4, 16, 22);
    fill(ctx, '#7dffb3', 12, 10, 8, 8);
  });
  canvasTex(scene, 'icon_scroll_spark', ART_RES, ART_RES, (ctx) => {
    fill(ctx, '#e8dcc8', 8, 4, 16, 22);
    fill(ctx, '#ffc857', 14, 8, 4, 12);
    fill(ctx, '#ff6b3a', 12, 12, 8, 4);
  });
  canvasTex(scene, 'icon_scroll_light', ART_RES, ART_RES, (ctx) => {
    fill(ctx, '#e8dcc8', 8, 4, 16, 22);
    fill(ctx, '#fff0a0', 12, 10, 8, 8);
  });
  canvasTex(scene, 'icon_tome_embers', ART_RES, ART_RES, (ctx) => {
    fill(ctx, '#4a2060', 8, 6, 16, 20);
    fill(ctx, '#ff6b3a', 12, 10, 8, 10);
    fill(ctx, '#ffc857', 14, 8, 4, 4);
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

  // Sewerz goose bosses (not tinted humans)
  canvasTex(scene, 'royal_goose', ART_RES, ART_RES, (ctx) => {
    drawRoyalGoose(ctx);
  });
  canvasTex(scene, 'assistant_honk', ART_RES, ART_RES, (ctx) => {
    drawAssistantHonk(ctx);
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

  // Mid-room loot crate drop (flash spawn) — bigger lid + glow band
  canvasTex(scene, 'loot_crate', ART_RES, ART_RES, (ctx) => {
    fill(ctx, 'rgba(255,200,87,0.2)', 4, 26, 24, 4);
    shadedBlock(ctx, '#8a5a2a', '#c97b3a', '#4a3010', 5, 12, 22, 14);
    shadedBlock(ctx, '#c97b3a', '#e8a050', '#6b4423', 4, 7, 24, 9);
    fill(ctx, '#c9a227', 5, 14, 22, 3);
    block(ctx, '#ffc857', '#8a6820', 13, 15, 6, 5);
    fill(ctx, '#7dffb3', 10, 20, 12, 2);
    spark(ctx, 15, 9, '#ffffff');
    spark(ctx, 12, 11, '#fff3a0');
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

  /**
   * Graphic mapz tiles — ART at 112px so large display stays detailed.
   * UI scales display size dynamically (72–148); textures stay crisp.
   */
  const cell = 112;
  const drawMapzCellRich = (
    ctx: CanvasRenderingContext2D,
    fillCol: string,
    border: string,
    mode: 'visited' | 'unknown' | 'current',
  ) => {
    fill(ctx, '#080a10', 0, 0, cell, cell);
    // Double-rim stone frame
    shadedBlock(ctx, '#2a3048', border, '#12161f', 2, 2, cell - 4, cell - 4);
    shadedBlock(ctx, '#3a4258', '#6a7890', '#1a2030', 6, 6, cell - 12, cell - 12);
    // Inner floor
    fill(ctx, fillCol, 12, 12, cell - 24, cell - 24);
    // Floor checker / cobble channels
    dither(ctx, fillCol, 'rgba(0,0,0,0.15)', 14, 14, cell - 28, cell - 28, 0);
    fill(ctx, 'rgba(0,0,0,0.18)', 14, 14, cell - 28, 1);
    fill(ctx, 'rgba(0,0,0,0.12)', 14, Math.floor(cell / 2), cell - 28, 1);
    fill(ctx, 'rgba(0,0,0,0.12)', Math.floor(cell / 2), 14, 1, cell - 28);
    // Bevel hilite
    fill(ctx, 'rgba(255,255,255,0.18)', 12, 12, cell - 24, 4);
    fill(ctx, 'rgba(255,255,255,0.08)', 12, 12, 3, cell - 24);
    // Corner brass studs
    for (const [x, y] of [
      [8, 8],
      [cell - 14, 8],
      [8, cell - 14],
      [cell - 14, cell - 14],
    ] as const) {
      fill(ctx, border, x, y, 6, 6);
      fill(ctx, 'rgba(255,255,255,0.4)', x + 1, y + 1, 2, 2);
      fill(ctx, 'rgba(0,0,0,0.3)', x + 3, y + 3, 2, 2);
    }
    // Door notch guides (all four sides as inset marks)
    fill(ctx, 'rgba(0,0,0,0.35)', cell / 2 - 8, 6, 16, 5);
    fill(ctx, 'rgba(0,0,0,0.35)', cell / 2 - 8, cell - 11, 16, 5);
    fill(ctx, 'rgba(0,0,0,0.35)', 6, cell / 2 - 8, 5, 16);
    fill(ctx, 'rgba(0,0,0,0.35)', cell - 11, cell / 2 - 8, 5, 16);

    if (mode === 'unknown') {
      grit(ctx, 'rgba(0,0,0,0.4)', 14, 14, cell - 28, cell - 28, 3, 1);
      // fog swirls
      fill(ctx, 'rgba(40,50,60,0.45)', 20, 24, 30, 18);
      fill(ctx, 'rgba(40,50,60,0.35)', 55, 50, 28, 20);
      ctx.fillStyle = border;
      ctx.font = 'bold 42px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', cell / 2, cell / 2 + 2);
    }
    if (mode === 'current') {
      ctx.strokeStyle = '#ffc857';
      ctx.lineWidth = 4;
      ctx.strokeRect(10, 10, cell - 20, cell - 20);
      ctx.strokeStyle = 'rgba(255,200,87,0.35)';
      ctx.lineWidth = 2;
      ctx.strokeRect(14, 14, cell - 28, cell - 28);
      // YOU marker — filled star-ish diamond
      const cx = cell / 2;
      const cy = 36;
      fill(ctx, '#ff6b9d', cx - 10, cy - 4, 20, 20);
      fill(ctx, '#ffc857', cx - 7, cy - 1, 14, 14);
      fill(ctx, '#fff8e0', cx - 4, cy + 2, 8, 8);
      spark(ctx, cx - 1, cy + 4, '#ffffff');
    }
  };

  canvasTex(scene, 'mapz_cell_visited', cell, cell, (ctx) => {
    drawMapzCellRich(ctx, '#2f6b45', '#7dffb3', 'visited');
  });
  canvasTex(scene, 'mapz_cell_unknown', cell, cell, (ctx) => {
    drawMapzCellRich(ctx, '#1a2a20', '#5a6a60', 'unknown');
  });
  canvasTex(scene, 'mapz_cell_current', cell, cell, (ctx) => {
    drawMapzCellRich(ctx, '#3a8a55', '#ffc857', 'current');
  });
  // Tintable base plate (white→land color via setTint)
  canvasTex(scene, 'mapz_cell_base', cell, cell, (ctx) => {
    fill(ctx, '#b8b8c0', 0, 0, cell, cell);
    shadedBlock(ctx, '#e0e0e8', '#ffffff', '#9090a0', 3, 3, cell - 6, cell - 6);
    fill(ctx, '#d0d0d8', 14, 14, cell - 28, cell - 28);
    // mini floor tiles
    for (let ty = 18; ty < cell - 20; ty += 12) {
      for (let tx = 18; tx < cell - 20; tx += 12) {
        fill(ctx, 'rgba(255,255,255,0.12)', tx, ty, 10, 1);
        fill(ctx, 'rgba(0,0,0,0.08)', tx, ty + 9, 10, 1);
      }
    }
    dither(ctx, '#d8d8e0', '#c4c4cc', 16, 16, cell - 32, cell - 32, 0);
    fill(ctx, 'rgba(255,255,255,0.45)', 14, 14, cell - 28, 5);
    for (const [x, y] of [
      [8, 8],
      [cell - 16, 8],
      [8, cell - 16],
      [cell - 16, cell - 16],
    ] as const) {
      fill(ctx, '#ffffff', x, y, 8, 8);
      fill(ctx, '#a0a0b0', x + 2, y + 2, 4, 4);
    }
    // door notch guides
    fill(ctx, 'rgba(0,0,0,0.2)', cell / 2 - 10, 6, 20, 6);
    fill(ctx, 'rgba(0,0,0,0.2)', cell / 2 - 10, cell - 12, 20, 6);
    fill(ctx, 'rgba(0,0,0,0.2)', 6, cell / 2 - 10, 6, 20);
    fill(ctx, 'rgba(0,0,0,0.2)', cell - 12, cell / 2 - 10, 6, 20);
  });

  // Land-specific floor overlays (additive detail when visited)
  const landOverlays: [string, (ctx: CanvasRenderingContext2D) => void][] = [
    [
      'mapz_overlay_surface',
      (ctx) => {
        // grass tufts + dirt path
        fill(ctx, 'rgba(0,0,0,0)', 0, 0, cell, cell);
        for (const [x, y] of [
          [20, 22],
          [70, 28],
          [30, 70],
          [80, 75],
          [50, 40],
        ] as const) {
          fill(ctx, 'rgba(90,200,110,0.55)', x, y, 8, 10);
          fill(ctx, 'rgba(40,120,60,0.5)', x + 2, y + 2, 3, 6);
        }
        fill(ctx, 'rgba(120,90,50,0.4)', 40, 48, 32, 14);
      },
    ],
    [
      'mapz_overlay_dunjunz',
      (ctx) => {
        fill(ctx, 'rgba(0,0,0,0)', 0, 0, cell, cell);
        // torch glows
        fill(ctx, 'rgba(255,140,60,0.35)', 22, 24, 14, 14);
        fill(ctx, 'rgba(255,200,80,0.5)', 26, 28, 6, 6);
        fill(ctx, 'rgba(255,140,60,0.35)', 76, 70, 14, 14);
        fill(ctx, 'rgba(255,200,80,0.5)', 80, 74, 6, 6);
        // stone cracks
        fill(ctx, 'rgba(0,0,0,0.35)', 35, 40, 2, 30);
        fill(ctx, 'rgba(0,0,0,0.3)', 50, 55, 25, 2);
      },
    ],
    [
      'mapz_overlay_woodz',
      (ctx) => {
        fill(ctx, 'rgba(0,0,0,0)', 0, 0, cell, cell);
        for (const [x, y] of [
          [24, 30],
          [72, 26],
          [48, 68],
          [80, 72],
        ] as const) {
          fill(ctx, 'rgba(60,40,20,0.7)', x + 4, y + 10, 6, 14);
          fill(ctx, 'rgba(40,120,50,0.65)', x, y, 14, 12);
          fill(ctx, 'rgba(80,180,80,0.5)', x + 2, y + 2, 8, 6);
        }
      },
    ],
    [
      'mapz_overlay_dezertz',
      (ctx) => {
        fill(ctx, 'rgba(0,0,0,0)', 0, 0, cell, cell);
        fill(ctx, 'rgba(255,220,140,0.25)', 18, 30, 76, 8);
        fill(ctx, 'rgba(180,140,60,0.3)', 22, 55, 70, 6);
        fill(ctx, 'rgba(255,240,180,0.2)', 30, 72, 50, 5);
        // cactus
        fill(ctx, 'rgba(60,140,70,0.7)', 70, 40, 8, 22);
        fill(ctx, 'rgba(60,140,70,0.65)', 64, 48, 6, 8);
      },
    ],
    [
      'mapz_overlay_kingdomz',
      (ctx) => {
        fill(ctx, 'rgba(0,0,0,0)', 0, 0, cell, cell);
        // banner + crown hint
        fill(ctx, 'rgba(200,160,60,0.55)', 40, 28, 32, 8);
        fill(ctx, 'rgba(160,80,200,0.5)', 44, 36, 24, 28);
        fill(ctx, 'rgba(255,200,87,0.7)', 50, 22, 4, 8);
        fill(ctx, 'rgba(255,200,87,0.7)', 58, 20, 4, 10);
        fill(ctx, 'rgba(255,200,87,0.7)', 66, 22, 4, 8);
      },
    ],
    [
      'mapz_overlay_sewerz',
      (ctx) => {
        fill(ctx, 'rgba(0,0,0,0)', 0, 0, cell, cell);
        fill(ctx, 'rgba(40,90,80,0.5)', 20, 50, 72, 18);
        fill(ctx, 'rgba(80,160,140,0.35)', 24, 54, 64, 6);
        fill(ctx, 'rgba(30,50,45,0.6)', 30, 28, 10, 24);
        fill(ctx, 'rgba(30,50,45,0.6)', 72, 28, 10, 24);
      },
    ],
  ];
  for (const [key, draw] of landOverlays) {
    canvasTex(scene, key, cell, cell, draw);
  }

  // Feature icons (author 28 → 56 at 64-bit density)
  const iconS = 28;
  const featureIcons: [string, (ctx: CanvasRenderingContext2D) => void][] = [
    [
      'mapz_feat_boss',
      (ctx) => {
        fill(ctx, 'rgba(20,10,10,0.5)', 0, 0, iconS, iconS);
        fill(ctx, '#c0392b', 6, 10, 16, 12);
        fill(ctx, '#1a1a22', 8, 8, 4, 4);
        fill(ctx, '#1a1a22', 16, 8, 4, 4);
        fill(ctx, '#ff3344', 10, 14, 2, 2);
        fill(ctx, '#ff3344', 16, 14, 2, 2);
        fill(ctx, '#e8e0d0', 12, 18, 4, 3);
      },
    ],
    [
      'mapz_feat_chest',
      (ctx) => {
        shadedBlock(ctx, '#8b5a2b', '#c9a227', '#5a3d1a', 4, 10, 20, 12);
        shadedBlock(ctx, '#a06830', '#ffc857', '#6b4423', 4, 6, 20, 8);
        fill(ctx, '#ffc857', 12, 12, 4, 5);
      },
    ],
    [
      'mapz_feat_shop',
      (ctx) => {
        fill(ctx, '#c9a227', 6, 8, 16, 14);
        fill(ctx, '#ffc857', 8, 10, 12, 4);
        fill(ctx, '#fff3a0', 12, 16, 4, 4);
      },
    ],
    [
      'mapz_feat_forje',
      (ctx) => {
        fill(ctx, '#5a5a68', 4, 14, 20, 8);
        fill(ctx, '#8a8a98', 6, 10, 16, 6);
        fill(ctx, '#ff8a4c', 10, 4, 8, 8);
        fill(ctx, '#ffcc66', 12, 2, 4, 4);
      },
    ],
    [
      'mapz_feat_water',
      (ctx) => {
        fill(ctx, '#1a5080', 4, 8, 20, 14);
        fill(ctx, '#3d8ec0', 6, 10, 16, 4);
        fill(ctx, 'rgba(200,230,255,0.5)', 8, 16, 10, 2);
      },
    ],
    [
      'mapz_feat_cave',
      (ctx) => {
        fill(ctx, '#2a2438', 4, 6, 20, 18);
        fill(ctx, '#0a0c10', 8, 12, 12, 12);
        fill(ctx, '#5a4a30', 4, 20, 20, 4);
      },
    ],
    [
      'mapz_feat_guild',
      (ctx) => {
        fill(ctx, '#c9a227', 6, 6, 16, 4);
        fill(ctx, '#6a5a40', 8, 10, 12, 14);
        fill(ctx, '#ffc857', 12, 4, 4, 4);
        fill(ctx, '#3a3020', 12, 16, 4, 8);
      },
    ],
    [
      'mapz_feat_beach',
      (ctx) => {
        fill(ctx, '#3d8ec0', 2, 4, 24, 10);
        fill(ctx, '#e8d4a8', 2, 12, 24, 12);
        fill(ctx, '#2a8a40', 18, 8, 6, 10);
      },
    ],
    [
      'mapz_feat_stairs',
      (ctx) => {
        for (let i = 0; i < 5; i++) {
          const y = 20 - i * 3;
          shadedBlock(ctx, '#ff6b9d', '#ffb0c8', '#a03050', 4 + i * 2, y, 20 - i * 4, 3);
        }
      },
    ],
    [
      'mapz_feat_portal',
      (ctx) => {
        fill(ctx, '#4a2a7a', 6, 4, 16, 20);
        fill(ctx, '#7a5ab0', 8, 6, 12, 16);
        fill(ctx, '#c9a0ff', 12, 10, 4, 8);
        spark(ctx, 13, 12, '#fff');
      },
    ],
    [
      'mapz_feat_trees',
      (ctx) => {
        fill(ctx, '#5a3a22', 12, 14, 4, 10);
        fill(ctx, '#2f6b45', 6, 6, 16, 12);
        fill(ctx, '#3a8f5a', 8, 4, 10, 8);
      },
    ],
    [
      'mapz_feat_dark',
      (ctx) => {
        fill(ctx, '#0a0c14', 4, 4, 20, 20);
        fill(ctx, '#ff8a4c', 12, 8, 4, 10);
        fill(ctx, '#ffcc66', 13, 6, 2, 4);
      },
    ],
    [
      'mapz_feat_hazard',
      (ctx) => {
        fill(ctx, '#c44b2b', 8, 6, 12, 16);
        fill(ctx, '#ff8a4c', 10, 10, 8, 8);
        fill(ctx, '#fff', 12, 8, 4, 2);
      },
    ],
    [
      'mapz_feat_sand',
      (ctx) => {
        fill(ctx, '#c9b080', 4, 8, 20, 14);
        fill(ctx, '#e8d4a8', 6, 10, 16, 4);
        fill(ctx, '#fff8e0', 10, 16, 8, 2);
      },
    ],
    [
      'mapz_feat_grass',
      (ctx) => {
        fill(ctx, '#2f6b45', 4, 10, 20, 12);
        fill(ctx, '#5ad45a', 8, 6, 3, 10);
        fill(ctx, '#5ad45a', 14, 4, 3, 12);
        fill(ctx, '#5ad45a', 20, 7, 3, 9);
      },
    ],
  ];
  for (const [key, draw] of featureIcons) {
    canvasTex2x(scene, key, iconS, iconS, (ctx) => {
      fill(ctx, 'rgba(10,12,16,0.55)', 0, 0, iconS, iconS);
      draw(ctx);
    });
  }

  canvasTex2x(scene, 'mapz_stairs', 28, 28, (ctx) => {
    fill(ctx, '#2a1520', 0, 0, 28, 28);
    for (let i = 0; i < 6; i++) {
      const y = 22 - i * 3;
      shadedBlock(ctx, '#ff6b9d', '#ffb0c8', '#a03050', 3 + i, y, 22 - i * 2, 3);
    }
  });
  canvasTex2x(scene, 'mapz_link_h', 40, 16, (ctx) => {
    fill(ctx, '#0a0c10', 0, 0, 40, 16);
    shadedBlock(ctx, '#4a7060', '#7dffb3', '#2a4a38', 0, 3, 40, 10);
    fill(ctx, 'rgba(255,255,255,0.25)', 0, 4, 40, 2);
    fill(ctx, 'rgba(0,0,0,0.25)', 0, 11, 40, 2);
    // plank lines
    fill(ctx, 'rgba(0,0,0,0.2)', 10, 3, 1, 10);
    fill(ctx, 'rgba(0,0,0,0.2)', 20, 3, 1, 10);
    fill(ctx, 'rgba(0,0,0,0.2)', 30, 3, 1, 10);
  });
  canvasTex2x(scene, 'mapz_link_v', 16, 40, (ctx) => {
    fill(ctx, '#0a0c10', 0, 0, 16, 40);
    shadedBlock(ctx, '#4a7060', '#7dffb3', '#2a4a38', 3, 0, 10, 40);
    fill(ctx, 'rgba(255,255,255,0.25)', 4, 0, 2, 40);
    fill(ctx, 'rgba(0,0,0,0.25)', 11, 0, 2, 40);
    fill(ctx, 'rgba(0,0,0,0.2)', 3, 10, 10, 1);
    fill(ctx, 'rgba(0,0,0,0.2)', 3, 20, 10, 1);
    fill(ctx, 'rgba(0,0,0,0.2)', 3, 30, 10, 1);
  });

  // Parchment map backdrop (128 already ≥64-bit density)
  canvasTex(scene, 'mapz_parchment', 128, 128, (ctx) => {
    vgrad(ctx, ['#e8d8b0', '#d4c090', '#c4b080', '#b8a070'], 0, 0, 128, 128);
    dither(ctx, '#d4c090', '#c0ac7a', 0, 0, 128, 128, 0);
    grit(ctx, 'rgba(80,60,30,0.12)', 0, 0, 128, 128, 5, 1);
    fill(ctx, 'rgba(90,70,40,0.15)', 0, 0, 128, 4);
    fill(ctx, 'rgba(90,70,40,0.15)', 0, 124, 128, 4);
    fill(ctx, 'rgba(90,70,40,0.12)', 0, 0, 4, 128);
    fill(ctx, 'rgba(90,70,40,0.12)', 124, 0, 4, 128);
    for (let i = 16; i < 128; i += 16) {
      fill(ctx, 'rgba(90,70,40,0.08)', i, 0, 1, 128);
      fill(ctx, 'rgba(90,70,40,0.08)', 0, i, 128, 1);
    }
  });

  // Compass rose (64 author → 128 final for dense UI)
  canvasTex2x(scene, 'mapz_compass', 64, 64, (ctx) => {
    fill(ctx, 'rgba(10,12,16,0.65)', 0, 0, 64, 64);
    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(32, 32, 26, 0, Math.PI * 2);
    ctx.stroke();
    fill(ctx, '#ffc857', 30, 6, 4, 22);
    fill(ctx, '#e74c3c', 28, 6, 8, 8);
    fill(ctx, '#7dffb3', 30, 36, 4, 20);
    fill(ctx, '#9b8fd4', 10, 30, 20, 4);
    fill(ctx, '#9b8fd4', 34, 30, 20, 4);
    ctx.fillStyle = '#ffc857';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('N', 32, 12);
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

  canvasTex(scene, 'throne', ART_RES, ART_RES, (ctx) => {
    drawThrone(ctx);
  });
  canvasTex(scene, 'pillar', ART_RES, ART_RES, (ctx) => {
    drawPillar(ctx);
  });
  canvasTex(scene, 'banner', ART_RES, ART_RES, (ctx) => {
    drawBanner(ctx);
  });
  canvasTex(scene, 'barrel', ART_RES, ART_RES, (ctx) => {
    drawBarrel(ctx);
  });
  canvasTex(scene, 'crate', ART_RES, ART_RES, (ctx) => {
    drawCrate(ctx);
  });
  canvasTex(scene, 'vase', ART_RES, ART_RES, (ctx) => {
    drawVase(ctx);
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

  // Moredorkz hostiles — Fellowship epic
  canvasTex(scene, 'goblin', ART_RES, ART_RES, (ctx) => {
    shadedBlock(ctx, '#4a7a3a', '#6a9a4a', '#2a4a20', 8, 10, 16, 14);
    fill(ctx, '#3a5a2a', 6, 6, 6, 6); // ear
    fill(ctx, '#3a5a2a', 20, 6, 6, 6);
    fill(ctx, '#ffee44', 10, 14, 3, 3);
    fill(ctx, '#ffee44', 18, 14, 3, 3);
    fill(ctx, '#6b5344', 12, 20, 8, 6); // rags
    fill(ctx, '#888', 22, 18, 6, 4); // knife
    fill(ctx, '#1a1a22', 10, 26, 4, 4);
    fill(ctx, '#1a1a22', 18, 26, 4, 4);
  });

  canvasTex(scene, 'orc', ART_RES, ART_RES, (ctx) => {
    shadedBlock(ctx, '#3a4a3a', '#5a6a5a', '#1a2a1a', 6, 8, 20, 16);
    fill(ctx, '#e8e0d0', 8, 14, 3, 4); // tusk
    fill(ctx, '#e8e0d0', 20, 14, 3, 4);
    fill(ctx, '#ff3344', 10, 12, 3, 3);
    fill(ctx, '#ff3344', 18, 12, 3, 3);
    fill(ctx, '#2a2a30', 8, 20, 16, 8); // iron plate
    fill(ctx, '#c0392b', 12, 6, 8, 4); // cloth
    fill(ctx, '#1a1a22', 8, 26, 5, 5);
    fill(ctx, '#1a1a22', 18, 26, 5, 5);
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
    drawTreeSprite(ctx, ART_BASE);
  });

  // Sky-piercing redwood — taller canvas; canopy cropped (tops never visible)
  canvasTex2x(scene, 'tree_redwood', 32, 56, (ctx) => {
    drawSkyRedwoodSprite(ctx, 32);
  });

  canvasTex(scene, 'elf_guard', ART_RES, ART_RES, (ctx) => {
    drawWoodElfGuard(ctx);
  });

  canvasTex(scene, 'elf_queen', ART_RES, ART_RES, (ctx) => {
    drawWoodElfQueen(ctx);
  });

  canvasTex(scene, 'glamdolph', ART_RES, ART_RES, (ctx) => {
    drawGlamdolph(ctx);
  });

  canvasTex(scene, 'koi', ART_RES, ART_RES, (ctx) => {
    drawKoiSprite(ctx, ART_BASE);
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
  // Elastic limb for stretch ghost (wide strip, tinted in anim) — 64-bit 2×
  canvasTex2x(scene, 'bud_stretch_limb', 24, 8, (ctx) => {
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
    fill(ctx, '#0a1220', 0, 0, ART_BASE, ART_BASE);
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

  // Particles / projectiles — 64-bit 2× of classic craft sizes
  canvasTex2x(scene, 'particle', 4, 4, (ctx) => {
    ctx.fillStyle = hex(COLORS.gold);
    ctx.fillRect(1, 0, 2, 4);
    ctx.fillRect(0, 1, 4, 2);
  });

  canvasTex2x(scene, 'particle-hit', 6, 6, (ctx) => {
    ctx.fillStyle = '#fff';
    ctx.fillRect(2, 0, 2, 6);
    ctx.fillRect(0, 2, 6, 2);
    ctx.fillStyle = hex(COLORS.green);
    ctx.fillRect(2, 2, 2, 2);
  });

  canvasTex2x(scene, 'proj-arrow', 8, 4, (ctx) => {
    ctx.fillStyle = '#c8b090';
    ctx.fillRect(0, 1, 6, 2);
    ctx.fillStyle = '#e8e0d0';
    ctx.fillRect(5, 0, 3, 4);
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(0, 1, 2, 2);
  });
  canvasTex2x(scene, 'proj-phaser', 8, 4, (ctx) => {
    ctx.fillStyle = '#ff3344';
    ctx.fillRect(0, 1, 8, 2);
    ctx.fillStyle = '#ffaaaa';
    ctx.fillRect(2, 0, 4, 4);
  });
  canvasTex2x(scene, 'proj-fireball', 8, 8, (ctx) => {
    ctx.fillStyle = '#ff8a4c';
    ctx.beginPath();
    ctx.arc(4, 4, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe08a';
    ctx.fillRect(3, 3, 2, 2);
  });
  canvasTex2x(scene, 'proj-bolt', 6, 6, (ctx) => {
    ctx.fillStyle = '#7dffb3';
    ctx.fillRect(2, 0, 2, 6);
    ctx.fillRect(0, 2, 6, 2);
    ctx.fillStyle = '#fff';
    ctx.fillRect(2, 2, 2, 2);
  });
  canvasTex2x(scene, 'proj-lightning', 8, 8, (ctx) => {
    ctx.fillStyle = '#4ac0ff';
    ctx.fillRect(3, 0, 2, 3);
    ctx.fillRect(2, 2, 4, 2);
    ctx.fillRect(4, 3, 2, 3);
    ctx.fillRect(1, 5, 5, 2);
    ctx.fillRect(3, 6, 2, 2);
    ctx.fillStyle = '#e0f8ff';
    ctx.fillRect(3, 2, 2, 2);
    ctx.fillRect(4, 4, 1, 2);
  });
  canvasTex2x(scene, 'proj-ice', 8, 8, (ctx) => {
    ctx.fillStyle = '#2a60a0';
    ctx.beginPath();
    ctx.moveTo(4, 0);
    ctx.lineTo(7, 4);
    ctx.lineTo(4, 8);
    ctx.lineTo(1, 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#80b0e0';
    ctx.fillRect(3, 2, 2, 4);
    ctx.fillStyle = '#c0e0ff';
    ctx.fillRect(3, 3, 2, 2);
  });

  // ── Humanz & Villagez ──────────────────────────────────
  canvasTex2x(scene, 'dragon', 32, 24, (ctx) => {
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

  canvasTex2x(scene, 'hoard-gold', 16, 12, (ctx) => {
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

  // Soft radial light cookie (white→transparent) for erase-blend lighting.
  // Large enough to scale down for torch / lantern / wall radii.
  const cookieSize = 256;
  canvasTex(scene, 'light_cookie', cookieSize, cookieSize, (ctx) => {
    const g = ctx.createRadialGradient(
      cookieSize / 2,
      cookieSize / 2,
      0,
      cookieSize / 2,
      cookieSize / 2,
      cookieSize / 2,
    );
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.75)');
    g.addColorStop(0.7, 'rgba(255,255,255,0.25)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cookieSize, cookieSize);
  });
}
