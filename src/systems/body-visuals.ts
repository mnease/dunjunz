/**
 * Race × gender body silhouettes for the 32×32 hero.
 * Binary gender only (male | female). Gear layers draw on top.
 */

import type { RaceId } from './races';
import type { GenderId } from '../types';
import {
  cartoonFace,
  fill,
  hairMass,
  shadedBlock,
  spark,
} from './pixel-art';
import type { PlayerWalkFrame } from './appearance';

export interface BodyLook {
  gender: GenderId;
  race: RaceId;
}

export const DEFAULT_BODY: BodyLook = { gender: 'male', race: 'human' };

/** Skin / scale / metal palettes per race. */
export function bodyPalette(race: RaceId): {
  skin: string;
  skinHi: string;
  skinSh: string;
  hair: string;
  hairHi: string;
  accent: string;
} {
  switch (race) {
    case 'elf':
      return {
        skin: '#f0d8c0',
        skinHi: '#fff0e0',
        skinSh: '#c0a088',
        hair: '#d0d8e8',
        hairHi: '#f0f4ff',
        accent: '#7dffb3',
      };
    case 'dwarf':
      return {
        skin: '#e0b090',
        skinHi: '#f0c8a8',
        skinSh: '#a07050',
        hair: '#6a3020',
        hairHi: '#8a5040',
        accent: '#c9a227',
      };
    case 'halfling':
      return {
        skin: '#f0c8a0',
        skinHi: '#ffe0c0',
        skinSh: '#c09070',
        hair: '#8a5030',
        hairHi: '#b07040',
        accent: '#7dffb3',
      };
    case 'gnome':
      return {
        skin: '#f0d0a8',
        skinHi: '#ffe8c8',
        skinSh: '#c09870',
        hair: '#c040a0',
        hairHi: '#e070c0',
        accent: '#ffc857',
      };
    case 'half_orc':
      return {
        skin: '#6a9060',
        skinHi: '#8ab080',
        skinSh: '#3a5030',
        hair: '#1a1a10',
        hairHi: '#3a3a28',
        accent: '#5ad45a',
      };
    case 'half_elf':
      return {
        skin: '#eec4a0',
        skinHi: '#ffdcc0',
        skinSh: '#b88868',
        hair: '#5a4030',
        hairHi: '#8a6850',
        accent: '#c9a0ff',
      };
    case 'dragonborn':
      return {
        skin: '#4a8a50',
        skinHi: '#6aba70',
        skinSh: '#2a5030',
        hair: '#2a4030',
        hairHi: '#4a6050',
        accent: '#ffc857',
      };
    case 'tiefling':
      return {
        skin: '#c06050',
        skinHi: '#e08070',
        skinSh: '#803030',
        hair: '#1a0a18',
        hairHi: '#4a2040',
        accent: '#ff5030',
      };
    case 'construct':
      return {
        skin: '#8a98a8',
        skinHi: '#c0d0e0',
        skinSh: '#4a5060',
        hair: '#5a6578',
        hairHi: '#9aabc0',
        accent: '#7dffb3',
      };
    case 'human':
    default:
      return {
        skin: '#e8c4a0',
        skinHi: '#ffe0c8',
        skinSh: '#c09070',
        hair: '#3d2b1f',
        hairHi: '#6b4423',
        accent: '#2d6cdf',
      };
  }
}

/**
 * Draw race×gender body under gear (legs/torso/arms/head base).
 * Helmet layer may overwrite head; bare heads keep race features.
 */
