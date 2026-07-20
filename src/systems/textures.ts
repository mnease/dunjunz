import type Phaser from 'phaser';
import { COLORS, TILE } from '../config';
import {
  AMULET_LOOKS,
  ARMOR_LOOKS,
  playerTextureKey,
  type AmuletLook,
  type ArmorLook,
  type AppearanceSpec,
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

/** Draw hero at 16x16 with optional armor / amulet / sword. */
function drawPlayerLook(
  ctx: CanvasRenderingContext2D,
  spec: AppearanceSpec,
): void {
  // Legs
  ctx.fillStyle = '#3d2b1f';
  ctx.fillRect(5, 13, 2, 2);
  ctx.fillRect(9, 13, 2, 2);

  // Torso base (tunic)
  let body = '#2d6cdf';
  if (spec.armor === 'leather_armor') body = '#8b5a2b';
  if (spec.armor === 'reinforced_leather') body = '#5c4030';
  ctx.fillStyle = body;
  ctx.fillRect(4, 6, 8, 7);

  // Armor plate / straps
  if (spec.armor === 'leather_armor') {
    ctx.fillStyle = '#a06830';
    ctx.fillRect(5, 7, 6, 2);
    ctx.fillStyle = '#5a3d1a';
    ctx.fillRect(4, 10, 8, 1);
  }
  if (spec.armor === 'reinforced_leather') {
    ctx.fillStyle = '#8a7a60';
    ctx.fillRect(5, 7, 6, 3);
    ctx.fillStyle = hex(COLORS.gold);
    ctx.fillRect(7, 8, 2, 2);
    ctx.fillStyle = '#3a2a18';
    ctx.fillRect(4, 11, 8, 1);
  }

  // Head + hair
  ctx.fillStyle = '#f0c8a4';
  ctx.fillRect(5, 2, 6, 5);
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(6, 3, 1, 1);
  ctx.fillRect(9, 3, 1, 1);
  ctx.fillStyle = '#c9a227';
  ctx.fillRect(4, 1, 8, 2);

  // Amulet / necklace
  if (spec.amulet === 'gold_trinket') {
    ctx.fillStyle = hex(COLORS.gold);
    ctx.fillRect(7, 6, 2, 1);
    ctx.fillRect(7, 7, 2, 2);
  }
  if (spec.amulet === 'shiny_bauble') {
    ctx.fillStyle = hex(COLORS.pink);
    ctx.fillRect(7, 6, 2, 1);
    ctx.fillRect(6, 7, 4, 2);
    ctx.fillStyle = '#fff';
    ctx.fillRect(7, 7, 1, 1);
  }

  // Sword on hip
  if (spec.sword) {
    ctx.fillStyle = '#dfe6f0';
    ctx.fillRect(12, 8, 2, 5);
    ctx.fillStyle = '#c9a227';
    ctx.fillRect(11, 12, 4, 1);
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
  if (itemId === 'mild_sword') {
    ctx.fillStyle = '#dfe6f0';
    ctx.fillRect(11, 4, 2, 14);
    ctx.fillStyle = '#c9a227';
    ctx.fillRect(8, 14, 8, 2);
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(11, 16, 2, 4);
    return;
  }
  if (itemId === 'leather_armor') {
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(6, 7, 12, 12);
    ctx.fillStyle = '#a06830';
    ctx.fillRect(8, 9, 8, 4);
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
  if (itemId === 'gold_trinket') {
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
  // Fallback
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
    ctx.fillStyle = '#3a3150';
    ctx.fillRect(0, 0, TILE, TILE);
    ctx.fillStyle = '#7a6a9a';
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(2, 2 + i * 3, 12 - i * 2, 2);
    }
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

  // Default player + every gear combination for world avatar / paper doll
  canvasTex(scene, 'player', TILE, TILE, (ctx) => {
    drawPlayerLook(ctx, { armor: 'none', amulet: 'none', sword: false });
  });
  for (const armor of ARMOR_LOOKS) {
    for (const amulet of AMULET_LOOKS) {
      for (const sword of [false, true]) {
        const spec = { armor: armor as ArmorLook, amulet: amulet as AmuletLook, sword };
        canvasTex(scene, playerTextureKey(spec), TILE, TILE, (ctx) => {
          drawPlayerLook(ctx, spec);
        });
      }
    }
  }

  // Inventory item icons (24×24)
  const iconIds = [
    'empty',
    'potion',
    'mild_sword',
    'leather_armor',
    'reinforced_leather',
    'gold_trinket',
    'shiny_bauble',
    'tinker_oil',
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

  canvasTex(scene, 'particle', 4, 4, (ctx) => {
    ctx.fillStyle = hex(COLORS.gold);
    ctx.fillRect(0, 0, 4, 4);
  });
}
