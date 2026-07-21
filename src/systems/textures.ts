import type Phaser from 'phaser';
import { COLORS, TILE } from '../config';
import {
  BARE_APPEARANCE,
  playerTextureKey,
  type AppearanceSpec,
  type WeaponLook,
  type ShieldLook,
  type AmuletLook,
  type RingLook,
  type ShoesLook,
} from './appearance';

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
  draw(ctx);
  scene.textures.addCanvas(key, canvas);
}

function hex(n: number): string {
  return `#${n.toString(16).padStart(6, '0')}`;
}

/** Draw unique hip / hand weapon silhouette (right side). */
function drawWeapon(
  ctx: CanvasRenderingContext2D,
  look: WeaponLook,
): void {
  if (look === 'none') return;

  if (look === 'bow') {
    // Compact recurve on right hip
    ctx.fillStyle = '#6b4423';
    ctx.fillRect(13, 6, 1, 7);
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(14, 7, 1, 5);
    ctx.fillStyle = '#d0d8e0';
    ctx.fillRect(13, 7, 1, 1);
    ctx.fillRect(13, 11, 1, 1);
    return;
  }
  if (look === 'staff') {
    ctx.fillStyle = '#6b4423';
    ctx.fillRect(13, 4, 2, 9);
    ctx.fillStyle = '#7dffb3';
    ctx.fillRect(13, 3, 2, 2);
    ctx.fillStyle = '#c9ffe0';
    ctx.fillRect(13, 3, 1, 1);
    return;
  }
  if (look === 'phaser') {
    ctx.fillStyle = '#3a3a48';
    ctx.fillRect(12, 8, 3, 3);
    ctx.fillStyle = '#ff3344';
    ctx.fillRect(14, 9, 2, 1);
    ctx.fillStyle = '#888';
    ctx.fillRect(12, 9, 1, 1);
    return;
  }
  if (look === 'cleaver') {
    ctx.fillStyle = '#ff6b9d';
    ctx.fillRect(12, 6, 3, 5);
    ctx.fillStyle = '#c04070';
    ctx.fillRect(14, 6, 1, 5);
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(12, 11, 2, 2);
    return;
  }
  if (look === 'honk') {
    // Gold blade + green goose accent
    ctx.fillStyle = '#ffe08a';
    ctx.fillRect(13, 5, 2, 7);
    ctx.fillStyle = '#5ad45a';
    ctx.fillRect(13, 5, 2, 2);
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(12, 11, 3, 1);
    return;
  }
  if (look === 'saber') {
    // Curved sand-gold edge
    ctx.fillStyle = '#e8c070';
    ctx.fillRect(13, 5, 1, 7);
    ctx.fillRect(14, 6, 1, 5);
    ctx.fillStyle = '#c9a227';
    ctx.fillRect(12, 11, 3, 1);
    return;
  }
  if (look === 'iron') {
    ctx.fillStyle = '#8a98a8';
    ctx.fillRect(13, 5, 2, 7);
    ctx.fillStyle = '#5a6878';
    ctx.fillRect(14, 5, 1, 7);
    ctx.fillStyle = '#6a5a40';
    ctx.fillRect(12, 11, 4, 1);
    return;
  }
  // default mild sword — bright steel short blade
  ctx.fillStyle = '#dfe6f0';
  ctx.fillRect(13, 6, 2, 6);
  ctx.fillStyle = '#c9a227';
  ctx.fillRect(12, 11, 4, 1);
  ctx.fillStyle = '#8b5a2b';
  ctx.fillRect(13, 12, 2, 1);
}

/** Draw unique left-arm shield. */
function drawShield(
  ctx: CanvasRenderingContext2D,
  look: ShieldLook,
): void {
  if (look === 'none') return;
  if (look === 'tower') {
    ctx.fillStyle = '#4a5568';
    ctx.fillRect(0, 5, 4, 8);
    ctx.fillStyle = '#2a3548';
    ctx.fillRect(0, 5, 1, 8);
    ctx.fillStyle = hex(COLORS.gold);
    ctx.fillRect(1, 7, 2, 1);
    ctx.fillStyle = '#7a8898';
    ctx.fillRect(1, 5, 2, 1);
    return;
  }
  if (look === 'iron') {
    ctx.fillStyle = '#8a98a8';
    ctx.fillRect(1, 6, 3, 6);
    ctx.fillStyle = '#5a6878';
    ctx.fillRect(1, 6, 1, 6);
    ctx.fillStyle = '#c0c8d0';
    ctx.fillRect(2, 8, 1, 2);
    return;
  }
  // wood
  ctx.fillStyle = '#8b6914';
  ctx.fillRect(1, 7, 3, 5);
  ctx.fillStyle = '#c9a227';
  ctx.fillRect(1, 8, 3, 1);
  ctx.fillStyle = '#5a4510';
  ctx.fillRect(2, 9, 1, 2);
}

function drawAmulet(
  ctx: CanvasRenderingContext2D,
  look: AmuletLook,
): void {
  if (look === 'none') return;
  if (look === 'cube') {
    // Gelatinous cube core — lime + bounce highlight
    ctx.fillStyle = '#5ad45a';
    ctx.fillRect(6, 6, 4, 3);
    ctx.fillStyle = '#9ef09e';
    ctx.fillRect(7, 6, 2, 1);
    ctx.fillStyle = '#2a8a2a';
    ctx.fillRect(6, 8, 4, 1);
    return;
  }
  if (look === 'bauble') {
    ctx.fillStyle = hex(COLORS.pink);
    ctx.fillRect(7, 6, 2, 1);
    ctx.fillRect(6, 7, 4, 2);
    ctx.fillStyle = '#fff';
    ctx.fillRect(7, 7, 1, 1);
    return;
  }
  // gold trinket
  ctx.fillStyle = hex(COLORS.gold);
  ctx.fillRect(7, 6, 2, 1);
  ctx.fillRect(7, 7, 2, 2);
  ctx.fillStyle = '#fff3a0';
  ctx.fillRect(7, 7, 1, 1);
}