export function drawBodyBase(
  ctx: CanvasRenderingContext2D,
  body: BodyLook,
  walk: PlayerWalkFrame = 0,
  opts?: { bareHead: boolean },
): void {
  const bareHead = opts?.bareHead !== false;
  const p = bodyPalette(body.race);
  const female = body.gender === 'female';
  const race = body.race;

  // Short races: compress vertical mass slightly by drawing higher feet
  const short =
    race === 'dwarf' || race === 'halfling' || race === 'gnome';
  const footY = short ? 26 : 25;
  const legH = short ? 5 : 6;
  const torsoY = short ? 12 : 11;
  const torsoH = short ? 10 : 11;

  // Foot plant for walk
  const leftOff = walk === 1 ? -1 : walk === 2 ? 1 : 0;
  const rightOff = walk === 2 ? -1 : walk === 1 ? 1 : 0;

  // Shadow
  fill(ctx, 'rgba(0,0,0,0.2)', 8, 29, 16, 2);

  // Legs
  const legW = female ? 4 : 5;
  const leftLegX = female ? 11 : 10;
  const rightLegX = female ? 17 : 17;
  shadedBlock(
    ctx,
    '#2a3a5a',
    '#3a5080',
    '#1a2840',
    leftLegX + leftOff,
    footY - legH + 1,
    legW,
    legH,
  );
  shadedBlock(
    ctx,
    '#2a3a5a',
    '#3a5080',
    '#1a2840',
    rightLegX + rightOff,
    footY - legH + 1,
    legW,
    legH,
  );
  // Boots
  shadedBlock(
    ctx,
    '#3d2b1f',
    '#5a4030',
    '#1a1008',
    leftLegX - 1 + leftOff,
    footY,
    legW + 1,
    3,
  );
  shadedBlock(
    ctx,
    '#3d2b1f',
    '#5a4030',
    '#1a1008',
    rightLegX - 1 + rightOff,
    footY,
    legW + 1,
    3,
  );
  // Halfling big feet
  if (race === 'halfling') {
    fill(ctx, '#3d2b1f', leftLegX - 2 + leftOff, footY + 1, legW + 3, 2);
    fill(ctx, '#3d2b1f', rightLegX - 2 + rightOff, footY + 1, legW + 3, 2);
  }

  // Torso width by gender + race
  let torsoW = female ? 14 : 16;
  let torsoX = female ? 9 : 8;
  if (race === 'dwarf') {
    torsoW = female ? 15 : 17;
    torsoX = female ? 8 : 7;
  }
  if (race === 'elf') {
    torsoW = female ? 13 : 14;
    torsoX = female ? 9 : 9;
  }
  if (race === 'gnome' || race === 'halfling') {
    torsoW = female ? 12 : 13;
    torsoX = female ? 10 : 9;
  }

  // Default tunic (overwritten by breastplate gear when present)
  const tunic =
    race === 'construct'
      ? { mid: '#6a7888', hi: '#9aabc0', sh: '#3a4558' }
      : race === 'dragonborn'
        ? { mid: p.skin, hi: p.skinHi, sh: p.skinSh }
        : { mid: '#2d6cdf', hi: '#5a9aff', sh: '#1a4aaf' };
  shadedBlock(ctx, tunic.mid, tunic.hi, tunic.sh, torsoX, torsoY, torsoW, torsoH);
  if (race !== 'dragonborn' && race !== 'construct') {
    fill(ctx, '#4a8cef', torsoX + 2, torsoY + 2, torsoW - 4, 3);
    fill(ctx, '#c9a227', torsoX + 3, torsoY + torsoH - 3, torsoW - 6, 2);
  }
  if (race === 'construct') {
    // plate seams
    fill(ctx, p.skinSh, torsoX + 2, torsoY + 3, torsoW - 4, 1);
    fill(ctx, p.skinSh, torsoX + Math.floor(torsoW / 2), torsoY + 1, 1, torsoH - 2);
    fill(ctx, p.accent, torsoX + Math.floor(torsoW / 2) - 1, torsoY + 5, 3, 2);
  }
  if (race === 'dragonborn') {
    // scale rows
    for (let i = 0; i < 3; i++) {
      fill(ctx, p.skinSh, torsoX + 2, torsoY + 2 + i * 3, torsoW - 4, 1);
    }
  }

  // Arms
  const armW = female ? 3 : 4;
  shadedBlock(ctx, p.skin, p.skinHi, p.skinSh, torsoX - armW, torsoY + 1, armW, 8);
  shadedBlock(
    ctx,
    p.skin,
    p.skinHi,
    p.skinSh,
    torsoX + torsoW,
    torsoY + 1,
    armW,
    8,
  );

  // Head
  if (!bareHead) return;

  const hx = 10;
  const hy = short ? 3 : 4;
  const hw = 12;
  const hh = race === 'dragonborn' ? 10 : 9;

  if (race === 'dragonborn') {
    drawDragonbornHead(ctx, body, hx, hy, hw, hh, p);
    return;
  }
  if (race === 'construct') {
    drawConstructHead(ctx, body, hx, hy, hw, hh, p);
    return;
  }

  // Standard head mass
  shadedBlock(ctx, p.skin, p.skinHi, p.skinSh, hx, hy, hw, hh);
  cartoonFace(ctx, hx, hy, hw, hh, {
    soft: female || race === 'elf' || race === 'halfling',
  });
  // Re-tint face area slightly for non-human (cartoonFace uses fixed skin)
  if (race !== 'human') {
    fill(ctx, p.skin, hx + 1, hy + 1, hw - 2, hh - 3);
    // simple eyes redo
    fill(ctx, '#fff', hx + 2, hy + 3, 3, 3);
    fill(ctx, '#fff', hx + hw - 5, hy + 3, 3, 3);
    fill(ctx, '#222', hx + 3, hy + 4, 2, 2);
    fill(ctx, '#222', hx + hw - 4, hy + 4, 2, 2);
    spark(ctx, hx + 3, hy + 3, '#fff');
  }

  // Ears / features
  if (race === 'elf' || race === 'half_elf') {
    // pointed ears
    fill(ctx, p.skin, hx - 2, hy + 2, 3, 4);
    fill(ctx, p.skinHi, hx - 2, hy + 2, 1, 2);
    fill(ctx, p.skin, hx + hw - 1, hy + 2, 3, 4);
    fill(ctx, p.skinHi, hx + hw + 1, hy + 2, 1, 2);
    if (race === 'elf') {
      fill(ctx, p.skin, hx - 3, hy + 1, 2, 2); // taller points
      fill(ctx, p.skin, hx + hw + 1, hy + 1, 2, 2);
    }
  }
  if (race === 'half_orc') {
    // tusks
    fill(ctx, '#e8e0d0', hx + 3, hy + hh - 2, 2, 3);
    fill(ctx, '#e8e0d0', hx + hw - 5, hy + hh - 2, 2, 3);
    fill(ctx, '#fff', hx + 3, hy + hh - 1, 1, 1);
  }
  if (race === 'tiefling') {
    // horns
    fill(ctx, '#2a1a10', hx + 1, hy - 3, 3, 4);
    fill(ctx, '#2a1a10', hx + hw - 4, hy - 3, 3, 4);
    fill(ctx, p.accent, hx + 2, hy - 2, 1, 2);
    fill(ctx, p.accent, hx + hw - 3, hy - 2, 1, 2);
    // small tail tip at hip
    fill(ctx, p.skinSh, 4, 18, 3, 2);
    fill(ctx, p.skin, 3, 19, 2, 3);
  }
  if (race === 'dwarf' && !female) {
    // full beard
    fill(ctx, p.hair, hx + 1, hy + hh - 2, hw - 2, 5);
    fill(ctx, p.hairHi, hx + 3, hy + hh, 2, 2);
    fill(ctx, p.hair, hx + 2, hy + hh + 2, hw - 4, 2);
  }
  if (race === 'dwarf' && female) {
    // braids
    fill(ctx, p.hair, hx - 1, hy + 4, 3, 8);
    fill(ctx, p.hair, hx + hw - 2, hy + 4, 3, 8);
    fill(ctx, p.accent, hx - 1, hy + 10, 3, 1);
    fill(ctx, p.accent, hx + hw - 2, hy + 10, 3, 1);
  }

  // Hair (dragonborn/construct already returned above)
  if (female && race !== 'dwarf') {
    hairMass(ctx, hx, hy, hw, { color: p.hair, bangs: true });
    fill(ctx, p.hair, hx - 1, hy + 4, 3, 9);
    fill(ctx, p.hair, hx + hw - 2, hy + 4, 3, 9);
    fill(ctx, p.hairHi, hx, hy + 6, 1, 3);
  } else if (!female || race === 'elf') {
    hairMass(ctx, hx, hy, hw, {
      color: p.hair,
      bangs: race !== 'dwarf',
    });
  }
  if (race === 'gnome') {
    fill(ctx, p.hair, hx + 2, hy - 4, hw - 4, 4);
    fill(ctx, p.hairHi, hx + 4, hy - 3, 3, 2);
    spark(ctx, hx + 5, hy - 3, '#fff');
  }
}

