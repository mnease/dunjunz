/**
 * Race × gender body silhouettes for the 32×32 hero.
 * Binary gender only (male | female). Gear layers draw on top.
 *
 * EMA Council 2026-07: height bands share foot plant (footY=27);
 * tall = longer legs + higher crown, short/tiny = stouter / shorter legs.
 * Single metrics source for body + gear alignment.
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

export type HeightBand = 'tall' | 'medium' | 'short' | 'tiny';

/** Integer canvas metrics (ART_BASE=32 author space; scaled to ART_RES=64). Shared ground plant footY=27. */
export interface BodyMetrics {
  band: HeightBand;
  footY: number;
  legH: number;
  torsoY: number;
  torsoH: number;
  headY: number;
  headH: number;
  torsoW: number;
  torsoX: number;
  headW: number;
  headX: number;
  legW: number;
  leftLegX: number;
  rightLegX: number;
  armW: number;
  armLen: number;
  shoulderBias: number;
}

export function heightBandFor(race: RaceId): HeightBand {
  switch (race) {
    case 'elf':
      return 'tall';
    case 'dwarf':
      return 'short';
    case 'halfling':
    case 'gnome':
      return 'tiny';
    default:
      return 'medium';
  }
}

/** Male baseline rows (EMA table). Female deltas applied in bodyMetrics. */
const MALE_BASE: Record<
  RaceId,
  Omit<BodyMetrics, 'torsoX' | 'leftLegX' | 'rightLegX' | 'headX'> & {
    leftLegX: number;
    rightLegX: number;
    headX: number;
    torsoX: number;
  }
> = {
  elf: {
    band: 'tall',
    footY: 27,
    legH: 9,
    torsoY: 9,
    torsoH: 10,
    torsoW: 13,
    torsoX: 9,
    headY: 1,
    headW: 10,
    headH: 8,
    headX: 11,
    legW: 4,
    leftLegX: 11,
    rightLegX: 17,
    armW: 3,
    armLen: 9,
    shoulderBias: 0,
  },
  human: {
    band: 'medium',
    footY: 27,
    legH: 7,
    torsoY: 11,
    torsoH: 10,
    torsoW: 15,
    torsoX: 8,
    headY: 3,
    headW: 11,
    headH: 8,
    headX: 10,
    legW: 5,
    leftLegX: 10,
    rightLegX: 17,
    armW: 4,
    armLen: 8,
    shoulderBias: 0,
  },
  half_elf: {
    band: 'medium',
    footY: 27,
    legH: 8,
    torsoY: 10,
    torsoH: 10,
    torsoW: 14,
    torsoX: 9,
    headY: 2,
    headW: 11,
    headH: 8,
    headX: 10,
    legW: 4,
    leftLegX: 11,
    rightLegX: 17,
    armW: 3,
    armLen: 8,
    shoulderBias: 0,
  },
  half_orc: {
    band: 'medium',
    footY: 27,
    legH: 7,
    torsoY: 11,
    torsoH: 10,
    torsoW: 16,
    torsoX: 8,
    headY: 3,
    headW: 12,
    headH: 8,
    headX: 10,
    legW: 5,
    leftLegX: 10,
    rightLegX: 17,
    armW: 4,
    armLen: 8,
    shoulderBias: 0,
  },
  dragonborn: {
    band: 'medium',
    footY: 27,
    legH: 7,
    torsoY: 11,
    torsoH: 10,
    torsoW: 16,
    torsoX: 8,
    headY: 2,
    headW: 12,
    headH: 9,
    headX: 10,
    legW: 5,
    leftLegX: 10,
    rightLegX: 17,
    armW: 4,
    armLen: 8,
    shoulderBias: 0,
  },
  tiefling: {
    band: 'medium',
    footY: 27,
    legH: 7,
    torsoY: 11,
    torsoH: 10,
    torsoW: 14,
    torsoX: 9,
    headY: 3,
    headW: 11,
    headH: 8,
    headX: 10,
    legW: 4,
    leftLegX: 11,
    rightLegX: 17,
    armW: 3,
    armLen: 8,
    shoulderBias: 0,
  },
  construct: {
    band: 'medium',
    footY: 27,
    legH: 7,
    torsoY: 11,
    torsoH: 10,
    torsoW: 15,
    torsoX: 8,
    headY: 3,
    headW: 12,
    headH: 8,
    headX: 10,
    legW: 5,
    leftLegX: 10,
    rightLegX: 17,
    armW: 4,
    armLen: 8,
    shoulderBias: 0,
  },
  dwarf: {
    band: 'short',
    footY: 27,
    legH: 5,
    torsoY: 13,
    torsoH: 10,
    torsoW: 17,
    torsoX: 7,
    headY: 5,
    headW: 12,
    headH: 8,
    headX: 10,
    legW: 5,
    leftLegX: 10,
    rightLegX: 17,
    armW: 4,
    armLen: 7,
    shoulderBias: 0,
  },
  halfling: {
    band: 'tiny',
    footY: 27,
    legH: 5,
    torsoY: 15,
    torsoH: 8,
    torsoW: 12,
    torsoX: 10,
    headY: 7,
    headW: 10,
    headH: 8,
    headX: 11,
    legW: 4,
    leftLegX: 11,
    rightLegX: 17,
    armW: 3,
    armLen: 6,
    shoulderBias: 0,
  },
  gnome: {
    band: 'tiny',
    footY: 27,
    legH: 5,
    torsoY: 15,
    torsoH: 8,
    torsoW: 12,
    torsoX: 10,
    headY: 7,
    headW: 10,
    headH: 8,
    headX: 11,
    legW: 4,
    leftLegX: 11,
    rightLegX: 17,
    armW: 3,
    armLen: 6,
    shoulderBias: 0,
  },
};

