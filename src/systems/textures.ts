import type Phaser from 'phaser';
import { COLORS, TILE } from '../config';
import {
  AMULET_LOOKS,
  BREAST_LOOKS,
  HELMET_LOOKS,
  playerTextureKey,
  type AppearanceSpec,
  type AmuletLook,
  type BreastLook,
  type HelmetLook,
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

/** Draw hero at 16x16 with breastplate / helmet / amulet / weapon / key. */
function drawPlayerLook(
  ctx: CanvasRenderingContext2D,
  spec: AppearanceSpec,
): void {
  // Legs / boots
  ctx.fillStyle = '#3d2b1f';
  ctx.fillRect(5, 13, 2, 2);
  ctx.fillRect(9, 13, 2, 2);

  // Torso
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
  }
  if (spec.breastplate === 'reinforced') {
    ctx.fillStyle = '#8a7a60';
    ctx.fillRect(5, 7, 6, 3);
    ctx.fillStyle = hex(COLORS.gold);
    ctx.fillRect(7, 8, 2, 2);
    ctx.fillStyle = '#3a2a18';
    ctx.fillRect(4, 11, 8, 1);
  }

  // Head
  ctx.fillStyle = '#f0c8a4';
  ctx.fillRect(5, 2, 6, 5);
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(6, 3, 1, 1);
  ctx.fillRect(9, 3, 1, 1);

  // Helmet or hair
  if (spec.helmet === 'leather') {
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(4, 1, 8, 3);
    ctx.fillRect(3, 3, 2, 2);
    ctx.fillRect(11, 3, 2, 2);
  } else {
    ctx.fillStyle = '#c9a227';
    ctx.fillRect(4, 1, 8, 2);
  }

  // Amulet
  if (spec.amulet === 'gold') {
    ctx.fillStyle = hex(COLORS.gold);
    ctx.fillRect(7, 6, 2, 1);
    ctx.fillRect(7, 7, 2, 2);
  }
  if (spec.amulet === 'bauble') {
    ctx.fillStyle = hex(COLORS.pink);
    ctx.fillRect(7, 6, 2, 1);
    ctx.fillRect(6, 7, 4, 2);
    ctx.fillStyle = '#fff';
    ctx.fillRect(7, 7, 1, 1);
  }

  // Weapon on hip (right)
  if (spec.weapon) {
    ctx.fillStyle = '#dfe6f0';
    ctx.fillRect(12, 8, 2, 5);
    ctx.fillStyle = '#c9a227';
    ctx.fillRect(11, 12, 4, 1);
  }

  // Shield on left arm
  if (spec.shield) {
    ctx.fillStyle = '#8b6914';
    ctx.fillRect(1, 7, 3, 5);
    ctx.fillStyle = '#c9a227';
    ctx.fillRect(1, 8, 3, 1);
    ctx.fillStyle = '#5a4510';
    ctx.fillRect(2, 9, 1, 2);
  }

  // Key on belt
  if (spec.key) {
    ctx.fillStyle = hex(COLORS.gold);
    ctx.fillRect(3, 10, 2, 3);
    ctx.fillRect(2, 10, 2, 2);
  }
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
    itemId === 'dunjun_cleaver'
  ) {
    ctx.fillStyle =
      itemId === 'dunjun_cleaver'
        ? '#ff6b9d'
        : itemId === 'sand_saber'
          ? '#e8c070'
          : itemId === 'iron_blade'
            ? '#a0b0c0'
            : '#dfe6f0';
    ctx.fillRect(11, 4, 2, 14);
    ctx.fillStyle = '#c9a227';
    ctx.fillRect(8, 14, 8, 2);
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(11, 16, 2, 4);
    return;
  }
  if (
    itemId === 'ore_iron' ||
    itemId === 'ore_spark' ||
    itemId === 'wood_shard' ||
    itemId === 'sand_crystal'
  ) {
    if (itemId === 'ore_iron') ctx.fillStyle = '#8a9098';
    else if (itemId === 'ore_spark') ctx.fillStyle = '#7dffb3';
    else if (itemId === 'wood_shard') ctx.fillStyle = '#8b5a2b';
    else ctx.fillStyle = '#e8c070';
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
  });

  canvasTex(scene, 'tile-wall', TILE, TILE, (ctx) => {
    ctx.fillStyle = hex(COLORS.wallDark);
    ctx.fillRect(0, 0, TILE, TILE);
    ctx.fillStyle = hex(COLORS.wall);
    ctx.fillRect(1, 1, TILE - 2, TILE - 3);
    ctx.fillStyle = '#2a2438';
    ctx.fillRect(0, TILE - 2, TILE, 2);
  });

  canvasTex(scene, 'tile-grass', TILE, TILE, (ctx) => {
    ctx.fillStyle = hex(COLORS.grass);
    ctx.fillRect(0, 0, TILE, TILE);
    ctx.fillStyle = hex(COLORS.grassAlt);
    ctx.fillRect(3, 4, 1, 3);
    ctx.fillRect(8, 2, 1, 4);
    ctx.fillRect(12, 7, 1, 3);
  });

  canvasTex(scene, 'tile-dirt', TILE, TILE, (ctx) => {
    ctx.fillStyle = hex(COLORS.dirt);
    ctx.fillRect(0, 0, TILE, TILE);
    ctx.fillStyle = '#5a4538';
    ctx.fillRect(4, 5, 2, 1);
    ctx.fillRect(10, 9, 2, 1);
  });

  canvasTex(scene, 'tile-water', TILE, TILE, (ctx) => {
    ctx.fillStyle = hex(COLORS.water);
    ctx.fillRect(0, 0, TILE, TILE);
    ctx.fillStyle = '#3d7eb0';
    ctx.fillRect(2, 4, 5, 1);
    ctx.fillRect(8, 10, 5, 1);
  });

  canvasTex(scene, 'tile-lava', TILE, TILE, (ctx) => {
    ctx.fillStyle = hex(COLORS.lava);
    ctx.fillRect(0, 0, TILE, TILE);
    ctx.fillStyle = '#ff8a4c';
    ctx.fillRect(3, 3, 3, 2);
    ctx.fillRect(9, 9, 4, 2);
  });

  canvasTex(scene, 'tile-door', TILE, TILE, (ctx) => {
    ctx.fillStyle = hex(COLORS.floor);
    ctx.fillRect(0, 0, TILE, TILE);
    ctx.fillStyle = '#8b6914';
    ctx.fillRect(2, 0, 12, 16);
    ctx.fillStyle = hex(COLORS.gold);
    ctx.fillRect(11, 7, 2, 2);
  });

  canvasTex(scene, 'tile-locked', TILE, TILE, (ctx) => {
    ctx.fillStyle = hex(COLORS.floor);
    ctx.fillRect(0, 0, TILE, TILE);
    ctx.fillStyle = '#5a3d1a';
    ctx.fillRect(2, 0, 12, 16);
    ctx.fillStyle = '#888';
    ctx.fillRect(6, 5, 4, 5);
    ctx.fillStyle = hex(COLORS.gold);
    ctx.fillRect(7, 7, 2, 2);
  });

  canvasTex(scene, 'tile-stairs', TILE, TILE, (ctx) => {
    // Stairs DOWN — darker, steps receding
    ctx.fillStyle = '#2a2038';
    ctx.fillRect(0, 0, TILE, TILE);
    ctx.fillStyle = '#6a5a8a';
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(2, 2 + i * 3, 12 - i * 2, 2);
    }
    ctx.fillStyle = '#ff6b9d';
    ctx.fillRect(7, 1, 2, 2);
  });

  canvasTex(scene, 'tile-stairs-up', TILE, TILE, (ctx) => {
    // Stairs UP — lighter, steps rising
    ctx.fillStyle = '#3a4060';
    ctx.fillRect(0, 0, TILE, TILE);
    ctx.fillStyle = '#9ab0d0';
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(2 + i, 12 - i * 3, 12 - i * 2, 2);
    }
    ctx.fillStyle = '#7dffb3';
    ctx.fillRect(7, 1, 2, 2);
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

  // Default player + layered combos (breast × helm × amulet × weapon × shield × key)
  const bare: AppearanceSpec = {
    breastplate: 'none',
    helmet: 'none',
    amulet: 'none',
    weapon: false,
    shield: false,
    key: false,
  };
  canvasTex(scene, 'player', TILE, TILE, (ctx) => {
    drawPlayerLook(ctx, bare);
  });
  for (const breastplate of BREAST_LOOKS) {
    for (const helmet of HELMET_LOOKS) {
      for (const amulet of AMULET_LOOKS) {
        for (const weapon of [false, true]) {
          for (const shield of [false, true]) {
            for (const key of [false, true]) {
              const spec: AppearanceSpec = {
                breastplate: breastplate as BreastLook,
                helmet: helmet as HelmetLook,
                amulet: amulet as AmuletLook,
                weapon,
                shield,
                key,
              };
              canvasTex(scene, playerTextureKey(spec), TILE, TILE, (ctx) => {
                drawPlayerLook(ctx, spec);
              });
            }
          }
        }
      }
    }
  }

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
    ctx.fillStyle = '#c9a227';
    ctx.fillRect(6, 12, 8, 3);
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(8, 15, 4, 4);
  });

  canvasTex(scene, 'slime', TILE, TILE, (ctx) => {
    ctx.fillStyle = hex(COLORS.slime);
    ctx.beginPath();
    ctx.ellipse(8, 10, 6, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillRect(5, 8, 2, 2);
    ctx.fillRect(9, 8, 2, 2);
    ctx.fillStyle = '#000';
    ctx.fillRect(6, 9, 1, 1);
    ctx.fillRect(10, 9, 1, 1);
  });

  canvasTex(scene, 'skeleton', TILE, TILE, (ctx) => {
    ctx.fillStyle = hex(COLORS.bone);
    ctx.fillRect(5, 2, 6, 5);
    ctx.fillRect(6, 7, 4, 5);
    ctx.fillRect(4, 8, 2, 4);
    ctx.fillRect(10, 8, 2, 4);
    ctx.fillRect(6, 12, 2, 3);
    ctx.fillRect(9, 12, 2, 3);
    ctx.fillStyle = '#000';
    ctx.fillRect(6, 4, 1, 1);
    ctx.fillRect(9, 4, 1, 1);
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
    ctx.fillStyle = '#ff8a4c';
    ctx.fillRect(6, 3, 4, 3);
    ctx.fillStyle = hex(COLORS.gold);
    ctx.fillRect(7, 4, 2, 1);
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

  // Dezertz cactus
  canvasTex(scene, 'cactus', TILE, TILE, (ctx) => {
    ctx.fillStyle = '#3d8b5a';
    ctx.fillRect(6, 3, 4, 11);
    ctx.fillRect(3, 5, 3, 4);
    ctx.fillRect(10, 7, 3, 4);
    ctx.fillStyle = '#2a6a40';
    ctx.fillRect(7, 4, 1, 2);
    ctx.fillRect(9, 8, 1, 2);
    ctx.fillStyle = '#f0e8c0';
    ctx.fillRect(5, 2, 1, 1);
    ctx.fillRect(10, 4, 1, 1);
  });

  canvasTex(scene, 'particle', 4, 4, (ctx) => {
    ctx.fillStyle = hex(COLORS.gold);
    ctx.fillRect(0, 0, 4, 4);
  });
}