function drawDragonbornHead(
  ctx: CanvasRenderingContext2D,
  body: BodyLook,
  hx: number,
  hy: number,
  hw: number,
  hh: number,
  p: ReturnType<typeof bodyPalette>,
): void {
  // Snout mass
  shadedBlock(ctx, p.skin, p.skinHi, p.skinSh, hx, hy, hw, hh);
  fill(ctx, p.skinSh, hx + 2, hy + 2, hw - 4, 1);
  // snout forward
  shadedBlock(ctx, p.skin, p.skinHi, p.skinSh, hx + 3, hy + 5, hw - 6, 5);
  fill(ctx, p.skinSh, hx + 4, hy + 8, 2, 1);
  fill(ctx, p.skinSh, hx + hw - 6, hy + 8, 2, 1);
  // eyes
  fill(ctx, '#ffc857', hx + 3, hy + 3, 3, 2);
  fill(ctx, '#ffc857', hx + hw - 6, hy + 3, 3, 2);
  fill(ctx, '#1a1a10', hx + 4, hy + 3, 1, 2);
  fill(ctx, '#1a1a10', hx + hw - 5, hy + 3, 1, 2);
  // crest / horns by gender
  if (body.gender === 'male') {
    fill(ctx, p.skinSh, hx + 4, hy - 3, 4, 4);
    fill(ctx, p.skin, hx + 5, hy - 4, 2, 3);
  } else {
    fill(ctx, p.skinHi, hx + 2, hy - 2, hw - 4, 3);
    fill(ctx, p.accent, hx + 5, hy - 3, 2, 2);
  }
  spark(ctx, hx + 6, hy + 2, '#c9ffe0');
}

function drawConstructHead(
  ctx: CanvasRenderingContext2D,
  body: BodyLook,
  hx: number,
  hy: number,
  hw: number,
  hh: number,
  p: ReturnType<typeof bodyPalette>,
): void {
  shadedBlock(ctx, p.skin, p.skinHi, p.skinSh, hx, hy, hw, hh);
  // visor band
  fill(ctx, '#0a1020', hx + 1, hy + 3, hw - 2, 4);
  fill(ctx, p.accent, hx + 3, hy + 4, 3, 2);
  fill(ctx, p.accent, hx + hw - 6, hy + 4, 3, 2);
  spark(ctx, hx + 4, hy + 4, '#fff');
  // antenna / crest
  if (body.gender === 'male') {
    fill(ctx, p.skinSh, hx + hw / 2 - 1, hy - 3, 2, 4);
    fill(ctx, p.accent, hx + hw / 2 - 1, hy - 4, 2, 2);
  } else {
    fill(ctx, p.skinHi, hx + 2, hy - 1, hw - 4, 2);
  }
  // jaw plate
  fill(ctx, p.skinSh, hx + 2, hy + hh - 2, hw - 4, 2);
}