export function bodyMetrics(race: RaceId, gender: GenderId): BodyMetrics {
  const base = MALE_BASE[race] ?? MALE_BASE.human;
  const m: BodyMetrics = { ...base };
  if (gender === 'female') {
    // Dwarf female stays stout (only −2, not elf-slender)
    m.torsoW = Math.max(11, m.torsoW - 2);
    m.torsoX = Math.floor((32 - m.torsoW) / 2);
    m.legW = Math.max(3, m.legW - 1);
    m.leftLegX = m.leftLegX + 1;
    m.armW = Math.max(2, m.armW - 1);
    // Recenter head on torso
    m.headX = Math.floor(m.torsoX + (m.torsoW - m.headW) / 2);
  }
  return m;
}

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
  const m = bodyMetrics(race, body.gender);

  const leftOff = walk === 1 ? -1 : walk === 2 ? 1 : 0;
  const rightOff = walk === 2 ? -1 : walk === 1 ? 1 : 0;

  // Shadow at shared ground plant
  fill(ctx, 'rgba(0,0,0,0.22)', 8, 30, 16, 2);

  // Legs
  const legTop = m.footY - m.legH + 1;
  shadedBlock(
    ctx,
    '#2a3a5a',
    '#3a5080',
    '#1a2840',
    m.leftLegX + leftOff,
    legTop,
    m.legW,
    m.legH,
  );
  shadedBlock(
    ctx,
    '#2a3a5a',
    '#3a5080',
    '#1a2840',
    m.rightLegX + rightOff,
    legTop,
    m.legW,
    m.legH,
  );
  // Boots
  shadedBlock(
    ctx,
    '#3d2b1f',
    '#5a4030',
    '#1a1008',
    m.leftLegX - 1 + leftOff,
    m.footY,
    m.legW + 1,
    3,
  );
  shadedBlock(
    ctx,
    '#3d2b1f',
    '#5a4030',
    '#1a1008',
    m.rightLegX - 1 + rightOff,
    m.footY,
    m.legW + 1,
    3,
  );
  // Halfling oversized feet
  if (race === 'halfling') {
    fill(ctx, '#3d2b1f', m.leftLegX - 2 + leftOff, m.footY + 1, m.legW + 3, 2);
    fill(ctx, '#3d2b1f', m.rightLegX - 2 + rightOff, m.footY + 1, m.legW + 3, 2);
  }

  // Torso tunic
  const tunic =
    race === 'construct'
      ? { mid: '#6a7888', hi: '#9aabc0', sh: '#3a4558' }
      : race === 'dragonborn'
        ? { mid: p.skin, hi: p.skinHi, sh: p.skinSh }
        : { mid: '#2d6cdf', hi: '#5a9aff', sh: '#1a4aaf' };
  shadedBlock(ctx, tunic.mid, tunic.hi, tunic.sh, m.torsoX, m.torsoY, m.torsoW, m.torsoH);
  if (race !== 'dragonborn' && race !== 'construct') {
    fill(ctx, '#4a8cef', m.torsoX + 2, m.torsoY + 2, m.torsoW - 4, 3);
    fill(ctx, '#c9a227', m.torsoX + 3, m.torsoY + m.torsoH - 3, m.torsoW - 6, 2);
  }
  if (race === 'construct') {
    fill(ctx, p.skinSh, m.torsoX + 2, m.torsoY + 3, m.torsoW - 4, 1);
    fill(
      ctx,
      p.skinSh,
      m.torsoX + Math.floor(m.torsoW / 2),
      m.torsoY + 1,
      1,
      m.torsoH - 2,
    );
    fill(
      ctx,
      p.accent,
      m.torsoX + Math.floor(m.torsoW / 2) - 1,
      m.torsoY + 5,
      3,
      2,
    );
  }
  if (race === 'dragonborn') {
    for (let i = 0; i < 3; i++) {
      fill(ctx, p.skinSh, m.torsoX + 2, m.torsoY + 2 + i * 3, m.torsoW - 4, 1);
    }
  }

  // Arms
  const armX0 = m.torsoX - m.armW + m.shoulderBias;
  const armX1 = m.torsoX + m.torsoW - m.shoulderBias;
  shadedBlock(ctx, p.skin, p.skinHi, p.skinSh, armX0, m.torsoY + 1, m.armW, m.armLen);
  shadedBlock(ctx, p.skin, p.skinHi, p.skinSh, armX1, m.torsoY + 1, m.armW, m.armLen);

  if (!bareHead) return;

  const hx = m.headX;
  const hy = m.headY;
  const hw = m.headW;
  const hh = m.headH;

  if (race === 'dragonborn') {
    drawDragonbornHead(ctx, body, hx, hy, hw, hh, p);
    return;
  }
  if (race === 'construct') {
    drawConstructHead(ctx, body, hx, hy, hw, hh, p);
    return;
  }

  // Head mass
  shadedBlock(ctx, p.skin, p.skinHi, p.skinSh, hx, hy, hw, hh);
  cartoonFace(ctx, hx, hy, hw, hh, {
    soft: female || race === 'elf' || race === 'halfling' || race === 'gnome',
  });
  // Re-tint non-human face (cartoonFace uses fixed peach skin)
  if (race !== 'human') {
    fill(ctx, p.skin, hx + 1, hy + 1, hw - 2, hh - 3);
    fill(ctx, '#fff', hx + 2, hy + 3, 3, 3);
    fill(ctx, '#fff', hx + hw - 5, hy + 3, 3, 3);
    fill(ctx, '#222', hx + 3, hy + 4, 2, 2);
    fill(ctx, '#222', hx + hw - 4, hy + 4, 2, 2);
    spark(ctx, hx + 3, hy + 3, '#fff');
    // Half-orc heavier brow
    if (race === 'half_orc') {
      fill(ctx, p.skinSh, hx + 1, hy + 2, hw - 2, 1);
    }
  }

  // Ears
  if (race === 'elf' || race === 'half_elf') {
    const tall = race === 'elf';
    fill(ctx, p.skin, hx - 2, hy + 2, 3, 4);
    fill(ctx, p.skinHi, hx - 2, hy + 2, 1, 2);
    fill(ctx, p.skin, hx + hw - 1, hy + 2, 3, 4);
    fill(ctx, p.skinHi, hx + hw + 1, hy + 2, 1, 2);
    if (tall) {
      fill(ctx, p.skin, hx - 3, hy + 1, 2, 2);
      fill(ctx, p.skin, hx + hw + 1, hy + 1, 2, 2);
      fill(ctx, p.skinHi, hx - 3, hy, 1, 2);
      fill(ctx, p.skinHi, hx + hw + 2, hy, 1, 2);
    }
  }
  // Tusks (half-orc)
  if (race === 'half_orc') {
    fill(ctx, '#e8e0d0', hx + 3, hy + hh - 2, 2, 3);
    fill(ctx, '#e8e0d0', hx + hw - 5, hy + hh - 2, 2, 3);
    fill(ctx, '#fff', hx + 3, hy + hh - 1, 1, 1);
  }
  // Horns + tail (tiefling)
  if (race === 'tiefling') {
    fill(ctx, '#2a1a10', hx + 1, hy - 3, 3, 4);
    fill(ctx, '#2a1a10', hx + hw - 4, hy - 3, 3, 4);
    fill(ctx, p.accent, hx + 2, hy - 2, 1, 2);
    fill(ctx, p.accent, hx + hw - 3, hy - 2, 1, 2);
    fill(ctx, p.skinSh, m.torsoX - 2, m.torsoY + m.torsoH - 2, 3, 2);
    fill(ctx, p.skin, m.torsoX - 3, m.torsoY + m.torsoH - 1, 2, 3);
  }

  // Dwarf male: long beard (non-negotiable silhouette)
  if (race === 'dwarf' && !female) {
    const beardTop = hy + hh - 2;
    fill(ctx, p.hair, hx + 1, beardTop, hw - 2, 5);
    fill(ctx, p.hairHi, hx + 3, beardTop + 2, 2, 2);
    fill(ctx, p.hair, hx + 2, beardTop + 4, hw - 4, 3);
    // forked tip
    fill(ctx, p.hair, hx + 3, beardTop + 7, 2, 2);
    fill(ctx, p.hair, hx + hw - 5, beardTop + 7, 2, 2);
    fill(ctx, p.hairHi, hx + 4, beardTop + 5, 1, 2);
  }
  // Dwarf female: side braids + gold bands
  if (race === 'dwarf' && female) {
    fill(ctx, p.hair, hx - 1, hy + 3, 3, 9);
    fill(ctx, p.hair, hx + hw - 2, hy + 3, 3, 9);
    fill(ctx, p.hairHi, hx - 1, hy + 4, 2, 3);
    fill(ctx, p.hairHi, hx + hw - 1, hy + 4, 2, 3);
    fill(ctx, p.accent, hx - 1, hy + 11, 3, 1);
    fill(ctx, p.accent, hx + hw - 2, hy + 11, 3, 1);
    hairMass(ctx, hx, hy, hw, { color: p.hair, bangs: true });
  }

  // Hair (non-dwarf-female path; dwarf male beard already drawn)
  if (race !== 'dwarf' || !female) {
    if (female) {
      hairMass(ctx, hx, hy, hw, { color: p.hair, bangs: true });
      fill(ctx, p.hair, hx - 1, hy + 4, 3, 9);
      fill(ctx, p.hair, hx + hw - 2, hy + 4, 3, 9);
      fill(ctx, p.hairHi, hx, hy + 6, 1, 3);
    } else if (race !== 'dwarf') {
      hairMass(ctx, hx, hy, hw, {
        color: p.hair,
        bangs: true,
      });
    } else {
      // dwarf male: short crown hair above beard
      hairMass(ctx, hx, hy, hw, { color: p.hair, bangs: false });
    }
  }
  // Gnome tall hair puff
  if (race === 'gnome') {
    fill(ctx, p.hair, hx + 1, hy - 4, hw - 2, 5);
    fill(ctx, p.hairHi, hx + 3, hy - 3, 4, 2);
    spark(ctx, hx + 4, hy - 3, '#fff');
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
  shadedBlock(ctx, p.skin, p.skinHi, p.skinSh, hx, hy, hw, hh);
  fill(ctx, p.skinSh, hx + 2, hy + 2, hw - 4, 1);
  shadedBlock(ctx, p.skin, p.skinHi, p.skinSh, hx + 3, hy + 5, hw - 6, 5);
  fill(ctx, p.skinSh, hx + 4, hy + 8, 2, 1);
  fill(ctx, p.skinSh, hx + hw - 6, hy + 8, 2, 1);
  fill(ctx, '#ffc857', hx + 3, hy + 3, 3, 2);
  fill(ctx, '#ffc857', hx + hw - 6, hy + 3, 3, 2);
  fill(ctx, '#1a1a10', hx + 4, hy + 3, 1, 2);
  fill(ctx, '#1a1a10', hx + hw - 5, hy + 3, 1, 2);
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
  fill(ctx, '#0a1020', hx + 1, hy + 3, hw - 2, 4);
  fill(ctx, p.accent, hx + 3, hy + 4, 3, 2);
  fill(ctx, p.accent, hx + hw - 6, hy + 4, 3, 2);
  spark(ctx, hx + 4, hy + 4, '#fff');
  if (body.gender === 'male') {
    fill(ctx, p.skinSh, hx + Math.floor(hw / 2) - 1, hy - 3, 2, 4);
    fill(ctx, p.accent, hx + Math.floor(hw / 2) - 1, hy - 4, 2, 2);
  } else {
    fill(ctx, p.skinHi, hx + 2, hy - 1, hw - 4, 2);
  }
  fill(ctx, p.skinSh, hx + 2, hy + hh - 2, hw - 4, 2);
}