function drawRing(
  ctx: CanvasRenderingContext2D,
  look: RingLook,
): void {
  if (look === 'none') return;
  // Sparkle on right hand / hip
  if (look === 'luck') {
    ctx.fillStyle = '#7dffb3';
    ctx.fillRect(11, 10, 2, 1);
    ctx.fillRect(12, 9, 1, 3);
    return;
  }
  if (look === 'silver') {
    ctx.fillStyle = '#d0d8e8';
    ctx.fillRect(11, 10, 2, 2);
    ctx.fillStyle = '#fff';
    ctx.fillRect(11, 10, 1, 1);
    return;
  }
  // copper
  ctx.fillStyle = '#c07040';
  ctx.fillRect(11, 10, 2, 2);
  ctx.fillStyle = '#e09060';
  ctx.fillRect(11, 10, 1, 1);
}

function drawShoes(
  ctx: CanvasRenderingContext2D,
  look: ShoesLook,
): void {
  if (look === 'apology') {
    // Minty cube-gift boots
    ctx.fillStyle = '#5ad4a0';
    ctx.fillRect(4, 13, 3, 3);
    ctx.fillRect(9, 13, 3, 3);
    ctx.fillStyle = '#9ef0c8';
    ctx.fillRect(4, 13, 3, 1);
    ctx.fillRect(9, 13, 3, 1);
    return;
  }
  if (look === 'leather') {
    ctx.fillStyle = '#6b4423';
    ctx.fillRect(4, 13, 3, 3);
    ctx.fillRect(9, 13, 3, 3);
    ctx.fillStyle = '#3d2b1f';
    ctx.fillRect(4, 15, 3, 1);
    ctx.fillRect(9, 15, 3, 1);
    return;
  }
  // bare brown boots
  ctx.fillStyle = '#3d2b1f';
  ctx.fillRect(5, 13, 2, 2);
  ctx.fillRect(9, 13, 2, 2);
}

/**
 * Draw hero at 16×16 with every equip slot uniquely readable.
 * Layer order: greaves → shoes → torso → gloves → head/helm →
 * amulet → ring → shield → weapon → key.
 */
export function drawPlayerLook(
  ctx: CanvasRenderingContext2D,
  spec: AppearanceSpec,
): void {
  // —— Legs / greaves ——
  if (spec.greaves === 'leather') {
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(5, 11, 2, 3);
    ctx.fillRect(9, 11, 2, 3);
    ctx.fillStyle = '#5a3d1a';
    ctx.fillRect(5, 12, 2, 1);
    ctx.fillRect(9, 12, 2, 1);
  } else {
    ctx.fillStyle = '#2a4a9a';
    ctx.fillRect(5, 12, 2, 2);
    ctx.fillRect(9, 12, 2, 2);
  }

  drawShoes(ctx, spec.shoes);

  // —— Torso / breastplate ——
  let body = '#2d6cdf';
  if (spec.breastplate === 'leather') body = '#8b5a2b';
  if (spec.breastplate === 'reinforced') body = '#5c4030';
  ctx.fillStyle = body;
  ctx.fillRect(4, 6, 8, 7);

  if (spec.breastplate === 'leather') {
    ctx.fillStyle = '#a06830';
    ctx.fillRect(5, 7, 6, 2);
    ctx.fillStyle = '#5a3d1a';
    ctx.fillRect(4, 10, 8, 1);
    ctx.fillRect(5, 8, 1, 2);
    ctx.fillRect(10, 8, 1, 2);
  } else if (spec.breastplate === 'reinforced') {
    ctx.fillStyle = '#8a7a60';
    ctx.fillRect(5, 7, 6, 3);
    ctx.fillStyle = hex(COLORS.gold);
    ctx.fillRect(7, 8, 2, 2);
    ctx.fillStyle = '#3a2a18';
    ctx.fillRect(4, 11, 8, 1);
    ctx.fillStyle = '#c0b090';
    ctx.fillRect(4, 6, 1, 5);
    ctx.fillRect(11, 6, 1, 5);
  } else {
    // Cloth tunic detail
    ctx.fillStyle = '#3d7cef';
    ctx.fillRect(5, 7, 6, 2);
    ctx.fillStyle = '#1a4aaf';
    ctx.fillRect(7, 9, 2, 3);
  }

  // —— Gloves / arms ——
  if (spec.gloves === 'leather') {
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(3, 8, 2, 3);
    ctx.fillRect(11, 8, 2, 3);
    ctx.fillStyle = '#5a3d1a';
    ctx.fillRect(3, 10, 2, 1);
    ctx.fillRect(11, 10, 2, 1);
  } else {
    ctx.fillStyle = '#f0c8a4';
    ctx.fillRect(3, 9, 1, 2);
    ctx.fillRect(12, 9, 1, 2);
  }

  // —— Head ——
  ctx.fillStyle = '#f0c8a4';
  ctx.fillRect(5, 2, 6, 5);
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(6, 3, 1, 1);
  ctx.fillRect(9, 3, 1, 1);
  // mouth hint
  ctx.fillStyle = '#d09080';
  ctx.fillRect(7, 5, 2, 1);

  // Helmet or hair
  if (spec.helmet === 'leather') {
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(4, 1, 8, 3);
    ctx.fillRect(3, 3, 2, 2);
    ctx.fillRect(11, 3, 2, 2);
    ctx.fillStyle = '#5a3d1a';
    ctx.fillRect(5, 1, 6, 1);
  } else {
    // Blond mop
    ctx.fillStyle = '#c9a227';
    ctx.fillRect(4, 1, 8, 2);
    ctx.fillStyle = '#e8c050';
    ctx.fillRect(5, 1, 6, 1);
  }

  drawAmulet(ctx, spec.amulet);
  drawRing(ctx, spec.ring);
  drawShield(ctx, spec.shield);
  drawWeapon(ctx, spec.weapon);

  // Key on belt (left hip)
  if (spec.key === 'key') {
    ctx.fillStyle = hex(COLORS.gold);
    ctx.fillRect(3, 11, 2, 3);
    ctx.fillRect(2, 11, 1, 2);
    ctx.fillStyle = '#fff3a0';
    ctx.fillRect(3, 11, 1, 1);
  }
}

/**
 * Ensure a canvas texture exists for this loadout (on-demand; avoids
 * combinatorial explosion at boot).
 */
