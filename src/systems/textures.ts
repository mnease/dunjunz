import type Phaser from 'phaser';
import { ART_RES, COLORS } from '../config';
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
import {
  drawWeaponAvatar,
  drawWeaponIcon,
  drawWeaponSwing,
  swingTextureKey,
  weaponLookFromTemplateId,
} from './weapon-visuals';
import {
  block,
  dither,
  drawBrickTile,
  drawFloorTile,
  drawGrassTile,
  fill,
  hex,
  shadedBlock,
  spark,
  vgrad,
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

/** Left-arm shield — 32×32 avatar space. */
function drawShield(
  ctx: CanvasRenderingContext2D,
  look: ShieldLook,
): void {
  if (look === 'none') return;
  if (look === 'tower') {
    block(ctx, '#5a6578', '#2a3040', 1, 10, 8, 16);
    fill(ctx, '#3a4558', 2, 12, 6, 12);
    fill(ctx, '#ffc857', 3, 16, 4, 2);
    fill(ctx, '#8a98a8', 2, 11, 6, 1);
    spark(ctx, 4, 14, '#c0d0e0');
    return;
  }
  if (look === 'iron') {
    block(ctx, '#9aabc0', '#3a4050', 2, 12, 7, 12);
    fill(ctx, '#c0d0e0', 4, 15, 3, 4);
    fill(ctx, '#6a7888', 2, 12, 1, 12);
    spark(ctx, 5, 14);
    return;
  }
  // wood
  block(ctx, '#a07828', '#4a3010', 2, 13, 7, 11);
  fill(ctx, '#c9a227', 3, 15, 5, 2);
  fill(ctx, '#6b4423', 4, 18, 3, 4);
  fill(ctx, '#5a3d1a', 5, 19, 1, 2);
}

function drawAmulet(
  ctx: CanvasRenderingContext2D,
  look: AmuletLook,
): void {
  if (look === 'none') return;
  if (look === 'cube') {
    block(ctx, '#5ad45a', '#2a6a2a', 12, 12, 8, 6);
    fill(ctx, '#9ef09e', 13, 13, 4, 2);
    fill(ctx, '#2a8a2a', 12, 16, 8, 1);
    spark(ctx, 14, 14, '#e0ffe0');
    return;
  }
  if (look === 'bauble') {
    fill(ctx, '#c07090', 14, 12, 4, 1);
    block(ctx, '#ff6b9d', '#8a2040', 12, 13, 8, 5);
    spark(ctx, 14, 14);
    fill(ctx, '#ffb0c8', 15, 15, 2, 1);
    return;
  }
  // gold
  fill(ctx, '#c9a227', 14, 12, 4, 1);
  block(ctx, '#ffc857', '#8a6820', 13, 13, 6, 5);
  spark(ctx, 15, 14, '#fff3a0');
}

function drawRing(
  ctx: CanvasRenderingContext2D,
  look: RingLook,
): void {
  if (look === 'none') return;
  if (look === 'luck') {
    fill(ctx, '#7dffb3', 22, 20, 4, 2);
    fill(ctx, '#c9ffe0', 23, 18, 2, 6);
    spark(ctx, 24, 19);
    return;
  }
  if (look === 'silver') {
    block(ctx, '#d0d8e8', '#607080', 22, 20, 5, 4);
    spark(ctx, 23, 21);
    return;
  }
  block(ctx, '#c07040', '#603010', 22, 20, 5, 4);
  fill(ctx, '#e09060', 23, 21, 2, 1);
}

function drawShoes(
  ctx: CanvasRenderingContext2D,
  look: ShoesLook,
): void {
  if (look === 'apology') {
    block(ctx, '#5ad4a0', '#2a6a50', 8, 26, 6, 5);
    block(ctx, '#5ad4a0', '#2a6a50', 18, 26, 6, 5);
    fill(ctx, '#9ef0c8', 8, 26, 6, 1);
    fill(ctx, '#9ef0c8', 18, 26, 6, 1);
    return;
  }
  if (look === 'leather') {
    block(ctx, '#6b4423', '#2a1810', 8, 26, 6, 5);
    block(ctx, '#6b4423', '#2a1810', 18, 26, 6, 5);
    fill(ctx, '#3d2b1f', 8, 29, 6, 2);
    fill(ctx, '#3d2b1f', 18, 29, 6, 2);
    return;
  }
  // bare boots
  block(ctx, '#3d2b1f', '#1a1008', 9, 27, 5, 4);
  block(ctx, '#3d2b1f', '#1a1008', 18, 27, 5, 4);
}

/**
 * 32×32 SNES-density hero. Layer order:
 * greaves → shoes → torso → gloves → head/helm → amulet → ring → shield → weapon → key.
 */
export function drawPlayerLook(
  ctx: CanvasRenderingContext2D,
  spec: AppearanceSpec,
): void {
  // —— Legs ——
  if (spec.greaves === 'plate') {
    shadedBlock(ctx, '#8a98a8', '#c0c8d0', '#4a5060', 10, 22, 5, 6);
    shadedBlock(ctx, '#8a98a8', '#c0c8d0', '#4a5060', 17, 22, 5, 6);
  } else if (spec.greaves === 'leather') {
    shadedBlock(ctx, '#8b5a2b', '#a06830', '#5a3d1a', 10, 22, 5, 6);
    shadedBlock(ctx, '#8b5a2b', '#a06830', '#5a3d1a', 17, 22, 5, 6);
  } else {
    shadedBlock(ctx, '#2d6cdf', '#4a8cff', '#1a3a8a', 10, 23, 5, 5);
    shadedBlock(ctx, '#2d6cdf', '#4a8cff', '#1a3a8a', 17, 23, 5, 5);
  }

  drawShoes(ctx, spec.shoes);

  // —— Torso (class clothing + armor) ——
  if (spec.breastplate === 'leather') {
    shadedBlock(ctx, '#8b5a2b', '#a06830', '#5a3d1a', 8, 12, 16, 12);
    fill(ctx, '#a06830', 10, 14, 12, 3);
    fill(ctx, '#5a3d1a', 8, 20, 16, 1);
    fill(ctx, '#3d2b1f', 10, 15, 2, 6);
    fill(ctx, '#3d2b1f', 20, 15, 2, 6);
    dither(ctx, '#8b5a2b', '#7a4a20', 11, 18, 10, 2);
  } else if (spec.breastplate === 'reinforced') {
    shadedBlock(ctx, '#5c4030', '#8a7a60', '#3a2a18', 8, 12, 16, 12);
    fill(ctx, '#8a7a60', 10, 14, 12, 5);
    fill(ctx, '#ffc857', 14, 16, 4, 4);
    fill(ctx, '#fff3a0', 15, 17, 2, 1);
    block(ctx, '#c0b090', '#6a6040', 7, 12, 4, 6);
    block(ctx, '#c0b090', '#6a6040', 21, 12, 4, 6);
  } else if (spec.breastplate === 'cloth_arcane') {
    // Wizard cloak — purple stars
    shadedBlock(ctx, '#4a2a7a', '#7a5ab0', '#2a1848', 7, 11, 18, 14);
    fill(ctx, '#6a4a9a', 9, 13, 14, 4);
    spark(ctx, 12, 16, '#ffc857');
    spark(ctx, 18, 19, '#7dffb3');
    spark(ctx, 14, 21, '#ffc857');
    fill(ctx, '#2a1848', 12, 12, 8, 2);
  } else if (spec.breastplate === 'cloak_ranger') {
    shadedBlock(ctx, '#3a5a38', '#5a8a50', '#1a3018', 7, 11, 18, 14);
    fill(ctx, '#2a4a28', 8, 12, 16, 3);
    fill(ctx, '#8b5a2b', 14, 18, 4, 4);
    fill(ctx, '#c9a227', 15, 19, 2, 1);
  } else if (spec.breastplate === 'plate') {
    shadedBlock(ctx, '#8a98a8', '#c0d0e0', '#3a4050', 8, 12, 16, 12);
    fill(ctx, '#a8b8c8', 10, 14, 12, 5);
    block(ctx, '#c0d0e0', '#5a6878', 6, 12, 5, 7);
    block(ctx, '#c0d0e0', '#5a6878', 21, 12, 5, 7);
    spark(ctx, 15, 16);
  } else if (spec.breastplate === 'holy') {
    shadedBlock(ctx, '#e8e0d0', '#ffffff', '#8a8070', 8, 12, 16, 12);
    fill(ctx, '#ffc857', 13, 15, 6, 6);
    fill(ctx, '#fff3a0', 15, 17, 2, 2);
  } else if (spec.breastplate === 'hide') {
    shadedBlock(ctx, '#6a4a30', '#8a6a48', '#3a2818', 8, 12, 16, 12);
    dither(ctx, '#6a4a30', '#5a3a28', 10, 14, 12, 6);
    fill(ctx, '#c0392b', 14, 16, 4, 3);
  } else {
    shadedBlock(ctx, '#2d6cdf', '#5a9aff', '#1a4aaf', 8, 12, 16, 12);
    fill(ctx, '#4a8cef', 10, 14, 12, 3);
    fill(ctx, '#1a4aaf', 14, 18, 4, 5);
    fill(ctx, '#1a3a8a', 12, 12, 8, 2);
    spark(ctx, 11, 15, '#a0c8ff');
  }

  // —— Arms / gloves ——
  if (spec.gloves === 'sheath') {
    shadedBlock(ctx, '#5a3d1a', '#8b5a2b', '#2a1810', 4, 14, 5, 8);
    shadedBlock(ctx, '#5a3d1a', '#8b5a2b', '#2a1810', 23, 14, 5, 8);
    fill(ctx, '#c8b090', 25, 12, 2, 6); // arrow nocks
    fill(ctx, '#7dffb3', 25, 11, 2, 2);
  } else if (spec.gloves === 'leather') {
    shadedBlock(ctx, '#8b5a2b', '#a06830', '#5a3d1a', 5, 15, 4, 7);
    shadedBlock(ctx, '#8b5a2b', '#a06830', '#5a3d1a', 23, 15, 4, 7);
  } else {
    shadedBlock(ctx, '#f0c8a4', '#ffe0c0', '#c09070', 5, 16, 3, 5);
    shadedBlock(ctx, '#f0c8a4', '#ffe0c0', '#c09070', 24, 16, 3, 5);
  }

  // —— Head ——
  shadedBlock(ctx, '#f0c8a4', '#ffe0c8', '#c09070', 10, 4, 12, 9);
  fill(ctx, '#1a1a2e', 12, 7, 2, 2);
  fill(ctx, '#1a1a2e', 18, 7, 2, 2);
  spark(ctx, 13, 7, '#ffffff');
  spark(ctx, 19, 7, '#ffffff');
  fill(ctx, '#c9a227', 12, 6, 2, 1);
  fill(ctx, '#c9a227', 18, 6, 2, 1);
  fill(ctx, '#d09080', 14, 10, 4, 1);

  if (spec.helmet === 'plate') {
    shadedBlock(ctx, '#8a98a8', '#c0d0e0', '#3a4050', 8, 1, 16, 8);
    fill(ctx, '#1a1a2e', 12, 6, 3, 2);
    fill(ctx, '#1a1a2e', 17, 6, 3, 2);
    spark(ctx, 14, 3);
  } else if (spec.helmet === 'cloth_arcane') {
    // Pointed mage hat
    fill(ctx, '#4a2a7a', 10, 0, 12, 6);
    fill(ctx, '#7a5ab0', 14, 0, 4, 8);
    fill(ctx, '#2a1848', 15, 0, 2, 3);
    spark(ctx, 16, 1, '#ffc857');
  } else if (spec.helmet === 'leather') {
    shadedBlock(ctx, '#8b5a2b', '#a06830', '#5a3d1a', 8, 2, 16, 6);
    fill(ctx, '#8b5a2b', 7, 6, 3, 4);
    fill(ctx, '#8b5a2b', 22, 6, 3, 4);
  } else {
    shadedBlock(ctx, '#c9a227', '#e8c050', '#8a7010', 8, 2, 16, 4);
    fill(ctx, '#e8c050', 10, 2, 12, 2);
    fill(ctx, '#c9a227', 8, 5, 3, 3);
    fill(ctx, '#c9a227', 21, 5, 3, 3);
  }

  drawAmulet(ctx, spec.amulet);
  drawRing(ctx, spec.ring);
  drawShield(ctx, spec.shield);
  drawWeapon(ctx, spec.weapon);

  if (spec.key === 'key') {
    block(ctx, '#ffc857', '#8a6820', 6, 21, 4, 6);
    fill(ctx, '#fff3a0', 6, 21, 2, 2);
    fill(ctx, '#ffc857', 5, 21, 2, 3);
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
    canvasTex(scene, key, ART_RES, ART_RES, (ctx) => {
      drawPlayerLook(ctx, spec);
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
    block(ctx, '#8b5a2b', '#3d2b1f', 6, 6, 20, 12);
    fill(ctx, '#a06830', 8, 8, 16, 4);
    fill(ctx, '#5a3d1a', 6, 14, 6, 8);
    fill(ctx, '#5a3d1a', 20, 14, 6, 8);
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
      block(ctx, '#4a2a7a', '#2a1848', 6, 6, 20, 22);
      fill(ctx, '#7a5ab0', 9, 10, 14, 6);
      spark(ctx, 12, 14, '#ffc857');
      spark(ctx, 18, 18, '#7dffb3');
      return;
    }
    if (itemId === 'ranger_cloak') {
      block(ctx, '#3a5a38', '#1a3018', 6, 6, 20, 22);
      fill(ctx, '#5a8a50', 9, 10, 14, 5);
      fill(ctx, '#8b5a2b', 14, 18, 4, 4);
      return;
    }
    if (itemId === 'fighter_plate') {
      block(ctx, '#8a98a8', '#3a4050', 6, 6, 20, 22);
      fill(ctx, '#c0d0e0', 9, 10, 14, 8);
      spark(ctx, 15, 14);
      return;
    }
    if (itemId === 'cleric_vestments') {
      block(ctx, '#e8e0d0', '#8a8070', 6, 6, 20, 22);
      fill(ctx, '#ffc857', 12, 12, 8, 8);
      return;
    }
    if (itemId === 'barbarian_hide') {
      block(ctx, '#6a4a30', '#3a2818', 6, 6, 20, 22);
      fill(ctx, '#c0392b', 13, 14, 6, 5);
      return;
    }
    const base = itemId === 'reinforced_leather' ? '#5c4030' : '#8b5a2b';
    const hi = itemId === 'reinforced_leather' ? '#8a7a60' : '#a06830';
    block(ctx, base, '#2a1810', 6, 6, 20, 20);
    fill(ctx, hi, 9, 10, 14, 8);
    if (itemId === 'reinforced_leather') {
      fill(ctx, '#ffc857', 13, 13, 6, 6);
      spark(ctx, 15, 14);
    } else if (itemId === 'studded_leather') {
      fill(ctx, '#c0c0c0', 10, 12, 2, 2);
      fill(ctx, '#c0c0c0', 16, 14, 2, 2);
      fill(ctx, '#c0c0c0', 20, 12, 2, 2);
    } else {
      fill(ctx, '#5a3d1a', 10, 12, 3, 10);
      fill(ctx, '#5a3d1a', 19, 12, 3, 10);
    }
    return;
  }
  if (itemId === 'mage_hat') {
    fill(ctx, '#4a2a7a', 8, 4, 16, 10);
    fill(ctx, '#7a5ab0', 14, 2, 4, 14);
    spark(ctx, 16, 3, '#ffc857');
    return;
  }
  if (itemId === 'plate_helm') {
    block(ctx, '#8a98a8', '#3a4050', 6, 6, 20, 18);
    fill(ctx, '#1a1a2e', 10, 14, 4, 3);
    fill(ctx, '#1a1a2e', 18, 14, 4, 3);
    spark(ctx, 15, 10);
    return;
  }
  if (itemId === 'plate_greaves') {
    block(ctx, '#8a98a8', '#3a4050', 6, 8, 8, 18);
    block(ctx, '#8a98a8', '#3a4050', 18, 8, 8, 18);
    return;
  }
  if (itemId === 'ranger_sheath') {
    block(ctx, '#5a3d1a', '#2a1810', 6, 10, 10, 14);
    block(ctx, '#5a3d1a', '#2a1810', 16, 10, 10, 14);
    fill(ctx, '#c8b090', 18, 6, 3, 10);
    fill(ctx, '#7dffb3', 18, 4, 3, 3);
    return;
  }
  if (itemId === 'leather_greaves') {
    block(ctx, '#8b5a2b', '#3d2b1f', 7, 8, 7, 18);
    block(ctx, '#8b5a2b', '#3d2b1f', 18, 8, 7, 18);
    fill(ctx, '#a06830', 8, 10, 5, 4);
    fill(ctx, '#a06830', 19, 10, 5, 4);
    return;
  }
  if (itemId === 'leather_shoes' || itemId === 'sorry_boots') {
    const c = itemId === 'sorry_boots' ? '#5ad4a0' : '#8b5a2b';
    const e = itemId === 'sorry_boots' ? '#2a6a50' : '#3d2b1f';
    block(ctx, c, e, 5, 14, 10, 12);
    block(ctx, c, e, 17, 14, 10, 12);
    fill(ctx, itemId === 'sorry_boots' ? '#9ef0c8' : '#a06830', 5, 14, 10, 3);
    fill(ctx, itemId === 'sorry_boots' ? '#9ef0c8' : '#a06830', 17, 14, 10, 3);
    if (itemId === 'sorry_boots') {
      fill(ctx, '#ff6b9d', 8, 20, 4, 2);
      fill(ctx, '#ff6b9d', 20, 20, 4, 2);
    }
    return;
  }
  if (itemId === 'leather_gloves') {
    block(ctx, '#8b5a2b', '#3d2b1f', 6, 10, 8, 14);
    block(ctx, '#8b5a2b', '#3d2b1f', 18, 10, 8, 14);
    fill(ctx, '#a06830', 7, 12, 6, 4);
    fill(ctx, '#a06830', 19, 12, 6, 4);
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
    const c =
      itemId === 'tower_shield'
        ? '#6a7080'
        : itemId === 'iron_shield'
          ? '#a0b0c0'
          : '#8b5a2b';
    const e =
      itemId === 'tower_shield'
        ? '#2a3040'
        : itemId === 'iron_shield'
          ? '#405060'
          : '#3d2b1f';
    if (itemId === 'tower_shield') {
      block(ctx, c, e, 8, 4, 16, 24);
      fill(ctx, '#ffc857', 12, 12, 8, 3);
    } else {
      // kite
      fill(ctx, e, 10, 4, 12, 4);
      block(ctx, c, e, 8, 6, 16, 20);
      fill(ctx, '#ffc857', 14, 12, 4, 8);
    }
    spark(ctx, 14, 10);
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
  // —— Map tiles @ ART_RES (16-bit density) ——
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
    vgrad(ctx, ['#7a6554', hex(COLORS.dirt), '#5a4538'], 0, 0, ART_RES, ART_RES);
    dither(ctx, hex(COLORS.dirt), '#5a4538', 2, 2, ART_RES - 4, ART_RES - 4, 1);
    fill(ctx, '#8a7564', 6, 8, 3, 1);
    fill(ctx, '#4a3830', 18, 20, 4, 2);
    fill(ctx, '#9a8574', 12, 4, 2, 1);
    fill(ctx, '#3a2820', 22, 12, 3, 1);
  });

  canvasTex(scene, 'tile-water', ART_RES, ART_RES, (ctx) => {
    vgrad(ctx, ['#3d7eb0', hex(COLORS.water), '#1a4068'], 0, 0, ART_RES, ART_RES);
    fill(ctx, 'rgba(180,220,255,0.45)', 4, 6, 10, 2);
    fill(ctx, 'rgba(200,230,255,0.35)', 14, 16, 12, 2);
    fill(ctx, 'rgba(255,255,255,0.25)', 8, 8, 4, 1);
    fill(ctx, '#2a5f8f', 2, 22, 8, 1);
    fill(ctx, '#2a5f8f', 18, 10, 6, 1);
  });

  canvasTex(scene, 'tile-water-b', ART_RES, ART_RES, (ctx) => {
    vgrad(ctx, ['#4a8ec0', hex(COLORS.water), '#1a4068'], 0, 0, ART_RES, ART_RES);
    fill(ctx, 'rgba(200,230,255,0.5)', 8, 10, 12, 2);
    fill(ctx, 'rgba(180,220,255,0.35)', 2, 20, 10, 2);
    fill(ctx, 'rgba(255,255,255,0.3)', 16, 6, 5, 1);
    fill(ctx, '#2a5f8f', 10, 4, 7, 1);
  });

  canvasTex(scene, 'tile-lava', ART_RES, ART_RES, (ctx) => {
    vgrad(ctx, ['#ff8a4c', hex(COLORS.lava), '#8a2010'], 0, 0, ART_RES, ART_RES);
    fill(ctx, '#ffcc66', 6, 8, 6, 4);
    fill(ctx, '#ffe08a', 8, 10, 2, 2);
    fill(ctx, '#ff8a4c', 18, 18, 8, 4);
    fill(ctx, '#ffaa55', 4, 22, 5, 3);
    spark(ctx, 10, 11, '#fff8c0');
  });

  canvasTex(scene, 'tile-lava-b', ART_RES, ART_RES, (ctx) => {
    vgrad(ctx, ['#ffaa55', '#d4542b', '#6a1808'], 0, 0, ART_RES, ART_RES);
    fill(ctx, '#ffe08a', 12, 6, 7, 4);
    fill(ctx, '#ffcc66', 5, 16, 6, 3);
    fill(ctx, '#ff8a4c', 20, 12, 5, 5);
    spark(ctx, 14, 8, '#ffffff');
  });

  canvasTex(scene, 'tile-door', ART_RES, ART_RES, (ctx) => {
    fill(ctx, hex(COLORS.floor), 0, 0, ART_RES, ART_RES);
    // stone arch
    shadedBlock(ctx, '#6a5a40', '#8a7a58', '#3a3018', 0, 0, ART_RES, 4);
    shadedBlock(ctx, '#6a5a40', '#8a7a58', '#3a3018', 0, 0, 4, ART_RES);
    shadedBlock(ctx, '#6a5a40', '#8a7a58', '#3a3018', ART_RES - 4, 0, 4, ART_RES);
    // leaves
    shadedBlock(ctx, '#8b6914', '#c9a227', '#5a4010', 5, 4, 10, 26);
    shadedBlock(ctx, '#8b6914', '#c9a227', '#5a4010', 17, 4, 10, 26);
    // panels
    fill(ctx, '#a07828', 7, 7, 6, 6);
    fill(ctx, '#a07828', 19, 7, 6, 6);
    fill(ctx, '#5a4010', 7, 16, 6, 8);
    fill(ctx, '#5a4010', 19, 16, 6, 8);
    // handles
    block(ctx, '#ffc857', '#8a6820', 13, 15, 2, 4);
    block(ctx, '#ffc857', '#8a6820', 17, 15, 2, 4);
    spark(ctx, 13, 16, '#fff3a0');
  });

  canvasTex(scene, 'tile-locked', ART_RES, ART_RES, (ctx) => {
    fill(ctx, hex(COLORS.floor), 0, 0, ART_RES, ART_RES);
    shadedBlock(ctx, '#4a3820', '#6a5030', '#2a1c10', 0, 0, ART_RES, 4);
    shadedBlock(ctx, '#4a3820', '#6a5030', '#2a1c10', 0, 0, 4, ART_RES);
    shadedBlock(ctx, '#4a3820', '#6a5030', '#2a1c10', ART_RES - 4, 0, 4, ART_RES);
    shadedBlock(ctx, '#5a3d1a', '#7a5a28', '#3a2810', 5, 4, 22, 26);
    // lock plate
    block(ctx, '#9a9aa8', '#404050', 11, 10, 10, 12);
    fill(ctx, '#ffc857', 14, 14, 4, 4);
    fill(ctx, '#fff3a0', 15, 15, 2, 1);
    fill(ctx, '#606070', 14, 19, 4, 2);
  });

  canvasTex(scene, 'tile-stairs', ART_RES, ART_RES, (ctx) => {
    fill(ctx, '#2a2038', 0, 0, ART_RES, ART_RES);
    for (let i = 0; i < 6; i++) {
      const y = 2 + i * 5;
      const inset = Math.floor(i * 0.6);
      shadedBlock(
        ctx,
        '#6a5a8a',
        '#9a8aba',
        '#3a3050',
        2 + inset,
        y,
        ART_RES - 4 - inset * 2,
        3,
      );
    }
    fill(ctx, '#ff6b9d', 12, 2, 8, 3);
    fill(ctx, '#ffb0c8', 14, 3, 4, 1);
  });

  canvasTex(scene, 'tile-stairs-up', ART_RES, ART_RES, (ctx) => {
    fill(ctx, '#3a4060', 0, 0, ART_RES, ART_RES);
    for (let i = 0; i < 6; i++) {
      const y = 27 - i * 5;
      const inset = Math.max(0, 4 - i);
      shadedBlock(
        ctx,
        '#9ab0d0',
        '#c0d8f0',
        '#506080',
        2 + inset,
        y,
        ART_RES - 4 - inset * 2,
        3,
      );
    }
    fill(ctx, '#7dffb3', 12, 2, 8, 3);
    fill(ctx, '#c9ffe0', 14, 3, 4, 1);
  });

  canvasTex(scene, 'tile-pad', ART_RES, ART_RES, (ctx) => {
    fill(ctx, '#1a2a40', 0, 0, ART_RES, ART_RES);
    shadedBlock(ctx, '#2a4060', '#4ecdc4', '#0a1828', 4, 4, 24, 24);
    fill(ctx, '#4ecdc4', 8, 8, 16, 2);
    fill(ctx, '#4ecdc4', 8, 22, 16, 2);
    fill(ctx, '#4ecdc4', 8, 8, 2, 16);
    fill(ctx, '#4ecdc4', 22, 8, 2, 16);
    block(ctx, '#7dffb3', '#2a8a5a', 14, 14, 4, 4);
    spark(ctx, 15, 15);
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
    fill(ctx, 'rgba(0,0,0,0.2)', 6, 26, 20, 4);
    block(ctx, '#5ad45a', '#2a6a2a', 6, 10, 20, 18);
    fill(ctx, '#7dffb3', 8, 12, 16, 8);
    fill(ctx, '#fff', 10, 14, 4, 4);
    fill(ctx, '#fff', 18, 14, 4, 4);
    fill(ctx, '#111', 12, 16, 2, 2);
    fill(ctx, '#111', 20, 16, 2, 2);
    spark(ctx, 14, 13, '#c9ffe0');
  });

  canvasTex(scene, 'slime-b', ART_RES, ART_RES, (ctx) => {
    fill(ctx, 'rgba(0,0,0,0.2)', 4, 26, 24, 4);
    block(ctx, '#5ad45a', '#2a6a2a', 4, 12, 24, 16);
    fill(ctx, '#7dffb3', 7, 14, 18, 6);
    fill(ctx, '#fff', 9, 15, 4, 4);
    fill(ctx, '#fff', 19, 14, 4, 4);
    fill(ctx, '#111', 11, 17, 2, 2);
    fill(ctx, '#111', 21, 16, 2, 2);
  });

  canvasTex(scene, 'skeleton', ART_RES, ART_RES, (ctx) => {
    block(ctx, '#e8e0d0', '#8a8070', 10, 2, 12, 10);
    fill(ctx, '#c8c0b0', 12, 4, 8, 2);
    fill(ctx, '#111', 12, 7, 3, 3);
    fill(ctx, '#111', 18, 7, 3, 3);
    fill(ctx, '#111', 14, 11, 4, 1);
    fill(ctx, '#e8e0d0', 12, 14, 8, 10);
    fill(ctx, '#c8c0b0', 13, 16, 6, 1);
    fill(ctx, '#c8c0b0', 13, 19, 6, 1);
    fill(ctx, '#c8c0b0', 13, 22, 6, 1);
    fill(ctx, '#e8e0d0', 6, 15, 5, 3);
    fill(ctx, '#e8e0d0', 21, 15, 5, 3);
    fill(ctx, '#e8e0d0', 11, 24, 4, 6);
    fill(ctx, '#e8e0d0', 17, 24, 4, 6);
  });

  canvasTex(scene, 'redshirt', ART_RES, ART_RES, (ctx) => {
    shadedBlock(ctx, '#c0392b', '#e05050', '#7a1818', 8, 12, 16, 12);
    shadedBlock(ctx, '#f0c8a4', '#ffe0c8', '#c09070', 10, 4, 12, 9);
    fill(ctx, '#111', 12, 7, 2, 2);
    fill(ctx, '#111', 18, 7, 2, 2);
    fill(ctx, '#1a1a22', 10, 24, 5, 6);
    fill(ctx, '#1a1a22', 17, 24, 5, 6);
    fill(ctx, '#888', 6, 14, 3, 8);
    fill(ctx, '#3a3a48', 22, 16, 6, 4);
    fill(ctx, '#ff2030', 26, 17, 3, 2);
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
    fill(ctx, '#d4c4a0', 4, 6, 24, 20);
    fill(ctx, '#8b6914', 4, 4, 24, 4);
    fill(ctx, '#8b6914', 4, 24, 24, 4);
    fill(ctx, '#5a8a5a', 8, 10, 8, 6);
    fill(ctx, '#4a6a9a', 16, 14, 8, 6);
    fill(ctx, '#c0392b', 14, 12, 3, 3);
  });

  // Graphic mapz UI tiles (48×48 room cells)
  const cell = 48;
  const drawMapzCell = (
    ctx: CanvasRenderingContext2D,
    fillCol: string,
    border: string,
    mode: 'visited' | 'unknown' | 'current',
  ) => {
    ctx.fillStyle = '#0a0c10';
    ctx.fillRect(0, 0, cell, cell);
    ctx.fillStyle = fillCol;
    ctx.fillRect(4, 4, cell - 8, cell - 8);
    ctx.strokeStyle = border;
    ctx.lineWidth = 2;
    ctx.strokeRect(4.5, 4.5, cell - 9, cell - 9);
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

  const drawBudBase = (
    ctx: CanvasRenderingContext2D,
    opts: {
      stretchX?: number;
      armReach?: number;
      claw?: boolean;
      puffed?: boolean;
      coil?: boolean;
      soft?: boolean;
      squint?: boolean;
    } = {},
  ): void => {
    const sx = (opts.stretchX ?? 0) * 2;
    // body
    shadedBlock(ctx, '#d0d0d8', '#e8e8f0', '#909098', 8 - Math.min(2, sx), 12, 16 + sx, 14);
    fill(ctx, '#c0c0c8', 10, 24, 12 + Math.floor(sx / 2), 2);
    // ears
    fill(ctx, '#d0d0d8', 6, 6, 6, 8);
    fill(ctx, '#d0d0d8', 20 + Math.min(4, sx), 6, 6, 8);
    fill(ctx, '#b0b0b8', 5, 4, 4, 4);
    fill(ctx, '#b0b0b8', 23 + Math.min(4, sx), 4, 4, 4);
    // face
    if (opts.squint) {
      fill(ctx, '#222', 12, 16, 4, 2);
      fill(ctx, '#222', 18, 16, 4, 2);
    } else {
      fill(ctx, '#222', 12, 15, 3, 3);
      fill(ctx, '#222', 18, 15, 3, 3);
      spark(ctx, 13, 15);
      spark(ctx, 19, 15);
    }
    fill(ctx, opts.soft ? '#ffb0c8' : '#ff6b9d', 14, 20, 4, 2);
    fill(ctx, 'rgba(255,107,157,0.45)', 10, 18, 3, 2);
    fill(ctx, 'rgba(255,107,157,0.45)', 20, 18, 3, 2);
    const reach = (opts.armReach ?? 0) * 2;
    if (reach > 0) {
      fill(ctx, '#c8c8d0', 24, 16, reach, 4);
      fill(ctx, '#c8c8d0', 24 + reach - 2, 14, 4, 8);
      if (opts.claw) {
        fill(ctx, '#222', 24 + reach, 12, 2, 4);
        fill(ctx, '#222', 26 + reach, 14, 2, 2);
        fill(ctx, '#222', 24 + reach, 20, 2, 4);
      }
    }
    if (opts.puffed) {
      fill(ctx, '#e8d0b0', 8, 18, 4, 4);
      fill(ctx, '#e8d0b0', 20, 18, 4, 4);
      fill(ctx, '#ff8844', 28, 16, 4, 4);
    }
    if (opts.coil) {
      fill(ctx, '#b0b0b8', 4, 14, 24, 10);
      fill(ctx, '#888890', 6, 16, 20, 2);
      fill(ctx, '#888890', 8, 20, 16, 2);
    }
    if (opts.soft) {
      fill(ctx, 'rgba(232,240,255,0.55)', 4, 10, 24, 16);
    }
    // feet
    fill(ctx, '#a0a0a8', 10, 26, 5, 4);
    fill(ctx, '#a0a0a8', 18, 26, 5, 4);
  };

  canvasTex(scene, 'best_bud', ART_RES, ART_RES, (ctx) => {
    drawBudBase(ctx);
  });
  // Stretch lash pose — elongated body + reaching arm
  canvasTex(scene, 'best_bud_stretch', ART_RES, ART_RES, (ctx) => {
    drawBudBase(ctx, { stretchX: 2, armReach: 3, claw: false });
  });
  // Grab loot — both arms forward
  canvasTex(scene, 'best_bud_grab', ART_RES, ART_RES, (ctx) => {
    drawBudBase(ctx, { stretchX: 1, armReach: 4, claw: true });
  });
  // Melee strike / claw
  canvasTex(scene, 'best_bud_strike', ART_RES, ART_RES, (ctx) => {
    drawBudBase(ctx, { armReach: 3, claw: true });
  });
  // Spit / roast
  canvasTex(scene, 'best_bud_spit', ART_RES, ART_RES, (ctx) => {
    drawBudBase(ctx, { puffed: true });
  });
  // Blink hop
  canvasTex(scene, 'best_bud_blink', ART_RES, ART_RES, (ctx) => {
    drawBudBase(ctx, { squint: true, stretchX: 0 });
    // afterimage streaks
    ctx.fillStyle = 'rgba(125,92,255,0.5)';
    ctx.fillRect(0, 7, 3, 3);
    ctx.fillRect(1, 6, 2, 1);
  });
  // Guard coil
  canvasTex(scene, 'best_bud_guard', ART_RES, ART_RES, (ctx) => {
    drawBudBase(ctx, { coil: true });
  });
  // Heal aura
  canvasTex(scene, 'best_bud_heal', ART_RES, ART_RES, (ctx) => {
    drawBudBase(ctx, { soft: true });
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