export function ensurePlayerTexture(
  scene: Phaser.Scene,
  spec: AppearanceSpec,
): string {
  const key = playerTextureKey(spec);
  if (!scene.textures.exists(key)) {
    canvasTex(scene, key, TILE, TILE, (ctx) => {
      drawPlayerLook(ctx, spec);
    });
  }
  return key;
}

function drawItemIcon(
  ctx: CanvasRenderingContext2D,
  itemId: string,
): void {
  // Slot background
  ctx.fillStyle = '#1a1528';
  ctx.fillRect(0, 0, 24, 24);
  ctx.strokeStyle = '#5c4d7a';
  ctx.strokeRect(0.5, 0.5, 23, 23);

  if (itemId === 'empty') {
    ctx.fillStyle = '#2a2438';
    ctx.fillRect(8, 8, 8, 8);
    return;
  }
  if (itemId === 'potion') {
    ctx.fillStyle = hex(COLORS.pink);
    ctx.fillRect(9, 10, 6, 8);
    ctx.fillStyle = '#ddd';
    ctx.fillRect(10, 6, 4, 4);
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(11, 4, 2, 3);
    return;
  }
  if (
    itemId === 'mild_sword' ||
    itemId === 'iron_blade' ||
    itemId === 'sand_saber' ||
    itemId === 'dunjun_cleaver' ||
    itemId === 'honk_blade'
  ) {
    ctx.fillStyle =
      itemId === 'dunjun_cleaver'
        ? '#ff6b9d'
        : itemId === 'sand_saber'
          ? '#e8c070'
          : itemId === 'iron_blade'
            ? '#a0b0c0'
            : itemId === 'honk_blade'
              ? '#ffe08a'
              : '#dfe6f0';
    ctx.fillRect(11, 4, 2, 14);
    ctx.fillStyle = '#c9a227';
    ctx.fillRect(8, 14, 8, 2);
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(11, 16, 2, 4);
    return;
  }
  if (itemId === 'phaser') {
    ctx.fillStyle = '#444';
    ctx.fillRect(6, 10, 12, 4);
    ctx.fillStyle = '#ff3344';
    ctx.fillRect(14, 11, 6, 2);
    ctx.fillStyle = '#888';
    ctx.fillRect(4, 11, 3, 2);
    return;
  }
  if (itemId === 'short_bow') {
    ctx.strokeStyle = '#8b5a2b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(12, 12, 8, -1.2, 1.2);
    ctx.stroke();
    ctx.strokeStyle = '#ddd';
    ctx.beginPath();
    ctx.moveTo(12, 4);
    ctx.lineTo(12, 20);
    ctx.stroke();
    return;
  }
  if (itemId === 'wizard_staff') {
    ctx.fillStyle = '#6b4423';
    ctx.fillRect(11, 4, 2, 16);
    ctx.fillStyle = '#7dffb3';
    ctx.beginPath();
    ctx.arc(12, 5, 3, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (itemId === 'beam_me_up' || itemId === 'arrows') {
    ctx.fillStyle = itemId === 'arrows' ? '#c8b090' : '#4ecdc4';
    ctx.fillRect(7, 7, 10, 10);
    ctx.fillStyle = '#fff';
    ctx.fillRect(9, 9, 6, 2);
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
    if (itemId === 'ore_iron') ctx.fillStyle = '#8a9098';
    else if (itemId === 'ore_spark') ctx.fillStyle = '#7dffb3';
    else if (itemId === 'wood_shard') ctx.fillStyle = '#8b5a2b';
    else if (itemId === 'sand_crystal') ctx.fillStyle = '#e8c070';
    else if (itemId === 'slime_gel') ctx.fillStyle = '#5ad45a';
    else if (itemId === 'bone') ctx.fillStyle = '#e8e0d0';
    else if (itemId === 'wolf_pelt') ctx.fillStyle = '#6a5a4a';
    else if (itemId === 'cactus_spine') ctx.fillStyle = '#3a8f4a';
    else ctx.fillStyle = '#c0392b'; // ensign_badge
    ctx.fillRect(7, 7, 10, 10);
    ctx.fillStyle = '#fff3a0';
    ctx.fillRect(9, 9, 3, 3);
    return;
  }
  if (
    itemId === 'leather_armor' ||
    itemId === 'leather_helmet' ||
    itemId === 'leather_greaves' ||
    itemId === 'leather_shoes' ||
    itemId === 'sorry_boots' ||
    itemId === 'leather_gloves'
  ) {
    ctx.fillStyle = itemId === 'sorry_boots' ? '#5ad4a0' : '#8b5a2b';
    ctx.fillRect(6, 7, 12, 12);
    ctx.fillStyle = itemId === 'sorry_boots' ? '#7dffb3' : '#a06830';
    ctx.fillRect(8, 9, 8, 4);
    if (itemId === 'sorry_boots') {
      ctx.fillStyle = hex(COLORS.pink);
      ctx.fillRect(10, 12, 4, 2);
    }
    return;
  }
  if (itemId === 'cube_core') {
    ctx.fillStyle = 'rgba(90, 220, 180, 0.9)';
    ctx.fillRect(5, 5, 14, 14);
    ctx.strokeStyle = '#2a8f70';
    ctx.strokeRect(5, 5, 14, 14);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(7, 7, 5, 5);
    return;
  }
  if (itemId === 'reinforced_leather') {
    ctx.fillStyle = '#5c4030';
    ctx.fillRect(6, 7, 12, 12);
    ctx.fillStyle = '#8a7a60';
    ctx.fillRect(8, 9, 8, 5);
    ctx.fillStyle = hex(COLORS.gold);
    ctx.fillRect(11, 11, 2, 2);
    return;
  }
  if (itemId === 'gold_trinket' || itemId === 'dungeon_key') {
    ctx.fillStyle = hex(COLORS.gold);
    ctx.beginPath();
    ctx.arc(12, 12, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff3a0';
    ctx.fillRect(10, 10, 2, 2);
    return;
  }
  if (itemId === 'shiny_bauble') {
    ctx.fillStyle = hex(COLORS.pink);
    ctx.beginPath();
    ctx.arc(12, 12, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillRect(9, 9, 3, 3);
    return;
  }
  if (itemId === 'tinker_oil') {
    ctx.fillStyle = '#4a90a4';
    ctx.fillRect(8, 8, 8, 10);
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(10, 5, 4, 4);
    return;
  }
  if (
    itemId === 'wood_shield' ||
    itemId === 'iron_shield' ||
    itemId === 'tower_shield'
  ) {
    ctx.fillStyle =
      itemId === 'tower_shield'
        ? '#6a7080'
        : itemId === 'iron_shield'
          ? '#a0b0c0'
          : '#8b5a2b';
    ctx.beginPath();
    ctx.moveTo(12, 4);
    ctx.lineTo(18, 8);
    ctx.lineTo(18, 16);
    ctx.lineTo(12, 20);
    ctx.lineTo(6, 16);
    ctx.lineTo(6, 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = hex(COLORS.gold);
    ctx.fillRect(11, 10, 2, 4);
    return;
  }
  if (
    itemId === 'copper_ring' ||
    itemId === 'silver_ring' ||
    itemId === 'luck_ring'
  ) {
    ctx.strokeStyle =
      itemId === 'silver_ring'
        ? '#d0d8e0'
        : itemId === 'luck_ring'
          ? '#7dffb3'
          : '#c97b3a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(12, 12, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = hex(COLORS.gold);
    ctx.fillRect(10, 5, 4, 3);
    return;
  }
  ctx.fillStyle = '#7dffb3';
  ctx.fillRect(8, 8, 8, 8);
}

export function generateTextures(scene: Phaser.Scene): void {
  canvasTex(scene, 'tile-floor', TILE, TILE, (ctx) => {
    ctx.fillStyle = hex(COLORS.floor);
    ctx.fillRect(0, 0, TILE, TILE);
    ctx.fillStyle = hex(COLORS.floorAlt);
    ctx.fillRect(1, 1, 2, 2);
    ctx.fillRect(10, 9, 2, 2);
    ctx.fillRect(6, 5, 1, 1);
    ctx.fillRect(13, 3, 1, 1);
    // subtle grout
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(0, 7, TILE, 1);
    ctx.fillRect(7, 0, 1, TILE);
  });

  canvasTex(scene, 'tile-wall', TILE, TILE, (ctx) => {
    ctx.fillStyle = hex(COLORS.wallDark);
    ctx.fillRect(0, 0, TILE, TILE);
    ctx.fillStyle = hex(COLORS.wall);
    ctx.fillRect(1, 1, TILE - 2, TILE - 3);
    // brick seams
    ctx.fillStyle = '#2a2438';
    ctx.fillRect(0, TILE - 2, TILE, 2);
    ctx.fillRect(1, 5, TILE - 2, 1);
    ctx.fillRect(4, 1, 1, 4);
    ctx.fillRect(10, 6, 1, 5);
    // highlight
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(2, 2, TILE - 5, 1);
  });

  canvasTex(scene, 'tile-grass', TILE, TILE, (ctx) => {
    ctx.fillStyle = hex(COLORS.grass);
    ctx.fillRect(0, 0, TILE, TILE);
    ctx.fillStyle = hex(COLORS.grassAlt);
    ctx.fillRect(3, 4, 1, 3);
    ctx.fillRect(8, 2, 1, 4);
    ctx.fillRect(12, 7, 1, 3);
    ctx.fillRect(5, 10, 1, 2);
    ctx.fillStyle = '#4a9a5a';
    ctx.fillRect(2, 2, 1, 1);
    ctx.fillRect(11, 5, 1, 1);
    ctx.fillRect(7, 12, 1, 1);
  });

  canvasTex(scene, 'tile-dirt', TILE, TILE, (ctx) => {
    ctx.fillStyle = hex(COLORS.dirt);
    ctx.fillRect(0, 0, TILE, TILE);
    ctx.fillStyle = '#5a4538';
    ctx.fillRect(4, 5, 2, 1);
    ctx.fillRect(10, 9, 2, 1);
    ctx.fillRect(2, 11, 1, 1);
    ctx.fillRect(13, 3, 2, 1);
    ctx.fillStyle = '#7a6554';
    ctx.fillRect(7, 2, 1, 1);
  });

  canvasTex(scene, 'tile-water', TILE, TILE, (ctx) => {
    ctx.fillStyle = hex(COLORS.water);
    ctx.fillRect(0, 0, TILE, TILE);
    ctx.fillStyle = '#3d7eb0';
    ctx.fillRect(2, 4, 5, 1);
    ctx.fillRect(8, 10, 5, 1);
    ctx.fillStyle = 'rgba(180,220,255,0.35)';
    ctx.fillRect(4, 2, 3, 1);
    ctx.fillRect(10, 7, 4, 1);
  });

  // Second water frame for shimmer
  canvasTex(scene, 'tile-water-b', TILE, TILE, (ctx) => {
    ctx.fillStyle = hex(COLORS.water);
    ctx.fillRect(0, 0, TILE, TILE);
    ctx.fillStyle = '#4a8ec0';
    ctx.fillRect(4, 6, 5, 1);
    ctx.fillRect(1, 11, 6, 1);
    ctx.fillStyle = 'rgba(200,230,255,0.4)';
    ctx.fillRect(9, 3, 4, 1);
    ctx.fillRect(3, 9, 3, 1);
  });

  canvasTex(scene, 'tile-lava', TILE, TILE, (ctx) => {
    ctx.fillStyle = hex(COLORS.lava);
    ctx.fillRect(0, 0, TILE, TILE);
    ctx.fillStyle = '#ff8a4c';
    ctx.fillRect(3, 3, 3, 2);
    ctx.fillRect(9, 9, 4, 2);
    ctx.fillStyle = '#ffcc66';
    ctx.fillRect(6, 6, 2, 2);
    ctx.fillRect(1, 12, 2, 1);
  });

  canvasTex(scene, 'tile-lava-b', TILE, TILE, (ctx) => {
    ctx.fillStyle = '#d4542b';
    ctx.fillRect(0, 0, TILE, TILE);
    ctx.fillStyle = '#ffaa55';
    ctx.fillRect(5, 2, 4, 2);
    ctx.fillRect(2, 10, 3, 2);
    ctx.fillStyle = '#ffe08a';
    ctx.fillRect(9, 7, 2, 2);
  });

  // Wide door graphic (single tile — fills full width, not multi-D ASCII)
  canvasTex(scene, 'tile-door', TILE, TILE, (ctx) => {
    ctx.fillStyle = hex(COLORS.floor);
    ctx.fillRect(0, 0, TILE, TILE);
    // Arch frame
    ctx.fillStyle = '#5a4510';
    ctx.fillRect(0, 0, 16, 2);
    ctx.fillRect(0, 0, 2, 16);
    ctx.fillRect(14, 0, 2, 16);
    // Door leaves (wide)
    ctx.fillStyle = '#8b6914';
    ctx.fillRect(2, 1, 5, 14);
    ctx.fillRect(9, 1, 5, 14);
    ctx.fillStyle = '#a07828';
    ctx.fillRect(3, 2, 3, 3);
    ctx.fillRect(10, 2, 3, 3);
    // Handles
    ctx.fillStyle = hex(COLORS.gold);
    ctx.fillRect(6, 7, 1, 2);
    ctx.fillRect(9, 7, 1, 2);
  });

  canvasTex(scene, 'tile-locked', TILE, TILE, (ctx) => {
    ctx.fillStyle = hex(COLORS.floor);
    ctx.fillRect(0, 0, TILE, TILE);
    ctx.fillStyle = '#3a2810';
    ctx.fillRect(0, 0, 16, 2);
    ctx.fillRect(0, 0, 2, 16);
    ctx.fillRect(14, 0, 2, 16);
    ctx.fillStyle = '#5a3d1a';
    ctx.fillRect(2, 1, 12, 14);
    // Big lock plate
    ctx.fillStyle = '#888';
    ctx.fillRect(5, 5, 6, 7);
    ctx.fillStyle = hex(COLORS.gold);
    ctx.fillRect(7, 7, 2, 2);
    ctx.fillRect(7, 9, 2, 2);
  });

  canvasTex(scene, 'tile-stairs', TILE, TILE, (ctx) => {
    // Wide stairs DOWN — full-tile tread width
    ctx.fillStyle = '#2a2038';
    ctx.fillRect(0, 0, TILE, TILE);
    ctx.fillStyle = '#6a5a8a';
    for (let i = 0; i < 5; i++) {
      const y = 1 + i * 3;
      const inset = i; // slight recede but stay wide
      ctx.fillRect(1 + inset, y, 14 - inset * 2, 2);
    }
    ctx.fillStyle = '#ff6b9d';
    ctx.fillRect(6, 1, 4, 2); // wide DOWN marker
  });

  canvasTex(scene, 'tile-stairs-up', TILE, TILE, (ctx) => {
    // Wide stairs UP — full-tile tread width
    ctx.fillStyle = '#3a4060';
    ctx.fillRect(0, 0, TILE, TILE);
    ctx.fillStyle = '#9ab0d0';
    for (let i = 0; i < 5; i++) {
      const y = 13 - i * 3;
      const inset = 4 - i;
      ctx.fillRect(1 + Math.max(0, inset), y, 14 - Math.max(0, inset) * 2, 2);
    }
    ctx.fillStyle = '#7dffb3';
    ctx.fillRect(6, 1, 4, 2); // wide UP marker
  });

  canvasTex(scene, 'tile-pad', TILE, TILE, (ctx) => {
    ctx.fillStyle = '#1a2a40';
    ctx.fillRect(0, 0, TILE, TILE);
    ctx.strokeStyle = '#4ecdc4';
    ctx.lineWidth = 1;
    ctx.strokeRect(2, 2, 12, 12);
    ctx.fillStyle = '#4ecdc4';
    ctx.fillRect(7, 7, 2, 2);
  });

  // Default bare hero + keyed loadout texture (full combos generated on demand)
  canvasTex(scene, 'player', TILE, TILE, (ctx) => {
    drawPlayerLook(ctx, BARE_APPEARANCE);
  });
  canvasTex(scene, playerTextureKey(BARE_APPEARANCE), TILE, TILE, (ctx) => {
    drawPlayerLook(ctx, BARE_APPEARANCE);
  });

  const iconIds = [
    'empty',
    'potion',
    'mild_sword',
    'iron_blade',
    'sand_saber',
    'dunjun_cleaver',
    'leather_armor',
    'reinforced_leather',
    'leather_helmet',
    'leather_greaves',
    'leather_shoes',
    'sorry_boots',
    'leather_gloves',
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
  ];
  for (const id of iconIds) {
    canvasTex(scene, `icon_${id}`, 24, 24, (ctx) => drawItemIcon(ctx, id));
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

  canvasTex(scene, 'sword-swing', 20, 20, (ctx) => {
    ctx.fillStyle = '#dfe6f0';
    ctx.fillRect(8, 0, 4, 14);
    ctx.fillStyle = '#fff';
    ctx.fillRect(9, 1, 1, 10);
    ctx.fillStyle = '#c9a227';
    ctx.fillRect(6, 12, 8, 3);
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(8, 15, 4, 4);
  });

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

  canvasTex(scene, 'slime', TILE, TILE, (ctx) => {
    ctx.fillStyle = hex(COLORS.slime);
    ctx.beginPath();
    ctx.ellipse(8, 10, 6, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.ellipse(6, 8, 2, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillRect(5, 8, 2, 2);
    ctx.fillRect(9, 8, 2, 2);
    ctx.fillStyle = '#000';
    ctx.fillRect(6, 9, 1, 1);
    ctx.fillRect(10, 9, 1, 1);
    // drip
    ctx.fillStyle = hex(COLORS.slime);
    ctx.fillRect(7, 14, 2, 2);
  });

  canvasTex(scene, 'slime-b', TILE, TILE, (ctx) => {
    ctx.fillStyle = hex(COLORS.slime);
    ctx.beginPath();
    ctx.ellipse(8, 10, 6.5, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillRect(5, 8, 2, 2);
    ctx.fillRect(9, 7, 2, 2);
    ctx.fillStyle = '#000';
    ctx.fillRect(6, 9, 1, 1);
    ctx.fillRect(10, 8, 1, 1);
  });

  canvasTex(scene, 'skeleton', TILE, TILE, (ctx) => {
    ctx.fillStyle = hex(COLORS.bone);
    ctx.fillRect(5, 2, 6, 5);
    ctx.fillRect(6, 7, 4, 5);
    ctx.fillRect(4, 8, 2, 4);
    ctx.fillRect(10, 8, 2, 4);
    ctx.fillRect(6, 12, 2, 3);
    ctx.fillRect(9, 12, 2, 3);
    ctx.fillStyle = '#c8c0b0';
    ctx.fillRect(6, 3, 4, 1);
    ctx.fillStyle = '#000';
    ctx.fillRect(6, 4, 1, 1);
    ctx.fillRect(9, 4, 1, 1);
    // ribs
    ctx.fillStyle = '#d0c8b8';
    ctx.fillRect(7, 8, 2, 1);
    ctx.fillRect(7, 10, 2, 1);
  });

  canvasTex(scene, 'redshirt', TILE, TILE, (ctx) => {
    ctx.fillStyle = hex(COLORS.redshirt);
    ctx.fillRect(4, 6, 8, 7);
    ctx.fillStyle = '#f0c8a4';
    ctx.fillRect(5, 2, 6, 5);
    ctx.fillStyle = '#111';
    ctx.fillRect(6, 3, 1, 1);
    ctx.fillRect(9, 3, 1, 1);
    ctx.fillStyle = '#888';
    ctx.fillRect(3, 7, 2, 5);
  });

  // Captain — gold command tunic (Kirk energy), not a redshirt
  canvasTex(scene, 'captain', TILE, TILE, (ctx) => {
    // black pants / boots
    ctx.fillStyle = '#1a1a22';
    ctx.fillRect(5, 12, 2, 3);
    ctx.fillRect(9, 12, 2, 3);
    // gold command shirt (TOS command gold)
    ctx.fillStyle = '#d4a017';
    ctx.fillRect(4, 6, 8, 7);
    ctx.fillStyle = '#e8c040';
    ctx.fillRect(5, 7, 6, 2);
    // collar
    ctx.fillStyle = '#1a1a22';
    ctx.fillRect(5, 6, 6, 1);
    // head
    ctx.fillStyle = '#f0c8a4';
    ctx.fillRect(5, 2, 6, 5);
    // hair (swoop)
    ctx.fillStyle = '#3d2b1f';
    ctx.fillRect(5, 1, 6, 2);
    ctx.fillRect(4, 2, 1, 2);
    // eyes
    ctx.fillStyle = '#111';
    ctx.fillRect(6, 3, 1, 1);
    ctx.fillRect(9, 3, 1, 1);
    // rank braid on sleeve
    ctx.fillStyle = hex(COLORS.gold);
    ctx.fillRect(3, 9, 1, 3);
    ctx.fillRect(12, 9, 1, 3);
  });

  canvasTex(scene, 'cube', 20, 20, (ctx) => {
    ctx.fillStyle = 'rgba(90, 220, 180, 0.75)';
    ctx.fillRect(2, 2, 16, 16);
    ctx.strokeStyle = '#2a8f70';
    ctx.strokeRect(2, 2, 16, 16);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(4, 4, 5, 5);
    ctx.fillStyle = '#1a3328';
    ctx.fillRect(6, 10, 2, 2);
    ctx.fillRect(12, 10, 2, 2);
  });

  canvasTex(scene, 'boss', 24, 24, (ctx) => {
    ctx.fillStyle = '#4a2060';
    ctx.fillRect(4, 8, 16, 12);
    ctx.fillStyle = '#f0c8a4';
    ctx.fillRect(7, 3, 10, 8);
    ctx.fillStyle = hex(COLORS.gold);
    ctx.fillRect(5, 1, 14, 4);
    ctx.fillRect(10, 0, 4, 3);
    ctx.fillStyle = '#ff3344';
    ctx.fillRect(9, 5, 2, 2);
    ctx.fillRect(13, 5, 2, 2);
    ctx.fillStyle = '#fff';
    ctx.fillRect(8, 14, 8, 2);
  });

  canvasTex(scene, 'npc', TILE, TILE, (ctx) => {
    ctx.fillStyle = '#6b4f9a';
    ctx.fillRect(4, 6, 8, 8);
    ctx.fillStyle = '#e8c4a0';
    ctx.fillRect(5, 2, 6, 5);
    ctx.fillStyle = '#ddd';
    ctx.fillRect(4, 1, 8, 2);
    ctx.fillStyle = '#222';
    ctx.fillRect(6, 4, 1, 1);
    ctx.fillRect(9, 4, 1, 1);
  });

  // Traveling tinkerer / merchant (pack + hat)
  canvasTex(scene, 'merchant', TILE, TILE, (ctx) => {
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(3, 7, 10, 7);
    ctx.fillStyle = '#c9a227';
    ctx.fillRect(2, 6, 12, 3);
    ctx.fillStyle = '#e8c4a0';
    ctx.fillRect(5, 2, 6, 5);
    ctx.fillStyle = '#5c3d1a';
    ctx.fillRect(4, 1, 8, 2);
    ctx.fillRect(7, 0, 2, 2);
    ctx.fillStyle = '#222';
    ctx.fillRect(6, 4, 1, 1);
    ctx.fillRect(9, 4, 1, 1);
    ctx.fillStyle = hex(COLORS.gold);
    ctx.fillRect(12, 9, 2, 2);
  });

  canvasTex(scene, 'key', TILE, TILE, (ctx) => {
    ctx.fillStyle = hex(COLORS.gold);
    ctx.beginPath();
    ctx.arc(6, 6, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(8, 5, 6, 2);
    ctx.fillRect(12, 7, 2, 3);
    ctx.fillRect(10, 7, 2, 2);
  });

  canvasTex(scene, 'heart', TILE, TILE, (ctx) => {
    ctx.fillStyle = hex(COLORS.pink);
    ctx.fillRect(3, 4, 4, 4);
    ctx.fillRect(9, 4, 4, 4);
    ctx.fillRect(4, 7, 8, 4);
    ctx.fillRect(6, 11, 4, 2);
  });

  canvasTex(scene, 'sword-item', TILE, TILE, (ctx) => {
    ctx.fillStyle = '#dfe6f0';
    ctx.fillRect(7, 1, 2, 10);
    ctx.fillStyle = '#c9a227';
    ctx.fillRect(5, 10, 6, 2);
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(7, 12, 2, 3);
  });

  canvasTex(scene, 'sign', TILE, TILE, (ctx) => {
    ctx.fillStyle = '#8b6914';
    ctx.fillRect(2, 2, 12, 9);
    ctx.fillStyle = '#5a4510';
    ctx.fillRect(7, 11, 2, 4);
    ctx.fillStyle = '#f5e6b8';
    ctx.fillRect(4, 4, 8, 1);
    ctx.fillRect(4, 7, 6, 1);
  });

  canvasTex(scene, 'chest', TILE, TILE, (ctx) => {
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(2, 6, 12, 8);
    ctx.fillStyle = '#a06830';
    ctx.fillRect(2, 4, 12, 4);
    ctx.fillStyle = hex(COLORS.gold);
    ctx.fillRect(7, 7, 2, 3);
  });

  // Mapz scroll (world pickup)
  canvasTex(scene, 'mapz', TILE, TILE, (ctx) => {
    ctx.fillStyle = '#d4c4a0';
    ctx.fillRect(2, 3, 12, 11);
    ctx.fillStyle = '#8b6914';
    ctx.fillRect(2, 2, 12, 2);
    ctx.fillRect(2, 13, 12, 2);
    ctx.fillStyle = '#2a6a4a';
    ctx.fillRect(4, 5, 8, 1);
    ctx.fillRect(4, 8, 6, 1);
    ctx.fillRect(4, 11, 7, 1);
  });

  // Graphic mapz UI tiles (48×48 room cells)
  const cell = 48;
  const drawMapzCell = (
    ctx: CanvasRenderingContext2D,
    fill: string,
    border: string,
    mode: 'visited' | 'unknown' | 'current',
  ) => {
    ctx.fillStyle = '#0a0c10';
    ctx.fillRect(0, 0, cell, cell);
    ctx.fillStyle = fill;
    ctx.fillRect(4, 4, cell - 8, cell - 8);
    ctx.strokeStyle = border;
    ctx.lineWidth = 2;
    ctx.strokeRect(4.5, 4.5, cell - 9, cell - 9);
    // Inner floor detail
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(8, 8, cell - 16, 4);
    if (mode === 'unknown') {
      ctx.fillStyle = border;
      ctx.font = 'bold 22px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', cell / 2, cell / 2 + 1);
    }
    if (mode === 'current') {
      // Player gem
      ctx.fillStyle = '#ff6b9d';
      ctx.beginPath();
      ctx.moveTo(cell / 2, 14);
      ctx.lineTo(cell / 2 + 8, 24);
      ctx.lineTo(cell / 2, 34);
      ctx.lineTo(cell / 2 - 8, 24);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillRect(cell / 2 - 2, 20, 4, 4);
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
  canvasTex(scene, 'mapz_stairs', 16, 16, (ctx) => {
    ctx.fillStyle = '#ff6b9d';
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(2 + i, 12 - i * 3, 12 - i * 2, 2);
    }
  });
  canvasTex(scene, 'mapz_link_h', 16, 8, (ctx) => {
    ctx.fillStyle = '#7dffb3';
    ctx.fillRect(0, 2, 16, 4);
  });
  canvasTex(scene, 'mapz_link_v', 8, 16, (ctx) => {
    ctx.fillStyle = '#7dffb3';
    ctx.fillRect(2, 0, 4, 16);
  });

  // Forje anvil + glow
  canvasTex(scene, 'forje', TILE, TILE, (ctx) => {
    ctx.fillStyle = '#3a3a48';
    ctx.fillRect(3, 8, 10, 5);
    ctx.fillStyle = '#5a5a68';
    ctx.fillRect(2, 6, 12, 3);
    ctx.fillStyle = '#2a2a34';
    ctx.fillRect(4, 9, 8, 1);
    // embers
    ctx.fillStyle = '#ff8a4c';
    ctx.fillRect(6, 3, 4, 3);
    ctx.fillRect(5, 2, 1, 2);
    ctx.fillRect(10, 1, 1, 2);
    ctx.fillStyle = hex(COLORS.gold);
    ctx.fillRect(7, 4, 2, 1);
    ctx.fillStyle = '#ffcc66';
    ctx.fillRect(7, 2, 1, 1);
  });

  // Princesz Prizella
  canvasTex(scene, 'princess', TILE, TILE, (ctx) => {
    ctx.fillStyle = hex(COLORS.pink);
    ctx.fillRect(4, 7, 8, 7);
    ctx.fillStyle = '#f0c8a4';
    ctx.fillRect(5, 3, 6, 5);
    ctx.fillStyle = hex(COLORS.gold);
    ctx.fillRect(4, 1, 8, 3);
    ctx.fillRect(7, 0, 2, 2);
    ctx.fillStyle = '#222';
    ctx.fillRect(6, 5, 1, 1);
    ctx.fillRect(9, 5, 1, 1);
  });

  // Woodz wolf
  canvasTex(scene, 'wolf', TILE, TILE, (ctx) => {
    ctx.fillStyle = '#6a6a78';
    ctx.fillRect(3, 7, 10, 6);
    ctx.fillRect(2, 5, 6, 4);
    ctx.fillStyle = '#4a4a58';
    ctx.fillRect(1, 3, 3, 3);
    ctx.fillRect(6, 3, 3, 3);
    ctx.fillStyle = '#ff3344';
    ctx.fillRect(3, 6, 1, 1);
    ctx.fillRect(6, 6, 1, 1);
    ctx.fillStyle = '#888';
    ctx.fillRect(12, 9, 3, 2);
  });

  // Dezertz cactus (stationary hazard plant)
  canvasTex(scene, 'cactus', TILE, TILE, (ctx) => {
    ctx.fillStyle = '#3d8b5a';
    ctx.fillRect(6, 3, 4, 11);
    ctx.fillRect(3, 5, 3, 4);
    ctx.fillRect(10, 7, 3, 4);
    ctx.fillStyle = '#2a6a40';
    ctx.fillRect(7, 4, 1, 2);
    ctx.fillRect(9, 8, 1, 2);
    // spines
    ctx.fillStyle = '#f0e8c0';
    ctx.fillRect(5, 2, 1, 1);
    ctx.fillRect(10, 4, 1, 1);
    ctx.fillRect(4, 6, 1, 1);
    ctx.fillRect(11, 9, 1, 1);
    ctx.fillRect(7, 1, 1, 1);
  });

  // Woodz tree (solid scenery)
  canvasTex(scene, 'tree', TILE, TILE, (ctx) => {
    ctx.fillStyle = '#5a3a22';
    ctx.fillRect(7, 9, 2, 6);
    ctx.fillStyle = '#2f6b45';
    ctx.beginPath();
    ctx.ellipse(8, 7, 6, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3a8f5a';
    ctx.beginPath();
    ctx.ellipse(6, 6, 3, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1e4a30';
    ctx.fillRect(5, 8, 1, 1);
    ctx.fillRect(10, 5, 1, 1);
  });

  // Tumbleweed (dezertz prop)
  canvasTex(scene, 'tumbleweed', TILE, TILE, (ctx) => {
    ctx.fillStyle = '#8a6a40';
    ctx.beginPath();
    ctx.ellipse(8, 9, 5, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#6a5030';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(8, 9, 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#a08050';
    ctx.fillRect(6, 7, 1, 1);
    ctx.fillRect(10, 10, 1, 1);
  });

  // Scorpion
  canvasTex(scene, 'scorpion', TILE, TILE, (ctx) => {
    ctx.fillStyle = '#8a5030';
    ctx.fillRect(4, 7, 8, 4);
    ctx.fillRect(10, 5, 3, 3);
    // claws
    ctx.fillRect(2, 6, 3, 2);
    ctx.fillRect(2, 10, 3, 2);
    // tail
    ctx.fillStyle = '#6a3820';
    ctx.fillRect(11, 3, 2, 4);
    ctx.fillRect(12, 2, 2, 2);
    ctx.fillStyle = '#ff3344';
    ctx.fillRect(13, 1, 1, 1);
  });

  // Tarantula
  canvasTex(scene, 'tarantula', TILE, TILE, (ctx) => {
    ctx.fillStyle = '#3a2a28';
    ctx.fillRect(5, 6, 6, 5);
    ctx.fillStyle = '#2a1a18';
    ctx.fillRect(3, 5, 2, 1);
    ctx.fillRect(3, 8, 2, 1);
    ctx.fillRect(3, 11, 2, 1);
    ctx.fillRect(11, 5, 2, 1);
    ctx.fillRect(11, 8, 2, 1);
    ctx.fillRect(11, 11, 2, 1);
    ctx.fillStyle = '#ff3344';
    ctx.fillRect(6, 7, 1, 1);
    ctx.fillRect(9, 7, 1, 1);
  });

  // Hornet
  canvasTex(scene, 'hornet', TILE, TILE, (ctx) => {
    ctx.fillStyle = '#ffc857';
    ctx.fillRect(5, 7, 6, 4);
    ctx.fillStyle = '#222';
    ctx.fillRect(6, 7, 1, 4);
    ctx.fillRect(9, 7, 1, 4);
    // wings
    ctx.fillStyle = 'rgba(200,220,255,0.7)';
    ctx.fillRect(4, 4, 3, 3);
    ctx.fillRect(9, 4, 3, 3);
    ctx.fillStyle = '#222';
    ctx.fillRect(11, 8, 3, 1);
  });

  // Best Bud base silhouette — tinted per species (never human)
  canvasTex(scene, 'best_bud', TILE, TILE, (ctx) => {
    ctx.fillStyle = '#d0d0d8';
    ctx.fillRect(4, 6, 8, 7);
    ctx.fillRect(3, 8, 10, 4);
    // rounder belly
    ctx.fillRect(5, 12, 6, 1);
    // ears
    ctx.fillRect(3, 3, 3, 4);
    ctx.fillRect(10, 3, 3, 4);
    ctx.fillRect(2, 2, 2, 2);
    ctx.fillRect(12, 2, 2, 2);
    // face
    ctx.fillStyle = '#222';
    ctx.fillRect(6, 8, 1, 1);
    ctx.fillRect(9, 8, 1, 1);
    ctx.fillStyle = '#ff6b9d';
    ctx.fillRect(7, 10, 2, 1);
    // cheek dots
    ctx.fillStyle = 'rgba(255,107,157,0.45)';
    ctx.fillRect(5, 9, 1, 1);
    ctx.fillRect(10, 9, 1, 1);
    ctx.fillStyle = '#a0a0a8';
    ctx.fillRect(5, 13, 2, 2);
    ctx.fillRect(9, 13, 2, 2);
  });

  // Boss exit portal — cyan ring + gem (step-on warp)
  canvasTex(scene, 'portal', TILE, TILE, (ctx) => {
    ctx.fillStyle = '#0a1220';
    ctx.fillRect(0, 0, TILE, TILE);
    ctx.strokeStyle = '#4ecdc4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(8, 8, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#7dffb3';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(8, 8, 4, 0, Math.PI * 2);
    ctx.stroke();
    // outer sparkles
    ctx.fillStyle = 'rgba(78,205,196,0.7)';
    ctx.fillRect(1, 7, 1, 1);
    ctx.fillRect(14, 8, 1, 1);
    ctx.fillRect(7, 1, 1, 1);
    ctx.fillRect(8, 14, 1, 1);
    ctx.fillStyle = '#ffc857';
    ctx.fillRect(7, 6, 2, 2);
    ctx.fillStyle = '#4ecdc4';
    ctx.fillRect(6, 9, 4, 1);
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

  canvasTex(scene, 'villager', TILE, TILE, (ctx) => {
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

  canvasTex(scene, 'villager-thief', TILE, TILE, (ctx) => {
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

  canvasTex(scene, 'villager-knight', TILE, TILE, (ctx) => {
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

  canvasTex(scene, 'villager-mage', TILE, TILE, (ctx) => {
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
